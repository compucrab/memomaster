import { BookOpen, Plus } from "lucide-preact";
import { getStudyQueueCounts } from "../services/studyQueue";

export default function NotebookGrid({ notebooks, settings, onOpen, onContextMenu, onCreate }) {
  const now = new Date();
  const rolloverHour = settings?.rolloverHour ?? 4;

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
            const cards = notebook.flashcards ?? (notebook.markdown ? [{ id: "legacy-card" }] : []);
            const counts = getStudyQueueCounts(cards, now, rolloverHour);
            return (
              <article class="notebook-card" key={notebook.id} onContextMenu={(event) => onContextMenu(event, notebook)}>
                <button class="notebook-open" onClick={() => onOpen(notebook.id)} aria-label={`Open ${notebook.title}`}>
                  <div class="notebook-cover">
                    <i class="cover-strip" style={{ backgroundColor: notebook.color }} />
                    <BookOpen size={30} />
                  </div>
                  <div class="notebook-info">
                    <h2>{notebook.title}</h2>
                    <footer><span>{chapterCount} CHAPTERS</span><span>{cards.length || notebook.cards || 0} CARDS</span></footer>
                    <div class="notebook-daily-counts" aria-label="Cards left today">
                      <span class="daily-new"><strong>{counts.new}</strong><small>New</small></span>
                      <span class="daily-learning"><strong>{counts.learning}</strong><small>Learning</small></span>
                      <span class="daily-review"><strong>{counts.review}</strong><small>Review</small></span>
                    </div>
                  </div>
                </button>
              </article>
            );
          })}
          <button class="new-notebook-card" onClick={onCreate}>
            <i><Plus size={20} /></i><strong>New notebook</strong>
          </button>
        </div>
      ) : (
        <div class="empty-library"><BookOpen size={26} /><h2>{notebooks.length === 0 ? "No notebooks yet" : "No notebooks found"}</h2><p>{notebooks.length === 0 ? "Create a notebook to get started." : "Try another search or create a notebook."}</p><button class="button-primary" onClick={onCreate}><Plus size={15} /> Create notebook</button></div>
      )}
    </section>
  );
}
