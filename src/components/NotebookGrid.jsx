import { BookOpen, Plus } from "lucide-preact";

function validColor(value) { return /^#[0-9a-fA-F]{6}$/.test(value); }

export default function NotebookGrid({ notebooks, onOpen, onContextMenu, onCreate, onUpdate }) {
  return (
    <section class="workspace library-workspace">
      <header class="library-heading">
        <h1>Notebooks</h1>
        <span>{notebooks.length} {notebooks.length === 1 ? "notebook" : "notebooks"}</span>
      </header>
      {notebooks.length ? (
        <div class="notebook-grid">
          {notebooks.map((notebook) => {
            const chapterCount = Array.isArray(notebook.chapters) ? notebook.chapters.length : (notebook.chapters || 0);
            return (
              <article class="notebook-card" key={notebook.id} onContextMenu={(event) => onContextMenu(event, notebook)}>
                <button class="notebook-open" onClick={() => onOpen(notebook.id)} aria-label={`Open ${notebook.title}`}>
                  <div class="notebook-cover">
                    <i class="cover-strip" style={{ backgroundColor: notebook.color }} />
                    <BookOpen size={30} />
                  </div>
                  <div class="notebook-info">
                    <h2>{notebook.title}</h2>
                    <p>{notebook.description}</p>
                    <footer><span>{chapterCount} CHAPTERS</span><span>{notebook.cards} CARDS</span></footer>
                  </div>
                </button>
                <label class="strip-picker" title="Set cover strip colour using a hex value">
                  <span>STRIP COLOUR</span>
                  <input type="text" value={notebook.color} maxLength={7} aria-label={`Strip colour for ${notebook.title}`} onInput={(event) => validColor(event.currentTarget.value) && onUpdate(notebook.id, { color: event.currentTarget.value })} />
                </label>
              </article>
            );
          })}
          <button class="new-notebook-card" onClick={onCreate}>
            <i><Plus size={20} /></i><strong>New notebook</strong>
          </button>
        </div>
      ) : (
        <div class="empty-library"><BookOpen size={26} /><h2>No notebooks found</h2><p>Try another search or create a notebook.</p><button class="button-primary" onClick={onCreate}><Plus size={15} /> Create notebook</button></div>
      )}
    </section>
  );
}
