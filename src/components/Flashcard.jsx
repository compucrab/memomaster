import { Check, Eye, PencilLine, RotateCw, X } from "lucide-preact";
import { renderMarkdown } from "../services/markdown";

export default function Flashcard({ card, index, total, showBack, editing, onFlip, onEdit, onChange, onDone }) {
  return (
    <article class={`study-card ${editing ? "is-editing" : ""}`}>
      <div class="study-card-topline">
        <span>MEMOMASTER <i /> FLASHCARD</span>
        <span>{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
      </div>

      {editing ? (
        <div class="study-card-editor">
          <label>FRONT · QUESTION
            <textarea autoFocus value={card.front} onInput={(event) => onChange({ front: event.currentTarget.value })} placeholder="Write the question or prompt in Markdown..." />
          </label>
          <label>BACK · ANSWER
            <textarea value={card.back} onInput={(event) => onChange({ back: event.currentTarget.value })} placeholder="Write the answer in Markdown..." />
          </label>
          <button class="study-primary" onClick={onDone}><Check size={15} /> Save card</button>
        </div>
      ) : (
        <>
          <div class="study-card-content">
            <p class="study-side-label">{showBack ? "THE ANSWER" : "THE QUESTION"}</p>
            <div class="study-card-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(showBack ? card.back : card.front) }} />
          </div>
          <div class="study-card-actions">
            <button class="study-secondary" onClick={onEdit}><PencilLine size={14} /> Edit card</button>
            <button class="study-primary" onClick={onFlip}><RotateCw size={15} /> {showBack ? "Back to question" : "Reveal answer"}</button>
          </div>
        </>
      )}
    </article>
  );
}
