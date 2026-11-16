import test from "node:test";
import assert from "node:assert/strict";
import { buildFsrsOptimizerDataset } from "./fsrsOptimizerData.js";

test("optimizer dataset maps ratings and prior FSRS states into official CSV columns", () => {
  const notebooks = [{
    reviewHistory: [
      { cardId: "card-b", review: "2026-01-02T12:00:00.000Z", rating: "good", previousState: 2 },
      { cardId: "card-a", review: "2026-01-01T12:00:00.000Z", rating: "forgot", previousState: 3 },
      { cardId: "card-a", review: "2026-01-03T12:00:00.000Z", rating: "easy", previousState: 2 },
      { cardId: "card-b", review: "2026-01-04T12:00:00.000Z", rating: "difficult", previousState: 2 },
    ],
  }];
  const dataset = buildFsrsOptimizerDataset(notebooks, { rolloverHour: 4 }, "Asia/Kolkata");
  const rows = dataset.csv.split("\n");
  assert.equal(rows[0], "review_time,card_id,review_rating,review_duration,review_state");
  assert.equal(rows.length, 5);
  assert.ok(rows[1].startsWith("1767268800000,card-a,1,0,3"));
  assert.ok(rows[2].startsWith("1767355200000,card-b,3,0,2"));
  assert.equal(dataset.reviewCount, 4);
  assert.equal(dataset.cardCount, 2);
  assert.equal(dataset.skippedCount, 0);
  assert.equal(dataset.nextDayStartsAt, 4);
  assert.equal(dataset.timeZone, "Asia/Kolkata");
  assert.equal(dataset.modelVersion, "FSRS-6");
});

test("optimizer dataset skips legacy or malformed logs instead of guessing card state", () => {
  const dataset = buildFsrsOptimizerDataset([{
    reviewHistory: [
      { cardId: "legacy", review: "2026-01-01T00:00:00.000Z", rating: "good" },
      { cardId: "bad-rating", review: "2026-01-01T00:00:00.000Z", rating: "done", previousState: 2 },
      { cardId: "bad-state", review: "2026-01-01T00:00:00.000Z", rating: "good", previousState: 8 },
      { cardId: "valid", review: "2026-01-01T00:00:00.000Z", rating: "good", previousState: 0 },
    ],
  }], {}, "UTC");
  assert.equal(dataset.reviewCount, 1);
  assert.equal(dataset.cardCount, 1);
  assert.equal(dataset.skippedCount, 3);
});

test("optimizer dataset safely quotes card IDs containing CSV delimiters", () => {
  const dataset = buildFsrsOptimizerDataset([{
    reviewHistory: [{
      cardId: 'card,"quoted"',
      review: "2026-01-01T00:00:00.000Z",
      rating: "difficult",
      previousState: 1,
    }],
  }], {}, "UTC");
  assert.match(dataset.csv, /"card,""quoted""",2,0,1/);
});
