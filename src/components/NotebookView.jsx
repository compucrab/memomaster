import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  ArrowLeft, BookOpen, GraduationCap, Layers3, Plus, Search, PencilLine, Trash2, X,
} from "lucide-preact";
import CardContent from "./CardContent";
import CardEditor from "./CardEditor";
import ReviewSession from "./ReviewSession";
import { getStudyQueueCounts } from "../services/studyQueue";
import { createMediaAsset } from "../services/mediaLibrary";
import { normalizeCardDocument, cardDocumentText } from "../services/cardDocument";

function makeCard() {
  return { id: crypto.randomUUID(), front: normalizeCardDocument("## Your question\n\nWrite a prompt here."), back: normalizeCardDocument("Write the answer here."), chapterId: "" };
}
const makeId = () => crypto.randomUUID();
const normalizeName = (value) => String(value || "").trim().toLocaleLowerCase();

function getDueLabel(card) {
  if (!card.fsrs?.due) return "Not scheduled";
  const due = new Date(card.fsrs.due);
  if (Number.isNaN(due.getTime())) return "Not scheduled";
  if (due <= new Date()) return "Due now";
  return due.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: due.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotebookView({ notebook, fsrsSettings, onUpdate, onBack, onRequestText }) {
  const cards = Array.isArray(notebook.flashcards) ? notebook.flashcards : [];
  const chapters = Array.isArray(notebook.chapters) ? notebook.chapters : [];
  const [tab, setTab] = useState("browse");
  const [previewSide, setPreviewSide] = useState("question");
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id || null);
  const [search, setSearch] = useState("");
  const selectionAnchorRef = useRef(null);
  const [chapterFilter, setChapterFilter] = useState("all");
  const [editingCardId, setEditingCardId] = useState(null);
  const [studyType, setStudyType] = useState("scheduled");
  const [scopeType, setScopeType] = useState("notebook");
  const [scopeChapterId, setScopeChapterId] = useState(chapters[0]?.id || "");
  const [reviewing, setReviewing] = useState(false);
  const [newCard, setNewCard] = useState(null);
  const [cardAddedNotice, setCardAddedNotice] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);
  const [targetChapterId, setTargetChapterId] = useState("");

  const editingCard = cards.find(card => card.id === editingCardId) || (newCard?.id === editingCardId ? newCard : null);

  useEffect(() => {
    if (!cardAddedNotice) return;
    const timeout = window.setTimeout(() => setCardAddedNotice(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [cardAddedNotice]);

  useEffect(() => {
    if (editingCardId || reviewing) return;
    const handleNotebookKeys = (event) => {
      if (event.repeat) return;
      const key = event.key.toLowerCase();
      const typing = event.target?.closest?.("input, textarea, select, [contenteditable='true'], [role='dialog'], [role='alertdialog']");
      if (event.key === "Escape") {
        if (confirmAction) { event.preventDefault(); setConfirmAction(null); return; }
        if (selectedCardIds.length) { event.preventDefault(); setSelectedCardIds([]); selectionAnchorRef.current = null; return; }
        if (tab === "browse" || tab === "study") { event.preventDefault(); onBack(); }
        return;
      }
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        if (key === "b") { event.preventDefault(); setTab("browse"); return; }
        if (key === "s") { event.preventDefault(); setTab("study"); return; }
        if (key === "a") { event.preventDefault(); addCard(); return; }
        if (key === "e" && tab === "browse" && selectedCard) { event.preventDefault(); setEditingCardId(selectedCard.id); return; }
        return;
      }
      if (typing || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "Delete" && tab === "browse" && selectedCardIds.length) {
        event.preventDefault();
        const ids = [...selectedCardIds];
        askDelete("Delete selected cards?", "Permanently delete " + ids.length + " selected cards?", () => deleteCards(ids));
        return;
      }
      if (key === "a") { event.preventDefault(); addCard(); }
      else if (key === "e" && tab === "browse" && selectedCard) {
        event.preventDefault();
        setEditingCardId(selectedCard.id);
      }
    };
    window.addEventListener("keydown", handleNotebookKeys);
    return () => window.removeEventListener("keydown", handleNotebookKeys);
  }, [editingCardId, reviewing, tab, selectedCardId, selectedCardIds, search, chapterFilter, cards, confirmAction, onBack]);

  const visibleCards = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return cards.filter(card => {
      const chapter = chapters.find(item => item.id === card.chapterId);
      const matchesSearch = !needle || [cardDocumentText(card.front), cardDocumentText(card.back), chapter?.name]
        .some(value => String(value || "").toLocaleLowerCase().includes(needle));
      const matchesChapter = chapterFilter === "all" || card.chapterId === chapterFilter;
      return matchesSearch && matchesChapter;
    });
  }, [cards, chapters, search, chapterFilter]);

  const selectedCard = visibleCards.find(card => card.id === selectedCardId) || visibleCards[0] || null;

  const scopedCards = useMemo(() => cards.filter(card => {
    if (scopeType === "chapter") return card.chapterId === scopeChapterId;
    return true;
  }), [cards, scopeType, scopeChapterId]);
  const now = new Date();
  const shortTermWindow = 10 * 60 * 1000;
  const dueCards = scopedCards.filter(card => {
    if (!card.fsrs?.due) return true;
    const due = new Date(card.fsrs.due);
    if (Number.isNaN(due.getTime()) || due <= now) return true;
    return due.getTime() - now.getTime() <= shortTermWindow;
  });
  const queueCounts = getStudyQueueCounts(scopedCards, now, fsrsSettings?.rolloverHour ?? 4);
  const studyCards = studyType === "scheduled" ? dueCards : scopedCards;

  function handleReview(cardId, fsrs, log, mode) {
    const next = cards.map(card => card.id === cardId && mode === "scheduled" ? { ...card, fsrs } : card);
    const changes = { flashcards: next, cards: next.length };
    if (mode === "scheduled") changes.reviewHistory = [...(notebook.reviewHistory || []), log];
    else changes.practiceHistory = [...(notebook.practiceHistory || []), log];
    onUpdate(changes);
  }

  async function addMedia(file) {
    const asset = await createMediaAsset(file);
    const current = notebook.media || [];
    onUpdate({ media: [...current, asset] });
    return asset;
  }

  function saveCard(draft) {
    const isAdding = !cards.some(card => card.id === draft.id);
    const cleanDraft = { ...draft };
    delete cleanDraft.topicId;
    const next = isAdding
      ? [...cards, cleanDraft]
      : cards.map(card => {
        if (card.id !== draft.id) return card;
        const cleanCard = { ...card };
        delete cleanCard.topicId;
        return { ...cleanCard, ...cleanDraft };
      });
    onUpdate({ flashcards: next, cards: next.length, markdown: undefined });
    setSelectedCardId(draft.id);

    if (isAdding) {
      const nextDraft = { ...makeCard(), chapterId: draft.chapterId || "" };
      setNewCard(nextDraft);
      setEditingCardId(nextDraft.id);
      setCardAddedNotice(true);
      return;
    }

    setNewCard(null);
    setEditingCardId(null);
  }

  function saveAndAddCard(draft) {
    const isAdding = !cards.some(card => card.id === draft.id);
    saveCard(draft);
    if (isAdding) return;
    const nextDraft = { ...makeCard(), chapterId: draft.chapterId || "" };
    setNewCard(nextDraft);
    setEditingCardId(nextDraft.id);
    setTab("browse");
  }

  function askDelete(title, message, action) { setConfirmAction({ title, message, action }); }
  function deleteCards(ids) {
    const removing = new Set(ids);
    const next = cards.filter((card) => !removing.has(card.id));
    onUpdate({
      flashcards: next,
      cards: next.length,
      reviewHistory: (notebook.reviewHistory || []).filter((entry) => !removing.has(entry.cardId)),
      practiceHistory: (notebook.practiceHistory || []).filter((entry) => !removing.has(entry.cardId)),
    });
    setSelectedCardIds([]);
    if (removing.has(selectedCardId)) setSelectedCardId(next[0]?.id || null);
  }
  function resetCardSchedules(ids) {
    const resetting = new Set(ids);
    const next = cards.map((card) => {
      if (!resetting.has(card.id)) return card;
      const cleanCard = { ...card };
      delete cleanCard.fsrs;
      return cleanCard;
    });
    onUpdate({ flashcards: next, cards: next.length });
  }

  function toggleCardSelection(id, event) {
    const index = visibleCards.findIndex((card) => card.id === id);
    if (event?.shiftKey && selectionAnchorRef.current) {
      const anchorIndex = visibleCards.findIndex((card) => card.id === selectionAnchorRef.current);
      if (anchorIndex >= 0 && index >= 0) {
        const start = Math.min(anchorIndex, index);
        const end = Math.max(anchorIndex, index);
        const rangeIds = visibleCards.slice(start, end + 1).map((card) => card.id);
        setSelectedCardIds((items) => event.ctrlKey || event.metaKey ? [...new Set([...items, ...rangeIds])] : rangeIds);
        return;
      }
    }
    if (event?.ctrlKey || event?.metaKey || event?.target?.type === "checkbox") {
      setSelectedCardIds((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
      selectionAnchorRef.current = id;
      return;
    }
    selectionAnchorRef.current = id;
    setSelectedCardIds([]);
    setSelectedCardId(id);
  }
  function deleteChapter(chapter) {
    const removedIds = cards.filter((card) => card.chapterId === chapter.id).map((card) => card.id);
    const nextCards = cards.filter((card) => card.chapterId !== chapter.id);
    const removed = new Set(removedIds);
    onUpdate({
      chapters: chapters.filter((item) => item.id !== chapter.id),
      flashcards: nextCards,
      cards: nextCards.length,
      reviewHistory: (notebook.reviewHistory || []).filter((entry) => !removed.has(entry.cardId)),
      practiceHistory: (notebook.practiceHistory || []).filter((entry) => !removed.has(entry.cardId)),
    });
    setSelectedCardIds((items) => items.filter((id) => !removedIds.includes(id)));
    if (removedIds.includes(selectedCardId)) setSelectedCardId(nextCards[0]?.id || null);
    if (scopeChapterId === chapter.id) { setScopeChapterId(""); setScopeType("notebook"); }
    if (chapterFilter === chapter.id) setChapterFilter("all");
  }
  function addCard() {
    const card = makeCard();
    setNewCard(card);
    setEditingCardId(card.id);
    setTab("browse");
  }

  function addChapter() {
    onRequestText({
      title: "New chapter", placeholder: "Chapter name", submitLabel: "Create chapter",
      onSubmit: name => {
        const title = name.trim();
        if (!title) return "Please enter a chapter name.";
        if (chapters.some((item) => normalizeName(item.name) === normalizeName(title))) return "This notebook already has a chapter with that name.";
        const chapter = { id: makeId(), name: title };
        onUpdate({ chapters: [...chapters, chapter] });
        setScopeChapterId(chapter.id);
      },
    });
  }

  if (editingCard) {
    return <CardEditor key={editingCard.id} card={editingCard} chapters={chapters} media={notebook.media || []} onAddMedia={addMedia}
      onSave={saveCard} onSaveAndAdd={saveAndAddCard} existingCards={cards} onCancel={() => { setEditingCardId(null); setNewCard(null); setCardAddedNotice(false); }}
      onNavigate={(nextTab) => { setEditingCardId(null); setNewCard(null); setCardAddedNotice(false); setTab(nextTab); }}
      addedNotice={cardAddedNotice} onAddChapter={addChapter} onDelete={() => { deleteCards([editingCard.id]); setEditingCardId(null); }}
      onResetSchedule={(id) => resetCardSchedules([id])} />;
  }

  if (reviewing) {
    return <ReviewSession key={`${studyType}-${scopeType}-${scopeChapterId}`}
      cards={studyCards} mode={studyType} settings={fsrsSettings} media={notebook.media || []}
      onReview={handleReview}
      onEditCard={(cardId) => {
        setSelectedCardId(cardId);
        setTab("browse");
        setReviewing(false);
        setEditingCardId(cardId);
      }}
      scopeType={scopeType}
      scopeChapterId={scopeChapterId}
      onComplete={(session) => onUpdate({
        studySessions: [...(notebook.studySessions || []), session],
      })}
      onExit={() => setReviewing(false)}
      onEscape={onBack}
      onBrowse={() => { setReviewing(false); setTab("browse"); }}
      onStudy={() => { setReviewing(false); setTab("study"); }} />;
  }

  return (
    <section class="workspace notebook-workspace">
      <header class="notebook-workspace-header">
        <button class="back-link" onClick={onBack}><ArrowLeft size={14} /> LIBRARY</button>
        <div class="notebook-workspace-title"><h1>{notebook.title}</h1><span>{cards.length} CARDS</span></div>
        <button class="study-add" onClick={addCard}><Plus size={14} /> Add card</button>
      </header>

      <nav class="notebook-tabs" role="tablist" aria-label="Notebook workspace">
        <button role="tab" aria-selected={tab === "browse"} class={tab === "browse" ? "active" : ""} onClick={() => setTab("browse")}><BookOpen size={15} /> Browse</button>
        <button role="tab" aria-selected={tab === "study"} class={tab === "study" ? "active" : ""} onClick={() => setTab("study")}><GraduationCap size={16} /> Study</button>
      </nav>

      {tab === "browse" ? (
        <div class="browse-workspace">
          <aside class="browse-list-panel">
            <div class="browse-tools">
              <label class="browse-search"><Search size={14} /><input value={search} onInput={event => setSearch(event.currentTarget.value)} placeholder="Search question or answer..." /></label>
              <div class="browse-filters">
                <select value={chapterFilter} onChange={event => setChapterFilter(event.currentTarget.value)}>
                  <option value="all">All chapters</option>
                  {chapters.map(chapter => <option value={chapter.id}>{chapter.name}</option>)}
                </select>
              </div>
              <div class="browse-list-count">{visibleCards.length} OF {cards.length} CARDS</div>
              <div class="browse-structure-actions">
                {chapterFilter !== "all" && (() => { const chapter = chapters.find((item) => item.id === chapterFilter); return chapter ? <button type="button" onClick={() => askDelete("Delete chapter?", chapter.name + " and all its cards will be permanently deleted.", () => deleteChapter(chapter))}><Trash2 size={12} /> Delete chapter</button> : null; })()}
              </div>
              {selectedCardIds.length > 0 && <div class="browse-selection-bar">
                <span>{selectedCardIds.length} selected</span>
                <select aria-label="Move selected cards to chapter" value={targetChapterId} onChange={(event) => setTargetChapterId(event.currentTarget.value)}>
                  <option value="">Move to chapter...</option>
                  <option value="__unassigned">Unassigned</option>
                  {chapters.map((chapter) => <option value={chapter.id}>{chapter.name}</option>)}
                </select>
                <button type="button" disabled={!targetChapterId} onClick={() => {
                  const next = cards.map((card) => selectedCardIds.includes(card.id)
                    ? (() => { const cleanCard = { ...card }; delete cleanCard.topicId; return { ...cleanCard, chapterId: targetChapterId === "__unassigned" ? "" : targetChapterId }; })()
                    : card);
                  onUpdate({ flashcards: next, cards: next.length });
                  setSelectedCardIds([]);
                  setSelectedCardId(selectedCardIds[0] || selectedCardId);
                  setChapterFilter(targetChapterId === "__unassigned" ? "all" : targetChapterId);
                  setTargetChapterId("");
                }}>Move</button>
                <button type="button" onClick={() => { resetCardSchedules(selectedCardIds); setSelectedCardIds([]); }}>Reset schedule</button>
                <button type="button" onClick={() => { setSelectedCardIds([]); selectionAnchorRef.current = null; }}>Clear</button>
                <button type="button" class="delete-selected" onClick={() => askDelete("Delete selected cards?", "Permanently delete " + selectedCardIds.length + " selected cards?", () => deleteCards(selectedCardIds))}><Trash2 size={12} /> Delete</button>
              </div>}
            </div>
            <div class="browse-card-list">
              {visibleCards.length ? visibleCards.map((card, index) => {
                const chapter = chapters.find(item => item.id === card.chapterId);
                return (
                  <div key={card.id} class={`browse-card-row ${selectedCard?.id === card.id ? "selected" : ""} ${selectedCardIds.includes(card.id) ? "checked" : ""}`} onContextMenu={(event) => event.preventDefault()}>
                    <input class="browse-card-checkbox" type="checkbox" aria-label="Select card" checked={selectedCardIds.includes(card.id)} onChange={(event) => toggleCardSelection(card.id, event)} />
                    <button type="button" class="browse-card-select" onClick={(event) => { if (event.ctrlKey || event.metaKey || event.shiftKey) toggleCardSelection(card.id, event); else { setSelectedCardId(card.id); setSelectedCardIds([]); selectionAnchorRef.current = card.id; } }}>
                      <span class="browse-card-index">{String(index + 1).padStart(2, "0")}</span>
                      <span class="browse-card-copy"><strong>{cardDocumentText(card.front).trim().split("\n")[0] || "Untitled question"}</strong><small>{chapter?.name || "Unassigned"} · Due: {getDueLabel(card)}</small></span>
                    </button>
                  </div>
                );
              }) : <div class="browse-list-empty">{cards.length ? "No cards match your search." : "No cards in this notebook yet."}</div>}
            </div>
          </aside>

          <section class="browse-preview-panel">
            {selectedCard ? (
              <>
                <header class="browse-preview-header">
                  <nav class="browse-preview-tabs" role="tablist" aria-label="Card preview">
                    <button type="button" role="tab" aria-selected={previewSide === "question"} class={previewSide === "question" ? "active" : ""} onClick={() => setPreviewSide("question")}>Question</button>
                    <button type="button" role="tab" aria-selected={previewSide === "answer"} class={previewSide === "answer" ? "active" : ""} onClick={() => setPreviewSide("answer")}>Answer</button>
                  </nav>
                  <button class="study-secondary" onClick={() => setEditingCardId(selectedCard.id)}><PencilLine size={13} /> Edit card</button>
                </header>
                <div class="browse-preview-content">
                  <CardContent content={previewSide === "question" ? selectedCard.front : selectedCard.back} media={notebook.media || []} />
                </div>
                <footer class="browse-preview-meta">
                  <span>{chapters.find(item => item.id === selectedCard.chapterId)?.name || "Unassigned"}</span>
                  <span class="browse-card-due">Next review: {getDueLabel(selectedCard)}</span>
                </footer>
              </>
            ) : <div class="browse-preview-empty"><Layers3 size={26} /><p>Select a card to preview it.</p></div>}
          </section>
        </div>
      ) : (
        <div class="study-setup">
          <div class="study-setup-intro"><GraduationCap size={25} /><h2>Choose what to study</h2><p>Scheduled reviews keep your FSRS timeline up to date. Unscheduled practice is for a quick refresh.</p></div>
          <div class="study-mode-options">
            <button class={`study-mode-option ${studyType === "scheduled" ? "selected" : ""}`} onClick={() => setStudyType("scheduled")}>
              <span class="study-mode-radio" /><strong>Scheduled</strong><small>Review cards that are due. Updates FSRS scheduling.</small><b>{dueCards.length} due</b>
            </button>
            <button class={`study-mode-option ${studyType === "unscheduled" ? "selected" : ""}`} onClick={() => setStudyType("unscheduled")}>
              <span class="study-mode-radio" /><strong>Unscheduled</strong><small>Practice any cards without changing their due dates.</small><b>{scopedCards.length} cards</b>
            </button>
          </div>
          <div class="study-scope-panel">
            <h3>Study scope</h3>
            <div class="study-scope-controls">
              <label>CONTENT
                <select value={scopeType} onChange={event => setScopeType(event.currentTarget.value)}>
                  <option value="notebook">Whole notebook</option>
                  <option value="chapter" disabled={!chapters.length}>Chapter</option>
                </select>
              </label>
              {scopeType !== "notebook" && <label>CHAPTER
                <select value={scopeChapterId} onChange={event => setScopeChapterId(event.currentTarget.value)}>
                  {chapters.map(chapter => <option value={chapter.id}>{chapter.name}</option>)}
                </select>
              </label>}
            </div>
{studyType === "scheduled" && (
              <div class="study-queue-counts" aria-label="Card counts">
                <div class="study-queue-count new"><strong>{queueCounts.new}</strong><span>New</span></div>
                <div class="study-queue-count learning"><strong>{queueCounts.learning}</strong><span>Learning</span></div>
                <div class="study-queue-count review"><strong>{queueCounts.review}</strong><span>Review</span></div>
              </div>
            )}
            <div class="study-scope-summary"><span>{studyCards.length} cards in this session</span><span>{studyType === "scheduled" ? "Due cards only" : "All cards · timeline unchanged"}</span></div>
            <button class="study-primary study-start-button" disabled={!studyCards.length} onClick={() => setReviewing(true)}>
              <GraduationCap size={15} /> {studyCards.length ? "Start studying" : "No cards to study"}
            </button>
          </div>
        </div>
      )}
      {confirmAction && <div class="prompt-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setConfirmAction(null)}>
        <section class="prompt-panel" role="alertdialog" aria-modal="true">
          <div class="prompt-heading"><h2>{confirmAction.title}</h2><button type="button" aria-label="Close" onClick={() => setConfirmAction(null)}><X size={16} /></button></div>
          <p>{confirmAction.message}</p>
          <div class="prompt-actions"><button type="button" class="prompt-cancel" onClick={() => setConfirmAction(null)}>Cancel</button><button type="button" class="prompt-confirm prompt-danger" onClick={() => { confirmAction.action(); setConfirmAction(null); }}>Delete</button></div>
        </section>
      </div>}
    </section>
  );
}
