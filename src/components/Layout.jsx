import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Titlebar from "./Titlebar";
import NotebookGrid from "./NotebookGrid";
import NotebookView from "./NotebookView";
import SettingsPanel from "./SettingsPanel";
import ContextMenu from "./ContextMenu";
import { initialNotebooks } from "../data/notebooks";
import { exportMemz, importMemz } from "../services/projectArchive";

const savedTheme = () => {
  try { return localStorage.getItem("memomaster-theme") || "light"; }
  catch { return "light"; }
};

export default function Layout() {
  const [notebooks, setNotebooks] = useState(initialNotebooks);
  const [view, setView] = useState("library");
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(null);
  const [theme, setTheme] = useState(savedTheme);
  const fileRef = useRef(null);

  const activeNotebook = notebooks.find((notebook) => notebook.id === activeId);
  const filteredNotebooks = useMemo(
    () => notebooks.filter((notebook) => notebook.title.toLowerCase().includes(query.toLowerCase())),
    [notebooks, query],
  );

  useEffect(() => {
    try { localStorage.setItem("memomaster-theme", theme); } catch {}
  }, [theme]);

  function updateNotebook(id, changes) {
    setNotebooks((items) => items.map((item) => item.id === id ? { ...item, ...changes } : item));
  }

  function createNotebook() {
    const id = crypto.randomUUID();
    setNotebooks((items) => [{
      id, title: "Untitled notebook", description: "A quiet place for your ideas.",
      color: "#c6d56a", chapters: 0, cards: 0, flashcards: [], updated: "Just created",
    }, ...items]);
    setActiveId(id);
    setView("notebook");
  }

  function openNotebook(id) {
    setActiveId(id);
    setView("notebook");
  }

  async function handleImport(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const imported = await importMemz(await file.arrayBuffer());
      setNotebooks((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        return [...imported.map((item) => existingIds.has(item.id) ? { ...item, id: crypto.randomUUID() } : item), ...current];
      });
      setView("library");
      setActiveId(null);
    } catch (error) {
      alert(`Could not import project: ${error.message}`);
    } finally {
      input.value = "";
    }
  }

  useEffect(() => {
    const shortcuts = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName));
      if (typing && event.key.toLowerCase() !== "o") return;
      const key = event.key.toLowerCase();
      if (key === "n") { event.preventDefault(); createNotebook(); }
      if (key === "o") { event.preventDefault(); fileRef.current?.click(); }
      if (key === "e" && event.shiftKey) { event.preventDefault(); exportMemz(notebooks).catch((error) => alert(error.message)); }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [notebooks]);

  return (
    <div class="app-layout" data-theme={theme} onClick={() => menu && setMenu(null)}>
      <input ref={fileRef} class="hidden-file-input" type="file" accept=".memz,application/zip" onChange={handleImport} />
      <div class="app-frame">
        <Titlebar
          onNew={createNotebook}
          onOpen={() => fileRef.current?.click()}
          onExport={() => exportMemz(notebooks).catch((error) => alert(error.message))}
          onPreferences={() => { setView("settings"); setActiveId(null); }}
        />
        <div class="app-body">
          {view !== "notebook" && (
            <Sidebar
              activeView={view}
              onNavigate={(nextView) => { setView(nextView); setActiveId(null); }}
              notebooks={notebooks}
              onOpenNotebook={openNotebook}
            />
          )}
          <main class="app-main">
            {view !== "notebook" && (
              <Topbar
                title={view === "settings" ? "Preferences" : "Your library"}
                query={query}
                onQueryChange={setQuery}
                onCreate={createNotebook}
              />
            )}
            {view === "settings" ? (
              <SettingsPanel theme={theme} onThemeChange={setTheme} />
            ) : view === "notebook" && activeNotebook ? (
              <NotebookView
                notebook={activeNotebook}
                onUpdate={(changes) => updateNotebook(activeNotebook.id, changes)}
                onBack={() => setView("library")}
              />
            ) : (
              <NotebookGrid
                notebooks={filteredNotebooks}
                onOpen={openNotebook}
                onContextMenu={(event, notebook) => {
                  event.preventDefault();
                  setMenu({ x: event.clientX, y: event.clientY, notebook });
                }}
                onCreate={createNotebook}
                onUpdate={updateNotebook}
              />
            )}
          </main>
        </div>
      </div>
      {menu && (
        <ContextMenu
          {...menu}
          onClose={() => setMenu(null)}
          onOpen={() => { openNotebook(menu.notebook.id); setMenu(null); }}
          onRename={(title) => updateNotebook(menu.notebook.id, { title })}
          onColorChange={(color) => updateNotebook(menu.notebook.id, { color })}
        />
      )}
    </div>
  );
}
