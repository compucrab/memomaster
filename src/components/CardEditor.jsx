import { useEffect, useRef, useState } from "preact/hooks";
import { ArrowLeft, Check, Plus, RotateCcw, Trash2, X } from "lucide-preact";
import RichTextEditor from "./RichTextEditor";
import { findSimilarQuestion } from "../services/questionSimilarity";
import { normalizeCardDocument, cardDocumentText } from "../services/cardDocument";
export default function CardEditor({ card, chapters = [], existingCards = [], onSave, onSaveAndAdd, onCancel, onAddChapter, onDelete, onResetSchedule, addedNotice = false, media = [], onAddMedia }) {
  const [draft, setDraft] = useState(() => ({ ...card, front: normalizeCardDocument(card.front), back: normalizeCardDocument(card.back) }));
  const [similarQuestion, setSimilarQuestion] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeSide, setActiveSide] = useState("question");
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false);
  const [chapterQuery, setChapterQuery] = useState("");
  const [highlightedChapter, setHighlightedChapter] = useState(0);
  const chapterSearchRef = useRef(null);
  const chapterOptions = [{ id: "", name: "Unassigned" }, ...chapters];
  const filteredChapterOptions = chapterOptions.filter(item => item.name.toLocaleLowerCase().includes(chapterQuery.toLocaleLowerCase()));
  const isNewCard = !existingCards.some(item => item.id === draft.id);
  function requestSave(addAnother = false) {
    const match = findSimilarQuestion(draft.front, existingCards, draft.id);
    if (match?.exact) { setSimilarQuestion({ ...match, blocked: true, addAnother }); return; }
    if (match) { setSimilarQuestion({ ...match, addAnother }); return; }
    (addAnother ? (onSaveAndAdd || onSave) : onSave)(draft);
  }
  function update(changes) { setDraft(current => ({ ...current, ...changes })); }

  useEffect(() => {
    if (chapterPickerOpen) chapterSearchRef.current?.focus();
  }, [chapterPickerOpen]);

  useEffect(() => {
    const handleEditorShortcuts = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        setChapterQuery("");
        setHighlightedChapter(Math.max(0, chapterOptions.findIndex(item => item.id === (draft.chapterId || ""))));
        setChapterPickerOpen(true);
      } else if (event.key === "Enter" && !event.shiftKey) {
        if (event.target?.closest?.(".chapter-picker, input, textarea, [role='dialog']")) return;
        event.preventDefault();
        requestSave(true);
      }
    };
    window.addEventListener("keydown", handleEditorShortcuts);
    return () => window.removeEventListener("keydown", handleEditorShortcuts);
  }, [draft, existingCards, chapterPickerOpen, chapterOptions.length]);

  function chooseChapter(chapter) {
    update({ chapterId: chapter.id });
    setChapterPickerOpen(false);
    setChapterQuery("");
  }

  function handleChapterKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setHighlightedChapter(index => Math.max(0, Math.min(filteredChapterOptions.length - 1, index + delta)));
    } else if (event.key === "Enter" && filteredChapterOptions[highlightedChapter]) {
      event.preventDefault();
      chooseChapter(filteredChapterOptions[highlightedChapter]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setChapterPickerOpen(false);
    }
  }
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
        <label class="chapter-picker-label">CHAPTER
          <div class="chapter-picker">
            <button type="button" class="chapter-picker-trigger" aria-expanded={chapterPickerOpen} onClick={() => { setChapterQuery(""); setChapterPickerOpen(open => !open); }}>
              <span>{chapterOptions.find(item => item.id === (draft.chapterId || ""))?.name || "Unassigned"}</span><span class="chapter-picker-caret">⌄</span>
            </button>
            {chapterPickerOpen && <div class="chapter-picker-popover">
              <input ref={chapterSearchRef} value={chapterQuery} onInput={event => { setChapterQuery(event.currentTarget.value); setHighlightedChapter(0); }} onKeyDown={handleChapterKeyDown} placeholder="Search chapters..." aria-label="Search chapters"/>
              <div class="chapter-picker-options" role="listbox" aria-label="Chapters">
                {filteredChapterOptions.map((chapter, index) => <button type="button" role="option" aria-selected={(draft.chapterId || "") === chapter.id} class={highlightedChapter === index ? "is-highlighted" : ""} onMouseEnter={() => setHighlightedChapter(index)} onClick={() => chooseChapter(chapter)}>{chapter.name}</button>)}
                {!filteredChapterOptions.length && <p>No chapters found</p>}
              </div>
              <small>↑ ↓ to navigate · Enter to choose</small>
            </div>}
          </div>
        </label>
        <button class="card-add-structure" type="button" onClick={onAddChapter}><Plus size={13}/> New chapter</button>
      </div>
      <div class="card-editor-footer-right">{!isNewCard && draft.fsrs && <button type="button" class="card-reset-schedule" onClick={() => { onResetSchedule?.(draft.id); setDraft(current => { const next = { ...current }; delete next.fsrs; return next; }); }}><RotateCcw size={13}/> Reset schedule</button>}{!isNewCard && <button type="button" class="card-delete-button" onClick={()=>setConfirmDelete(true)}><Trash2 size={14}/> Delete card</button>}<button type="button" class="study-secondary" onClick={onCancel}>Cancel</button><button type="button" class="study-primary" onClick={() => requestSave(false)}><Check size={15}/> {isNewCard ? "Add card" : "Save changes"}</button></div>
    </footer>
    {confirmDelete && <div class="prompt-backdrop" onMouseDown={e=>e.target===e.currentTarget && setConfirmDelete(false)}><section class="prompt-panel" role="alertdialog" aria-modal="true" aria-labelledby="delete-card-title"><div class="prompt-heading"><h2 id="delete-card-title">Delete card?</h2><button type="button" aria-label="Close" onClick={()=>setConfirmDelete(false)}><X size={16}/></button></div><p>This card and its review history will be permanently deleted.</p><div class="prompt-actions"><button type="button" class="prompt-cancel" onClick={()=>setConfirmDelete(false)}>Cancel</button><button type="button" class="prompt-confirm prompt-danger" onClick={onDelete}>Delete card</button></div></section></div>}
    {similarQuestion && <div class="prompt-backdrop" role="presentation"><section class="prompt-panel question-warning" role="alertdialog" aria-modal="true" aria-labelledby="similar-question-title"><div class="prompt-heading"><h2 id="similar-question-title">{similarQuestion.blocked ? "This question already exists" : "This looks similar to another question"}</h2></div><p>{similarQuestion.blocked ? "There is already a card with the same question. Edit this question to make it distinct." : "We found a question that is very close in wording. You may already have this card in your notebook."}</p><div class="similar-question-match"><span>EXISTING QUESTION</span><p>{cardDocumentText(similarQuestion.card.front).trim()}</p></div><div class="prompt-actions"><button type="button" class="prompt-cancel" onClick={()=>{setSimilarQuestion(null);onCancel();}}>{isNewCard ? "Discard card" : "Cancel edit"}</button>{!similarQuestion.blocked && <button type="button" class="prompt-confirm" onClick={()=>{setSimilarQuestion(null);(similarQuestion.addAnother ? (onSaveAndAdd || onSave) : onSave)(draft);}}>Save anyway</button>}{similarQuestion.blocked && <button type="button" class="prompt-confirm" onClick={()=>setSimilarQuestion(null)}>Edit question</button>}</div></section></div>}
  </section>;
}
