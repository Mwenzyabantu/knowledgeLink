export interface KnowledgeLinkDesktopBridge {
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<boolean>;
  isMaximized: () => Promise<boolean>;
  close: () => Promise<void>;
  onMaximizedChange: (
    callback: (isMaximized: boolean) => void,
  ) => () => void;
}

declare global {
  interface Window {
    knowledgeLinkDesktop?: KnowledgeLinkDesktopBridge;
  }
}

export {};
