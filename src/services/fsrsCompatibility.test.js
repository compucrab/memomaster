import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyCard, State } from "ts-fsrs";
import { DEFAULT_FSRS_SETTINGS, getReviewOptions, scheduleReview } from "./fsrs.js";

const DAY = 86400000;

function reviewCard(now, overrides = {}) {
  return {
    id: "compatibility-card",
    fsrs: {
      ...createEmptyCard(new Date(now.getTime() - 30 * DAY)),
      state: State.Review,
      stability: 24,
      difficulty: 5,
      elapsed_days: 30,
      scheduled_days: 30,
      reps: 9,
      lapses: 1,
      learning_steps: 0,
      last_review: new Date(now.getTime() - 30 * DAY),
      due: now,
      ...overrides,
    },
  };
}

// These are scheduler-contract tests for behaviours shared with Anki's FSRS-6
// integration. They deliberately do not claim byte-for-byte Anki parity: that
// requires running the same fixture through Anki's scheduler implementation.
test("all four ratings have stable preview-to-commit results", () => {
  const now = new Date("2026-04-18T12:00:00.000Z");
  const card = reviewCard(now);
  const preview = getReviewOptions(card, now);
  for (const rating of ["forgot", "difficult", "good", "easy"]) {
    const committed = scheduleReview(card, rating, now);
    assert.equal(
      new Date(preview[rating].due).getTime(),
      new Date(committed.fsrs.due).getTime(),
      `${rating} preview and committed due dates differ`,
    );
  }
});

test("review transitions preserve FSRS-6 rating semantics", () => {
  const now = new Date("2026-04-18T12:00:00.000Z");
  const card = reviewCard(now);
  const again = scheduleReview(card, "forgot", now);
  const hard = scheduleReview(card, "difficult", now);
  const good = scheduleReview(card, "good", now);
  const easy = scheduleReview(card, "easy", now);

  assert.equal(again.fsrs.state, State.Relearning);
  for (const result of [hard, good, easy]) assert.equal(result.fsrs.state, State.Review);
  assert.ok(hard.fsrs.scheduled_days <= good.fsrs.scheduled_days);
  assert.ok(good.fsrs.scheduled_days <= easy.fsrs.scheduled_days);
});

test("late reviews record elapsed time from the previous review, not the due date", () => {
  const now = new Date("2026-04-18T12:00:00.000Z");
  const card = reviewCard(now, {
    due: new Date(now.getTime() - 8 * DAY),
    last_review: new Date(now.getTime() - 38 * DAY),
    elapsed_days: 30,
  });
  const result = scheduleReview(card, "good", now);
  assert.equal(result.log.elapsed_days, 38);
  assert.equal(new Date(result.log.review).toISOString(), now.toISOString());
});

test("review counters and lapse counters follow the FSRS outcome", () => {
  const now = new Date("2026-04-18T12:00:00.000Z");
  const card = reviewCard(now);
  const again = scheduleReview(card, "forgot", now);
  const good = scheduleReview(card, "good", now);
  assert.equal(again.fsrs.reps, card.fsrs.reps + 1);
  assert.equal(again.fsrs.lapses, card.fsrs.lapses + 1);
  assert.equal(good.fsrs.reps, card.fsrs.reps + 1);
  assert.equal(good.fsrs.lapses, card.fsrs.lapses);
});

test("maximum interval is respected after rating-order adjustments", () => {
  const now = new Date("2026-04-18T12:00:00.000Z");
  const settings = { ...DEFAULT_FSRS_SETTINGS, maximumInterval: 5 };
  const card = reviewCard(now);
  for (const rating of ["difficult", "good", "easy"]) {
    const result = scheduleReview(card, rating, now, settings);
    assert.ok(result.fsrs.scheduled_days <= 5);
    assert.equal(
      new Date(result.fsrs.due).getTime(),
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + result.fsrs.scheduled_days, settings.rolloverHour).getTime(),
    );
  }
});

test("learning and relearning steps retain minute-level timing", () => {
  const now = new Date("2026-04-18T12:00:00.000Z");
  const card = reviewCard(now);
  const result = scheduleReview(card, "forgot", now);
  assert.equal(result.fsrs.state, State.Relearning);
  assert.equal(new Date(result.fsrs.due).getTime() - now.getTime(), 10 * 60 * 1000);
});
