// ⚠️  This file is no longer the active main process.
// Active main process: src/main.js  (package.json "main" → "src/main.js")
// Kept only as a backup reference — do not edit.

// eslint-disable-next-line
const _unused = null; module.exports = _unused;
/*
const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const path = require('path');

// ─────────────────────────────────────────────────────────────
// In development, point to the local Replit web server.
// In production, point to the deployed .replit.app URL.
// ─────────────────────────────────────────────────────────────
const IS_DEV = process.env.NODE_ENV === 'development' || !app.isPackaged;
// In production, APP_URL env var overrides the default deployed URL.
// Set APP_URL at build time or in a .env file to point to your deployment.
const APP_URL = process.env.APP_URL || (IS_DEV
  ? 'http://localhost:22333'
  : 'https://knowledgelink.replit.app');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'KnowledgeLink',
    show: false,
    backgroundColor: '#F8FAFC',
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    if (errorCode === -3) return;
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
  });

  // Detect Replit "not live" page and show friendly error.html instead
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) return;
    const title = mainWindow.webContents.getTitle();
    if (title.toLowerCase().includes("isn't live") || title.toLowerCase().includes('not live') || title.toLowerCase().includes('app is not live')) {
      mainWindow.loadFile(path.join(__dirname, 'error.html'));
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow && mainWindow.loadURL(APP_URL),
        },
        { type: 'separator' },
        { role: 'quit', label: 'Quit KnowledgeLink' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About KnowledgeLink',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'KnowledgeLink',
              message: 'KnowledgeLink',
              detail: 'AI-powered learning platform\nVersion ' + app.getVersion(),
              icon: path.join(__dirname, 'assets', 'icon.png'),
            });
          },
        },
        {
          label: 'Open in Browser',
          click: () => shell.openExternal(APP_URL),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
