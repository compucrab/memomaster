import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyCard, State } from "ts-fsrs";
import { DEFAULT_FSRS_SETTINGS, getMemoryOverview, getReviewOptions, scheduleReview, undoLatestReview } from "./fsrs.js";

const DAY = 86400000;
function matureCard(now) {
  const base = createEmptyCard(now);
  return {
    id: "fsrs-test-card",
    fsrs: {
      ...base,
      state: State.Review,
      stability: 20,
      difficulty: 5,
      elapsed_days: 20,
      scheduled_days: 20,
      reps: 12,
      lapses: 0,
      learning_steps: 0,
      last_review: new Date(now.getTime() - 20 * DAY),
      due: now,
    },
  };
}

test("FSRS defaults to a 180-day maximum interval", () => {
  assert.equal(DEFAULT_FSRS_SETTINGS.maximumInterval, 180);
});

test("Again enters a timed relearning step", () => {
  const now = new Date("2026-01-10T12:00:00.000Z");
  const result = scheduleReview(matureCard(now), "forgot", now);
  assert.equal(result.fsrs.state, State.Relearning);
  const delay = new Date(result.fsrs.due).getTime() - now.getTime();
  assert.ok(delay >= 9 * 60000 && delay <= 11 * 60000, `expected a 10-minute step, got ${delay}ms`);
});

test("Hard is a successful review and does not enter relearning", () => {
  const now = new Date("2026-01-10T12:00:00.000Z");
  const result = scheduleReview(matureCard(now), "difficult", now);
  assert.equal(result.fsrs.state, State.Review);
  assert.ok(new Date(result.fsrs.due) > now);
});

test("Good and Easy continue the review schedule", () => {
  const now = new Date("2026-01-10T12:00:00.000Z");
  for (const rating of ["good", "easy"]) {
    const result = scheduleReview(matureCard(now), rating, now);
    assert.equal(result.fsrs.state, State.Review);
    assert.ok(new Date(result.fsrs.due) > now);
  }
});

test("new cards graduate on Good with the configured single learning step", () => {
  const now = new Date("2026-01-10T12:00:00.000Z");
  const result = scheduleReview({ id: "new-card" }, "good", now);
  assert.equal(result.fsrs.state, State.Review);
});

test("preview intervals match committed intervals", () => {
  const now = new Date("2026-01-10T12:00:00.000Z");
  const card = matureCard(now);
  const options = getReviewOptions(card, now);
  for (const rating of ["forgot", "difficult", "good", "easy"]) {
    const saved = scheduleReview(card, rating, now);
    assert.equal(new Date(options[rating].due).getTime(), new Date(saved.fsrs.due).getTime());
  }
});

test("desired retention changes future intervals and maximum interval caps them", () => {
  const now = new Date("2026-01-10T12:00:00.000Z");
  const card = matureCard(now);
  const low = scheduleReview(card, "good", now, { ...DEFAULT_FSRS_SETTINGS, desiredRetention: 0.75 });
  const high = scheduleReview(card, "good", now, { ...DEFAULT_FSRS_SETTINGS, desiredRetention: 0.95 });
  assert.ok(new Date(high.fsrs.due) < new Date(low.fsrs.due));

  const cappedSettings = { ...DEFAULT_FSRS_SETTINGS, maximumInterval: 3 };
  for (const rating of ["difficult", "good", "easy"]) {
    const capped = scheduleReview(card, rating, now, cappedSettings);
    assert.ok(
      capped.fsrs.scheduled_days <= 3,
      `${rating} exceeded the maximum interval: ${capped.fsrs.scheduled_days} days`
    );
    const expectedDue = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + capped.fsrs.scheduled_days,
      cappedSettings.rolloverHour
    );
    assert.equal(new Date(capped.fsrs.due).getTime(), expectedDue.getTime());
  }
});

test("memory overview exposes recall probability and a decaying curve", () => {
  const now = new Date("2026-01-10T12:00:00.000Z");
  const memory = getMemoryOverview(matureCard(now), now);
  assert.ok(memory);
  assert.ok(memory.retrievability >= 0 && memory.retrievability <= 1);
  assert.ok(memory.stability > 0);
  assert.ok(memory.difficulty >= 1 && memory.difficulty <= 10);
  assert.ok(memory.curve[0].probability > memory.curve.at(-1).probability);
});

test("day rollover controls elapsed review days and review due time", () => {
  const card = matureCard(new Date(2026, 0, 10, 5, 0, 0));
  card.fsrs.last_review = new Date(2026, 0, 10, 3, 0, 0);
  card.fsrs.due = new Date(2026, 0, 10, 5, 0, 0);
  const now = new Date(2026, 0, 10, 5, 0, 0);
  const rolled = scheduleReview(card, "good", now, { ...DEFAULT_FSRS_SETTINGS, rolloverHour: 4 });
  const midnight = scheduleReview(card, "good", now, { ...DEFAULT_FSRS_SETTINGS, rolloverHour: 0 });
  assert.equal(rolled.log.elapsed_days, 1);
  assert.equal(midnight.log.elapsed_days, 0);
  assert.equal(new Date(rolled.fsrs.due).getHours(), 4);
});

test("review logs retain reversible before-and-after FSRS snapshots", () => {
  const now = new Date("2026-01-10T12:00:00.000Z");
  const result = scheduleReview({ id: "new-card" }, "good", now);
  assert.equal(result.log.previousFsrs, null);
  assert.equal(result.log.nextFsrs.state, State.Review);
  assert.equal(result.log.previousState, State.New);
  assert.equal(result.log.nextState, State.Review);
  assert.equal(typeof result.log.nextFsrs.due, "string");
});

test("undo restores the exact previous FSRS state and removes only that review", () => {
  const now = new Date("2026-01-10T12:00:00.000Z");
  const card = matureCard(now);
  const previous = JSON.stringify(card.fsrs);
  const result = scheduleReview(card, "good", now);
  const notebooks = [{
    id: "notebook-a",
    flashcards: [{ ...card, fsrs: result.fsrs }],
    reviewHistory: [result.log],
  }];
  const undone = undoLatestReview(notebooks);
  assert.equal(undone.undone, true);
  assert.equal(JSON.stringify(undone.notebooks[0].flashcards[0].fsrs), previous);
  assert.equal(undone.notebooks[0].reviewHistory.length, 0);
});

test("undo of a first review removes the newly created FSRS state", () => {
  const now = new Date("2026-01-10T12:00:00.000Z");
  const result = scheduleReview({ id: "new-card" }, "good", now);
  const undone = undoLatestReview([{
    id: "notebook-a",
    flashcards: [{ id: "new-card", fsrs: result.fsrs }],
    reviewHistory: [result.log],
  }]);
  assert.equal(undone.undone, true);
  assert.equal(Object.hasOwn(undone.notebooks[0].flashcards[0], "fsrs"), false);
});

test("legacy review logs without snapshots are not undone destructively", () => {
  const notebooks = [{
    id: "notebook-a",
    flashcards: [{ id: "card-a", fsrs: matureCard(new Date()).fsrs }],
    reviewHistory: [{ cardId: "card-a", review: "2026-01-10T12:00:00.000Z", rating: "good" }],
  }];
  const undone = undoLatestReview(notebooks);
  assert.equal(undone.undone, false);
  assert.equal(undone.notebooks, notebooks);
});

test("undo refuses to overwrite a schedule changed after the recorded review", () => {
  const now = new Date("2026-01-10T12:00:00.000Z");
  const result = scheduleReview(matureCard(now), "good", now);
  const changedFsrs = { ...result.fsrs, due: new Date("2026-02-01T04:00:00.000Z").toISOString() };
  const notebooks = [{
    id: "notebook-a",
    flashcards: [{ id: "fsrs-test-card", fsrs: changedFsrs }],
    reviewHistory: [result.log],
  }];
  const undone = undoLatestReview(notebooks);
  assert.equal(undone.undone, false);
  assert.match(undone.reason, /schedule changed/);
  assert.equal(undone.notebooks, notebooks);
});
