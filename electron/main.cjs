const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

let appUrl;
let mainWindow;

if (process.platform === "win32") {
  app.setAppUserModelId("com.knowledgelink.desktop");
}

function windowForSender(event) {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  return senderWindow === mainWindow ? senderWindow : null;
}

function sendMaximizedState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(
      "knowledgelink-window:maximized",
      mainWindow.isMaximized(),
    );
  }
}

ipcMain.handle("knowledgelink-window:minimize", (event) => {
  windowForSender(event)?.minimize();
});

ipcMain.handle("knowledgelink-window:toggle-maximize", (event) => {
  const target = windowForSender(event);
  if (!target) return false;

  if (target.isMaximized()) {
    target.unmaximize();
  } else {
    target.maximize();
  }

  return target.isMaximized();
});

ipcMain.handle("knowledgelink-window:is-maximized", (event) => {
  return windowForSender(event)?.isMaximized() ?? false;
});

ipcMain.handle("knowledgelink-window:close", (event) => {
  windowForSender(event)?.close();
});

function loadRuntimeConfig() {
  const configPath = path.join(__dirname, "runtime-config.json");
  let config;

  try {
    config = require(configPath);
  } catch {
    throw new Error(
      "Desktop configuration is missing. Run the desktop setup command before starting KnowledgeLink.",
    );
  }

  for (const key of [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ]) {
    if (!process.env[key] && typeof config[key] === "string") {
      process.env[key] = config[key];
    }
    if (!process.env[key]) {
      throw new Error(`Desktop configuration is missing ${key}.`);
    }
  }
}

function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") {
        probe.close();
        reject(new Error("Could not reserve a local app port."));
        return;
      }

      const { port } = address;
      probe.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

function isServerReady(port) {
  return new Promise((resolve) => {
    const request = http.get(
      { hostname: "127.0.0.1", port, path: "/", timeout: 1000 },
      (response) => {
        response.resume();
        resolve((response.statusCode ?? 500) < 500);
      },
    );
    request.once("error", () => resolve(false));
    request.once("timeout", () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(port) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await isServerReady(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("KnowledgeLink’s local server did not start in time.");
}

async function startLocalServer() {
  const port = await findAvailablePort();
  const serverEntry = app.isPackaged
    ? path.join(app.getAppPath(), "dist", "index.js")
    : path.join(__dirname, "..", "dist", "index.js");

  process.env.NODE_ENV = "production";
  process.env.HOST = "127.0.0.1";
  process.env.PORT = String(port);

  await import(pathToFileURL(serverEntry).href);
  await waitForServer(port);
  return `http://127.0.0.1:${port}`;
}

function openExternalUrl(candidate) {
  try {
    const url = new URL(candidate);
    if (url.protocol === "http:" || url.protocol === "https:") {
      void shell.openExternal(url.toString());
    }
  } catch {
    // Ignore invalid or unsupported external URLs.
  }
}

async function createMainWindow() {
  if (!appUrl) appUrl = await startLocalServer();

  const iconPath = path.join(
    __dirname,
    "assets",
    process.platform === "win32" ? "knowledgelink.ico" : "knowledgelink.png",
  );

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 900,
    minHeight: 640,
    show: false,
    frame: false,
    title: "KnowledgeLink",
    backgroundColor: "#f7f5ef",
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.on("maximize", sendMaximizedState);
  mainWindow.on("unmaximize", sendMaximizedState);

  const appOrigin = new URL(appUrl).origin;
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    try {
      if (new URL(navigationUrl).origin !== appOrigin) {
        event.preventDefault();
        openExternalUrl(navigationUrl);
      }
    } catch {
      event.preventDefault();
    }
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });

  await mainWindow.loadURL(appUrl);
}

app.whenReady().then(async () => {
  try {
    loadRuntimeConfig();
    await createMainWindow();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "KnowledgeLink could not start.";
    dialog.showErrorBox("KnowledgeLink could not start", message);
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createMainWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
