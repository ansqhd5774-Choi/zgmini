// Only the publisher's composite score is accepted; economic series are not substitutes.
const LABELS = {
  "extreme fear": "극심한 공포",
  fear: "공포",
  neutral: "중립",
  greed: "탐욕",
  "extreme greed": "극심한 탐욕",
};

const COMPONENT_SPECS = [
  { id: "market-momentum", key: "market_momentum_sp500", referenceKey: "market_momentum_sp125" },
  { id: "stock-price-strength", key: "stock_price_strength" },
  { id: "stock-price-breadth", key: "stock_price_breadth" },
  { id: "put-call-options", key: "put_call_options" },
  { id: "market-volatility", key: "market_volatility_vix", referenceKey: "market_volatility_vix_50" },
  { id: "junk-bond-demand", key: "junk_bond_demand" },
  { id: "safe-haven-demand", key: "safe_haven_demand" },
];

function normalizedScore(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : null;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function timestampMs(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value >= 1e12 ? value : value * 1000;
    return Number.isFinite(milliseconds) ? milliseconds : NaN;
  }
  return typeof value === "string" ? Date.parse(value) : NaN;
}

function translatedRating(value) {
  const key = typeof value === "string" ? value.trim().toLowerCase() : "";
  return Object.hasOwn(LABELS, key) ? LABELS[key] : undefined;
}

function latestRawPoint(block, now) {
  const points = Array.isArray(block?.data) ? block.data : [];
  let latest = null;

  for (const point of points) {
    const time = timestampMs(point?.x ?? point?.timestamp ?? point?.date);
    const value = finiteNumber(point?.y ?? point?.value);
    if (!Number.isFinite(time) || value === null || time > now + 300000) continue;
    if (!latest || time > latest.time) {
      latest = {
        time,
        value,
        rating: translatedRating(point?.rating),
      };
    }
  }

  return latest;
}

function parseComponent(payload, spec, now) {
  const block = payload?.[spec.key];
  const score = normalizedScore(block?.score);
  const rating = translatedRating(block?.rating);
  const observedMs = timestampMs(block?.timestamp);
  const raw = latestRawPoint(block, now);

  if (
    score === null ||
    !rating ||
    !Number.isFinite(observedMs) ||
    observedMs > now + 300000 ||
    now - observedMs > 7 * 86400000 ||
    !raw
  ) {
    return null;
  }

  const referenceBlock = spec.referenceKey ? payload?.[spec.referenceKey] : null;
  const reference = referenceBlock ? latestRawPoint(referenceBlock, now) : null;

  return {
    id: spec.id,
    score,
    rating,
    observedAt: new Date(observedMs).toISOString(),
    rawValue: raw.value,
    rawObservedAt: new Date(raw.time).toISOString(),
    ...(reference
      ? {
          referenceValue: reference.value,
          referenceObservedAt: new Date(reference.time).toISOString(),
        }
      : {}),
  };
}

export function parseCnnIndex(payload, now = Date.now()) {
  const item = payload?.fear_and_greed;
  const score = normalizedScore(item?.score);
  const date = typeof item?.timestamp === "string" ? Date.parse(item.timestamp) : NaN;

  if (
    score === null ||
    !Number.isFinite(date) ||
    date > now + 300000 ||
    now - date > 7 * 86400000
  ) {
    throw new Error("Invalid or outdated CNN observation");
  }

  const publisherRating = typeof item?.rating === "string" ? item.rating.trim().toLowerCase() : "";
  if (!Object.hasOwn(LABELS, publisherRating)) throw new Error("Invalid CNN rating");

  const observedAt = new Date(date).toISOString();
  const currentDay = observedAt.slice(0, 10);

  const previous = {
    close: normalizedScore(item?.previous_close),
    oneWeek: normalizedScore(item?.previous_1_week),
    oneMonth: normalizedScore(item?.previous_1_month),
    oneYear: normalizedScore(item?.previous_1_year),
  };

  const historySource =
    payload?.fear_and_greed_historical?.data ??
    payload?.fear_and_greed_historical;

  const parsedHistory = Array.isArray(historySource)
    ? historySource.flatMap((point) => {
        const pointTime = timestampMs(
          typeof point?.x === "number" || typeof point?.x === "string"
            ? point.x
            : point?.timestamp ?? point?.date,
        );
        const pointScore = normalizedScore(
          typeof point?.y === "number"
            ? point.y
            : typeof point?.score === "number"
              ? point.score
              : point?.value,
        );

        if (
          pointScore === null ||
          !Number.isFinite(pointTime) ||
          pointTime > now + 300000
        ) {
          return [];
        }

        const historyRating = translatedRating(point?.rating);
        return [{
          timestamp: new Date(pointTime).toISOString(),
          score: pointScore,
          ...(historyRating ? { rating: historyRating } : {}),
        }];
      })
    : [];

  // The headline observation is authoritative for its observation day.
  // Remove any historical point for the same UTC day, then append the headline.
  const history = parsedHistory
    .filter((point) => point.timestamp.slice(0, 10) !== currentDay)
    .concat({
      timestamp: observedAt,
      score,
      rating: LABELS[publisherRating],
    })
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));

  const components = COMPONENT_SPECS
    .map((spec) => parseComponent(payload, spec, now))
    .filter(Boolean);

  return {
    score,
    rating: LABELS[publisherRating],
    observedAt,
    previous,
    history,
    components,
  };
}
