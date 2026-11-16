import { useEffect, useState } from "preact/hooks";
import { ArrowLeft, ChevronLeft, ChevronRight, Layers3, Plus } from "lucide-preact";
import Flashcard from "./Flashcard";

function makeCard() {
  return { id: crypto.randomUUID(), front: "## Your question\n\nWrite a prompt here.", back: "Write the answer here.", chapterId: "", topicId: "" };
}
function makeId() { return crypto.randomUUID(); }

export default function NotebookView({ notebook, onUpdate, onBack, onRequestText }) {
  const cards = notebook.flashcards ?? (notebook.markdown ? [{ id: "legacy-card", front: "What is this note about?", back: notebook.markdown }] : []);
  const chapters = Array.isArray(notebook.chapters) ? notebook.chapters : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [editing, setEditing] = useState(false);
  const activeCard = cards[activeIndex];

  useEffect(() => {
    if (activeIndex >= cards.length) setActiveIndex(Math.max(0, cards.length - 1));
  }, [cards.length, activeIndex]);

  function updateCard(changes) {
    const next = cards.map((card, index) => index === activeIndex ? { ...card, ...changes } : card);
    onUpdate({ flashcards: next, cards: next.length, markdown: undefined });
  }
  function addCard() {
    const next = [...cards, makeCard()];
    onUpdate({ flashcards: next, cards: next.length });
    setActiveIndex(next.length - 1);
    setShowBack(false);
    setEditing(true);
  }
  function addChapter() {
    onRequestText({
      title: "New chapter",
      placeholder: "Chapter name",
      onSubmit: (name) => {
        if (!name.trim()) return;
        onUpdate({ chapters: [...chapters, { id: makeId(), name: name.trim(), topics: [] }] });
      },
    });
  }
  function addTopic(chapterId) {
    onRequestText({
      title: "New topic",
      placeholder: "Topic name",
      onSubmit: (name) => {
        if (!name.trim()) return;
        const next = chapters.map((chapter) => chapter.id === chapterId
          ? { ...chapter, topics: [...(chapter.topics || []), { id: makeId(), name: name.trim() }] }
          : chapter);
        onUpdate({ chapters: next });
      },
    });
  }
  function move(offset) {
    setActiveIndex((index) => Math.min(Math.max(index + offset, 0), cards.length - 1));
    setShowBack(false);
    setEditing(false);
  }

  return (
    <section class="workspace study-workspace">
      <header class="study-header">
        <button class="back-link" onClick={onBack}><ArrowLeft size={14} /> LIBRARY</button>
        <div class="study-notebook-name"><span>{notebook.title}</span><span>{cards.length} CARDS</span></div>
        <button class="study-add" onClick={addCard}><Plus size={14} /> Add card</button>
      </header>
      {activeCard ? (
        <div class="study-stage">
          <Flashcard
            card={activeCard}
            chapters={chapters}
            index={activeIndex}
            total={cards.length}
            showBack={showBack}
            editing={editing}
            onFlip={() => setShowBack((value) => !value)}
            onEdit={() => setEditing(true)}
            onChange={updateCard}
            onDone={() => setEditing(false)}
            onAddChapter={addChapter}
            onAddTopic={addTopic}
          />
          <footer class="study-navigation">
            <button class="study-nav-button" onClick={() => move(-1)} disabled={activeIndex === 0}><ChevronLeft size={17} /> Previous</button>
            <small class="study-count">{activeIndex + 1} / {cards.length}</small>
            <button class="study-nav-button" onClick={() => move(1)} disabled={activeIndex === cards.length - 1}>Next <ChevronRight size={17} /></button>
          </footer>
        </div>
      ) : (
        <div class="study-empty">
          <Layers3 size={30} />
          <h1>A fresh page.</h1>
          <p>This notebook has no flashcards yet. Create one to begin studying.</p>
          <button class="study-primary" onClick={addCard}><Plus size={15} /> Create first card</button>
        </div>
      )}
    </section>
  );
}
