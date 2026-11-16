import { useEffect, useRef, useState } from "preact/hooks";
import {
  ChevronDown, FilePlus2, FolderOpen, Save, SaveAll, FileOutput,
  Download, Settings2,
} from "lucide-preact";

const groups = [
  { name: "File", items: [
    { label: "New notebook", shortcut: "Ctrl N", Icon: FilePlus2, action: "new" },
    { label: "Open notebook…", shortcut: "Ctrl Shift O", Icon: FolderOpen, action: "openNotebook" },
    { label: "Save notebook", shortcut: "Ctrl S", Icon: Save, action: "saveNotebook", needsNotebook: true },
    { label: "Save notebook as…", Icon: FileOutput, action: "saveNotebookAs", needsNotebook: true },
    { separator: true },
    { label: "Open project…", shortcut: "Ctrl O", Icon: FolderOpen, action: "openProject" },
    { label: "Save project", Icon: SaveAll, action: "saveProject" },
    { label: "Save project as…", shortcut: "Ctrl Shift S", Icon: Download, action: "saveProjectAs" },
  ] },
  { name: "Edit", items: [
    { label: "Preferences", Icon: Settings2, action: "preferences" },
  ] },
];

export default function AppMenu({
  onNew, onOpenNotebook, onSaveNotebook, onSaveNotebookAs,
  onOpenProject, onSaveProject, onSaveProjectAs, onPreferences,
  hasNotebook = false,
}) {
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
      new: onNew,
      openNotebook: onOpenNotebook,
      saveNotebook: onSaveNotebook,
      saveNotebookAs: onSaveNotebookAs,
      openProject: onOpenProject,
      saveProject: onSaveProject,
      saveProjectAs: onSaveProjectAs,
      preferences: onPreferences,
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
                <button key={item.label} disabled={item.needsNotebook && !hasNotebook} onClick={() => run(item.action)}>
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
