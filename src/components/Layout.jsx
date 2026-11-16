import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { listen } from "@tauri-apps/api/event";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import NotebookGrid from "./NotebookGrid";
import NotebookView from "./NotebookView";
import SettingsPanel from "./SettingsPanel";
import ContextMenu from "./ContextMenu";

import { initialNotebooks } from "../data/notebooks";
import { exportMemz, importMemz } from "../services/projectArchive";

export default function Layout() {
  const [notebooks, setNotebooks] = useState(initialNotebooks);
  const [view, setView] = useState("library");
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(null);
  const fileRef = useRef(null);

  const activeNotebook = notebooks.find((notebook) => notebook.id === activeId);
  const filteredNotebooks = useMemo(
    () => notebooks.filter((notebook) =>
      notebook.title.toLowerCase().includes(query.toLowerCase())
    ),
    [notebooks, query],
  );

  function updateNotebook(id, changes) {
    setNotebooks((items) =>
      items.map((item) => item.id === id ? { ...item, ...changes } : item)
    );
  }

  function createNotebook() {
    const id = crypto.randomUUID();
    setNotebooks((items) => [{
      id,
      title: "Untitled notebook",
      description: "A quiet place for your notes and ideas.",
      color: "#c6d56a",
      chapters: 0,
      cards: 0,
      updated: "Just created",
    }, ...items]);
    setActiveId(id);
    setView("notebook");
  }

  function openNotebook(id) {
    setActiveId(id);
    setView("notebook");
  }

  useEffect(() => {
    let unlisten;
    let active = true;

    listen("memomaster://menu", (event) => {
      switch (event.payload) {
        case "new-notebook":
          createNotebook();
          break;
        case "open-project":
          fileRef.current?.click();
          break;
        case "export-project":
          exportMemz(notebooks).catch((error) => alert(error.message));
          break;
        case "about":
          setView("settings");
          break;
      }
    }).then((stop) => {
      if (active) unlisten = stop;
      else stop();
    }).catch(() => {});

    return () => {
      active = false;
      unlisten?.();
    };
  }, [notebooks]);

  async function handleImport(event) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    try {
      const imported = await importMemz(await file.arrayBuffer());

      setNotebooks((current) => {
        const existingIds = new Set(current.map((item) => item.id));
        const safeImports = imported.map((notebook) =>
          existingIds.has(notebook.id)
            ? { ...notebook, id: crypto.randomUUID() }
            : notebook
        );
        return [...safeImports, ...current];
      });

      setView("library");
      setActiveId(null);
    } catch (error) {
      alert(`Could not import project: ${error.message}`);
    } finally {
      event.currentTarget.value = "";
    }
  }

  return (
    <div class="app-layout" onClick={() => menu && setMenu(null)}>
      <input
        ref={fileRef}
        class="hidden-file-input"
        type="file"
        accept=".memz,application/zip"
        onChange={handleImport}
      />

      <Sidebar
        activeView={view}
        onNavigate={(nextView) => {
          setView(nextView);
          setActiveId(null);
        }}
        notebooks={notebooks}
        onOpenNotebook={openNotebook}
      />

      <main class="app-main">
        <Topbar
          title={
            view === "settings"
              ? "Preferences"
              : view === "notebook"
                ? activeNotebook?.title || "Notebook"
                : "Your library"
          }
          query={query}
          onQueryChange={setQuery}
          onCreate={createNotebook}
        />

        {view === "settings" ? (
          <SettingsPanel />
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

      {menu && (
        <ContextMenu
          {...menu}
          onClose={() => setMenu(null)}
          onOpen={() => {
            openNotebook(menu.notebook.id);
            setMenu(null);
          }}
          onRename={(title) => updateNotebook(menu.notebook.id, { title })}
          onColorChange={(color) => updateNotebook(menu.notebook.id, { color })}
        />
      )}
    </div>
  );
}
