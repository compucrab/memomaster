import { useRef, useState } from "preact/hooks";
import { State } from "ts-fsrs";
import { Check, RotateCw } from "lucide-preact";
import CardContent from "./CardContent";
import { getReviewOptions, scheduleReview } from "../services/fsrs";

const SHORT_TERM_WINDOW = 10 * 60 * 1000;

function isShortTermPending(card, now) {
  if (!card.fsrs?.due) return false;
  const due = new Date(card.fsrs.due);
  const remaining = due.getTime() - now.getTime();
  return Number.isFinite(remaining) && remaining > 0 && remaining <= SHORT_TERM_WINDOW;
}

function isDue(card, now) {
  if (!card.fsrs?.due) return true;
  const due = new Date(card.fsrs.due);
  return Number.isNaN(due.getTime()) || due <= now;
}

export default function ReviewSession({ cards, mode = "scheduled", settings, media = [], onReview, onComplete, scopeType, scopeChapterId, onExit }) {
  const [sessionCards, setSessionCards] = useState(() => cards.map((card) => ({ ...card })));
  const [queue, setQueue] = useState(() => {
    const now = new Date();
    const priority = (card) => {
      const state = card.fsrs?.state ?? State.New;
      if (state === State.Learning || state === State.Relearning) return 0;
      if (state === State.Review) return 1;
      return 2;
    };
    return cards.filter((card) => mode === "unscheduled" || isDue(card, now) || isShortTermPending(card, now))
      .sort((a, b) => mode === "scheduled"
        ? priority(a) - priority(b) || new Date(a.fsrs?.due || 0) - new Date(b.fsrs?.due || 0)
        : 0)
      .map((card) => card.id);
  });
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const reviewedCardIds = useRef(new Set());
  const [processing, setProcessing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const activeCard = sessionCards.find((card) => card.id === queue[0]);
  const options = activeCard && mode === "scheduled"
    ? getReviewOptions(activeCard, new Date(), settings)
    : null;

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
        const reviewedAt = new Date();
        const result = scheduleReview(activeCard, choice, reviewedAt, settings);
        onReview(activeCard.id, result.fsrs, result.log, mode);
        reviewedCardIds.current.add(activeCard.id);
        setSessionCards((items) => items.map((card) => card.id === activeCard.id ? { ...card, fsrs: result.fsrs } : card));
        setReviewed((count) => count + 1);
        if (isShortTermPending({ fsrs: result.fsrs }, reviewedAt)) {
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
      if (mode === "scheduled" && queue.length === 1) {
        onComplete?.({
          completedAt: new Date().toISOString(),
          reviewedCards: reviewedCardIds.current.size,
          scopeType,
          chapterId: scopeType === "chapter" ? scopeChapterId : null,
        });
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
      </header>
      <div class="review-card">
        <div class="review-card-content">
          <section class="review-card-side review-question">
            <p class="study-side-label">QUESTION</p>
            <CardContent content={activeCard.front} />
          </section>
          {revealed && (
            <>
              <div class="review-answer-divider" role="separator" />
              <section class="review-card-side review-answer">
                <p class="study-side-label">ANSWER</p>
                <CardContent content={activeCard.back} />
              </section>
            </>
          )}
        </div>
        {!revealed ? (
          <div class="study-card-actions">
            <button class="study-primary" onClick={() => setRevealed(true)}><RotateCw size={15} /> Reveal answer</button>
          </div>
        ) : mode === "scheduled" ? (
          <div class="review-ratings">
            <p>How well did you remember?</p>
            <div class="review-rating-options">
              <button disabled={processing} class="review-rating forgot" onClick={() => finishCard("forgot")}><strong>Again</strong><span>{options.forgot.interval}</span></button>
              <button disabled={processing} class="review-rating difficult" onClick={() => finishCard("difficult")}><strong>Hard</strong><span>{options.difficult.interval}</span></button>
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
      {reviewError && <p class="review-error" role="alert">{reviewError}</p>}
    </section>
  );
}
