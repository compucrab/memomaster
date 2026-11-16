import { useEffect, useRef, useState } from "preact/hooks";
import { ChevronDown, FilePlus2, FolderOpen, Download, Settings2, Info, Scissors, Copy, Clipboard, ClipboardCheck } from "lucide-preact";

const groups = [
  { name: "File", items: [
    { label: "New notebook", shortcut: "Ctrl N", Icon: FilePlus2, action: "new" },
    { label: "Open project", shortcut: "Ctrl O", Icon: FolderOpen, action: "open" },
    { label: "Export project", shortcut: "Ctrl Shift E", Icon: Download, action: "export" },
  ] },
  { name: "Edit", items: [
    { label: "Cut", shortcut: "Ctrl X", Icon: Scissors, action: "cut" },
    { label: "Copy", shortcut: "Ctrl C", Icon: Copy, action: "copy" },
    { label: "Paste", shortcut: "Ctrl V", Icon: Clipboard, action: "paste" },
    { label: "Select all", shortcut: "Ctrl A", Icon: ClipboardCheck, action: "selectAll" },
  ] },
  { name: "Help", items: [
    { label: "Preferences", Icon: Settings2, action: "preferences" },
    { label: "About MemoMaster", Icon: Info, action: "preferences" },
  ] },
];

export default function AppMenu({ onNew, onOpen, onExport, onPreferences }) {
  const [active, setActive] = useState(null);
  const root = useRef(null);
  useEffect(() => {
    const close = (event) => {
      if (!root.current?.contains(event.target)) setActive(null);
      if (event.key === "Escape") setActive(null);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, []);
  function run(action) {
    setActive(null);
    const actions = {
      new: onNew, open: onOpen, export: onExport, preferences: onPreferences,
      cut: () => document.execCommand("cut"),
      copy: () => document.execCommand("copy"),
      paste: () => document.execCommand("paste"),
      selectAll: () => document.execCommand("selectAll"),
    };
    actions[action]?.();
  }
  return (
    <nav class="app-menu" ref={root} aria-label="Application menu">
      {groups.map((group) => (
        <div class="app-menu-group" key={group.name}>
          <button class={active === group.name ? "app-menu-trigger is-open" : "app-menu-trigger"} onClick={() => setActive(active === group.name ? null : group.name)}>
            {group.name} <ChevronDown size={11} />
          </button>
          {active === group.name && (
            <div class="app-menu-popover">
              {group.items.map(({ label, shortcut, Icon, action }) => (
                <button key={label} onClick={() => run(action)}>
                  <Icon size={14} /> {label} {shortcut && <kbd>{shortcut}</kbd>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
