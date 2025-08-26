const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    showSaveDialog: (defaultPath) => ipcRenderer.invoke('show-save-dialog', defaultPath),
    writeFile: (path, data) => ipcRenderer.invoke('write-file', path, data),
    showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
    readFile: (path) => ipcRenderer.invoke('read-file', path),
    onUpdateSettings: (callback) => ipcRenderer.on('update-settings', callback)
});