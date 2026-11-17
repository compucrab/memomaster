import { useState } from "preact/hooks";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X, Copy } from "lucide-preact";
import AppMenu from "./AppMenu";

export default function Titlebar({ onNewProject, onOpenProject, onSaveProject, onPreferences, onHelp }) {
  const [maximized, setMaximized] = useState(false);

  async function toggleMaximize() {
    const window = getCurrentWindow();
    await window.toggleMaximize();
    setMaximized(await window.isMaximized());
  }

  function startWindowDrag(event) {
    if (event.button !== 0) return;
    getCurrentWindow().startDragging().catch((error) => console.error("Unable to drag window:", error));
  }

  return (
    <header class="titlebar">
      <div class="titlebar-brand" data-tauri-drag-region onMouseDown={startWindowDrag}>
        <span class="titlebar-mark" data-tauri-drag-region>m</span>
        <span data-tauri-drag-region>MemoMaster</span>
      </div>
      <AppMenu onNewProject={onNewProject} onOpenProject={onOpenProject} onSaveProject={onSaveProject} onPreferences={onPreferences} onHelp={onHelp} />
      <div class="titlebar-drag" data-tauri-drag-region onMouseDown={startWindowDrag} />
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
