import { useState } from "preact/hooks";
import { ArrowLeft, Check, Plus, Trash2, X } from "lucide-preact";
import RichTextEditor from "./RichTextEditor";
import { findSimilarQuestion } from "../services/questionSimilarity";

export default function CardEditor({ card, chapters = [], existingCards = [], onSave, onCancel, onAddChapter, onDelete }) {
  const [draft, setDraft] = useState(() => ({ ...card }));
  const [side, setSide] = useState("front");
  const [similarQuestion, setSimilarQuestion] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isNewCard = !existingCards.some((item) => item.id === draft.id);

  function requestSave() {
    const match = findSimilarQuestion(draft.front, existingCards, draft.id);
    if (match?.exact) {
      setSimilarQuestion({ ...match, blocked: true });
      return;
    }
    if (match) {
      setSimilarQuestion(match);
      return;
    }
    onSave(draft);
  }

  function update(changes) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  return (
    <section class="card-editor-page">
      <header class="card-editor-header">
        <button class="back-link" onClick={onCancel}><ArrowLeft size={14} /> BACK TO CARD</button>
        <div class="card-editor-heading"><h1>{isNewCard ? "New card" : "Edit card"}</h1><span>QUESTION AND ANSWER</span></div>
        <div class="card-editor-header-actions">
          {!isNewCard && <button type="button" class="card-delete-button" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Delete</button>}
          <button type="button" class="study-primary" onClick={requestSave}><Check size={15} /> Save card</button>
        </div>
      </header>

      <div class="card-editor-body">
        <div class="card-editor-tabs" role="tablist" aria-label="Card content">
          <button type="button" role="tab" aria-selected={side === "front"} class={side === "front" ? "is-active" : ""} onClick={() => setSide("front")}>Question</button>
          <button type="button" role="tab" aria-selected={side === "back"} class={side === "back" ? "is-active" : ""} onClick={() => setSide("back")}>Answer</button>
        </div>

        <div class="card-editor-writing">
          {side === "front" ? (
            <RichTextEditor key="front" label="QUESTION" value={draft.front} placeholder="Write your question..." onChange={(front) => update({ front })} />
          ) : (
            <RichTextEditor key="back" label="ANSWER" value={draft.back} placeholder="Write your answer..." onChange={(back) => update({ back })} />
          )}
        </div>

        <div class="card-editor-organization">
          <label>CHAPTER
            <select value={draft.chapterId || ""} onChange={(event) => update({ chapterId: event.currentTarget.value, topicId: "" })}>
              <option value="">Unassigned</option>
              {chapters.map((chapter) => <option value={chapter.id}>{chapter.name}</option>)}
            </select>
          </label>
          <button class="card-add-structure" type="button" onClick={onAddChapter}><Plus size={13} /> New chapter</button>
        </div>
      </div>
      {confirmDelete && (
        <div class="prompt-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setConfirmDelete(false)}>
          <section class="prompt-panel" role="alertdialog" aria-modal="true" aria-labelledby="delete-card-title">
            <div class="prompt-heading"><h2 id="delete-card-title">Delete card?</h2><button type="button" aria-label="Close" onClick={() => setConfirmDelete(false)}><X size={16} /></button></div>
            <p>This card and its review history will be permanently deleted.</p>
            <div class="prompt-actions"><button type="button" class="prompt-cancel" onClick={() => setConfirmDelete(false)}>Cancel</button><button type="button" class="prompt-confirm prompt-danger" onClick={onDelete}>Delete card</button></div>
          </section>
        </div>
      )}
      {similarQuestion && (
        <div class="prompt-backdrop" role="presentation">
          <section class="prompt-panel question-warning" role="alertdialog" aria-modal="true" aria-labelledby="similar-question-title">
            <div class="prompt-heading"><h2 id="similar-question-title">{similarQuestion.blocked ? "This question already exists" : "This looks similar to another question"}</h2></div>
            <p>{similarQuestion.blocked
              ? "There is already a card with the same question. Edit this question to make it distinct."
              : "We found a question that is very close in wording. You may already have this card in your notebook."}</p>
            <div class="similar-question-match">
              <span>EXISTING QUESTION</span>
              <p>{String(similarQuestion.card.front || "").replace(/[#>*_]/g, "").trim()}</p>
            </div>
            <div class="prompt-actions">
              <button type="button" class="prompt-cancel" onClick={() => { setSimilarQuestion(null); onCancel(); }}>{isNewCard ? "Discard card" : "Cancel edit"}</button>
              {!similarQuestion.blocked && <button type="button" class="prompt-confirm" onClick={() => { setSimilarQuestion(null); onSave(draft); }}>Save anyway</button>}
              {similarQuestion.blocked && <button type="button" class="prompt-confirm" onClick={() => setSimilarQuestion(null)}>Edit question</button>}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
