import { useEffect, useRef } from "preact/hooks";
import { ExternalLink, Pencil, Palette, Trash2 } from "lucide-preact";

export default function ContextMenu({ x, y, notebook, onClose, onOpen, onRename, onColorChange, onDelete }) {
  const menuRef = useRef(null);
  useEffect(() => {
    const closeOutside = (event) => { if (!menuRef.current?.contains(event.target)) onClose(); };
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  return (
    <div ref={menuRef} class="context-menu" style={{ left: Math.min(x, window.innerWidth - 240), top: Math.min(y, window.innerHeight - 170) }} onClick={(event) => event.stopPropagation()} onContextMenu={(event) => event.preventDefault()}>
      <button onClick={onOpen}><ExternalLink size={14} /> Open notebook</button>
      <button onClick={onRename}><Pencil size={14} /> Rename</button>
      <button class="context-danger" onClick={onDelete}><Trash2 size={14} /> Delete notebook</button>
      <div class="context-divider" />
      <label class="context-color-picker">
        <span><Palette size={13} /> COVER STRIP</span>
        <input
          aria-label="Change cover strip colour"
          type="color"
          value={notebook.color || "#477dbb"}
          onInput={(event) => onColorChange(event.currentTarget.value)}
        />
      </label>
    </div>
  );
}
