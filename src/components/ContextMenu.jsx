import { useEffect, useRef } from "preact/hooks";
import { ExternalLink, Pencil, Palette } from "lucide-preact";

function validColor(value) { return /^#[0-9a-fA-F]{6}$/.test(value); }

export default function ContextMenu({ x, y, notebook, onClose, onOpen, onRename, onColorChange }) {
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
    <div ref={menuRef} class="context-menu" style={{ left: Math.min(x, window.innerWidth - 220), top: Math.min(y, window.innerHeight - 170) }} onContextMenu={(event) => event.preventDefault()}>
      <button onClick={onOpen}><ExternalLink size={14} /> Open notebook</button>
      <button onClick={onRename}><Pencil size={14} /> Rename</button>
      <div class="context-divider" />
      <label class="context-color-picker">
        <span><Palette size={13} /> COVER STRIP</span>
        <input aria-label="Cover strip hex colour" type="text" value={notebook.color} maxLength={7} onInput={(event) => validColor(event.currentTarget.value) && onColorChange(event.currentTarget.value)} />
      </label>
    </div>
  );
}
