import test from "node:test";
import assert from "node:assert/strict";
import { State } from "ts-fsrs";
import { getStudyQueueCounts } from "./studyQueue.js";

test("daily queue counts include new cards and cards due before the next rollover", () => {
  const now = new Date(2026, 10, 17, 10, 0);
  const counts = getStudyQueueCounts([
    { id: "new" },
    { id: "learning-due", fsrs: { state: State.Learning, due: new Date(2026, 10, 17, 11).toISOString() } },
    { id: "relearning-overdue", fsrs: { state: State.Relearning, due: new Date(2026, 10, 16, 12).toISOString() } },
    { id: "review-due", fsrs: { state: State.Review, due: new Date(2026, 10, 17, 20).toISOString() } },
    { id: "review-tomorrow", fsrs: { state: State.Review, due: new Date(2026, 10, 18, 5).toISOString() } },
  ], now, 4);

  assert.deepEqual(counts, { new: 1, learning: 2, review: 1 });
});

test("the next study day begins at the configured rollover hour", () => {
  const now = new Date(2026, 10, 17, 3, 30);
  const counts = getStudyQueueCounts([
    { id: "learning-before-rollover", fsrs: { state: State.Learning, due: new Date(2026, 10, 17, 3, 45).toISOString() } },
    { id: "review-after-rollover", fsrs: { state: State.Review, due: new Date(2026, 10, 17, 4, 0).toISOString() } },
  ], now, 4);

  assert.deepEqual(counts, { new: 0, learning: 1, review: 1 });
});
