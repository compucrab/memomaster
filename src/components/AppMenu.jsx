import { useEffect, useRef, useState } from "preact/hooks";
import {
  ChevronDown, FolderPlus, FolderOpen, SaveAll, Settings2, BookOpen, Keyboard, Info,
} from "lucide-preact";

const groups = [
  { name: "File", items: [
    { label: "New project", shortcut: "Ctrl Shift N", Icon: FolderPlus, action: "newProject" },
    { separator: true },
    { label: "Open project…", shortcut: "Ctrl O", Icon: FolderOpen, action: "openProject" },
    { label: "Save project", shortcut: "Ctrl S", Icon: SaveAll, action: "saveProject" },
    { separator: true },
    { label: "Preferences", Icon: Settings2, action: "preferences" },
  ] },
  { name: "Help", items: [
    { label: "User guide", Icon: BookOpen, action: "guide" },
    { label: "Keyboard shortcuts", Icon: Keyboard, action: "shortcuts" },
    { label: "About MemoMaster", Icon: Info, action: "about" },
  ] },
];

export default function AppMenu({ onNewProject, onOpenProject, onSaveProject, onPreferences, onHelp }) {
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
      newProject: onNewProject,
      openProject: onOpenProject,
      saveProject: onSaveProject,
      preferences: onPreferences,
      guide: () => onHelp?.("guide"),
      shortcuts: () => onHelp?.("shortcuts"),
      about: () => onHelp?.("about"),
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
              {group.items.map((item, index) => item.separator ? (
                <div class="app-menu-separator" key={index} />
              ) : (
                <button key={item.label} onClick={() => run(item.action)}>
                  <item.Icon size={14} /> {item.label} {item.shortcut && <kbd>{item.shortcut}</kbd>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
