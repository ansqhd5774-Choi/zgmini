/** Public US breadth display contract. No provider rows or raw constituents. */
export const US_BREADTH_CURRENT_KEY = 'public:market-breadth-r1:usa';
export const US_BREADTH_DAILY_KEY_PREFIX = 'public:market-breadth-r1:usa:';
export const US_BREADTH_SOURCE = 'SP500_STORED_MARKETPARQUET_FREE_SAMPLE';

const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const count = n => Number.isSafeInteger(n) && n >= 0;

export function validUsBreadthRecord(record) {
  if (!record || record.version !== 1 || record.market !== 'usa'
    || record.universe !== 'SP500' || record.source !== US_BREADTH_SOURCE
    || record.methodologyVersion !== 'ISSUE_DIRECTION_COUNTS_R1'
    || record.status !== 'READY' || !validDate(record.observationDate)
    || !Number.isSafeInteger(record.expectedCount)
    || record.expectedCount < 490 || record.expectedCount > 520
    || !count(record.eligibleCount) || record.eligibleCount > record.expectedCount
    || !record.counts || !Object.values(record.counts).every(count)
    || Object.keys(record.counts).sort().join(',') !== 'falling,rising,unchanged'
    || !Number.isFinite(record.coverage) || record.coverage < .98 || record.coverage > 1
    || Math.abs(record.coverage - record.eligibleCount / record.expectedCount) > 1e-9
    || record.counts.rising + record.counts.unchanged + record.counts.falling !== record.eligibleCount
    || typeof record.calculatedAt !== 'string' || !Number.isFinite(Date.parse(record.calculatedAt))) return false;
  return true;
}
