const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("knowledgeLinkDesktop", {
  minimize: () => ipcRenderer.invoke("knowledgelink-window:minimize"),
  toggleMaximize: () =>
    ipcRenderer.invoke("knowledgelink-window:toggle-maximize"),
  isMaximized: () =>
    ipcRenderer.invoke("knowledgelink-window:is-maximized"),
  close: () => ipcRenderer.invoke("knowledgelink-window:close"),
  onMaximizedChange: (callback) => {
    const listener = (_event, isMaximized) => callback(isMaximized);
    ipcRenderer.on("knowledgelink-window:maximized", listener);
    return () =>
      ipcRenderer.removeListener("knowledgelink-window:maximized", listener);
  },
});
