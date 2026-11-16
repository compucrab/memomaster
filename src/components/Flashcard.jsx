import { useState } from "preact/hooks";
import { Eye, PencilLine, RotateCw, Check, X } from "lucide-preact";
import { renderMarkdown } from "../services/markdown";

export default function Flashcard({ card, index, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [showBack, setShowBack] = useState(false);

  return (
    <article class="flashcard">
      <div class="flashcard-toolbar">
        <span>FLASHCARD <i /> {String(index + 1).padStart(2, "0")}</span>
        <div>
          <button class={!editing ? "is-selected" : ""} onClick={() => setEditing(false)}><Eye size={13} /> Study</button>
          <button class={editing ? "is-selected" : ""} onClick={() => setEditing(true)}><PencilLine size={13} /> Edit</button>
          {onDelete && <button class="flashcard-delete" onClick={onDelete} aria-label="Delete flashcard"><X size={14} /></button>}
        </div>
      </div>

      {editing ? (
        <div class="flashcard-editor">
          <label>FRONT <textarea value={card.front} onInput={(event) => onChange({ front: event.currentTarget.value })} placeholder="Write the question or prompt in Markdown..." /></label>
          <label>BACK <textarea value={card.back} onInput={(event) => onChange({ back: event.currentTarget.value })} placeholder="Write the answer in Markdown..." /></label>
          <button class="button-primary" onClick={() => setEditing(false)}><Check size={14} /> Done</button>
        </div>
      ) : (
        <div class="flashcard-study">
          <div class="flashcard-side-label">{showBack ? "BACK · ANSWER" : "FRONT · QUESTION"}</div>
          <div class="flashcard-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(showBack ? card.back : card.front) }} />
          <button class="flashcard-flip" onClick={() => setShowBack(!showBack)}>
            <RotateCw size={14} /> {showBack ? "Show front" : "Reveal answer"}
          </button>
        </div>
      )}
    </article>
  );
}
