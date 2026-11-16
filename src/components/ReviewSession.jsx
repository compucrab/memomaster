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
  const [queue, setQueue] = useState(() => {
    const now = new Date();
    return cards.filter((card) => mode === "unscheduled" || isDue(card, now))
      .sort((a, b) => new Date(a.fsrs?.due || 0) - new Date(b.fsrs?.due || 0))
      .map((card) => card.id);
  });
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [repeatDelay, setRepeatDelay] = useState("3");
  const [pendingRepeats, setPendingRepeats] = useState(0);
  const activeCard = cards.find((card) => card.id === queue[0]);
  const now = new Date();
  const options = useMemo(
    () => activeCard && mode === "scheduled" ? getReviewOptions(activeCard, now) : null,
    [activeCard?.id, activeCard?.fsrs, queue.length],
  );

  function finishCard(choice) {
    if (!activeCard) return;
    if (mode === "scheduled") {
      const result = scheduleReview(activeCard, choice, new Date());
      onReview(activeCard.id, result.fsrs, result.log, mode);
    } else {
      onReview(activeCard.id, null, {
        cardId: activeCard.id,
        rating: "done",
        review: new Date().toISOString(),
      }, mode);
    }
    setReviewed((count) => count + 1);
    setQueue((items) => items.slice(1));
    setRevealed(false);
  }

  function repeatCard() {
    if (!activeCard) return;
    const cardId = activeCard.id;
    const delay = Number(repeatDelay) * 60 * 1000;
    setQueue((items) => items.slice(1));
    setPendingRepeats((count) => count + 1);
    setRevealed(false);
    setTimeout(() => {
      setQueue((items) => [...items, cardId]);
      setPendingRepeats((count) => Math.max(0, count - 1));
    }, delay);
  }

  if (!queue.length && pendingRepeats === 0) {
    return (
      <section class="review-session">
        <header class="review-session-header"><button class="back-link" onClick={onExit}>← BACK TO NOTEBOOK</button></header>
        <div class="review-complete">
          <Check size={30} />
          <h1>{reviewed ? "Review complete" : "Nothing due right now"}</h1>
          <p>{reviewed ? `You marked ${reviewed} ${reviewed === 1 ? "card" : "cards"} as done.` : "All caught up. New cards and due reviews will appear here."}</p>
          <button class="study-primary" onClick={onExit}>Back to notebook</button>
        </div>
      </section>
    );
  }

  if (!activeCard) {
    return (
      <section class="review-session">
        <header class="review-session-header"><button class="back-link" onClick={onExit}>← EXIT REVIEW</button><span>UNSCHEDULED · WAITING</span></header>
        <div class="review-complete">
          <Clock3 size={30} />
          <h1>Repeat queued</h1>
          <p>{pendingRepeats} {pendingRepeats === 1 ? "card will" : "cards will"} return when the repeat timer {pendingRepeats === 1 ? "ends" : "ends"}.</p>
          <button class="study-secondary" onClick={onExit}>Exit review</button>
        </div>
      </section>
    );
  }

  return (
    <section class="review-session">
      <header class="review-session-header">
        <button class="back-link" onClick={onExit}>← EXIT REVIEW</button>
        <span>{mode === "scheduled" ? "SCHEDULED" : "UNSCHEDULED"} · {reviewed} DONE · {queue.length + pendingRepeats} LEFT</span>
      </header>
      <div class="review-progress"><i style={{ width: `${(reviewed / (reviewed + queue.length + pendingRepeats)) * 100}%` }} /></div>
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
      <footer class="review-session-footer"><Clock3 size={13} /> {mode === "scheduled" ? "Your answers update the FSRS schedule" : "Practice only · scheduled due dates remain unchanged"}</footer>
    </section>
  );
}
