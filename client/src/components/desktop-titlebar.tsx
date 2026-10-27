import { useEffect, useState } from "react";
import { Copy, Minus, X, Square } from "lucide-react";

export function DesktopTitleBar() {
  const desktop = window.knowledgeLinkDesktop;
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!desktop) return;

    let mounted = true;
    void desktop.isMaximized().then((value) => {
      if (mounted) setIsMaximized(value);
    });

    const unsubscribe = desktop.onMaximizedChange(setIsMaximized);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [desktop]);

  if (!desktop) return null;

  return (
    <header className="desktop-titlebar">
      <div className="desktop-titlebar__brand">
        <img src="/favicon.png" alt="" draggable={false} />
        <span>KnowledgeLink</span>
      </div>

      <div
        className="desktop-titlebar__drag-region"
        aria-hidden="true"
        onDoubleClick={() => void desktop.toggleMaximize()}
      />

      <div className="desktop-titlebar__controls">
        <button
          type="button"
          aria-label="Minimize window"
          title="Minimize"
          onClick={() => void desktop.minimize()}
        >
          <Minus aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={isMaximized ? "Restore window" : "Maximize window"}
          title={isMaximized ? "Restore" : "Maximize"}
          onClick={() =>
            void desktop.toggleMaximize().then(setIsMaximized)
          }
        >
          {isMaximized ? (
            <Copy aria-hidden="true" />
          ) : (
            <Square aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className="desktop-titlebar__close"
          aria-label="Close window"
          title="Close"
          onClick={() => void desktop.close()}
        >
          <X aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
