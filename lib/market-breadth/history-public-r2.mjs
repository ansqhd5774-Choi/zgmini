import {US_BREADTH_DAILY_KEY_PREFIX, validUsBreadthRecord} from './us-public-r1.mjs';

const DAY_MS = 86_400_000;
export const US_BREADTH_HISTORY_MAX_DAYS = 270;

/** Keep the historical window tied to the latest *completed* US session. */
export function usBreadthHistoryWindow(latestDate) {
  const endMs = Date.parse(`${latestDate}T00:00:00Z`);
  if (!Number.isFinite(endMs) || new Date(endMs).toISOString().slice(0, 10) !== latestDate)
    throw new Error('INVALID_COMPLETED_SESSION');
  return {
    from: new Date(endMs - 365 * DAY_MS).toISOString().slice(0, 10),
    to: latestDate,
  };
}

/** D1 stores a current key and one verified daily key per trading day. No estimated rows. */
export function selectVerifiedUsBreadthHistory(rows, window) {
  if (!Array.isArray(rows)) return [];
  const maxPublicationTime = Date.now() + 60_000;
  const dates = new Set();
  const records = [];
  for (const row of rows) {
    if (!row || typeof row.snapshot_key !== 'string' || !row.snapshot_key.startsWith(US_BREADTH_DAILY_KEY_PREFIX)) continue;
    const date = row.snapshot_key.slice(US_BREADTH_DAILY_KEY_PREFIX.length);
    if (date < window.from || date > window.to || dates.has(date)) continue;
    if (!Number.isSafeInteger(Number(row.stored_at)) || Number(row.stored_at) <= 0 || Number(row.stored_at) > maxPublicationTime) continue;
    let record;
    try { record = JSON.parse(row.body); } catch { continue; }
    if (!validUsBreadthRecord(record) || record.observationDate !== date) continue;
    dates.add(date);
    records.push({
      observationDate: date,
      eligibleCount: record.eligibleCount,
      counts: {
        rising: record.counts.rising,
        unchanged: record.counts.unchanged,
        falling: record.counts.falling,
      },
    });
  }
  return records.sort((a, b) => a.observationDate.localeCompare(b.observationDate)).slice(-US_BREADTH_HISTORY_MAX_DAYS);
}
