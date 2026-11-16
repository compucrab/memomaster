import { useState } from "preact/hooks";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Copy } from "lucide-preact";
import AppMenu from "./AppMenu";

export default function Titlebar({ onNew, onOpen, onExport, onPreferences }) {
  const [maximized, setMaximized] = useState(false);

  async function toggleMaximize() {
    const window = getCurrentWindow();
    await window.toggleMaximize();
    setMaximized(await window.isMaximized());
  }

  function startWindowDrag(event) {
    // Only the unoccupied titlebar surface starts a native window drag.
    if (event.button === 0) getCurrentWindow().startDragging();
  }

  return (
    <header class="titlebar">
      <div class="titlebar-brand" onMouseDown={startWindowDrag}>
        <span class="titlebar-mark">m</span>
        <span>MemoMaster</span>
      </div>
      <AppMenu
        onNew={onNew}
        onOpen={onOpen}
        onExport={onExport}
        onPreferences={onPreferences}
      />
      <div class="titlebar-drag" onMouseDown={startWindowDrag} />
      <div class="window-controls">
        <button aria-label="Minimize" onClick={() => getCurrentWindow().minimize()}>
          <Minus size={14} />
        </button>
        <button aria-label={maximized ? "Restore" : "Maximize"} onClick={toggleMaximize}>
          {maximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button class="window-close" aria-label="Close" onClick={() => getCurrentWindow().close()}>
          <X size={15} />
        </button>
      </div>
    </header>
  );
}
