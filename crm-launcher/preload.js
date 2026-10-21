const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getStatus: () => ipcRenderer.invoke('get-status'),
  getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
  setAutoStart: (enabled) => ipcRenderer.invoke('set-auto-start', enabled),
  restartBackend: () => ipcRenderer.invoke('restart-backend'),
  restartFrontend: () => ipcRenderer.invoke('restart-frontend'),
  openBrowser: (url) => ipcRenderer.invoke('open-browser', url),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  onStatus: (callback) => {
    ipcRenderer.on('status', (_, data) => callback(data))
  },
})
