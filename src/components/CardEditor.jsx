import { useState } from "preact/hooks";
import { ArrowLeft, Check, Plus, RotateCcw, Trash2, X } from "lucide-preact";
import RichTextEditor from "./RichTextEditor";
import { findSimilarQuestion } from "../services/questionSimilarity";
import { normalizeCardDocument, cardDocumentText } from "../services/cardDocument";
export default function CardEditor({ card, chapters = [], existingCards = [], onSave, onCancel, onAddChapter, onDelete, onResetSchedule, addedNotice = false, media = [], onAddMedia }) {
  const [draft, setDraft] = useState(() => ({ ...card, front: normalizeCardDocument(card.front), back: normalizeCardDocument(card.back) }));
  const [similarQuestion, setSimilarQuestion] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeSide, setActiveSide] = useState("question");
  const isNewCard = !existingCards.some(item => item.id === draft.id);
  function requestSave() {
    const match = findSimilarQuestion(draft.front, existingCards, draft.id);
    if (match?.exact) { setSimilarQuestion({ ...match, blocked: true }); return; }
    if (match) { setSimilarQuestion(match); return; }
    onSave(draft);
  }
  function update(changes) { setDraft(current => ({ ...current, ...changes })); }
  return <section class="card-editor-page">
    <header class="card-editor-compact-header">
      <button class="back-link" type="button" onClick={onCancel}><ArrowLeft size={14}/> Back to cards</button>
      <div class="card-editor-heading"><span>{isNewCard ? "NEW CARD" : "EDIT MODE"}</span></div>
    </header>
    {addedNotice && <div class="card-added-toast" role="status" aria-live="polite"><Check size={13} /> Card added</div>}
    <div class="card-editor-body">
      <div class="card-editor-tabs" role="tablist" aria-label="Card content">
        <button type="button" role="tab" aria-selected={activeSide === "question"} class={activeSide === "question" ? "is-active" : ""} onClick={() => setActiveSide("question")}>Question</button>
        <button type="button" role="tab" aria-selected={activeSide === "answer"} class={activeSide === "answer" ? "is-active" : ""} onClick={() => setActiveSide("answer")}>Answer</button>
      </div>
      <div class="card-editor-writing">
        <div class="card-editor-content-panel">
          {activeSide === "question"
            ? <RichTextEditor key="question" label="Question" value={draft.front} placeholder="Write your question..." media={media} onAddMedia={onAddMedia} onChange={front=>update({front})}/>
            : <RichTextEditor key="answer" label="Answer" value={draft.back} placeholder="Write your answer..." media={media} onAddMedia={onAddMedia} onChange={back=>update({back})}/>}
        </div>
      </div>
    </div>
    <footer class="card-editor-footer">
      <div class="card-editor-organization">
        <label>CHAPTER<select value={draft.chapterId || ""} onChange={e=>update({chapterId:e.currentTarget.value})}><option value="">Unassigned</option>{chapters.map(chapter=><option value={chapter.id}>{chapter.name}</option>)}</select></label>
        <button class="card-add-structure" type="button" onClick={onAddChapter}><Plus size={13}/> New chapter</button>
      </div>
      <div class="card-editor-footer-right">{!isNewCard && draft.fsrs && <button type="button" class="card-reset-schedule" onClick={() => { onResetSchedule?.(draft.id); setDraft(current => { const next = { ...current }; delete next.fsrs; return next; }); }}><RotateCcw size={13}/> Reset schedule</button>}{!isNewCard && <button type="button" class="card-delete-button" onClick={()=>setConfirmDelete(true)}><Trash2 size={14}/> Delete card</button>}<button type="button" class="study-secondary" onClick={onCancel}>Cancel</button><button type="button" class="study-primary" onClick={requestSave}><Check size={15}/> {isNewCard ? "Add card" : "Save changes"}</button></div>
    </footer>
    {confirmDelete && <div class="prompt-backdrop" onMouseDown={e=>e.target===e.currentTarget && setConfirmDelete(false)}><section class="prompt-panel" role="alertdialog" aria-modal="true" aria-labelledby="delete-card-title"><div class="prompt-heading"><h2 id="delete-card-title">Delete card?</h2><button type="button" aria-label="Close" onClick={()=>setConfirmDelete(false)}><X size={16}/></button></div><p>This card and its review history will be permanently deleted.</p><div class="prompt-actions"><button type="button" class="prompt-cancel" onClick={()=>setConfirmDelete(false)}>Cancel</button><button type="button" class="prompt-confirm prompt-danger" onClick={onDelete}>Delete card</button></div></section></div>}
    {similarQuestion && <div class="prompt-backdrop" role="presentation"><section class="prompt-panel question-warning" role="alertdialog" aria-modal="true" aria-labelledby="similar-question-title"><div class="prompt-heading"><h2 id="similar-question-title">{similarQuestion.blocked ? "This question already exists" : "This looks similar to another question"}</h2></div><p>{similarQuestion.blocked ? "There is already a card with the same question. Edit this question to make it distinct." : "We found a question that is very close in wording. You may already have this card in your notebook."}</p><div class="similar-question-match"><span>EXISTING QUESTION</span><p>{cardDocumentText(similarQuestion.card.front).trim()}</p></div><div class="prompt-actions"><button type="button" class="prompt-cancel" onClick={()=>{setSimilarQuestion(null);onCancel();}}>{isNewCard ? "Discard card" : "Cancel edit"}</button>{!similarQuestion.blocked && <button type="button" class="prompt-confirm" onClick={()=>{setSimilarQuestion(null);onSave(draft);}}>Save anyway</button>}{similarQuestion.blocked && <button type="button" class="prompt-confirm" onClick={()=>setSimilarQuestion(null)}>Edit question</button>}</div></section></div>}
  </section>;
}
