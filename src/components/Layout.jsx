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
import { createMemz, importMemz } from "../services/projectArchive";

const savedTheme = () => {
  try { return localStorage.getItem("memomaster-theme") || "light"; }
  catch { return "light"; }
};
const savedProjectPath = () => {
  try { return localStorage.getItem("memomaster-project-path") || null; }
  catch { return null; }
};
const projectFilter = [{ name: "MemoMaster project", extensions: ["memz"] }];
const ensureExtension = (path) => path.toLowerCase().endsWith(".memz") ? path : path + ".memz";

export default function Layout() {
  const [notebooks, setNotebooks] = useState([]);
  const [view, setView] = useState("library");
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(null);
  const [theme, setTheme] = useState(savedTheme);
  const [prompt, setPrompt] = useState(null);
  const [confirmNewProject, setConfirmNewProject] = useState(false);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [projectPath, setProjectPath] = useState(savedProjectPath);
  const notebooksRef = useRef(notebooks);
  notebooksRef.current = notebooks;

  const activeNotebook = notebooks.find((notebook) => notebook.id === activeId);
  const filteredNotebooks = useMemo(
    () => notebooks.filter((notebook) => notebook.title.toLowerCase().includes(query.toLowerCase())),
    [notebooks, query],
  );

  useEffect(() => { try { localStorage.setItem("memomaster-theme", theme); } catch {} }, [theme]);
  useEffect(() => { try { projectPath ? localStorage.setItem("memomaster-project-path", projectPath) : localStorage.removeItem("memomaster-project-path"); } catch {} }, [projectPath]);

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
          setNotebooks([]);
        }
        setReady(true);
      })
      .catch((error) => {
        if (!mounted) return;
        console.error("Unable to load local library:", error);
        setNotebooks([]);
        setNotice("Could not load the saved library. Changes may not persist.");
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
  function startNewProject() {
    setNotebooks([]);
    setActiveId(null);
    setView("library");
    setQuery("");
    setProjectPath(null);
    setConfirmNewProject(false);
    setNotice("New empty project created.");
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
      setNotice(`Opened project: ${path.split(/[\\\\/]/).pop()}`);
    } catch (error) {
      setNotice(`Could not open project: ${error.message || error}`);
    }
  }

  async function saveProjectAs() {
    try {
      const selected = await save({ defaultPath: "MemoMaster project.memz", filters: projectFilter });
      if (!selected) return;
      const path = ensureExtension(selected);
      await writeBytes(path, await createMemz(notebooks));
      setProjectPath(path);
      setNotice("Project backup saved.");
    } catch (error) {
      setNotice(`Could not save project: ${error.message || error}`);
    }
  }

  async function saveProject() {
    if (!projectPath) return saveProjectAs();
    try {
      await writeBytes(projectPath, await createMemz(notebooks));
      setNotice("Project backup saved.");
    } catch (error) {
      setNotice(`Could not save project: ${error.message || error}`);
    }
  }

  useEffect(() => {
    const shortcuts = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "n" && event.shiftKey) { event.preventDefault(); setConfirmNewProject(true); }
      else if (key === "n") { event.preventDefault(); createNotebook(); }
      else if (key === "o" && !event.shiftKey) { event.preventDefault(); openProjectFile(); }
      else if (key === "s" && event.shiftKey) { event.preventDefault(); saveProjectAs(); }
      else if (key === "s") { event.preventDefault(); saveProject(); }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [notebooks, projectPath]);

  return (
    <div class="app-layout" data-theme={theme} onClick={() => menu && setMenu(null)}>
      <div class="app-frame">
        <Titlebar
          onNew={createNotebook}
          onNewProject={() => setConfirmNewProject(true)}
          onOpenProject={openProjectFile}
          onSaveProject={saveProject}
          onSaveProjectAs={saveProjectAs}
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
      {confirmNewProject && (
        <div class="prompt-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setConfirmNewProject(false)}>
          <section class="prompt-panel" role="dialog" aria-modal="true" aria-labelledby="new-project-title">
            <div class="prompt-heading">
              <h2 id="new-project-title">Start a new project?</h2>
              <button type="button" aria-label="Close" onClick={() => setConfirmNewProject(false)}>×</button>
            </div>
            <p>This will replace the current project with an empty library. Make a .memz backup first if you want to keep its contents.</p>
            <div class="prompt-actions">
              <button type="button" class="prompt-cancel" onClick={() => setConfirmNewProject(false)}>Cancel</button>
              <button type="button" class="prompt-confirm" onClick={startNewProject}>Create empty project</button>
            </div>
          </section>
        </div>
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
