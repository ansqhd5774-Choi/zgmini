// One row per UTC observation date in the existing public_feed_snapshots_v1 table.
// This is verified score history only, never provider raw inputs or synthesized bars.
// Archive rows are appended without truncating older dates.
export const CNN_OBSERVED_ARCHIVE_VERSION = 'CNN_OBSERVED_ARCHIVE_R1';
export const CNN_OBSERVED_ARCHIVE_KEY = 'fear-greed-observed';
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const scoreValid = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;

function validPoint(candidate, day, now) {
 const time = Date.parse(candidate?.observedAt ?? '');
 if (!Number.isFinite(time) || time > now + 300000 || !scoreValid(candidate?.score)) return null;
 const observedAt = new Date(time).toISOString();
 return observedAt.slice(0, 10) === day ? {observedAt, score:candidate.score} : null;
}

// Preserve original exact observation timestamps, including equal-score readings
// only when CNN actually publishes a distinct timestamp. Same timestamps dedupe.
export function mergeCnnArchivedDay(previous, date, observations, now = Date.now()) {
 if (!DAY.test(date) || !Array.isArray(observations)) throw Error('CNN_ARCHIVE_INVALID_DATE');
 if (previous && (previous.version !== CNN_OBSERVED_ARCHIVE_VERSION || previous.date !== date || !Array.isArray(previous.observations)))
  throw Error('CNN_ARCHIVE_PREVIOUS_INVALID');
 const byTime = new Map();
 for (const raw of previous?.observations ?? []) {
  const point = validPoint(raw, date, now);
  if (!point) throw Error('CNN_ARCHIVE_PREVIOUS_INVALID');
  byTime.set(point.observedAt, point);
 }
 const before = JSON.stringify([...byTime.values()]);
 for (const raw of observations) {
  const point = validPoint(raw, date, now);
  if (!point) throw Error('CNN_ARCHIVE_OBSERVATION_INVALID');
  byTime.set(point.observedAt, point);
 }
 if (byTime.size > 1500) throw Error('CNN_ARCHIVE_DAILY_LIMIT');
 const points = [...byTime.values()].sort((a,b) => a.observedAt.localeCompare(b.observedAt));
 return {
  changed: !previous || JSON.stringify(points) !== before,
  body: {version:CNN_OBSERVED_ARCHIVE_VERSION,date,observations:points},
 };
}

export function groupVerifiedCnnObservations(body, now = Date.now()) {
 if (body?.status !== 'verified' || typeof body?.observedAt !== 'string' || !scoreValid(body?.score))
  throw Error('CNN_ARCHIVE_OUTPUT_INVALID');
 const list = Array.isArray(body.intradayObservations) ? body.intradayObservations : [];
 const grouped = new Map();
 for (const raw of [...list,{observedAt:body.observedAt,score:body.score}]) {
  const timestamp = Date.parse(raw?.observedAt ?? '');
  if (!Number.isFinite(timestamp)) throw Error('CNN_ARCHIVE_OBSERVATION_INVALID');
  const day = new Date(timestamp).toISOString().slice(0,10);
  const point = validPoint(raw, day, now);
  if (!point) throw Error('CNN_ARCHIVE_OBSERVATION_INVALID');
  if (!grouped.has(day)) grouped.set(day,[]);
  grouped.get(day).push(point);
 }
 return grouped;
}
