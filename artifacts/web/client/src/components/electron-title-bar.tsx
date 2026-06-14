import { useState, useEffect } from "react";
import { Minus, X } from "lucide-react";

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      isElectron: boolean;
      windowControls?: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        onMaximizedChange: (cb: (isMaximized: boolean) => void) => void;
      };
    };
  }
}

function MaximizeIcon({ isMaximized }: { isMaximized: boolean }) {
  if (isMaximized) {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.1">
        <rect x="3" y="1" width="6" height="6" rx="0.5" />
        <path d="M1 3v5.5A0.5 0.5 0 0 0 1.5 9H7" />
      </svg>
    );
  }
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.1">
      <rect x="1" y="1" width="8" height="8" rx="0.5" />
    </svg>
  );
}

export function ElectronTitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    window.electronAPI?.windowControls?.onMaximizedChange((val) => {
      setIsMaximized(val);
    });
  }, []);

  if (!window.electronAPI?.isElectron) return null;

  const controls = window.electronAPI.windowControls;

  return (
    <div
      className="flex items-center justify-between h-8 flex-shrink-0 select-none bg-sidebar border-b border-sidebar-border"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties & { WebkitAppRegion: string }}
    >
      <div className="flex items-center gap-2 px-3">
        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-primary font-bold text-[9px] leading-none">K</span>
        </div>
        <span className="text-xs font-semibold text-primary tracking-wide">KnowledgeLink</span>
      </div>

      <div
        className="flex h-full"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties & { WebkitAppRegion: string }}
      >
        <button
          onClick={() => controls?.minimize()}
          title="Minimize"
          className="flex items-center justify-center w-11 h-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-100"
        >
          <Minus className="h-[11px] w-[11px]" />
        </button>

        <button
          onClick={() => controls?.maximize()}
          title={isMaximized ? "Restore" : "Maximize"}
          className="flex items-center justify-center w-11 h-full text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors duration-100"
        >
          <MaximizeIcon isMaximized={isMaximized} />
        </button>

        <button
          onClick={() => controls?.close()}
          title="Close"
          className="flex items-center justify-center w-11 h-full text-sidebar-foreground/50 hover:text-white hover:bg-red-500 transition-colors duration-100"
        >
          <X className="h-[12px] w-[12px]" />
        </button>
      </div>
    </div>
  );
}
