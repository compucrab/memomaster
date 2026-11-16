import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import Topbar from "./Topbar";
import Titlebar from "./Titlebar";
import NotebookGrid from "./NotebookGrid";
import NotebookView from "./NotebookView";
import SettingsPanel from "./SettingsPanel";
import ContextMenu from "./ContextMenu";
import TextPrompt from "./TextPrompt";
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
  const [prompt, setPrompt] = useState(null);
  const [notice, setNotice] = useState("");
  const fileRef = useRef(null);
  const activeNotebook = notebooks.find((notebook) => notebook.id === activeId);
  const filteredNotebooks = useMemo(
    () => notebooks.filter((notebook) => notebook.title.toLowerCase().includes(query.toLowerCase())),
    [notebooks, query],
  );

  useEffect(() => { try { localStorage.setItem("memomaster-theme", theme); } catch {} }, [theme]);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function requestText({ title, value = "", placeholder, onSubmit }) {
    setPrompt({ title, value, placeholder, onSubmit });
  }
  function updateNotebook(id, changes) {
    setNotebooks((items) => items.map((item) => item.id === id ? { ...item, ...changes } : item));
  }
  function createNotebook() {
    const id = crypto.randomUUID();
    setNotebooks((items) => [{
      id, title: "Untitled notebook",
      color: "#6f9dcc", chapters: [], cards: 0, flashcards: [], updated: "Just created",
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
      setNotice("Project imported.");
    } catch (error) {
      setNotice(`Could not import project: ${error.message}`);
    } finally { input.value = ""; }
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
      if (key === "e" && event.shiftKey) {
        event.preventDefault();
        exportMemz(notebooks).catch((error) => setNotice(error.message));
      }
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
          onExport={() => exportMemz(notebooks).catch((error) => setNotice(error.message))}
          onPreferences={() => { setView("settings"); setActiveId(null); }}
        />
        {view === "library" && (
          <Topbar title="Your library" query={query} onQueryChange={setQuery} onCreate={createNotebook} />
        )}
        <main class="app-main">
          {view === "settings" ? (
            <SettingsPanel theme={theme} onThemeChange={setTheme} onBack={() => setView("library")} />
          ) : view === "notebook" && activeNotebook ? (
            <NotebookView
              notebook={activeNotebook}
              onUpdate={(changes) => updateNotebook(activeNotebook.id, changes)}
              onBack={() => setView("library")}
              onRequestText={requestText}
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
            />
          )}
        </main>
      </div>
      {menu && (
        <ContextMenu
          {...menu}
          onClose={() => setMenu(null)}
          onOpen={() => { openNotebook(menu.notebook.id); setMenu(null); }}
          onRename={() => {
            const notebook = menu.notebook;
            setMenu(null);
            requestText({
              title: "Rename notebook",
              value: notebook.title,
              placeholder: "Notebook name",
              onSubmit: (title) => title.trim() && updateNotebook(notebook.id, { title: title.trim() }),
            });
          }}
          onColorChange={(color) => updateNotebook(menu.notebook.id, { color })}
        />
      )}
      {prompt && (
        <TextPrompt
          {...prompt}
          onCancel={() => setPrompt(null)}
          onSubmit={(value) => {
            const submit = prompt.onSubmit;
            setPrompt(null);
            submit(value);
          }}
        />
      )}
      {notice && <div class="app-notice" role="status">{notice}</div>}
    </div>
  );
}
