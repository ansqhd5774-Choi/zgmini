import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDolNationalClaimsXml } from '../lib/market-score/employment-r6-provider.mjs';
import { parseDolWeeklyReleaseText } from '../lib/market-score/employment-r6-dol-release-text.mjs';
import { dolNationalSeriesFreshAtRelease } from '../lib/market-score/employment-r6-scheduler.mjs';

const RELEASE_AT = '2026-11-19T13:30:00.000Z';
const retrievedAt = '2026-11-24T13:35:37.666Z';
// Source-shape fixture of a r539cy historical/revised week: numbers are
// intentionally synthetic. The real Nov 24 runtime reported Oct 24 as the
// latest non-empty national week; no historical numerical values are asserted.
const oldNationalXml = `<r539cyNational>
  <week><weekEnded>10/24/2026</weekEnded>
    <InitialClaims><SA>190000</SA><SA4WK>195000</SA4WK></InitialClaims>
    <ContinuedClaims><SA>1760000</SA></ContinuedClaims>
    <IUR><SA>1.1</SA></IUR>
  </week></r539cyNational>`;
// Official 2026-11-19 release content, with the distinct initial and
// continued reference weeks. This text is NOT raw PDF byte attestation.
const advanceReleaseText = `UNEMPLOYMENT INSURANCE WEEKLY CLAIMS
SEASONALLY ADJUSTED DATA
In the week ending November 14, the advance figure for seasonally adjusted initial claims was 203,000, an increase of 1,000.
The 4-week moving average was 197,750, an increase of 2,000.
The advance seasonally adjusted insured unemployment rate was 1.1 percent for the week ending November 7,
unchanged from the prior week. The advance number for seasonally adjusted insured unemployment during the week ending November 7 was 1,763,000, an increase of 70,000.`;

test('W04 revised r539cy XML cannot stand in for the current ETA538 advance release', () => {
  const xmlRows = parseDolNationalClaimsXml(oldNationalXml, {retrievedAt, releaseAt:RELEASE_AT});
  assert.equal(xmlRows.length, 4);
  const xmlDates = Object.fromEntries(xmlRows.map(row => [row.logicalSeriesId, row.observationDate]));
  assert.ok(Object.values(xmlDates).every(date => date === '2026-10-24'));
  assert.equal(dolNationalSeriesFreshAtRelease(xmlDates, RELEASE_AT), false);
  // Upstream time lag is not a parsing exception. Retain the true vintage.
  assert.ok(xmlRows.every(row => row.provenance?.sourceUrl?.endsWith('/wkclaims/report.asp')));
});

test('W04 ETA538 advance and lagged continued dates remain candidate only without PDF bytes', () => {
  const candidate = parseDolWeeklyReleaseText(advanceReleaseText, {
    releaseDate: '2026-11-19',
    expectedInitialWeekEnd: '2026-11-14',
  });
  assert.equal(candidate.status, 'CANDIDATE_ONLY');
  assert.equal(candidate.reason, 'SOURCE_TEXT_REQUIRES_ORIGINAL_BYTES_ATTESTATION');
  assert.deepEqual(
    Object.fromEntries(candidate.rows.map(row => [row.logicalSeriesId, [row.observationDate, row.value]])),
    {
      INITIAL_CLAIMS: ['2026-11-14', 203000],
      INITIAL_CLAIMS_4W: ['2026-11-14', 197750],
      CONTINUED_CLAIMS: ['2026-11-07', 1763000],
      INSURED_UNEMPLOYMENT_RATE: ['2026-11-07', 1.1],
    },
  );
  const dates = Object.fromEntries(candidate.rows.map(row => [row.logicalSeriesId, row.observationDate]));
  assert.equal(dolNationalSeriesFreshAtRelease(dates, RELEASE_AT), true);
  assert.ok(candidate.rows.every(row => !('sourceHash' in row) && !('availableAt' in row)));
});
