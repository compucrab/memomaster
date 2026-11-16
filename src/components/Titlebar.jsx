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

  return (
    <header class="titlebar">
      <div class="titlebar-brand" data-tauri-drag-region>
        <span class="titlebar-mark">m</span>
        <span data-tauri-drag-region>MemoMaster</span>
      </div>
      <AppMenu
        onNew={onNew}
        onOpen={onOpen}
        onExport={onExport}
        onPreferences={onPreferences}
      />
      <div class="titlebar-drag" data-tauri-drag-region />
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
