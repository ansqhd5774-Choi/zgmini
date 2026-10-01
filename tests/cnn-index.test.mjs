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


test("exposes seven verified CNN subindicators with raw and reference values", () => {
  const component = (score, rating, y, timestamp = Date.parse("2026-09-04T23:58:00Z")) => ({
    timestamp,
    score,
    rating,
    data: [{ x: timestamp, y, rating }],
  });

  const parsed = parseCnnIndex({
    fear_and_greed: observation,
    market_momentum_sp500: component(72.4, "greed", 6500.25),
    market_momentum_sp125: {
      timestamp: Date.parse("2026-09-04T23:58:00Z"),
      data: [{ x: Date.parse("2026-09-04T23:58:00Z"), y: 6310.5, rating: "greed" }],
    },
    stock_price_strength: component(61.4, "greed", 0.257),
    stock_price_breadth: component(62.2, "greed", 1276.64),
    put_call_options: component(77.4, "extreme greed", 0.704),
    market_volatility_vix: component(50, "neutral", 18.39),
    market_volatility_vix_50: {
      timestamp: Date.parse("2026-09-04T23:58:00Z"),
      data: [{ x: Date.parse("2026-09-04T23:58:00Z"), y: 20.15, rating: "neutral" }],
    },
    junk_bond_demand: component(24, "extreme fear", 1.394),
    safe_haven_demand: component(93.6, "extreme greed", 8.701),
  }, now);

  assert.equal(parsed.components.length, 7);
  assert.deepEqual(parsed.components[0], {
    id: "market-momentum",
    score: 72.4,
    rating: "탐욕",
    observedAt: "2026-09-04T23:58:00.000Z",
    rawValue: 6500.25,
    rawObservedAt: "2026-09-04T23:58:00.000Z",
    referenceValue: 6310.5,
    referenceObservedAt: "2026-09-04T23:58:00.000Z",
  });
  assert.deepEqual(parsed.components[4], {
    id: "market-volatility",
    score: 50,
    rating: "중립",
    observedAt: "2026-09-04T23:58:00.000Z",
    rawValue: 18.39,
    rawObservedAt: "2026-09-04T23:58:00.000Z",
    referenceValue: 20.15,
    referenceObservedAt: "2026-09-04T23:58:00.000Z",
  });
  assert.equal(parsed.components[6].id, "safe-haven-demand");
  assert.equal(parsed.components[6].rawValue, 8.701);
});

test("drops invalid component blocks instead of fabricating values", () => {
  const parsed = parseCnnIndex({
    fear_and_greed: observation,
    market_volatility_vix: {
      timestamp: Date.parse("2026-09-04T23:58:00Z"),
      score: null,
      rating: "fear",
      data: [{ x: Date.parse("2026-09-04T23:58:00Z"), y: 25.1, rating: "fear" }],
    },
  }, now);

  assert.deepEqual(parsed.components, []);
});
