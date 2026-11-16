import { Check, PencilLine, RotateCw, Plus } from "lucide-preact";
import { renderMarkdown } from "../services/markdown";

export default function Flashcard({ card, chapters = [], showBack, editing, onFlip, onEdit, onChange, onDone, onAddChapter, onAddTopic }) {
  const selectedChapter = chapters.find((chapter) => chapter.id === card.chapterId);
  const topics = selectedChapter?.topics ?? [];

  return (
    <article class={`study-card ${editing ? "is-editing" : ""}`}>
      {editing ? (
        <div class="study-card-editor">
          <label>FRONT · QUESTION
            <textarea autoFocus value={card.front} onInput={(event) => onChange({ front: event.currentTarget.value })} placeholder="Write the question or prompt in Markdown..." />
          </label>
          <label>BACK · ANSWER
            <textarea value={card.back} onInput={(event) => onChange({ back: event.currentTarget.value })} placeholder="Write the answer in Markdown..." />
          </label>
          <div class="card-organization">
            <label>CHAPTER
              <select value={card.chapterId || ""} onChange={(event) => onChange({ chapterId: event.currentTarget.value, topicId: "" })}>
                <option value="">Unassigned</option>
                {chapters.map((chapter) => <option value={chapter.id}>{chapter.name}</option>)}
              </select>
            </label>
            <button class="card-add-structure" type="button" onClick={onAddChapter}><Plus size={13} /> New chapter</button>
            <label>TOPIC
              <select value={card.topicId || ""} disabled={!selectedChapter} onChange={(event) => onChange({ topicId: event.currentTarget.value })}>
                <option value="">Unassigned</option>
                {topics.map((topic) => <option value={topic.id}>{topic.name}</option>)}
              </select>
            </label>
            <button class="card-add-structure" type="button" disabled={!selectedChapter} onClick={() => onAddTopic(card.chapterId)}><Plus size={13} /> New topic</button>
          </div>
          <button class="study-primary" onClick={onDone}><Check size={15} /> Save card</button>
        </div>
      ) : (
        <>
          <div class="study-card-content">
            <p class="study-side-label">{showBack ? "ANSWER" : "QUESTION"}</p>
            <div class="study-card-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(showBack ? card.back : card.front) }} />
          </div>
          <div class="study-card-actions">
            <button class="study-secondary" onClick={onEdit}><PencilLine size={14} /> Edit card</button>
            <button class="study-primary" onClick={onFlip}><RotateCw size={15} /> {showBack ? "Show question" : "Reveal answer"}</button>
          </div>
        </>
      )}
    </article>
  );
}
