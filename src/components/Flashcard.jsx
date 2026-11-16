import { PencilLine, RotateCw } from "lucide-preact";
import { renderMarkdown } from "../services/markdown";

export default function Flashcard({ card, showBack, onFlip, onEdit }) {
  return (
    <article class="study-card">
      <div class="study-card-content">
        <p class="study-side-label">{showBack ? "ANSWER" : "QUESTION"}</p>
        <div class="study-card-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(showBack ? card.back : card.front) }} />
      </div>
      <div class="study-card-actions">
        <button class="study-secondary" onClick={onEdit}><PencilLine size={14} /> Edit card</button>
        <button class="study-primary" onClick={onFlip}><RotateCw size={15} /> {showBack ? "Show question" : "Reveal answer"}</button>
      </div>
    </article>
  );
}
