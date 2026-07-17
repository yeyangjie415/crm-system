import { Router, Request, Response } from 'express'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { requireAuth } from '../middleware/auth.js'
import prisma from '../lib/prisma.js'

export const systemRouter = Router()
systemRouter.use(requireAuth)

const STARTUP_SCRIPT_NAME = 'CRM System Startup.lnk'

/* ── Database path detection ── */
function getDbPath(): string {
  // Prisma schema has url = "file:./crm.db" relative to prisma/ dir
  return path.resolve(import.meta.dirname, '../../prisma/crm.db')
}

function getBackupDir(): string {
  const dir = path.resolve(import.meta.dirname, '../../prisma/backups')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

/* ── Backup: create and download ── */
systemRouter.get('/backup', async (_req: Request, res: Response) => {
  try {
    const dbPath = getDbPath()
    if (!fs.existsSync(dbPath)) {
      res.status(404).json({ error: '数据库文件不存在' })
      return
    }
    // Create a backup copy with timestamp
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const backupName = `crm-backup-${ts}.db`
    const backupPath = path.join(getBackupDir(), backupName)
    fs.copyFileSync(dbPath, backupPath)
    console.log('[BACKUP] Created:', backupPath)
    // Send the backup file
    res.download(backupPath, backupName)
  } catch (err) {
    console.error('[BACKUP] Error:', err)
    res.status(500).json({ error: '备份创建失败' })
  }
})

/* ── Backup: upload and restore ── */
systemRouter.post('/backup/restore', async (req: Request, res: Response) => {
  try {
    const { data } = req.body
    if (!data) {
      res.status(400).json({ error: '请提供备份文件数据' })
      return
    }
    const dbPath = getDbPath()
    // Backup current db before restoring
    const backupDir = getBackupDir()
    const preRestoreBackup = path.join(backupDir, `pre-restore-${Date.now()}.db`)
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, preRestoreBackup)
    }
    // Decode base64 data and write to db path
    const buffer = Buffer.from(data, 'base64')
    // Disconnect prisma before replacing file
    await prisma.$disconnect()
    fs.writeFileSync(dbPath, buffer)
    console.log('[BACKUP] Restored from upload, pre-restore backup at:', preRestoreBackup)
    res.json({ message: '数据库已恢复，请重启服务', preRestoreBackup: path.basename(preRestoreBackup) })
  } catch (err) {
    console.error('[BACKUP] Restore error:', err)
    res.status(500).json({ error: '恢复失败: ' + String(err) })
  }
})

/* ── Backup: list local backups ── */
systemRouter.get('/backup/list', (_req: Request, res: Response) => {
  try {
    const backupDir = getBackupDir()
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f))
        return { name: f, size: stat.size, createdAt: stat.birthtime }
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    res.json({ backups: files, latestBackup: files[0]?.createdAt || null })
  } catch (err) {
    res.status(500).json({ error: '获取备份列表失败' })
  }
})

/* ── Health check ── */
systemRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

/* ── Restart server ── */
systemRouter.post('/restart', (_req: Request, res: Response) => {
  console.log('[SYSTEM] Restart requested')
  res.json({ message: '重启请求已收到，请手动运行 start.bat 重启服务' })
  // process.exit(0) removed — it kills the entire concurrently group
  // User should restart manually via start.bat
})

/* ── Auto-start: check status ── */
systemRouter.get('/auto-start', (_req: Request, res: Response) => {
  try {
    const startupPath = getStartupFolderPath()
    const exists = fs.existsSync(path.join(startupPath, STARTUP_SCRIPT_NAME))
    res.json({ enabled: exists })
  } catch {
    res.json({ enabled: false, error: '无法检测开机自启状态' })
  }
})

/* ── Auto-start: toggle ── */
systemRouter.post('/auto-start', async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body
    const startupPath = getStartupFolderPath()
    const shortcutPath = path.join(startupPath, STARTUP_SCRIPT_NAME)

    if (enabled) {
      await createStartupShortcut()
      res.json({ enabled: true, message: '已开启开机自启' })
    } else {
      if (fs.existsSync(shortcutPath)) fs.unlinkSync(shortcutPath)
      res.json({ enabled: false, message: '已关闭开机自启' })
    }
  } catch (err) {
    res.status(500).json({ error: '操作失败', detail: String(err) })
  }
})

/* ── Helpers ── */

function getStartupFolderPath(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
  }
  // macOS / Linux — not implemented for this CRM
  return '/tmp'
}

async function createStartupShortcut() {
  if (process.platform !== 'win32') {
    throw new Error('仅支持 Windows 系统的开机自启')
  }

  const startupPath = getStartupFolderPath()
  const shortcutPath = path.join(startupPath, STARTUP_SCRIPT_NAME)
  if (fs.existsSync(shortcutPath)) return

  // Find the project root (2 levels up from src/routes)
  const projectRoot = path.resolve(import.meta.dirname, '../..')
  const startBat = path.join(projectRoot, '..', 'start.bat')

  if (!fs.existsSync(startBat)) {
    throw new Error('start.bat 不存在，请确认项目路径')
  }

  // Use PowerShell to create a shortcut
  const psScript = `
$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')
$s.TargetPath = '${startBat.replace(/'/g, "''")}'
$s.WorkingDirectory = '${projectRoot.replace(/'/g, "''")}'
$s.Description = 'CRM System'
$s.Save()
`
  execSync(`powershell -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, { timeout: 10000 })
}
