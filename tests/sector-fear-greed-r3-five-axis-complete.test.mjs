import test from "node:test";
import assert from "node:assert/strict";
import {
  SECTOR_FEAR_GREED_R3_AXIS_WEIGHTS,
  SECTOR_FEAR_GREED_R3_REFERENCE_OBSERVATIONS,
  SECTOR_FEAR_GREED_R3_LEGACY_WEIGHT_SUM,
  scoreSectorFearGreedR3,
  completeLegacyFiveRawR3,
  legacyFiveRawFromAxes,
} from "../lib/market-score/sector-fear-greed-r3-five-axis-complete.mjs";

const close = (actual, expected, tolerance = 1e-12) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

test("R3 keeps the approved 756 reference and completes weights to 100% proportionally", () => {
  assert.equal(SECTOR_FEAR_GREED_R3_REFERENCE_OBSERVATIONS, 756);
  assert.equal(SECTOR_FEAR_GREED_R3_LEGACY_WEIGHT_SUM, 0.85);
  assert.deepEqual(SECTOR_FEAR_GREED_R3_AXIS_WEIGHTS, {
    trend: 4 / 17,
    breadth: 4 / 17,
    demand: 3 / 17,
    relativeStrength: 3 / 17,
    volatility: 3 / 17,
  });
  close(Object.values(SECTOR_FEAR_GREED_R3_AXIS_WEIGHTS).reduce((a, b) => a + b, 0), 1);
});

test("R3 direct rational formula is equivalent to legacy fiveRaw / 0.85", () => {
  const fixtures = [
    { trend: 0, breadth: 0, demand: 0, relativeStrength: 0, volatility: 0 },
    { trend: 100, breadth: 100, demand: 100, relativeStrength: 100, volatility: 100 },
    { trend: 66.5476, breadth: 87.4901, demand: 49.8016, relativeStrength: 82.0833, volatility: 88.7004 },
    { trend: 25.2381, breadth: 9.4246, demand: 74.6429, relativeStrength: 21.1706, volatility: 23.7897 },
  ];

  for (const axes of fixtures) {
    const legacy = legacyFiveRawFromAxes(axes);
    const direct = scoreSectorFearGreedR3(axes);
    close(direct, legacy / 0.85, 2e-12);
  }
});

test("R3 converts the validated current legacy fiveRaw examples", () => {
  close(completeLegacyFiveRawR3(63.5779), 74.7975294117647, 1e-12);
  close(completeLegacyFiveRawR3(24.7917), 29.16670588235294, 1e-12);
  close(completeLegacyFiveRawR3(19.6691), 23.14011764705882, 1e-12);
});

test("R3 preserves missing values and rejects impossible inputs instead of clamping", () => {
  assert.equal(scoreSectorFearGreedR3(null), null);
  assert.equal(scoreSectorFearGreedR3({ trend: 50, breadth: 50, demand: 50, relativeStrength: 50 }), null);
  assert.equal(completeLegacyFiveRawR3(null), null);
  assert.equal(completeLegacyFiveRawR3(Number.NaN), null);
  assert.throws(
    () => scoreSectorFearGreedR3({ trend: 101, breadth: 50, demand: 50, relativeStrength: 50, volatility: 50 }),
    /AXIS_OUT_OF_RANGE/,
  );
  assert.throws(() => completeLegacyFiveRawR3(85.1), /FIVE_RAW_OUT_OF_RANGE/);
});

test("R3 does not invert the one-ULP pair found by R2.14.15", () => {
  const a = 63.378472222222214;
  const b = 63.378472222222221;
  assert.ok(a < b);
  assert.ok(completeLegacyFiveRawR3(a) <= completeLegacyFiveRawR3(b));
});
