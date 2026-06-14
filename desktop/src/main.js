"use strict";

/**
 * KnowledgeLink — Electron main process
 *
 * 1. Spawn the bundled Express API server as a child process.
 * 2. Wait until the server is accepting requests.
 * 3. Load the built React frontend from the local filesystem (no hosting needed).
 */

const { app, BrowserWindow, shell, Menu, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

// ─── Paths ────────────────────────────────────────────────────────────────────

function getServerPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "server", "index.mjs");
  }
  // Dev: go up 2 levels from desktop/src/ to reach the workspace root
  return path.resolve(__dirname, "..", "..", "artifacts", "web", "dist-server", "index.mjs");
}

function getFrontendPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "frontend", "index.html");
  }
  return path.resolve(__dirname, "..", "..", "artifacts", "web", "dist", "index.html");
}

// ─── Config persistence ───────────────────────────────────────────────────────

function getConfigPath() {
  return path.join(app.getPath("userData"), "knowledgelink-config.json");
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(getConfigPath(), "utf-8"));
  } catch {
    return {};
  }
}

// ─── API server ───────────────────────────────────────────────────────────────

const PORT = 22333;
let apiProcess = null;

function startApiServer() {
  stopApiServer();

  const serverPath = getServerPath();
  if (!fs.existsSync(serverPath)) {
    console.error("[knowledgelink] Server bundle not found:", serverPath);
    console.error("[knowledgelink] Build it first: pnpm --filter @workspace/web run build:server");
    return;
  }

  const savedConfig = readConfig();

  apiProcess = spawn(process.execPath, ["--enable-source-maps", serverPath], {
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "production",
      ...(savedConfig.DATABASE_URL ? { DATABASE_URL: savedConfig.DATABASE_URL } : {}),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  apiProcess.stdout.on("data", (d) => process.stdout.write(`[api] ${d}`));
  apiProcess.stderr.on("data", (d) => process.stderr.write(`[api] ${d}`));
  apiProcess.on("exit", (code) => {
    console.log(`[knowledgelink] Server exited (code=${code})`);
    apiProcess = null;
  });
}

function stopApiServer() {
  if (apiProcess) {
    try { apiProcess.kill("SIGTERM"); } catch { /* ignore */ }
    apiProcess = null;
  }
}

// ─── Wait for server readiness ────────────────────────────────────────────────

function waitForServer(maxMs = 15000) {
  const url = `http://127.0.0.1:${PORT}/api/health`;
  const deadline = Date.now() + maxMs;

  return new Promise((resolve) => {
    function probe() {
      const req = require("http").get(url, (res) => {
        if (res.statusCode < 500) {
          console.log("[knowledgelink] Server is ready");
          resolve();
        } else {
          retry();
        }
        res.resume();
      });
      req.on("error", retry);
      req.setTimeout(1000, () => { req.destroy(); retry(); });
    }

    function retry() {
      if (Date.now() >= deadline) {
        console.warn("[knowledgelink] Server did not respond in time — opening window anyway");
        resolve();
        return;
      }
      setTimeout(probe, 300);
    }

    probe();
  });
}

// ─── Browser window ───────────────────────────────────────────────────────────

let mainWindow = null;

function createWindow() {
  const isMac = process.platform === "darwin";

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "KnowledgeLink",
    backgroundColor: "#F8FAFC",
    icon: path.join(__dirname, "..", "assets", "icon.png"),
    ...(isMac
      ? { titleBarStyle: "hidden", trafficLightPosition: { x: 14, y: 10 } }
      : { frame: false }),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // preload.js lives in the same src/ directory as main.js
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
  });

  mainWindow.setMenuBarVisibility(false);

  // Forward maximize/unmaximize events to the renderer
  const sendMaximize = (val) => mainWindow?.webContents.send("window:maximizeChanged", val);
  mainWindow.on("maximize",   () => sendMaximize(true));
  mainWindow.on("unmaximize", () => sendMaximize(false));

  const frontendPath = getFrontendPath();

  if (!fs.existsSync(frontendPath)) {
    mainWindow.loadURL(
      "data:text/html," +
        encodeURIComponent(`<!DOCTYPE html>
<html>
<body style="background:#F8FAFC;color:#1C1A17;font-family:system-ui;padding:2rem">
  <h2 style="color:#E6850A">KnowledgeLink — Build Required</h2>
  <p>The app hasn't been built yet. Run:</p>
  <pre style="background:#f1f5f9;padding:1rem;border-radius:6px;font-size:13px">pnpm --filter @workspace/web run build
pnpm --filter @workspace/web run build:server</pre>
  <p>Then restart the app.</p>
  <p style="color:#64748B;font-size:0.8em">Expected: ${frontendPath}</p>
</body>
</html>`)
    );
  } else {
    mainWindow.loadFile(frontendPath);
  }

  mainWindow.once("ready-to-show", () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => { mainWindow = null; });

  buildMenu();
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

function buildMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow?.webContents.reload(),
        },
        { type: "separator" },
        { role: "quit", label: "Quit KnowledgeLink" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" }, { role: "redo" },
        { type: "separator" },
        { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" }, { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About KnowledgeLink",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "KnowledgeLink",
              message: "KnowledgeLink",
              detail: `AI-powered learning platform\nVersion ${app.getVersion()}`,
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── IPC handlers — window controls ───────────────────────────────────────────

ipcMain.handle("window:minimize",    () => mainWindow?.minimize());
ipcMain.handle("window:maximize",    () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.handle("window:close",       () => mainWindow?.close());
ipcMain.handle("window:isMaximized", () => mainWindow?.isMaximized() ?? false);

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  startApiServer();
  await waitForServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopApiServer();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", stopApiServer);
