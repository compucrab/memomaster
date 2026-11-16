import { createEmptyCard, fsrs, Rating } from "ts-fsrs";

const scheduler = fsrs();
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

export function getReviewOptions(card, now = new Date()) {
  const scheduled = scheduler.repeat(getFsrsCard(card, now), now);
  return {
    forgot: {
      due: scheduled[REVIEW_RATINGS.forgot].card.due,
      interval: formatInterval(scheduled[REVIEW_RATINGS.forgot].card.due, now),
    },
    difficult: {
      due: scheduled[REVIEW_RATINGS.difficult].card.due,
      interval: formatInterval(scheduled[REVIEW_RATINGS.difficult].card.due, now),
    },
    good: {
      due: scheduled[REVIEW_RATINGS.good].card.due,
      interval: formatInterval(scheduled[REVIEW_RATINGS.good].card.due, now),
    },
    easy: {
      due: scheduled[REVIEW_RATINGS.easy].card.due,
      interval: formatInterval(scheduled[REVIEW_RATINGS.easy].card.due, now),
    },
  };
}

export function scheduleReview(card, choice, now = new Date()) {
  const rating = REVIEW_RATINGS[choice];
  if (!rating) throw new Error("Unknown review rating");
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
