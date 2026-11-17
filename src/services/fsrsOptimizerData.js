import { normalizeFsrsSettings } from "./fsrsSettings.js";

const OPTIMIZER_RATINGS = {
  forgot: 1,
  difficult: 2,
  good: 3,
  easy: 4,
};

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Prepare complete, timestamped FSRS-6 review history for the official
 * optimizer binding. Logs without a captured pre-review state are skipped
 * rather than assigning a guessed state.
 */
export function buildFsrsOptimizerDataset(notebooks, settings, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC") {
  const config = normalizeFsrsSettings(settings);
  const rows = [];
  let skippedCount = 0;

  for (const notebook of notebooks || []) {
    for (const log of notebook.reviewHistory || []) {
      const reviewTime = new Date(log.review).getTime();
      const rating = OPTIMIZER_RATINGS[log.rating];
      const state = Number(log.previousState);
      if (
        !log.cardId ||
        !Number.isFinite(reviewTime) ||
        !rating ||
        !Number.isInteger(state) ||
        state < 0 ||
        state > 3
      ) {
        skippedCount++;
        continue;
      }
      rows.push({
        reviewTime,
        cardId: String(log.cardId),
        rating,
        state,
      });
    }
  }

  rows.sort((a, b) => a.reviewTime - b.reviewTime || a.cardId.localeCompare(b.cardId));
  const csv = [
    "review_time,card_id,review_rating,review_duration,review_state",
    ...rows.map((row) => [
      row.reviewTime,
      csvCell(row.cardId),
      row.rating,
      0,
      row.state,
    ].join(",")),
  ].join("\n");

  return {
    csv,
    reviewCount: rows.length,
    cardCount: new Set(rows.map((row) => row.cardId)).size,
    skippedCount,
    nextDayStartsAt: config.rolloverHour,
    timeZone,
    modelVersion: "FSRS-6",
  };
}
