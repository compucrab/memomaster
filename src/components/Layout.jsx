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
import StudyStatus from "./StudyStatus";
import HelpPanel from "./HelpPanel";
import { createMemz, importMemz } from "../services/projectArchive";
import { loadFsrsSettings, saveFsrsSettings } from "../services/fsrsSettings";
import { normalizeCardDocument } from "../services/cardDocument";

const savedTheme = () => {
  try { return localStorage.getItem("memomaster-theme") || "light"; }
  catch { return "light"; }
};
const savedProjectPath = () => {
  try { return localStorage.getItem("memomaster-project-path") || null; }
  catch { return null; }
};
const projectFilter = [{ name: "MemoMaster project", extensions: ["memz"] }];
const normalizeName = (value) => String(value || "").trim().toLocaleLowerCase();
const normalizeLibrary = (items) => items.map((notebook) => ({
  ...notebook,
  ...(Array.isArray(notebook.flashcards) ? { flashcards: notebook.flashcards.map((card) => ({
    ...card,
    front: normalizeCardDocument(card.front),
    back: normalizeCardDocument(card.back),
  })) } : {}),
}));

export default function Layout() {
  const [notebooks, setNotebooks] = useState([]);
  const [view, setView] = useState("library");
  const [helpPage, setHelpPage] = useState("guide");
  const [helpReturnView, setHelpReturnView] = useState("library");
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(null);
  const [theme, setTheme] = useState(savedTheme);
  const [fsrsSettings, setFsrsSettings] = useState(loadFsrsSettings);
  const [prompt, setPrompt] = useState(null);
  const [confirmNewProject, setConfirmNewProject] = useState(false);
  const [deleteNotebook, setDeleteNotebook] = useState(null);
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [projectPath, setProjectPath] = useState(savedProjectPath);
  const [backupItems, setBackupItems] = useState([]);
  const [backupDialog, setBackupDialog] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState(null);
  const [recoveryRequired, setRecoveryRequired] = useState(false);
  const notebooksRef = useRef(notebooks);
  notebooksRef.current = notebooks;
  const saveQueueRef = useRef(Promise.resolve());

  function persistLibrary(snapshot) {
    const data = JSON.stringify(snapshot);
    const save = saveQueueRef.current.catch(() => {}).then(() => invoke("save_library", { data }));
    saveQueueRef.current = save;
    return save;
  }

  const activeNotebook = notebooks.find((notebook) => notebook.id === activeId);
  const filteredNotebooks = useMemo(
    () => notebooks.filter((notebook) => notebook.title.toLowerCase().includes(query.toLowerCase())),
    [notebooks, query],
  );

  useEffect(() => { try { localStorage.setItem("memomaster-theme", theme); } catch {} }, [theme]);
  useEffect(() => { saveFsrsSettings(fsrsSettings); }, [fsrsSettings]);
  useEffect(() => { try { projectPath ? localStorage.setItem("memomaster-project-path", projectPath) : localStorage.removeItem("memomaster-project-path"); } catch {} }, [projectPath]);

  useEffect(() => {
    let mounted = true;
    invoke("load_library")
      .then((saved) => {
        if (!mounted) return;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!Array.isArray(parsed)) throw new Error("Saved library data is invalid");
          setNotebooks(normalizeLibrary(parsed));
        } else {
          setNotebooks([]);
        }
        setReady(true);
      })
      .catch((error) => {
        if (!mounted) return;
        console.error("Unable to load local library:", error);
        setNotebooks([]);
        setRecoveryRequired(true);
        setNotice("Could not load the saved library: " + (error.message || error));
        invoke("list_automatic_backups").then((items) => { setBackupItems(items); setBackupDialog(true); }).catch((backupError) => console.error("Could not list recovery backups:", backupError));
        setReady(true);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!ready || recoveryRequired) return;
    const timeout = window.setTimeout(() => {
      persistLibrary(notebooks)
        .catch((error) => setNotice(`Could not save local changes: ${error}`));
    }, 100);
    return () => window.clearTimeout(timeout);
  }, [notebooks, ready, recoveryRequired]);

  useEffect(() => {
    const flushPendingSave = () => {
      if (ready && !recoveryRequired) persistLibrary(notebooksRef.current).catch((error) => console.error("Unable to flush library during app suspension:", error));
    };
    const handleVisibilityChange = () => { if (document.visibilityState === "hidden") flushPendingSave(); };
    window.addEventListener("pagehide", flushPendingSave);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flushPendingSave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [ready, recoveryRequired]);

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
        if (recoveryRequired) {
          setNotice("Restore a backup or explicitly start with an empty library before closing.");
          return;
        }
        await persistLibrary(notebooksRef.current);
        const archive = await createMemz(notebooksRef.current);
        const verified = await importMemz(archive);
        const expected = notebooksRef.current;
        if (verified.length !== expected.length || verified.some((notebook, index) => notebook.id !== expected[index].id || notebook.flashcards.length !== (expected[index].flashcards || []).length)) throw new Error("Automatic backup verification failed. The backup was not saved.");
        const backupPath = await invoke("create_automatic_backup", { bytes: Array.from(archive) });
        console.info("Automatic project backup created:", backupPath);
        await getCurrentWindow().destroy();
      } catch (error) {
        setNotice(`Could not save before closing: ${error.message || error}`);
      }
    }).then((dispose) => { unlisten = dispose; })
      .catch((error) => console.error("Could not register close handler:", error));
    return () => unlisten?.();
  }, [ready, recoveryRequired]);

  function requestText({ title, value = "", placeholder, submitLabel, onSubmit }) {
    setPrompt({ title, value, placeholder, submitLabel, onSubmit });
  }
  function updateNotebook(id, changes) {
    setNotebooks((items) => items.map((item) => item.id === id ? { ...item, ...changes } : item));
  }
  function createNotebook() {
    requestText({
      title: "New notebook",
      placeholder: "Notebook name",
      submitLabel: "Create notebook",
      onSubmit: (name) => {
        const title = name.trim();
        if (!title) return "Please enter a notebook name.";
        if (notebooksRef.current.some((item) => normalizeName(item.title) === normalizeName(title))) {
          return "A notebook with this name already exists.";
        }
        const id = crypto.randomUUID();
        setNotebooks((items) => [{
          id, title, color: "#6f9dcc", chapters: [], cards: 0, flashcards: [],
          reviewHistory: [], updated: "Just created",
        }, ...items]);
        setActiveId(id);
        setView("notebook");
      },
    });
  }
  function startNewProject() {
    setRecoveryRequired(false);
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
      setNotebooks(normalizeLibrary(imported));
      setRecoveryRequired(false);
      setActiveId(null);
      setView("library");
      setProjectPath(path);
      setNotice(`Opened project: ${path.split(/[\\\\/]/).pop()}`);
    } catch (error) {
      setNotice(`Could not open project: ${error.message || error}`);
    }
  }

  async function loadAutomaticBackups() {
    try {
      setBackupItems(await invoke("list_automatic_backups"));
      setBackupToRestore(null);
      setBackupDialog(true);
    } catch (error) { setNotice("Could not list backups: " + (error.message || error)); }
  }

  async function restoreAutomaticBackup(backup) {
    try {
      if (!recoveryRequired) {
        const safetyArchive = await createMemz(notebooksRef.current);
        await importMemz(safetyArchive);
        await invoke("create_automatic_backup", { bytes: Array.from(safetyArchive) });
      }
      const imported = normalizeLibrary(await importMemz(await readBytes(backup.path)));
      await persistLibrary(imported);
      setNotebooks(imported);
      setActiveId(null);
      setView("library");
      setProjectPath(null);
      setBackupToRestore(null);
      setBackupDialog(false);
      setRecoveryRequired(false);
      setNotice("Restored " + backup.name + ". Review the recovered library before continuing.");
    } catch (error) { setNotice("Could not restore " + backup.name + ": " + (error.message || error)); }
  }

  async function saveProject() {
    try {
      const path = await save({
        defaultPath: projectPath || "MemoMaster.memz",
        filters: projectFilter,
      });
      if (!path) return;

      const archive = await createMemz(notebooks);
      const targetPath = path.toLowerCase().endsWith(".memz") ? path : `${path}.memz`;
      await writeBytes(targetPath, archive);
      setProjectPath(targetPath);
      setNotice(`Project saved: ${targetPath.split(/[\\\\/]/).pop()}`);
    } catch (error) {
      setNotice(`Could not save project: ${error.message || error}`);
    }
  }

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape" || event.repeat) return;
      if (prompt) { event.preventDefault(); setPrompt(null); return; }
      if (deleteNotebook) { event.preventDefault(); setDeleteNotebook(null); return; }
      if (confirmNewProject) { event.preventDefault(); setConfirmNewProject(false); return; }
      if (menu) { event.preventDefault(); setMenu(null); return; }
      if (["help", "settings", "status"].includes(view)) {
        event.preventDefault();
        setView("library");
        setActiveId(null);
      }
    };
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [view, prompt, deleteNotebook, confirmNewProject, menu]);

  useEffect(() => {
    const shortcuts = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "n" && event.shiftKey) { event.preventDefault(); setConfirmNewProject(true); }
      else if (key === "n") { event.preventDefault(); createNotebook(); }
      else if (key === "o" && !event.shiftKey) { event.preventDefault(); openProjectFile(); }
      else if (key === "s") { event.preventDefault(); saveProject(); }
      else if (key === ",") { event.preventDefault(); setView("settings"); setActiveId(null); }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [notebooks, projectPath]);

  return (
    <div class="app-layout" data-theme={theme} onClick={() => menu && setMenu(null)}>
      <div class="app-frame">
        <Titlebar
          onNewProject={() => setConfirmNewProject(true)}
          onOpenProject={openProjectFile}
          onSaveProject={saveProject}
          onPreferences={() => { setView("settings"); setActiveId(null); }}
          onHelp={(page) => { setHelpReturnView(view === "notebook" ? "notebook" : "library"); setHelpPage(page); setView("help"); }}
        />
        {view === "library" && (
          <Topbar title="Your library" query={query} onQueryChange={setQuery} onCreate={createNotebook} onStudyStatus={() => { setView("status"); setActiveId(null); }} />
        )}
        <main class="app-main">
          {view === "settings" ? (
            <SettingsPanel theme={theme} onThemeChange={setTheme} fsrsSettings={fsrsSettings} onFsrsSettingsChange={setFsrsSettings} onManageBackups={loadAutomaticBackups} onBack={() => setView("library")} />
          ) : view === "help" ? (
            <HelpPanel page={helpPage} onPageChange={setHelpPage} backLabel={helpReturnView === "notebook" ? "BACK TO NOTEBOOK" : "BACK TO LIBRARY"} onBack={() => setView(helpReturnView)} />
          ) : view === "status" ? (
            <StudyStatus notebooks={notebooks} settings={fsrsSettings} onBack={() => setView("library")} />
          ) : view === "notebook" && activeNotebook ? (
            <NotebookView
              notebook={activeNotebook}
              fsrsSettings={fsrsSettings}
              onUpdate={(changes) => updateNotebook(activeNotebook.id, changes)}
              onBack={() => setView("library")}
              onRequestText={requestText}
            />
          ) : (
            <NotebookGrid
              notebooks={filteredNotebooks}
              settings={fsrsSettings}
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
              onSubmit: (title) => {
                const nextTitle = title.trim();
                if (!nextTitle) return "Please enter a notebook name.";
                if (notebooksRef.current.some((item) => item.id !== notebook.id && normalizeName(item.title) === normalizeName(nextTitle))) {
                  return "A notebook with this name already exists.";
                }
                updateNotebook(notebook.id, { title: nextTitle });
              },
            });
          }}
          onDelete={() => { setDeleteNotebook(menu.notebook); setMenu(null); }}
          onColorChange={(color) => updateNotebook(menu.notebook.id, { color })}
        />
      )}
      {deleteNotebook && (
        <div class="prompt-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDeleteNotebook(null)}>
          <section class="prompt-panel" role="alertdialog" aria-modal="true" aria-labelledby="delete-notebook-title">
            <div class="prompt-heading"><h2 id="delete-notebook-title">Delete notebook?</h2><button type="button" aria-label="Close" onClick={() => setDeleteNotebook(null)}>×</button></div>
            <p>“{deleteNotebook.title}” and all its chapters, cards and study history will be permanently deleted. This cannot be undone.</p>
            <div class="prompt-actions"><button type="button" class="prompt-cancel" onClick={() => setDeleteNotebook(null)}>Cancel</button><button type="button" class="prompt-confirm prompt-danger" onClick={() => {
              setNotebooks((items) => items.filter((item) => item.id !== deleteNotebook.id));
              if (activeId === deleteNotebook.id) { setActiveId(null); setView("library"); }
              setDeleteNotebook(null);
              setNotice("Notebook deleted.");
            }}>Delete notebook</button></div>
          </section>
        </div>
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
            const result = prompt.onSubmit(value);
            if (typeof result === "string") return result;
            setPrompt(null);
          }}
        />
      )}
      {backupDialog && (
        <div class="prompt-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !backupToRestore && setBackupDialog(false)}>
          <section class="prompt-panel backup-panel" role="dialog" aria-modal="true" aria-labelledby="backup-title">
            <div class="prompt-heading"><h2 id="backup-title">{backupToRestore ? "Restore this backup?" : "Backups & recovery"}</h2><button type="button" aria-label="Close" onClick={() => { setBackupToRestore(null); setBackupDialog(false); }}>×</button></div>
            {backupToRestore ? (
              <><p>This replaces the current library with <strong>{backupToRestore.name}</strong>. Continue only if this is the snapshot you want to recover.</p><div class="prompt-actions"><button class="prompt-cancel" onClick={() => setBackupToRestore(null)}>Cancel</button><button class="prompt-confirm" onClick={() => restoreAutomaticBackup(backupToRestore)}>Restore backup</button></div></>
            ) : (
              <><p>Automatic backups are verified before saving. The newest 10 backups are retained. Restoring a backup replaces the current library.</p>
                {backupItems.length ? <div class="backup-list">{backupItems.map((backup) => <div class="backup-item"><div><strong>{backup.name}</strong><small>{new Date(backup.modified * 1000).toLocaleString()}</small></div><button class="prompt-confirm" onClick={() => setBackupToRestore(backup)}>Restore</button></div>)}</div> : <p class="backup-empty">No automatic backups are available yet.</p>}
                <div class="prompt-actions">
                  {recoveryRequired && <button class="prompt-cancel" onClick={() => { setRecoveryRequired(false); setBackupDialog(false); setNotebooks([]); setNotice("Started with an empty library. Existing backup files and the damaged database were preserved."); }}>Start with empty library</button>}
                  <button class="prompt-cancel" onClick={() => setBackupDialog(false)}>Close</button>
                </div></>
            )}
          </section>
        </div>
      )}
      {notice && <div class="app-notice" role="status">{notice}</div>}
    </div>
  );
}
