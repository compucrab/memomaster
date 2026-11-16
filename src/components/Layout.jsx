import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open, save } from "@tauri-apps/plugin-dialog";
import Topbar from "./Topbar";
import Titlebar from "./Titlebar";
import NotebookGrid from "./NotebookGrid";
import NotebookView from "./NotebookView";
import SettingsPanel from "./SettingsPanel";
import ContextMenu from "./ContextMenu";
import TextPrompt from "./TextPrompt";
import { initialNotebooks } from "../data/notebooks";
import { createMemn, createMemz, importMemn, importMemz } from "../services/projectArchive";

const savedTheme = () => {
  try { return localStorage.getItem("memomaster-theme") || "light"; }
  catch { return "light"; }
};
const notebookFilter = [{ name: "MemoMaster notebook", extensions: ["memn"] }];
const projectFilter = [{ name: "MemoMaster project", extensions: ["memz"] }];
const safeFilename = (name) => name.replace(/[<>:"/\\|?*]/g, "-").trim() || "Untitled";
const ensureExtension = (path, extension) => path.toLowerCase().endsWith(extension) ? path : path + extension;

export default function Layout() {
  const [notebooks, setNotebooks] = useState(initialNotebooks);
  const [view, setView] = useState("library");
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(null);
  const [theme, setTheme] = useState(savedTheme);
  const [prompt, setPrompt] = useState(null);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [projectPath, setProjectPath] = useState(null);
  const [notebookPaths, setNotebookPaths] = useState({});
  const notebooksRef = useRef(notebooks);
  notebooksRef.current = notebooks;

  const activeNotebook = notebooks.find((notebook) => notebook.id === activeId);
  const filteredNotebooks = useMemo(
    () => notebooks.filter((notebook) => notebook.title.toLowerCase().includes(query.toLowerCase())),
    [notebooks, query],
  );

  useEffect(() => { try { localStorage.setItem("memomaster-theme", theme); } catch {} }, [theme]);

  useEffect(() => {
    let mounted = true;
    invoke("load_library")
      .then((saved) => {
        if (!mounted) return;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!Array.isArray(parsed)) throw new Error("Saved library data is invalid");
          setNotebooks(parsed);
        } else {
          setNotebooks(initialNotebooks);
        }
        setReady(true);
      })
      .catch((error) => {
        if (!mounted) return;
        console.error("Unable to load local library:", error);
        setNotebooks(initialNotebooks);
        setNotice("Could not load the saved library. The sample library was loaded instead.");
        setReady(true);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const timeout = window.setTimeout(() => {
      invoke("save_library", { data: JSON.stringify(notebooks) })
        .catch((error) => setNotice(`Could not save local changes: ${error}`));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [notebooks, ready]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    let unlisten;
    getCurrentWindow().onCloseRequested(async (event) => {
      event.preventDefault();
      try {
        if (!ready) {
          setNotice("The library is still loading. Try closing again in a moment.");
          return;
        }
        await invoke("save_library", { data: JSON.stringify(notebooksRef.current) });
        await getCurrentWindow().destroy();
      } catch (error) {
        setNotice(`Could not save before closing: ${error.message || error}`);
      }
    }).then((dispose) => { unlisten = dispose; })
      .catch((error) => console.error("Could not register close handler:", error));
    return () => unlisten?.();
  }, [ready]);

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
  async function readBytes(path) {
    return new Uint8Array(await invoke("read_project_file", { path }));
  }
  async function writeBytes(path, bytes) {
    await invoke("write_project_file", { path, bytes: Array.from(bytes) });
  }

  async function openProjectFile() {
    try {
      const path = await open({ multiple: false, directory: false, filters: projectFilter });
      if (!path) return;
      const imported = await importMemz(await readBytes(path));
      setNotebooks(imported);
      setActiveId(null);
      setView("library");
      setProjectPath(path);
      setNotebookPaths({});
      setNotice(`Opened project: ${path.split(/[\\\\/]/).pop()}`);
    } catch (error) {
      setNotice(`Could not open project: ${error.message || error}`);
    }
  }

  async function openNotebookFile() {
    try {
      const path = await open({ multiple: false, directory: false, filters: notebookFilter });
      if (!path) return;
      const imported = importMemn(await readBytes(path));
      const id = notebooks.some((item) => item.id === imported.id) ? crypto.randomUUID() : imported.id;
      const notebook = { ...imported, id };
      setNotebooks((items) => [notebook, ...items]);
      setActiveId(id);
      setView("notebook");
      setNotebookPaths((items) => ({ ...items, [id]: path }));
      setNotice(`Opened notebook: ${notebook.title}`);
    } catch (error) {
      setNotice(`Could not open notebook: ${error.message || error}`);
    }
  }

  async function saveNotebookAs() {
    if (!activeNotebook) return;
    try {
      const selected = await save({
        defaultPath: `${safeFilename(activeNotebook.title)}.memn`,
        filters: notebookFilter,
      });
      if (!selected) return;
      const path = ensureExtension(selected, ".memn");
      await writeBytes(path, createMemn(activeNotebook));
      setNotebookPaths((items) => ({ ...items, [activeNotebook.id]: path }));
      setNotice("Notebook saved.");
    } catch (error) {
      setNotice(`Could not save notebook: ${error.message || error}`);
    }
  }

  async function saveNotebook() {
    if (!activeNotebook) return;
    const path = notebookPaths[activeNotebook.id];
    if (!path) return saveNotebookAs();
    try {
      await writeBytes(path, createMemn(activeNotebook));
      setNotice("Notebook saved.");
    } catch (error) {
      setNotice(`Could not save notebook: ${error.message || error}`);
    }
  }

  async function saveProjectAs() {
    try {
      const selected = await save({ defaultPath: "MemoMaster project.memz", filters: projectFilter });
      if (!selected) return;
      const path = ensureExtension(selected, ".memz");
      await writeBytes(path, await createMemz(notebooks));
      setProjectPath(path);
      setNotice("Project saved.");
    } catch (error) {
      setNotice(`Could not save project: ${error.message || error}`);
    }
  }

  async function saveProject() {
    if (!projectPath) return saveProjectAs();
    try {
      await writeBytes(projectPath, await createMemz(notebooks));
      setNotice("Project saved.");
    } catch (error) {
      setNotice(`Could not save project: ${error.message || error}`);
    }
  }

  useEffect(() => {
    const shortcuts = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "n" && !event.shiftKey) { event.preventDefault(); createNotebook(); }
      else if (key === "o" && event.shiftKey) { event.preventDefault(); openNotebookFile(); }
      else if (key === "o") { event.preventDefault(); openProjectFile(); }
      else if (key === "s" && event.shiftKey) { event.preventDefault(); saveProjectAs(); }
      else if (key === "s") { event.preventDefault(); activeNotebook ? saveNotebook() : saveProject(); }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [notebooks, activeNotebook, projectPath, notebookPaths]);

  return (
    <div class="app-layout" data-theme={theme} onClick={() => menu && setMenu(null)}>
      <div class="app-frame">
        <Titlebar
          onNew={createNotebook}
          onOpenNotebook={openNotebookFile}
          onSaveNotebook={saveNotebook}
          onSaveNotebookAs={saveNotebookAs}
          onOpenProject={openProjectFile}
          onSaveProject={saveProject}
          onSaveProjectAs={saveProjectAs}
          hasNotebook={Boolean(activeNotebook)}
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
