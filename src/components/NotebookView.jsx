import { useMemo, useState } from "preact/hooks";
import {
  ArrowLeft, BookOpen, GraduationCap, Layers3, Plus, Search, PencilLine, Trash2, X,
} from "lucide-preact";
import { renderMarkdown } from "../services/markdown";
import CardEditor from "./CardEditor";
import ReviewSession from "./ReviewSession";

function makeCard() {
  return { id: crypto.randomUUID(), front: "## Your question\n\nWrite a prompt here.", back: "Write the answer here.", chapterId: "", topicId: "" };
}
const makeId = () => crypto.randomUUID();
const normalizeName = (value) => String(value || "").trim().toLocaleLowerCase();

export default function NotebookView({ notebook, onUpdate, onBack, onRequestText }) {
  const cards = notebook.flashcards ?? (notebook.markdown ? [{ id: "legacy-card", front: "What is this note about?", back: notebook.markdown }] : []);
  const chapters = Array.isArray(notebook.chapters) ? notebook.chapters : [];
  const [tab, setTab] = useState("browse");
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id || null);
  const [search, setSearch] = useState("");
  const [chapterFilter, setChapterFilter] = useState("all");
  const [editingCardId, setEditingCardId] = useState(null);
  const [studyType, setStudyType] = useState("scheduled");
  const [scopeType, setScopeType] = useState("notebook");
  const [scopeChapterId, setScopeChapterId] = useState(chapters[0]?.id || "");
  const [reviewing, setReviewing] = useState(false);
  const [newCard, setNewCard] = useState(null);
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);
  const [targetChapterId, setTargetChapterId] = useState("");

  const editingCard = cards.find(card => card.id === editingCardId) || (newCard?.id === editingCardId ? newCard : null);

  const visibleCards = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return cards.filter(card => {
      const chapter = chapters.find(item => item.id === card.chapterId);
      const matchesSearch = !needle || [card.front, card.back, chapter?.name]
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
  const dueCards = scopedCards.filter(card => !card.fsrs?.due || new Date(card.fsrs.due) <= new Date());
  const studyCards = studyType === "scheduled" ? dueCards : scopedCards;

  function handleReview(cardId, fsrs, log, mode) {
    const next = cards.map(card => card.id === cardId && mode === "scheduled" ? { ...card, fsrs } : card);
    const changes = { flashcards: next, cards: next.length };
    if (mode === "scheduled") changes.reviewHistory = [...(notebook.reviewHistory || []), log];
    else changes.practiceHistory = [...(notebook.practiceHistory || []), log];
    onUpdate(changes);
  }

  function saveCard(draft) {
    const next = cards.some(card => card.id === draft.id)
      ? cards.map(card => card.id === draft.id ? { ...card, ...draft } : card)
      : [...cards, draft];
    onUpdate({ flashcards: next, cards: next.length, markdown: undefined });
    setSelectedCardId(draft.id);
    setNewCard(null);
    setEditingCardId(null);
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
  function toggleCardSelection(id) {
    setSelectedCardIds((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
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
        const chapter = { id: makeId(), name: title, topics: [] };
        onUpdate({ chapters: [...chapters, chapter] });
        setScopeChapterId(chapter.id);
      },
    });
  }

  if (editingCard) {
    return <CardEditor key={editingCard.id} card={editingCard} chapters={chapters}
      onSave={saveCard} existingCards={cards} onCancel={() => { setEditingCardId(null); setNewCard(null); }}
      onAddChapter={addChapter} onDelete={() => askDelete("Delete card?", "This card and its review history will be permanently deleted.", () => { deleteCards([editingCard.id]); setEditingCardId(null); })} />;
  }

  if (reviewing) {
    return <ReviewSession key={`${studyType}-${scopeType}-${scopeChapterId}`}
      cards={studyCards} mode={studyType}
      onReview={handleReview} onExit={() => setReviewing(false)} />;
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
                    ? { ...card, chapterId: targetChapterId === "__unassigned" ? "" : targetChapterId, topicId: "" }
                    : card);
                  onUpdate({ flashcards: next, cards: next.length });
                  setSelectedCardIds([]);
                  setTargetChapterId("");
                }}>Move</button>
                <button type="button" onClick={() => setSelectedCardIds([])}>Clear</button>
                <button type="button" class="delete-selected" onClick={() => askDelete("Delete selected cards?", "Permanently delete " + selectedCardIds.length + " selected cards?", () => deleteCards(selectedCardIds))}><Trash2 size={12} /> Delete</button>
              </div>}
            </div>
            <div class="browse-card-list">
              {visibleCards.length ? visibleCards.map((card, index) => {
                const chapter = chapters.find(item => item.id === card.chapterId);
                return (
                  <div key={card.id} class={`browse-card-row ${selectedCard?.id === card.id ? "selected" : ""} ${selectedCardIds.includes(card.id) ? "checked" : ""}`}>
                    <input class="browse-card-checkbox" type="checkbox" aria-label="Select card" checked={selectedCardIds.includes(card.id)} onChange={() => toggleCardSelection(card.id)} />
                    <button type="button" class="browse-card-select" onClick={() => setSelectedCardId(card.id)}>
                      <span class="browse-card-index">{String(index + 1).padStart(2, "0")}</span>
                      <span class="browse-card-copy"><strong>{String(card.front || "").replace(/[#>*_\x60]/g, "").trim().split("\n")[0] || "Untitled question"}</strong><small>{chapter?.name || "Unassigned"}</small></span>
                    </button>
                  </div>
                );
              }) : <div class="browse-list-empty">{cards.length ? "No cards match your search." : "No cards in this notebook yet."}</div>}
            </div>
          </aside>

          <section class="browse-preview-panel">
            {selectedCard ? (
              <>
                <header class="browse-preview-header"><span>CARD PREVIEW</span><button class="study-secondary" onClick={() => setEditingCardId(selectedCard.id)}><PencilLine size={13} /> Edit card</button></header>
                <div class="browse-preview-content">
                  <section><p>QUESTION</p><div class="study-card-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedCard.front) }} /></section>
                  <div class="browse-preview-divider" />
                  <section><p>ANSWER</p><div class="study-card-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedCard.back) }} /></section>
                </div>
                <footer class="browse-preview-meta">
                  {chapters.find(item => item.id === selectedCard.chapterId)?.name || "Unassigned"}
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
