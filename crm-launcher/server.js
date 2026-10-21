const http = require('http')
const { spawn, execSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

const ROOT = path.resolve(__dirname, '..')
const BACKEND_DIR = path.join(ROOT, 'crm-backend')
const FRONTEND_DIR = path.join(ROOT, 'crm-frontend')
const LAUNCHER_PORT = 3002

let backendProcess = null
let frontendProcess = null
let backendOnline = false
let frontendOnline = false
let frontendPort = 5173
let backendPort = 3001

/* ── Spawn child processes ── */
function startBackend() {
  if (backendProcess) return
  backendProcess = spawn('npx.cmd', ['tsx', 'src/index.ts'], {
    cwd: BACKEND_DIR, stdio: 'pipe', shell: true,
  })
  backendProcess.stdout.on('data', d => process.stdout.write(`[BE] ${d}`))
  backendProcess.stderr.on('data', d => { process.stderr.write(`[BE] ${d}`) })
  backendProcess.on('exit', () => { backendProcess = null; backendOnline = false })
}

function startFrontend() {
  if (frontendProcess) return
  frontendProcess = spawn('npx.cmd', ['vite', '--host'], {
    cwd: FRONTEND_DIR, stdio: 'pipe', shell: true,
  })
  frontendProcess.stdout.on('data', d => {
    const str = d.toString()
    process.stdout.write(`[FE] ${str}`)
    // Detect actual port from Vite output
    const portMatch = str.match(/Local:\s+http:\/\/localhost:(\d+)/)
    if (portMatch) frontendPort = parseInt(portMatch[1])
  })
  frontendProcess.stderr.on('data', d => process.stderr.write(`[FE] ${d}`))
  frontendProcess.on('exit', () => { frontendProcess = null; frontendOnline = false })
}

function stopBackend() { if (backendProcess) { backendProcess.kill(); backendProcess = null; backendOnline = false } }
function stopFrontend() { if (frontendProcess) { frontendProcess.kill(); frontendProcess = null; frontendOnline = false } }

/* ── Health check ── */
function checkHealth(url) {
  return new Promise(r => {
    const req = http.get(url, res => r(res.statusCode < 400))
    req.on('error', () => r(false))
    req.setTimeout(2000, () => { req.destroy(); r(false) })
  })
}

async function pollHealth() {
  const [be, fe] = await Promise.all([
    checkHealth(`http://localhost:${backendPort}/api/system/health`),
    checkHealth(`http://localhost:${frontendPort}/`),
  ])
  backendOnline = be
  frontendOnline = fe
}

function getLocalIPs() {
  const ips = []
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address)
    }
  }
  return ips.length > 0 ? ips : ['127.0.0.1']
}

/* ── Serve the launcher UI ── */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath)
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
    res.end(data)
  })
}

const server = http.createServer((req, res) => {
  // API endpoints
  if (req.url === '/api/status') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(JSON.stringify({
      backendOnline,
      frontendOnline,
      allOnline: backendOnline && frontendOnline,
      ips: getLocalIPs(),
      backendPort,
      frontendPort,
    }))
    return
  }

  if (req.url === '/api/restart-backend' && req.method === 'POST') {
    stopBackend(); setTimeout(() => startBackend(), 1500)
    res.writeHead(200); res.end('ok')
    return
  }
  if (req.url === '/api/restart-frontend' && req.method === 'POST') {
    stopFrontend(); setTimeout(() => startFrontend(), 1500)
    res.writeHead(200); res.end('ok')
    return
  }
  if (req.url === '/api/auto-start' && req.method === 'GET') {
    const shortcutPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'CRM System.url')
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ enabled: fs.existsSync(shortcutPath) }))
    return
  }
  if (req.url === '/api/auto-start' && req.method === 'POST') {
    let body = ''
    req.on('data', c => body += c)
    req.on('end', () => {
      const { enabled } = JSON.parse(body)
      const startupPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
      const shortcutPath = path.join(startupPath, 'CRM System.url')
      if (enabled) {
        const content = `[InternetShortcut]\nURL=http://localhost:${LAUNCHER_PORT}\n`
        fs.writeFileSync(shortcutPath, content)
      } else {
        try { fs.unlinkSync(shortcutPath) } catch {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ enabled }))
    })
    return
  }

  // Serve static files
  if (req.url === '/' || req.url === '/index.html') {
    serveFile(res, path.join(__dirname, 'renderer', 'index.html'))
  } else {
    serveFile(res, path.join(__dirname, 'renderer', req.url))
  }
})

/* ── Start ── */
startBackend()
startFrontend()
server.listen(LAUNCHER_PORT, () => {
  console.log(`CRM Launcher running on http://localhost:${LAUNCHER_PORT}`)
  // Open browser after a short delay
  setTimeout(() => {
    execSync(`start http://localhost:${LAUNCHER_PORT}`, { shell: true })
  }, 1000)
})

// Health polling
setInterval(pollHealth, 3000)
setTimeout(pollHealth, 500)

// Graceful shutdown
process.on('SIGINT', () => { stopBackend(); stopFrontend(); process.exit() })
process.on('SIGTERM', () => { stopBackend(); stopFrontend(); process.exit() })
