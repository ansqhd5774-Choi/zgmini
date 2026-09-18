import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCnnIndex } from "../lib/cnn-index.mjs";

const now = Date.parse("2026-09-07T10:00:00Z");
const observation = {
  score: 42.2,
  rating: "fear",
  timestamp: "2026-09-04T23:59:43Z",
  previous_close: 43.8,
  previous_1_week: 46.1,
  previous_1_month: 51.4,
  previous_1_year: 39.7,
};

test("preserves publisher headline, baselines and CNN x/y historical scores", () => {
  const parsed = parseCnnIndex({
    fear_and_greed: observation,
    fear_and_greed_historical: {
      data: [
        { x: Date.parse("2026-09-02T23:59:43Z"), y: 45.5, rating: "neutral" },
        // Same observation day as the headline. The headline must win.
        { x: Date.parse("2026-09-04T12:00:00Z"), y: 41.1, rating: "fear" },
        // Invalid/future data is ignored, never rendered as real history.
        { x: Date.parse("2026-09-08T23:59:43Z"), y: 99, rating: "extreme greed" },
      ],
    },
  }, now);

  assert.equal(parsed.score, 42.2);
  assert.equal(parsed.rating, "공포");
  assert.equal(parsed.observedAt, "2026-09-04T23:59:43.000Z");
  assert.deepEqual(parsed.previous, {
    close: 43.8,
    oneWeek: 46.1,
    oneMonth: 51.4,
    oneYear: 39.7,
  });
  assert.deepEqual(parsed.history, [
    {
      timestamp: "2026-09-02T23:59:43.000Z",
      score: 45.5,
      rating: "중립",
    },
    {
      timestamp: "2026-09-04T23:59:43.000Z",
      score: 42.2,
      rating: "공포",
    },
  ]);
});

test("missing publisher baselines remain null and are never fabricated", () => {
  const parsed = parseCnnIndex({
    fear_and_greed: {
      score: 42.2,
      rating: "fear",
      timestamp: "2026-09-04T23:59:43Z",
    },
  }, now);

  assert.deepEqual(parsed.previous, {
    close: null,
    oneWeek: null,
    oneMonth: null,
    oneYear: null,
  });
  assert.deepEqual(parsed.history, [{
    timestamp: "2026-09-04T23:59:43.000Z",
    score: 42.2,
    rating: "공포",
  }]);
});

test("rejects missing, invalid, stale and future headline observations without sample fallback", () => {
  for (const patch of [
    { score: null },
    { score: "42" },
    { score: NaN },
    { score: 101 },
    { score: -1 },
    { timestamp: "bad" },
    { timestamp: "2026-08-01" },
    { timestamp: "2026-09-09" },
    { rating: "unknown" },
  ]) {
    assert.throws(() => parseCnnIndex({ fear_and_greed: { ...observation, ...patch } }, now));
  }
  assert.throws(() => parseCnnIndex({}, now));
});
