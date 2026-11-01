// Observed CNN scores only. This is a bounded public score sidecar, not raw
// provider data, an estimated OHLC series, or a replacement for CNN history.
export const CNN_OBSERVED_HISTORY_VERSION = 'CNN_OBSERVED_HISTORY_R1';
const DAY_MS = 86400000;
const RECENT_MS = 8 * DAY_MS;
const MAX_RECENT_POINTS = 1200;
const MAX_DAILY_RANGES = 370;

const scoreIsValid = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
const validDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

function observedPoint(value, latestTime) {
  const time = Date.parse(value?.observedAt ?? '');
  if (!Number.isFinite(time) || time > latestTime || !scoreIsValid(value?.score)) return null;
  return { observedAt: new Date(time).toISOString(), score: value.score };
}

function readPreviousRange(value, latestTime) {
  if (!validDay(value?.date)) return null;
  const first = observedPoint(value.first, latestTime);
  const last = observedPoint(value.last, latestTime);
  const low = observedPoint(value.low, latestTime);
  const high = observedPoint(value.high, latestTime);
  if (![first, last, low, high].every(point => point?.observedAt.slice(0, 10) === value.date)
    || first.observedAt > last.observedAt || low.score > high.score) return null;
  return { date: value.date, first, last, low, high };
}

function includePoint(range, point) {
  const date = point.observedAt.slice(0, 10);
  if (!range) return { date, first: point, last: point, low: point, high: point };
  return {
    date,
    first: point.observedAt < range.first.observedAt ? point : range.first,
    last: point.observedAt >= range.last.observedAt ? point : range.last,
    low: point.score < range.low.score ? point : range.low,
    high: point.score > range.high.score ? point : range.high,
  };
}

export function mergeCnnObservedHistory(previous, current, now = Date.now()) {
  const latestTime = Date.parse(current?.observedAt ?? '');
  if (!Number.isFinite(latestTime) || latestTime > now + 300000 || !scoreIsValid(current?.score)) {
    throw Error('CNN_OBSERVATION_INVALID');
  }
  const priorTime = Date.parse(previous?.observedAt ?? '');
  if (Number.isFinite(priorTime) && priorTime > latestTime) throw Error('CNN_OBSERVATION_REGRESSION');

  const hasPriorSidecar = previous?.observedHistoryVersion === CNN_OBSERVED_HISTORY_VERSION;
  const previousPoints = hasPriorSidecar && Array.isArray(previous.intradayObservations)
    ? previous.intradayObservations : [];
  const recentByTime = new Map();
  for (const candidate of previousPoints) {
    const point = observedPoint(candidate, latestTime);
    if (point && Date.parse(point.observedAt) >= latestTime - RECENT_MS) recentByTime.set(point.observedAt, point);
  }

  const priorHeadline = observedPoint(previous, latestTime);
  const latest = observedPoint(current, latestTime);
  const toAdd = hasPriorSidecar ? [latest] : [priorHeadline, latest];
  const ranges = new Map();
  if (hasPriorSidecar && Array.isArray(previous.dailyObservedRanges)) {
    for (const candidate of previous.dailyObservedRanges) {
      const range = readPreviousRange(candidate, latestTime);
      if (range) ranges.set(range.date, range);
    }
  }
  for (const point of toAdd) {
    if (!point) continue;
    const date = point.observedAt.slice(0, 10);
    ranges.set(date, includePoint(ranges.get(date), point));
    if (Date.parse(point.observedAt) >= latestTime - RECENT_MS) recentByTime.set(point.observedAt, point);
  }

  const cutoffDay = new Date(latestTime - (MAX_DAILY_RANGES - 1) * DAY_MS).toISOString().slice(0, 10);
  return {
    ...current,
    observedHistoryVersion: CNN_OBSERVED_HISTORY_VERSION,
    intradayObservations: [...recentByTime.values()]
      .sort((a, b) => a.observedAt.localeCompare(b.observedAt)).slice(-MAX_RECENT_POINTS),
    dailyObservedRanges: [...ranges.values()]
      .filter(range => range.date >= cutoffDay && range.date <= latest.observedAt.slice(0, 10))
      .sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_DAILY_RANGES),
  };
}
