import { useEffect, useMemo, useState } from "preact/hooks";
import { State } from "ts-fsrs";
import { Check, Clock3, RotateCw } from "lucide-preact";
import CardContent from "./CardContent";
import { formatInterval, getReviewOptions, scheduleReview } from "../services/fsrs";

function getStudyDayEnd(now, rolloverHour) {
  const end = new Date(now);
  end.setHours(rolloverHour ?? 4, 0, 0, 0);
  if (end <= now) end.setDate(end.getDate() + 1);
  return end;
}

function isLearning(card) {
  return card.fsrs?.state === State.Learning || card.fsrs?.state === State.Relearning;
}

function isDue(card, now) {
  if (!card.fsrs?.due) return true;
  const due = new Date(card.fsrs.due);
  return Number.isNaN(due.getTime()) || due <= now;
}

function isLearningDueToday(card, now, studyDayEnd) {
  if (!isLearning(card) || !card.fsrs?.due) return false;
  const due = new Date(card.fsrs.due);
  return !Number.isNaN(due.getTime()) && due > now && due < studyDayEnd;
}

export default function ReviewSession({ cards, mode = "scheduled", settings, onReview, onExit }) {
  const [sessionCards, setSessionCards] = useState(() => cards.map((card) => ({ ...card })));
  const [studyDayEnd] = useState(() => getStudyDayEnd(new Date(), settings?.rolloverHour));
  const [queue, setQueue] = useState(() => {
    const now = new Date();
    const priority = (card) => {
      const state = card.fsrs?.state ?? State.New;
      if (state === State.Learning || state === State.Relearning) return 0;
      if (state === State.Review) return 1;
      return 2;
    };
    return cards.filter((card) => mode === "unscheduled" || isDue(card, now))
      .sort((a, b) => mode === "scheduled"
        ? priority(a) - priority(b) || new Date(a.fsrs?.due || 0) - new Date(b.fsrs?.due || 0)
        : 0)
      .map((card) => card.id);
  });
  const [pending, setPending] = useState(() => {
    const now = new Date();
    return mode === "scheduled" ? cards.filter((card) => isLearningDueToday(card, now, studyDayEnd)).map((card) => card.id) : [];
  });
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
      const dayEnd = studyDayEnd;
      const dayEnded = now >= dayEnd;
      const dueIds = dayEnded ? [] : pending.filter((id) => {
        const card = sessionCards.find((item) => item.id === id);
        return card && isDue(card, now);
      });
      const expiredIds = dayEnded ? pending : pending.filter((id) => {
        const card = sessionCards.find((item) => item.id === id);
        const due = new Date(card?.fsrs?.due);
        return !card || Number.isNaN(due.getTime()) || due >= dayEnd;
      });
      if (!queue.length || dueIds.length || expiredIds.length) setClockNow(now);
      if (dueIds.length) {
        setQueue((items) => [...items, ...dueIds.filter((id) => !items.includes(id))]);
      }
      if (dueIds.length || expiredIds.length) {
        const finishedIds = new Set([...dueIds, ...expiredIds]);
        setPending((items) => items.filter((id) => !finishedIds.has(id)));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pending, sessionCards, queue.length, studyDayEnd]);

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
        if (inLearningStep && isLearningDueToday({ fsrs: result.fsrs }, reviewedAt, studyDayEnd)) {
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
    const nextDue = pending
      .map((id) => sessionCards.find((card) => card.id === id)?.fsrs?.due)
      .filter(Boolean)
      .map((due) => new Date(due))
      .filter((due) => !Number.isNaN(due.getTime()))
      .sort((a, b) => a - b)[0];
    return (
      <section class="review-session">
        <header class="review-session-header"><button class="back-link" onClick={onExit}>← EXIT REVIEW</button><span>{reviewed} REVIEWS</span></header>
        <div class="review-complete">
          <Clock3 size={30} />
          <h1>Next card is not due yet</h1>
          <p>{nextDue ? "The next learning card is due at " + nextDue.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + ". It will return automatically." : "The remaining learning cards are scheduled for another study day."}</p>
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
