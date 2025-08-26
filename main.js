const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png')
    });

    mainWindow.loadFile('index.html');
     //mainWindow.webContents.openDevTools(); // Dev tools for debugging
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// File system handlers
ipcMain.handle('show-save-dialog', async (_, defaultPath) => {
    const { filePath } = await dialog.showSaveDialog({
        defaultPath,
        filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    return filePath;
});

ipcMain.handle('write-file', (_, path, data) => {
    fs.writeFileSync(path, data);
});

ipcMain.handle('show-open-dialog', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
    });
    return filePaths[0];
});

ipcMain.handle('read-file', (_, path) => {
    return fs.readFileSync(path, 'utf8');
});