import { useEffect, useMemo, useState } from "preact/hooks";
import { State } from "ts-fsrs";
import { Check, Clock3, RotateCw } from "lucide-preact";
import CardContent from "./CardContent";
import { formatInterval, getReviewOptions, scheduleReview } from "../services/fsrs";

function isDue(card, now) {
  if (!card.fsrs?.due) return true;
  const due = new Date(card.fsrs.due);
  return Number.isNaN(due.getTime()) || due <= now;
}

export default function ReviewSession({ cards, mode = "scheduled", settings, onReview, onExit }) {
  const [sessionCards, setSessionCards] = useState(() => cards.map((card) => ({ ...card })));
  const [queue, setQueue] = useState(() => {
    const now = new Date();
    return cards.filter((card) => mode === "unscheduled" || isDue(card, now))
      .sort((a, b) => new Date(a.fsrs?.due || 0) - new Date(b.fsrs?.due || 0))
      .map((card) => card.id);
  });
  const [pending, setPending] = useState([]);
  const [clockNow, setClockNow] = useState(() => new Date());
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const activeCard = sessionCards.find((card) => card.id === queue[0]);
  const options = useMemo(
    () => activeCard && mode === "scheduled" ? getReviewOptions(activeCard, clockNow, settings) : null,
    [activeCard?.id, activeCard?.fsrs, clockNow, settings],
  );

  useEffect(() => {
    if (!pending.length) return undefined;
    const timer = window.setInterval(() => {
      const now = new Date();
      setClockNow(now);
      const dueIds = pending.filter((id) => {
        const card = sessionCards.find((item) => item.id === id);
        return card && isDue(card, now);
      });
      if (dueIds.length) {
        setQueue((items) => [...items, ...dueIds.filter((id) => !items.includes(id))]);
        setPending((items) => items.filter((id) => !dueIds.includes(id)));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pending, sessionCards]);

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
        setSessionCards((items) => items.map((card) => card.id === activeCard.id ? { ...card, fsrs: result.fsrs } : card));
        setReviewed((count) => count + 1);
        const inLearningStep = result.fsrs.state === State.Learning || result.fsrs.state === State.Relearning;
        if (inLearningStep && new Date(result.fsrs.due) > reviewedAt) {
          setPending((items) => items.includes(activeCard.id) ? items : [...items, activeCard.id]);
          removeActiveCard();
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

  if (!queue.length && pending.length) {
    const nextCard = pending.map((id) => sessionCards.find((card) => card.id === id)).filter(Boolean)
      .sort((a, b) => new Date(a.fsrs.due) - new Date(b.fsrs.due))[0];
    const remaining = Math.max(0, new Date(nextCard?.fsrs?.due || clockNow).getTime() - clockNow.getTime());
    return (
      <section class="review-session">
        <header class="review-session-header"><button class="back-link" onClick={onExit}>← EXIT REVIEW</button><span>LEARNING STEP · {pending.length} WAITING</span></header>
        <div class="review-complete review-waiting">
          <Clock3 size={30} />
          <h1>Learning step in progress</h1>
          <p>The next card will return when its scheduled learning step is due.</p>
          <strong>{formatInterval(new Date(clockNow.getTime() + remaining), clockNow)}</strong>
          <small>Next due: {nextCard?.fsrs?.due ? new Date(nextCard.fsrs.due).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</small>
          <button class="study-primary" onClick={onExit}>Finish session for now</button>
        </div>
      </section>
    );
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
        <span>{mode === "scheduled" ? "SCHEDULED" : "UNSCHEDULED"} · {reviewed} REVIEWS · {queue.length + pending.length} LEFT</span>
      </header>
      <div class="review-progress"><i style={{ width: `${(reviewed / (reviewed + queue.length + pending.length)) * 100}%` }} /></div>
      <div class="review-card">
        <div class="review-card-content">
          <p class="study-side-label">{revealed ? "ANSWER" : "QUESTION"}</p>
          <CardContent content={revealed ? activeCard.back : activeCard.front} />
        </div>
        {!revealed ? (
          <div class="study-card-actions">
            <button class="study-primary" onClick={() => setRevealed(true)}><RotateCw size={15} /> Reveal answer</button>
          </div>
        ) : mode === "scheduled" ? (
          <div class="review-ratings">
            <p>How well did you remember?</p>
            <div class="review-rating-options">
              <button disabled={processing} class="review-rating forgot" onClick={() => finishCard("forgot")}><strong>Forgot</strong><span>{options.forgot.interval} · relearn</span></button>
              <button disabled={processing} class="review-rating difficult" onClick={() => finishCard("difficult")}><strong>Difficult</strong><span>{options.difficult.interval}</span></button>
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
      <footer class="review-session-footer"><Clock3 size={13} /> {mode === "scheduled" ? "Forgot enters a timed relearning step; Hard is a successful recall and does not repeat automatically." : "Practice only · scheduled due dates remain unchanged"}</footer>
    </section>
  );
}
