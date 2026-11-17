import test from "node:test";
import assert from "node:assert/strict";
import { getStudyActivity, studyDayKey } from "./studyActivity.js";

test("only completed sessions with reviewed cards create activity days", () => {
  const now = new Date(2026, 10, 17, 12);
  const activity = getStudyActivity([
    { studySessions: [
      { completedAt: new Date(2026, 10, 17, 10).toISOString(), reviewedCards: 8 },
      { completedAt: new Date(2026, 10, 16, 10).toISOString(), reviewedCards: 3 },
      { completedAt: new Date(2026, 10, 15, 10).toISOString(), reviewedCards: 0 },
      { completedAt: new Date(2026, 10, 14, 10).toISOString() },
    ] },
  ], now, 4);

  assert.equal(activity.currentStreak, 2);
  assert.equal(activity.longestStreak, 2);
  assert.equal(activity.completedDays, 2);
  assert.equal(activity.cardsReviewed, 11);
});

test("current streak remains active until the current study day ends", () => {
  const now = new Date(2026, 10, 17, 2);
  const activity = getStudyActivity([
    { studySessions: [{ completedAt: new Date(2026, 10, 16, 22).toISOString(), reviewedCards: 4 }] },
  ], now, 4);
  assert.equal(studyDayKey(now, 4), studyDayKey(new Date(2026, 10, 16, 22), 4));
  assert.equal(activity.currentStreak, 1);
});

test("a gap resets the current streak but preserves the longest streak", () => {
  const now = new Date(2026, 10, 17, 12);
  const activity = getStudyActivity([
    { studySessions: [
      { completedAt: new Date(2026, 10, 17, 10).toISOString(), reviewedCards: 2 },
      { completedAt: new Date(2026, 10, 15, 10).toISOString(), reviewedCards: 5 },
      { completedAt: new Date(2026, 10, 14, 10).toISOString(), reviewedCards: 5 },
      { completedAt: new Date(2026, 10, 13, 10).toISOString(), reviewedCards: 5 },
    ] },
  ], now, 4);
  assert.equal(activity.currentStreak, 1);
  assert.equal(activity.longestStreak, 3);
});
