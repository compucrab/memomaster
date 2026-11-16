import { createEmptyCard, fsrs, Rating, State } from "ts-fsrs";
import { DEFAULT_FSRS_SETTINGS, normalizeFsrsSettings } from "./fsrsSettings";

export { DEFAULT_FSRS_SETTINGS, normalizeFsrsSettings };
export const REVIEW_RATINGS = {
  forgot: Rating.Again,
  difficult: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

function toDate(value, fallback) {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
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
    enable_fuzz: true,
  });
}

function serializeDates(record, fields) {
  const result = { ...record };
  for (const field of fields) {
    if (result[field] instanceof Date) result[field] = result[field].toISOString();
  }
  return result;
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

export function getReviewOptions(card, now = new Date(), settings = DEFAULT_FSRS_SETTINGS) {
  const scheduler = makeScheduler(settings);
  const scheduled = scheduler.repeat(getFsrsCard(card, now), now);
  return Object.fromEntries(Object.entries(REVIEW_RATINGS).map(([key, rating]) => {
    const due = scheduled[rating].card.due;
    return [key, { due, interval: formatInterval(due, now) }];
  }));
}

export function scheduleReview(card, choice, now = new Date(), settings = DEFAULT_FSRS_SETTINGS) {
  const rating = REVIEW_RATINGS[choice];
  if (!rating) throw new Error("Unknown review rating");
  const scheduler = makeScheduler(settings);
  const result = scheduler.repeat(getFsrsCard(card, now), now)[rating];
  return {
    fsrs: serializeDates(result.card, ["due", "last_review"]),
    log: {
      ...serializeDates(result.log, ["due", "review"]),
      rating: choice,
      cardId: card.id,
    },
  };
}

export function getMemoryOverview(card, now = new Date(), settings = DEFAULT_FSRS_SETTINGS) {
  const state = card?.fsrs;
  if (!state || !state.last_review || !(state.stability > 0)) return null;
  const scheduler = makeScheduler(settings);
  const lastReview = toDate(state.last_review, null);
  if (!lastReview) return null;
  const elapsedDays = Math.max(0, (now.getTime() - lastReview.getTime()) / 86400000);
  const retrievability = scheduler.get_retrievability(getFsrsCard(card, now), now, false);
  const horizon = Math.max(7, Math.min(365, Math.ceil(state.stability * 3)));
  const curve = Array.from({ length: 31 }, (_, index) => {
    const days = horizon * index / 30;
    const at = new Date(lastReview.getTime() + days * 86400000);
    return { days, probability: scheduler.get_retrievability(getFsrsCard(card, at), at, false) };
  });
  return {
    stability: state.stability,
    difficulty: state.difficulty,
    retrievability,
    elapsedDays,
    curve,
    state: state.state,
    lapses: state.lapses || 0,
    scheduledDays: state.scheduled_days || 0,
    stateLabel: state.state === State.Learning ? "Learning"
      : state.state === State.Relearning ? "Relearning"
      : state.state === State.Review ? "Review" : "New",
  };
}
