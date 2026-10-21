const LAUNCHER_API = 'http://localhost:3002/api'

/* ── DOM refs ── */
const statusDot = document.getElementById('statusDot')
const statusTitle = document.getElementById('statusTitle')
const statusUrl = document.getElementById('statusUrl')
const backendDot = document.getElementById('backendDot')
const backendStatus = document.getElementById('backendStatus')
const backendRestartBtn = document.getElementById('backendRestartBtn')
const frontendDot = document.getElementById('frontendDot')
const frontendStatus = document.getElementById('frontendStatus')
const frontendRestartBtn = document.getElementById('frontendRestartBtn')
const ipValue = document.getElementById('ipValue')
const autoStartToggle = document.getElementById('autoStartToggle')

/* ── API helpers ── */
async function api(url, method = 'GET', body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  return res.json()
}

/* ── Update UI ── */
function updateUI(status) {
  const { backendOnline, frontendOnline, allOnline, ips, frontendPort } = status

  if (allOnline) {
    statusDot.style.color = '#22c55e'
    statusTitle.textContent = '系统运行正常'
  } else if (backendOnline || frontendOnline) {
    statusDot.style.color = '#f59e0b'
    statusTitle.textContent = '部分服务离线'
  } else {
    statusDot.style.color = '#ef4444'
    statusTitle.textContent = '系统离线'
  }
  statusUrl.textContent = ips.length > 0 ? `http://${ips[0]}:${frontendPort}` : `http://localhost:${frontendPort}`

  // Backend card
  backendDot.style.color = backendOnline ? '#22c55e' : '#ef4444'
  backendStatus.textContent = backendOnline ? '在线' : '离线'
  backendStatus.style.color = backendOnline ? '#22c55e' : '#ef4444'
  backendRestartBtn.disabled = false
  backendRestartBtn.style.opacity = '1'

  // Frontend card
  frontendDot.style.color = frontendOnline ? '#22c55e' : '#ef4444'
  frontendStatus.textContent = frontendOnline ? '在线' : '离线'
  frontendStatus.style.color = frontendOnline ? '#22c55e' : '#ef4444'
  frontendRestartBtn.disabled = false
  frontendRestartBtn.style.opacity = '1'

  // IP addresses
  ipValue.textContent = ips.length > 0 ? ips.join(', ') : '127.0.0.1'
}

/* ── Controls ── */
document.getElementById('backendRestartBtn').onclick = async () => {
  backendRestartBtn.textContent = '重启中...'
  backendRestartBtn.disabled = true
  await api(`${LAUNCHER_API}/restart-backend`, 'POST')
  setTimeout(() => { backendRestartBtn.textContent = '重启'; backendRestartBtn.disabled = false }, 5000)
}

document.getElementById('frontendRestartBtn').onclick = async () => {
  frontendRestartBtn.textContent = '重启中...'
  frontendRestartBtn.disabled = true
  await api(`${LAUNCHER_API}/restart-frontend`, 'POST')
  setTimeout(() => { frontendRestartBtn.textContent = '重启'; frontendRestartBtn.disabled = false }, 5000)
}

document.getElementById('autoStartToggle').onclick = async () => {
  const current = autoStartToggle.classList.contains('active')
  const result = await api(`${LAUNCHER_API}/auto-start`, 'POST', { enabled: !current })
  if (result.enabled) autoStartToggle.classList.add('active')
  else autoStartToggle.classList.remove('active')
}

document.getElementById('openBrowserBtn').onclick = () => {
  window.open('http://localhost:5173', '_blank')
}

document.getElementById('minimizeBtn').onclick = () => {
  window.close()
}

/* ── Init ── */
async function init() {
  // Load auto-start state
  const autoStart = await api(`${LAUNCHER_API}/auto-start`)
  if (autoStart.enabled) autoStartToggle.classList.add('active')

  // Load initial status
  const status = await api(`${LAUNCHER_API}/status`)
  updateUI(status)

  // Poll every 3 seconds
  setInterval(async () => {
    const s = await api(`${LAUNCHER_API}/status`)
    updateUI(s)
  }, 3000)
}

init()
