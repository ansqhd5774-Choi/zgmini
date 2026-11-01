export const SECTOR_FEAR_GREED_R3_VERSION = "SECTOR-FEAR-GREED-R3-FIVE-AXIS-COMPLETE";
export const SECTOR_FEAR_GREED_R3_REFERENCE_OBSERVATIONS = 756;
export const SECTOR_FEAR_GREED_R3_LEGACY_WEIGHT_SUM = 0.85;

export const SECTOR_FEAR_GREED_R3_AXIS_WEIGHTS = Object.freeze({
  trend: 4 / 17,
  breadth: 4 / 17,
  demand: 3 / 17,
  relativeStrength: 3 / 17,
  volatility: 3 / 17,
});

export const SECTOR_FEAR_GREED_R3_AXIS_KEYS = Object.freeze([
  "trend",
  "breadth",
  "demand",
  "relativeStrength",
  "volatility",
]);

const finite = (value) => typeof value === "number" && Number.isFinite(value);

function assertUnitScore(name, value) {
  if (!finite(value)) return false;
  if (value < 0 || value > 100) {
    throw new RangeError(`SECTOR_FEAR_GREED_R3_AXIS_OUT_OF_RANGE:${name}:${value}`);
  }
  return true;
}

/**
 * Approved five-axis complete R3 score.
 *
 * This is the exact rational form of the approved proportional completion:
 *   (0.20*T + 0.20*B + 0.15*D + 0.15*R + 0.15*V) / 0.85
 * = (4*T + 4*B + 3*D + 3*R + 3*V) / 17
 *
 * Missing/non-finite inputs remain null. Values are never zero-filled or clamped.
 */
export function scoreSectorFearGreedR3(axes) {
  if (!axes || typeof axes !== "object") return null;
  for (const key of SECTOR_FEAR_GREED_R3_AXIS_KEYS) {
    if (!assertUnitScore(key, axes[key])) return null;
  }

  return (
    4 * axes.trend +
    4 * axes.breadth +
    3 * axes.demand +
    3 * axes.relativeStrength +
    3 * axes.volatility
  ) / 17;
}

/**
 * Converts an already-computed legacy five-axis raw composite (weight sum 0.85)
 * to the complete R3 0..100 scale. This is intended for stored-history migration
 * and equivalence checks; new computation should use scoreSectorFearGreedR3().
 */
export function completeLegacyFiveRawR3(fiveRaw) {
  if (!finite(fiveRaw)) return null;
  if (fiveRaw < 0 || fiveRaw > 85 + Number.EPSILON * 85) {
    throw new RangeError(`SECTOR_FEAR_GREED_R3_FIVE_RAW_OUT_OF_RANGE:${fiveRaw}`);
  }
  return (fiveRaw * 20) / 17;
}

export function legacyFiveRawFromAxes(axes) {
  if (!axes || typeof axes !== "object") return null;
  for (const key of SECTOR_FEAR_GREED_R3_AXIS_KEYS) {
    if (!assertUnitScore(key, axes[key])) return null;
  }
  return (
    0.20 * axes.trend +
    0.20 * axes.breadth +
    0.15 * axes.demand +
    0.15 * axes.relativeStrength +
    0.15 * axes.volatility
  );
}
