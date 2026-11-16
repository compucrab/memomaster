import { createEmptyCard, fsrs, Rating, State } from "ts-fsrs";
import { DEFAULT_FSRS_SETTINGS, normalizeFsrsSettings } from "./fsrsSettings.js";

export { DEFAULT_FSRS_SETTINGS, normalizeFsrsSettings };
export const REVIEW_RATINGS = {
  forgot: Rating.Again,
  difficult: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const DAY = 86400000;

function toDate(value, fallback) {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function studyDayIndex(value, rolloverHour) {
  const date = new Date(value);
  if (date.getHours() < rolloverHour) date.setDate(date.getDate() - 1);
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY);
}

// FSRS v5 measures elapsed days in fixed 24-hour blocks. Normalize review
// timestamps to study-day boundaries so the configured rollover is respected.
function toStudyTime(value, rolloverHour) {
  return new Date(studyDayIndex(value, rolloverHour) * DAY);
}

function fromStudyTime(value, rolloverHour) {
  const day = new Date(Math.floor(value.getTime() / DAY) * DAY);
  return new Date(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), rolloverHour);
}

function restoreDue(card, schedulerNow, actualNow, rolloverHour) {
  if (card.state === State.Learning || card.state === State.Relearning) {
    const delay = card.due.getTime() - schedulerNow.getTime();
    return new Date(actualNow.getTime() + delay);
  }
  return fromStudyTime(card.due, rolloverHour);
}

export function getFsrsCard(card, now = new Date()) {
  const stored = card?.fsrs;
  if (!stored) return createEmptyCard(now);
  return {
    ...stored,
    due: toDate(stored.due, now),
    last_review: toDate(stored.last_review, undefined),
  };
}

function makeScheduler(settings) {
  const config = normalizeFsrsSettings(settings);
  return fsrs({
    request_retention: config.desiredRetention,
    maximum_interval: config.maximumInterval,
    learning_steps: config.learningSteps,
    relearning_steps: config.relearningSteps,
    enable_short_term: true,
    enable_fuzz: false,
  });
}

function serializeDates(record, fields) {
  const result = { ...record };
  for (const field of fields) {
    if (result[field] instanceof Date) result[field] = result[field].toISOString();
  }
  return result;
}

function getScheduledCandidate(scheduler, card, choice, now, settings) {
  const config = normalizeFsrsSettings(settings);
  const schedulerNow = toStudyTime(now, config.rolloverHour);
  const current = getFsrsCard(card, now);
  const schedulerCard = {
    ...current,
    due: toStudyTime(current.due, config.rolloverHour),
    last_review: current.last_review ? toStudyTime(current.last_review, config.rolloverHour) : undefined,
  };
  const result = scheduler.repeat(schedulerCard, schedulerNow)[REVIEW_RATINGS[choice]];

  // ts-fsrs v5 applies maximum_interval before enforcing rating order.
  // That ordering can push Good/Easy one or more days above the cap.
  // Re-apply the cap after the rating-order adjustment for Review cards.
  if (result.card.state === State.Review && result.card.scheduled_days > config.maximumInterval) {
    result.card.scheduled_days = config.maximumInterval;
    result.card.due = new Date(schedulerNow.getTime() + config.maximumInterval * DAY);
  }

  return { result, schedulerNow, config };
}

export function formatInterval(due, now = new Date()) {
  const minutes = Math.max(0, Math.round((new Date(due).getTime() - now.getTime()) / 60000));
  if (minutes < 60) return minutes <= 1 ? "1 min" : `${minutes} mins`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour" : `${hours} hours`;
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? "1 day" : `${days} days`;
  const months = Math.round(days / 30);
  if (months < 12) return months === 1 ? "1 month" : `${months} months`;
  const years = Math.round(days / 365);
  return years === 1 ? "1 year" : `${years} years`;
}

function formatCandidateInterval(candidate, due, now) {
  if (candidate.state === State.Review && candidate.scheduled_days > 0) {
    const days = candidate.scheduled_days;
    if (days < 30) return days === 1 ? "1 day" : `${days} days`;
    const months = Math.round(days / 30);
    if (months < 12) return months === 1 ? "1 month" : `${months} months`;
    const years = Math.round(days / 365);
    return years === 1 ? "1 year" : `${years} years`;
  }
  return formatInterval(due, now);
}

export function getReviewOptions(card, now = new Date(), settings = DEFAULT_FSRS_SETTINGS) {
  const scheduler = makeScheduler(settings);
  return Object.fromEntries(Object.keys(REVIEW_RATINGS).map((choice) => {
    const { result, schedulerNow, config } = getScheduledCandidate(scheduler, card, choice, now, settings);
    const due = restoreDue(result.card, schedulerNow, now, config.rolloverHour);
    return [choice, { due, interval: formatCandidateInterval(result.card, due, now) }];
  }));
}

export function scheduleReview(card, choice, now = new Date(), settings = DEFAULT_FSRS_SETTINGS) {
  if (!REVIEW_RATINGS[choice]) throw new Error("Unknown review rating");
  const scheduler = makeScheduler(settings);
  const { result, schedulerNow, config } = getScheduledCandidate(scheduler, card, choice, now, settings);
  const nextCard = {
    ...result.card,
    due: restoreDue(result.card, schedulerNow, now, config.rolloverHour),
    last_review: now,
  };
  const current = getFsrsCard(card, now);
  const previousFsrs = card?.fsrs
    ? serializeDates(getFsrsCard(card, now), ["due", "last_review"])
    : null;
  const nextFsrs = serializeDates(nextCard, ["due", "last_review"]);
  const nextLog = {
    ...result.log,
    due: current.due,
    review: now,
    rating: choice,
    cardId: card.id,
    previousFsrs,
    nextFsrs,
    previousState: current.state,
    nextState: nextCard.state,
    previousStability: current.stability,
    nextStability: nextCard.stability,
    previousDifficulty: current.difficulty,
    nextDifficulty: nextCard.difficulty,
  };
  return {
    fsrs: nextFsrs,
    log: serializeDates(nextLog, ["due", "review"]),
  };
}

export function undoLatestReview(notebooks) {
  let latest = null;
  for (const notebook of notebooks || []) {
    const history = notebook.reviewHistory || [];
    history.forEach((log, index) => {
      const timestamp = new Date(log.review).getTime();
      if (!Number.isFinite(timestamp) || !log.cardId) return;
      if (!latest || timestamp > latest.timestamp) {
        latest = { notebookId: notebook.id, log, index, timestamp };
      }
    });
  }
  if (!latest) return { notebooks, undone: false, reason: "No scheduled review is available to undo." };
  if (!Object.hasOwn(latest.log, "previousFsrs")) {
    return { notebooks, undone: false, reason: "This older review does not contain the state needed to undo it safely." };
  }

  let restored = false;
  const nextNotebooks = notebooks.map((notebook) => {
    if (notebook.id !== latest.notebookId) return notebook;
    const flashcards = (notebook.flashcards || []).map((card) => {
      if (card.id !== latest.log.cardId) return card;
      restored = true;
      const nextCard = { ...card };
      if (latest.log.previousFsrs) nextCard.fsrs = latest.log.previousFsrs;
      else delete nextCard.fsrs;
      return nextCard;
    });
    return {
      ...notebook,
      flashcards,
      cards: flashcards.length,
      reviewHistory: (notebook.reviewHistory || []).filter((_, index) => index !== latest.index),
    };
  });
  if (!restored) return { notebooks, undone: false, reason: "The reviewed card no longer exists." };
  return { notebooks: nextNotebooks, undone: true, log: latest.log };
}

export function getMemoryOverview(card, now = new Date(), settings = DEFAULT_FSRS_SETTINGS) {
  const state = card?.fsrs;
  if (!state || !state.last_review || !(state.stability > 0)) return null;
  const config = normalizeFsrsSettings(settings);
  const scheduler = makeScheduler(config);
  const lastReview = toDate(state.last_review, null);
  if (!lastReview) return null;
  const schedulerLastReview = toStudyTime(lastReview, config.rolloverHour);
  const schedulerNow = toStudyTime(now, config.rolloverHour);
  const schedulerCard = {
    ...getFsrsCard(card, now),
    due: toStudyTime(toDate(state.due, now), config.rolloverHour),
    last_review: schedulerLastReview,
  };
  const elapsedDays = Math.max(0, (schedulerNow.getTime() - schedulerLastReview.getTime()) / DAY);
  const retrievability = scheduler.get_retrievability(schedulerCard, schedulerNow, false);
  const horizon = Math.max(7, Math.min(365, Math.ceil(state.stability * 3)));
  const curve = Array.from({ length: 31 }, (_, index) => {
    const days = horizon * index / 30;
    return { days, probability: scheduler.forgetting_curve(days, state.stability) };
  });
  return {
    stability: state.stability,
    difficulty: state.difficulty,
    retrievability,
    elapsedDays,
    curve,
    horizon,
    state: state.state,
    lapses: state.lapses || 0,
    scheduledDays: state.scheduled_days || 0,
    stateLabel: state.state === State.Learning ? "Learning"
      : state.state === State.Relearning ? "Relearning"
      : state.state === State.Review ? "Review" : "New",
  };
}
