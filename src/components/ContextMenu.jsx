import { useEffect, useRef } from "preact/hooks";
import { ExternalLink, Pencil, Palette } from "lucide-preact";

const colors = ["#c6d56a", "#a9b27a", "#c58f76", "#8c9eaf", "#b39abf", "#d3b878"];

export default function ContextMenu({
  x, y, notebook, onClose, onOpen, onRename, onColorChange,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const closeOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) onClose();
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("pointerdown", closeOutside);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div
      ref={menuRef}
      class="context-menu"
      style={{
        left: Math.min(x, window.innerWidth - 220),
        top: Math.min(y, window.innerHeight - 190),
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <button onClick={onOpen}>
        <ExternalLink size={14} /> Open notebook
      </button>
      <button
        onClick={() => {
          const title = window.prompt("Notebook name", notebook.title);
          if (title?.trim()) onRename(title.trim());
          onClose();
        }}
      >
        <Pencil size={14} /> Rename
      </button>

      <div class="context-divider" />
      <p><Palette size={13} /> COVER STRIP</p>
      <div class="context-colors">
        {colors.map((color) => (
          <button
            key={color}
            data-color={color}
            aria-label={`Set strip colour to ${color}`}
            onClick={() => {
              onColorChange(color);
              onClose();
            }}
          />
        ))}
      </div>
    </div>
  );
}
