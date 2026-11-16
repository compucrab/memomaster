import { useMemo, useState } from "preact/hooks";
import { Check, Clock3, RotateCw } from "lucide-preact";
import { renderMarkdown } from "../services/markdown";
import { getReviewOptions, scheduleReview } from "../services/fsrs";

function isDue(card, now) {
  if (!card.fsrs?.due) return true;
  const due = new Date(card.fsrs.due);
  return Number.isNaN(due.getTime()) || due <= now;
}

export default function ReviewSession({ cards, mode = "scheduled", onReview, onExit }) {
  const [sessionCards, setSessionCards] = useState(() => cards.map((card) => ({ ...card })));
  const [queue, setQueue] = useState(() => {
    const now = new Date();
    return cards.filter((card) => mode === "unscheduled" || isDue(card, now))
      .sort((a, b) => new Date(a.fsrs?.due || 0) - new Date(b.fsrs?.due || 0))
      .map((card) => card.id);
  });
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const activeCard = sessionCards.find((card) => card.id === queue[0]);
  const now = new Date();
  const options = useMemo(
    () => activeCard && mode === "scheduled" ? getReviewOptions(activeCard, now) : null,
    [activeCard?.id, activeCard?.fsrs],
  );

  function removeActiveCard() {
    setQueue((items) => items.slice(1));
    setRevealed(false);
  }

  function finishCard(choice) {
    if (!activeCard || processing) return;
    setProcessing(true);
    setReviewError("");
    try {
      if (mode === "scheduled") {
        const result = scheduleReview(activeCard, choice, new Date());
        onReview(activeCard.id, result.fsrs, result.log, mode);
        setSessionCards((items) => items.map((card) => card.id === activeCard.id ? { ...card, fsrs: result.fsrs } : card));
        setReviewed((count) => count + 1);
        if (choice === "forgot" || choice === "difficult") {
          setQueue((items) => [...items.slice(1), activeCard.id]);
          setRevealed(false);
          return;
        }
      } else {
        onReview(activeCard.id, null, {
          cardId: activeCard.id,
          rating: "done",
          review: new Date().toISOString(),
        }, mode);
        setReviewed((count) => count + 1);
      }
      removeActiveCard();
    } catch (error) {
      console.error("Unable to save review:", error);
      setReviewError(error?.message || "This review could not be saved. Your card is still in the session.");
    } finally {
      setProcessing(false);
    }
  }

  function repeatCard() {
    if (!activeCard) return;
    setQueue((items) => [...items.slice(1), activeCard.id]);
    setRevealed(false);
  }

  if (!queue.length) {
    return (
      <section class="review-session">
        <header class="review-session-header"><button class="back-link" onClick={onExit}>← BACK TO NOTEBOOK</button></header>
        <div class="review-complete">
          <Check size={30} />
          <h1>{reviewed ? "Review complete" : "Nothing due right now"}</h1>
          <p>{reviewed ? `You completed ${reviewed} ${reviewed === 1 ? "review" : "reviews"}.` : "All caught up. New cards and due reviews will appear here."}</p>
          <button class="study-primary" onClick={onExit}>Back to notebook</button>
        </div>
      </section>
    );
  }

  if (!activeCard) {
    return <section class="review-session"><div class="review-complete"><h2>Review paused</h2><p>The current card could not be loaded. Exit and reopen the session.</p><button class="study-primary" onClick={onExit}>Back to notebook</button></div></section>;
  }

  return (
    <section class="review-session">
      <header class="review-session-header">
        <button class="back-link" onClick={onExit}>← EXIT REVIEW</button>
        <span>{mode === "scheduled" ? "SCHEDULED" : "UNSCHEDULED"} · {reviewed} REVIEWS · {queue.length} LEFT</span>
      </header>
      <div class="review-progress"><i style={{ width: `${(reviewed / (reviewed + queue.length)) * 100}%` }} /></div>
      <div class="review-card">
        <div class="review-card-content">
          <p class="study-side-label">{revealed ? "ANSWER" : "QUESTION"}</p>
          <div class="study-card-prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(revealed ? activeCard.back : activeCard.front) }} />
        </div>
        {!revealed ? (
          <div class="study-card-actions">
            <button class="study-primary" onClick={() => setRevealed(true)}><RotateCw size={15} /> Reveal answer</button>
          </div>
        ) : mode === "scheduled" ? (
          <div class="review-ratings">
            <p>How well did you remember?</p>
            <div class="review-rating-options">
              <button disabled={processing} class="review-rating forgot" onClick={() => finishCard("forgot")}><strong>Forgot</strong><span>{options.forgot.interval} · repeat</span></button>
              <button disabled={processing} class="review-rating difficult" onClick={() => finishCard("difficult")}><strong>Difficult</strong><span>{options.difficult.interval} · repeat</span></button>
              <button disabled={processing} class="review-rating good" onClick={() => finishCard("good")}><strong>Good</strong><span>{options.good.interval}</span></button>
              <button disabled={processing} class="review-rating easy" onClick={() => finishCard("easy")}><strong>Easy</strong><span>{options.easy.interval}</span></button>
            </div>
          </div>
        ) : (
          <div class="review-ratings unscheduled-actions">
            <p>What would you like to do with this card?</p>
            <div class="unscheduled-review-options">
              <button class="review-rating difficult" onClick={repeatCard}><strong>Repeat</strong><span>Show again after this queue</span></button>
              <button class="review-rating easy" onClick={() => finishCard("done")}><strong>Done</strong><span>Mark as reviewed</span></button>
            </div>
          </div>
        )}
      </div>
      <footer class="review-session-footer"><Clock3 size={13} /> {mode === "scheduled" ? "Forgot and Difficult repeat until Good or Easy completes the card" : "Practice only · scheduled due dates remain unchanged"}</footer>
    </section>
  );
}
