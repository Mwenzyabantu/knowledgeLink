"use strict";

const { contextBridge, ipcRenderer } = require("electron");

// Window controls — exposed as windowBridge (same pattern as gyro)
contextBridge.exposeInMainWorld("windowBridge", {
  minimize:    () => ipcRenderer.invoke("window:minimize"),
  maximize:    () => ipcRenderer.invoke("window:maximize"),
  close:       () => ipcRenderer.invoke("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  onMaximizeChanged: (cb) => {
    const handler = (_, val) => cb(val);
    ipcRenderer.on("window:maximizeChanged", handler);
    return () => ipcRenderer.off("window:maximizeChanged", handler);
  },
});

// General app bridge
contextBridge.exposeInMainWorld("electronBridge", {
  isElectron: true,
  platform: process.platform,
});
