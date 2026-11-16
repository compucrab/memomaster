import { useEffect, useMemo, useState } from "preact/hooks";
import { Check, Clock3, RotateCw } from "lucide-preact";
import { renderMarkdown } from "../services/markdown";
import { getReviewOptions, scheduleReview } from "../services/fsrs";

function isDue(card, now) {
  if (!card.fsrs?.due) return true;
  const due = new Date(card.fsrs.due);
  return Number.isNaN(due.getTime()) || due <= now;
}

export default function ReviewSession({ cards, mode = "scheduled", onReview, onExit }) {
  const [queue, setQueue] = useState(() => {
    const now = new Date();
    return cards.filter((card) => mode === "unscheduled" || isDue(card, now))
      .sort((a, b) => new Date(a.fsrs?.due || 0) - new Date(b.fsrs?.due || 0))
      .map((card) => card.id);
  });
  const [pendingCards, setPendingCards] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [repeatDelay, setRepeatDelay] = useState("3");
  const activeCard = cards.find((card) => card.id === queue[0]);
  const now = new Date();
  const options = useMemo(
    () => activeCard && mode === "scheduled" ? getReviewOptions(activeCard, now) : null,
    [activeCard?.id, activeCard?.fsrs, queue.length],
  );

  // Delays are preferences, not blockers: release waiting cards whenever the
  // active queue becomes empty, or when their individual timer expires.
  useEffect(() => {
    if (!pendingCards.length) return;
    if (!queue.length) {
      setQueue((items) => [...items, ...pendingCards.map((item) => item.id)]);
      setPendingCards([]);
      return;
    }
    const timers = pendingCards.map((item) => setTimeout(() => {
      setQueue((items) => [...items, item.id]);
      setPendingCards((items) => items.filter((pending) => pending.id !== item.id));
    }, Math.max(0, item.dueAt - Date.now())));
    return () => timers.forEach(clearTimeout);
  }, [pendingCards, queue.length]);

  function removeActiveCard() {
    setQueue((items) => items.slice(1));
    setRevealed(false);
  }

  function finishCard(choice) {
    if (!activeCard) return;
    if (mode === "scheduled") {
      const result = scheduleReview(activeCard, choice, new Date());
      onReview(activeCard.id, result.fsrs, result.log, mode);
      if (choice === "forgot") {
        setPendingCards((items) => [...items, {
          id: activeCard.id,
          dueAt: new Date(result.fsrs.due).getTime(),
        }]);
      }
    } else {
      onReview(activeCard.id, null, {
        cardId: activeCard.id,
        rating: "done",
        review: new Date().toISOString(),
      }, mode);
    }
    setReviewed((count) => count + 1);
    removeActiveCard();
  }

  function repeatCard() {
    if (!activeCard) return;
    setPendingCards((items) => [...items, {
      id: activeCard.id,
      dueAt: Date.now() + Number(repeatDelay) * 60 * 1000,
    }]);
    removeActiveCard();
  }

  if (!queue.length && !pendingCards.length) {
    return (
      <section class="review-session">
        <header class="review-session-header"><button class="back-link" onClick={onExit}>← BACK TO NOTEBOOK</button></header>
        <div class="review-complete">
          <Check size={30} />
          <h1>{reviewed ? "Review complete" : "Nothing due right now"}</h1>
          <p>{reviewed ? `You reviewed ${reviewed} ${reviewed === 1 ? "card" : "cards"}.` : "All caught up. New cards and due reviews will appear here."}</p>
          <button class="study-primary" onClick={onExit}>Back to notebook</button>
        </div>
      </section>
    );
  }

  if (!activeCard) {
    return (
      <section class="review-session">
        <header class="review-session-header"><button class="back-link" onClick={onExit}>← EXIT REVIEW</button><span>{mode === "scheduled" ? "SCHEDULED" : "UNSCHEDULED"} · WAITING</span></header>
        <div class="review-complete">
          <Clock3 size={30} />
          <h1>Reviewing again shortly</h1>
          <p>{pendingCards.length} {pendingCards.length === 1 ? "card is" : "cards are"} queued to repeat. You won't have to wait if there are no other cards to review.</p>
          <button class="study-secondary" onClick={onExit}>Exit review</button>
        </div>
      </section>
    );
  }

  return (
    <section class="review-session">
      <header class="review-session-header">
        <button class="back-link" onClick={onExit}>← EXIT REVIEW</button>
        <span>{mode === "scheduled" ? "SCHEDULED" : "UNSCHEDULED"} · {reviewed} DONE · {queue.length + pendingCards.length} LEFT</span>
      </header>
      <div class="review-progress"><i style={{ width: `${(reviewed / (reviewed + queue.length + pendingCards.length)) * 100}%` }} /></div>
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
              <button class="review-rating forgot" onClick={() => finishCard("forgot")}><strong>Forgot</strong><span>{options.forgot.interval}</span></button>
              <button class="review-rating difficult" onClick={() => finishCard("difficult")}><strong>Difficult</strong><span>{options.difficult.interval}</span></button>
              <button class="review-rating easy" onClick={() => finishCard("easy")}><strong>Easy</strong><span>{options.easy.interval}</span></button>
            </div>
          </div>
        ) : (
          <div class="review-ratings unscheduled-actions">
            <p>What would you like to do with this card?</p>
            <div class="unscheduled-review-options">
              <label class="repeat-delay-control">Repeat after
                <select value={repeatDelay} onChange={(event) => setRepeatDelay(event.currentTarget.value)}>
                  <option value="3">3 minutes</option>
                  <option value="5">5 minutes</option>
                </select>
              </label>
              <button class="review-rating difficult" onClick={repeatCard}><strong>Repeat</strong><span>Show again in {repeatDelay} min</span></button>
              <button class="review-rating easy" onClick={() => finishCard("done")}><strong>Done</strong><span>Mark as reviewed</span></button>
            </div>
          </div>
        )}
      </div>
      <footer class="review-session-footer"><Clock3 size={13} /> {mode === "scheduled" ? "FSRS updates your schedule · repeat delays won't block the session" : "Practice only · scheduled due dates remain unchanged"}</footer>
    </section>
  );
}
