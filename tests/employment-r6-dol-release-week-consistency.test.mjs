import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDolWeeklyReleaseText } from '../lib/market-score/employment-r6-dol-release-text.mjs';

const release = (continuedCountWeek) => `UNEMPLOYMENT INSURANCE WEEKLY CLAIMS
SEASONALLY ADJUSTED DATA
In the week ending November 14, the advance figure for seasonally adjusted initial claims was 203,000. The 4-week moving average was 210,000.
The advance seasonally adjusted insured unemployment rate was 1.3 percent for the week ending November 7.
The advance number for seasonally adjusted insured unemployment during the week ending ${continuedCountWeek} was 1,900,000.`;

test('DOL release text accepts matching continued-claims weeks as unverified candidate', () => {
  const result = parseDolWeeklyReleaseText(release('November 7'), {releaseDate:'2026-11-19',expectedInitialWeekEnd:'2026-11-14'});
  assert.equal(result.status, 'CANDIDATE_ONLY');
  assert.equal(result.rows.find(row => row.logicalSeriesId === 'CONTINUED_CLAIMS').observationDate, '2026-11-07');
  assert.equal(result.rows.find(row => row.logicalSeriesId === 'CONTINUED_CLAIMS').value, 1900000);
});

test('DOL release text holds mismatched continued-claims rate and count weeks', () => {
  const result = parseDolWeeklyReleaseText(release('October 31'), {releaseDate:'2026-11-19',expectedInitialWeekEnd:'2026-11-14'});
  assert.deepEqual(result, {status:'HOLD',reason:'WEEK_DATE_INCONSISTENT',rows:[]});
});
