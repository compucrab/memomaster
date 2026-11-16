import { ArrowLeft, BookOpen, Plus, Layers3 } from "lucide-preact";
import Flashcard from "./Flashcard";

function makeCard() {
  return { id: crypto.randomUUID(), front: "## Your question\n\nWrite a prompt here.", back: "Write the answer here." };
}

export default function NotebookView({ notebook, onUpdate, onBack }) {
  const cards = notebook.flashcards ?? (notebook.markdown ? [{ id: "legacy-card", front: "What is this note about?", back: notebook.markdown }] : []);

  function updateCard(id, changes) {
    const next = cards.map((card) => card.id === id ? { ...card, ...changes } : card);
    onUpdate({ flashcards: next, cards: next.length, markdown: undefined });
  }
  function addCard() {
    const next = [...cards, makeCard()];
    onUpdate({ flashcards: next, cards: next.length });
  }
  function deleteCard(id) {
    const next = cards.filter((card) => card.id !== id);
    onUpdate({ flashcards: next, cards: next.length });
  }

  return (
    <section class="workspace notebook-workspace">
      <button class="back-link" onClick={onBack}><ArrowLeft size={14} /> ALL NOTEBOOKS</button>
      <div class="notebook-detail-head">
        <i style={{ backgroundColor: notebook.color }} />
        <div>
          <p class="eyebrow">NOTEBOOK / COLLECTION</p>
          <h1>{notebook.title}</h1>
          <input value={notebook.description} onInput={(event) => onUpdate({ description: event.currentTarget.value })} aria-label="Notebook description" />
        </div>
      </div>
      <div class="notebook-detail-meta">
        <span><BookOpen size={14} /> {notebook.chapters} CHAPTERS</span>
        <span><Layers3 size={14} /> {cards.length} FLASHCARDS</span>
      </div>
      <div class="cards-heading">
        <div><p class="eyebrow">ACTIVE COLLECTION</p><h2>Knowledge, one card at a time.</h2></div>
        <button class="button-primary" onClick={addCard}><Plus size={15} /> Add flashcard</button>
      </div>
      <div class="flashcard-list">
        {cards.length ? cards.map((card, index) => (
          <Flashcard key={card.id} card={card} index={index}
            onChange={(changes) => updateCard(card.id, changes)}
            onDelete={() => deleteCard(card.id)} />
        )) : (
          <div class="empty-cards">
            <Layers3 size={26} /><h3>Your first flashcard is waiting.</h3>
            <p>Add a question on the front and its answer on the back.</p>
            <button class="button-primary" onClick={addCard}><Plus size={15} /> Create flashcard</button>
          </div>
        )}
      </div>
    </section>
  );
}
