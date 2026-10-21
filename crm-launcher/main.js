const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const http = require('http')
const os = require('os')

/* ── Paths ── */
const ROOT_DIR = path.resolve(__dirname, '..')
const BACKEND_DIR = path.join(ROOT_DIR, 'crm-backend')
const FRONTEND_DIR = path.join(ROOT_DIR, 'crm-frontend')

/* ── State ── */
let mainWindow = null
let tray = null
let backendProcess = null
let frontendProcess = null
let backendOnline = false
let frontendOnline = false
let pollingInterval = null

/* ── Create icon from Building2 SVG data ── */
function createIcon(size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></svg>`
  const buf = Buffer.from(svg)
  return nativeImage.createFromBuffer(buf, size / 24)
}

function createTrayIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6" stroke="none"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/></svg>`
  const buf = Buffer.from(svg)
  return nativeImage.createFromBuffer(buf, 16 / 24)
}

/* ── Get current state ── */
function getState() {
  return {
    backendOnline,
    frontendOnline,
    allOnline: backendOnline && frontendOnline,
    backendPort: 3001,
    frontendPort: 5173,
    ips: getLocalIPs(),
  }
}

function getLocalIPs() {
  const interfaces = os.networkInterfaces()
  const ips = []
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address)
      }
    }
  }
  return ips.length > 0 ? ips : ['127.0.0.1']
}

/* ── Health check ── */
function checkHealth(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => resolve(res.statusCode < 400))
    req.on('error', () => resolve(false))
    req.setTimeout(2000, () => { req.destroy(); resolve(false) })
  })
}

async function pollHealth() {
  const [be, fe] = await Promise.all([
    checkHealth('http://localhost:3001/api/system/health'),
    checkHealth('http://localhost:5173/'),
  ])
  backendOnline = be
  frontendOnline = fe
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status', getState())
  }
  updateTrayTooltip()
}

function updateTrayTooltip() {
  if (tray) {
    const status = backendOnline && frontendOnline ? '运行正常' : '部分离线'
    tray.setToolTip(`CRM System - ${status}`)
  }
}

/* ── Manage child processes ── */
function startBackend() {
  if (backendProcess) return
  backendProcess = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: BACKEND_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  })
  backendProcess.stdout.on('data', (d) => process.stdout.write(`[BE] ${d}`))
  backendProcess.stderr.on('data', (d) => process.stderr.write(`[BE] ${d}`))
  backendProcess.on('exit', () => { backendProcess = null; backendOnline = false })
}

function startFrontend() {
  if (frontendProcess) return
  frontendProcess = spawn('npx', ['vite', '--host'], {
    cwd: FRONTEND_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  })
  frontendProcess.stdout.on('data', (d) => process.stdout.write(`[FE] ${d}`))
  frontendProcess.stderr.on('data', (d) => process.stderr.write(`[FE] ${d}`))
  frontendProcess.on('exit', () => { frontendProcess = null; frontendOnline = false })
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill('SIGTERM')
    backendProcess = null
    backendOnline = false
  }
}

function stopFrontend() {
  if (frontendProcess) {
    frontendProcess.kill('SIGTERM')
    frontendProcess = null
    frontendOnline = false
  }
}

function restartBackend() {
  stopBackend()
  setTimeout(() => startBackend(), 1000)
}

function restartFrontend() {
  stopFrontend()
  setTimeout(() => startFrontend(), 1000)
}

/* ── Auto-start ── */
function setAutoStart(enabled) {
  const startupPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
  const shortcutPath = path.join(startupPath, 'CRM System.lnk')
  if (enabled) {
    const psScript = `
$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')
$s.TargetPath = '${process.execPath.replace(/'/g, "''")}'
$s.Arguments = '"${path.join(__dirname, 'main.js').replace(/'/g, "''")}"'
$s.WorkingDirectory = '${ROOT_DIR.replace(/'/g, "''")}'
$s.Description = 'CRM System v1.2'
$s.Save()
`
    require('child_process').execSync(`powershell -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { timeout: 10000 })
  } else {
    try { fs.unlinkSync(shortcutPath) } catch {}
  }
}

function getAutoStart() {
  const shortcutPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'CRM System.lnk')
  return fs.existsSync(shortcutPath)
}

/* ── Window ── */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 720,
    height: 580,
    resizable: false,
    frame: false,
    transparent: true,
    icon: createIcon(48),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })
}

/* ── Tray ── */
function createTray() {
  tray = new Tray(createTrayIcon())
  tray.setToolTip('CRM System')
  const contextMenu = Menu.buildFromTemplate([
    { label: '打开面板', click: () => { if (mainWindow) mainWindow.show() } },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true
        stopBackend()
        stopFrontend()
        app.quit()
      },
    },
  ])
  tray.setContextMenu(contextMenu)
  tray.on('click', () => { if (mainWindow) mainWindow.show() })
}

/* ── IPC Handlers ── */
ipcMain.handle('get-status', () => getState())
ipcMain.handle('get-auto-start', () => getAutoStart())
ipcMain.handle('set-auto-start', (_, enabled) => { setAutoStart(enabled); return getAutoStart() })
ipcMain.handle('restart-backend', () => restartBackend())
ipcMain.handle('restart-frontend', () => restartFrontend())
ipcMain.handle('open-browser', (_, url) => shell.openExternal(url))
ipcMain.handle('quit-app', () => {
  app.isQuitting = true
  stopBackend()
  stopFrontend()
  app.quit()
})
ipcMain.handle('minimize-to-tray', () => { if (mainWindow) mainWindow.hide() })

/* ── App lifecycle ── */
app.whenReady().then(() => {
  createWindow()
  createTray()
  startBackend()
  startFrontend()
  pollingInterval = setInterval(pollHealth, 3000)
  setTimeout(pollHealth, 500)
})

app.on('window-all-closed', () => {})
app.on('activate', () => { if (mainWindow) mainWindow.show() })
app.on('before-quit', () => {
  app.isQuitting = true
  if (pollingInterval) clearInterval(pollingInterval)
})
