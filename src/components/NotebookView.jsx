import { useMemo, useState } from "preact/hooks";
import {
  ArrowLeft, BookOpen, GraduationCap, Layers3, Plus, Search, PencilLine,
} from "lucide-preact";
import { renderMarkdown } from "../services/markdown";
import CardEditor from "./CardEditor";
import ReviewSession from "./ReviewSession";
import { findSimilarQuestion } from "../services/questionSimilarity";

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
  const [topicFilter, setTopicFilter] = useState("all");
  const [editingCardId, setEditingCardId] = useState(null);
  const [studyType, setStudyType] = useState("scheduled");
  const [scopeType, setScopeType] = useState("notebook");
  const [scopeChapterId, setScopeChapterId] = useState(chapters[0]?.id || "");
  const [scopeTopicId, setScopeTopicId] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [newCard, setNewCard] = useState(null);

  const editingCard = cards.find(card => card.id === editingCardId) || (newCard?.id === editingCardId ? newCard : null);
  const filterTopics = chapters.find(chapter => chapter.id === chapterFilter)?.topics || [];
  const scopeTopics = chapters.find(chapter => chapter.id === scopeChapterId)?.topics || [];

  const visibleCards = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return cards.filter(card => {
      const chapter = chapters.find(item => item.id === card.chapterId);
      const topic = chapter?.topics?.find(item => item.id === card.topicId);
      const matchesSearch = !needle || [card.front, card.back, chapter?.name, topic?.name]
        .some(value => String(value || "").toLocaleLowerCase().includes(needle));
      const matchesChapter = chapterFilter === "all" || card.chapterId === chapterFilter;
      const matchesTopic = topicFilter === "all" || card.topicId === topicFilter;
      return matchesSearch && matchesChapter && matchesTopic;
    });
  }, [cards, chapters, search, chapterFilter, topicFilter]);

  const selectedCard = visibleCards.find(card => card.id === selectedCardId) || visibleCards[0] || null;

  const scopedCards = useMemo(() => cards.filter(card => {
    if (scopeType === "chapter") return card.chapterId === scopeChapterId;
    if (scopeType === "topic") return card.chapterId === scopeChapterId && card.topicId === scopeTopicId;
    return true;
  }), [cards, scopeType, scopeChapterId, scopeTopicId]);
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

  function addTopic(chapterId) {
    onRequestText({
      title: "New topic", placeholder: "Topic name", submitLabel: "Create topic",
      onSubmit: name => {
        const title = name.trim();
        if (!title) return "Please enter a topic name.";
        const parent = chapters.find((chapter) => chapter.id === chapterId);
        if (parent?.topics?.some((topic) => normalizeName(topic.name) === normalizeName(title))) return "This chapter already has a topic with that name.";
        const next = chapters.map(chapter => chapter.id === chapterId
          ? { ...chapter, topics: [...(chapter.topics || []), { id: makeId(), name: title }] }
          : chapter);
        onUpdate({ chapters: next });
      },
    });
  }

  if (editingCard) {
    return <CardEditor key={editingCard.id} card={editingCard} chapters={chapters}
      onSave={saveCard} existingCards={cards} onCancel={() => { setEditingCardId(null); setNewCard(null); }}
      onAddChapter={addChapter} onAddTopic={addTopic} />;
  }

  if (reviewing) {
    return <ReviewSession key={`${studyType}-${scopeType}-${scopeChapterId}-${scopeTopicId}`}
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
                <select value={chapterFilter} onChange={event => { setChapterFilter(event.currentTarget.value); setTopicFilter("all"); }}>
                  <option value="all">All chapters</option>
                  {chapters.map(chapter => <option value={chapter.id}>{chapter.name}</option>)}
                </select>
                <select value={topicFilter} onChange={event => setTopicFilter(event.currentTarget.value)} disabled={chapterFilter === "all" || !filterTopics.length}>
                  <option value="all">All topics</option>
                  {filterTopics.map(topic => <option value={topic.id}>{topic.name}</option>)}
                </select>
              </div>
              <div class="browse-list-count">{visibleCards.length} OF {cards.length} CARDS</div>
            </div>
            <div class="browse-card-list">
              {visibleCards.length ? visibleCards.map((card, index) => {
                const chapter = chapters.find(item => item.id === card.chapterId);
                const topic = chapter?.topics?.find(item => item.id === card.topicId);
                return <button key={card.id} class={`browse-card-row ${selectedCard?.id === card.id ? "selected" : ""}`} onClick={() => setSelectedCardId(card.id)}>
                  <span class="browse-card-index">{String(index + 1).padStart(2, "0")}</span>
                  <span class="browse-card-copy"><strong>{String(card.front || "").replace(/[#>*_\x60]/g, "").trim().split("\n")[0] || "Untitled question"}</strong><small>{topic?.name || chapter?.name || "Unassigned"}</small></span>
                </button>;
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
                  {chapters.find(item => item.id === selectedCard.chapterId)?.name || "No chapter"}
                  <span>·</span>
                  {chapters.find(item => item.id === selectedCard.chapterId)?.topics?.find(item => item.id === selectedCard.topicId)?.name || "No topic"}
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
                  <option value="topic" disabled={!chapters.some(chapter => chapter.topics?.length)}>Topic</option>
                </select>
              </label>
              {scopeType !== "notebook" && <label>CHAPTER
                <select value={scopeChapterId} onChange={event => { setScopeChapterId(event.currentTarget.value); setScopeTopicId(""); }}>
                  {chapters.map(chapter => <option value={chapter.id}>{chapter.name}</option>)}
                </select>
              </label>}
              {scopeType === "topic" && <label>TOPIC
                <select value={scopeTopicId} onChange={event => setScopeTopicId(event.currentTarget.value)}>
                  <option value="">Choose a topic</option>
                  {scopeTopics.map(topic => <option value={topic.id}>{topic.name}</option>)}
                </select>
              </label>}
            </div>
            <div class="study-scope-summary"><span>{studyCards.length} cards in this session</span><span>{studyType === "scheduled" ? "Due cards only" : "All cards · timeline unchanged"}</span></div>
            <button class="study-primary study-start-button" disabled={!studyCards.length || (scopeType === "topic" && !scopeTopicId)} onClick={() => setReviewing(true)}>
              <GraduationCap size={15} /> {studyCards.length ? "Start studying" : "No cards to study"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
