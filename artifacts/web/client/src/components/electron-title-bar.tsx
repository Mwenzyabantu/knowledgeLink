import { useState, useEffect } from "react";
import { Minus, Square, X, Maximize2 } from "lucide-react";

declare global {
  interface Window {
    windowBridge?: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      onMaximizeChanged: (cb: (val: boolean) => void) => () => void;
    };
    electronBridge?: {
      isElectron: boolean;
      platform: string;
    };
  }
}

const isElectron =
  typeof window !== "undefined" && !!window.electronBridge?.isElectron;

const isMac =
  typeof window !== "undefined" && window.electronBridge?.platform === "darwin";

export function ElectronTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (isMac || !window.windowBridge) return;

    window.windowBridge.isMaximized().then(setIsMaximized);
    const unsub = window.windowBridge.onMaximizeChanged(setIsMaximized);
    return unsub;
  }, []);

  if (!isElectron) return null;

  // On macOS, native traffic lights handle window controls — no custom bar needed
  if (isMac) return null;

  return (
    <div
      className="flex items-center justify-between h-8 w-full shrink-0 select-none bg-sidebar border-b border-sidebar-border"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 px-3">
        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-primary font-bold text-[9px] leading-none">K</span>
        </div>
        <span className="text-xs font-semibold text-primary tracking-wide">KnowledgeLink</span>
      </div>

      <div
        className="flex h-full items-stretch"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <button
          onClick={() => window.windowBridge?.minimize()}
          title="Minimize"
          className="flex items-center justify-center w-11 h-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-100 focus:outline-none"
        >
          <Minus className="h-[11px] w-[11px]" />
        </button>

        <button
          onClick={() => window.windowBridge?.maximize()}
          title={isMaximized ? "Restore" : "Maximize"}
          className="flex items-center justify-center w-11 h-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-100 focus:outline-none"
        >
          {isMaximized ? <Square size={11} /> : <Maximize2 size={12} />}
        </button>

        <button
          onClick={() => window.windowBridge?.close()}
          title="Close"
          className="flex items-center justify-center w-11 h-full text-sidebar-foreground/50 hover:text-white hover:bg-red-500 transition-colors duration-100 focus:outline-none"
        >
          <X className="h-[12px] w-[12px]" />
        </button>
      </div>
    </div>
  );
}
