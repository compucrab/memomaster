import { BookOpen, Plus, ArrowUpRight } from "lucide-preact";

export default function NotebookGrid({ notebooks, onOpen, onContextMenu, onCreate, onUpdate }) {
  return (
    <section class="workspace library-workspace">
      <div class="page-intro">
        <div>
          <p class="eyebrow"><i /> YOUR PERSONAL KNOWLEDGE LIBRARY</p>
          <h1>A place for <em>curiosity.</em></h1>
          <p class="page-description">Gather what you learn. Revisit what matters. Let ideas find their place.</p>
        </div>
        <div class="library-meta"><b>{String(notebooks.length).padStart(2, "0")}</b> NOTEBOOKS</div>
      </div>
      <div class="section-rule"><span>YOUR NOTEBOOKS</span><span>{notebooks.length} COLLECTIONS</span></div>
      {notebooks.length ? (
        <div class="notebook-grid">
          {notebooks.map((notebook, index) => {
            const chapterCount = Array.isArray(notebook.chapters) ? notebook.chapters.length : (notebook.chapters || 0);
            return (
              <article class="notebook-card" key={notebook.id} onContextMenu={(event) => onContextMenu(event, notebook)}>
                <button class="notebook-open" onClick={() => onOpen(notebook.id)} aria-label={`Open ${notebook.title}`}>
                  <div class="notebook-cover">
                    <i class="cover-strip" style={{ backgroundColor: notebook.color }} />
                    <div class="cover-topline"><span>MM / {String(index + 1).padStart(2, "0")}</span><span>FIELD NOTES</span></div>
                    <div class="cover-art"><BookOpen size={36} /><i /><b /></div>
                    <div class="cover-footer"><span>MEMOMASTER</span><span>EST. 2026</span></div>
                  </div>
                  <div class="notebook-info">
                    <div><h2>{notebook.title}</h2><ArrowUpRight size={16} /></div>
                    <p>{notebook.description}</p>
                    <footer><span>{chapterCount} CHAPTERS</span><span>{notebook.cards} CARDS</span><span>{notebook.updated.toUpperCase()}</span></footer>
                  </div>
                </button>
                <label class="strip-picker" title="Choose any cover strip colour">
                  <span>STRIP COLOUR</span>
                  <input type="color" value={notebook.color} aria-label={`Choose strip colour for ${notebook.title}`} onInput={(event) => onUpdate(notebook.id, { color: event.currentTarget.value })} />
                </label>
              </article>
            );
          })}
          <button class="new-notebook-card" onClick={onCreate}>
            <i><Plus size={22} /></i><strong>Create a notebook</strong><span>Start a new collection of ideas</span>
          </button>
        </div>
      ) : (
        <div class="empty-library"><BookOpen size={28} /><h2>No notebooks found</h2><p>Try another search or create a notebook.</p><button class="button-primary" onClick={onCreate}><Plus size={15} /> Create notebook</button></div>
      )}
      <footer class="library-footer"><span>MAKE ROOM FOR WHAT YOU WANT TO REMEMBER.</span><span>LOCAL LIBRARY <i /></span></footer>
    </section>
  );
}
