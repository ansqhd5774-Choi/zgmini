import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectNineR32, findR25} from '../scripts/pc-writer/theme-nine-r32-readonly-preflight.mjs';
const roster = JSON.parse(fs.readFileSync(new URL('../config/theme-nine-r20-approved-candidates.json', import.meta.url)));
const aum = JSON.parse(fs.readFileSync(new URL('../config/theme-nine-r26-official-aum-evidence.json', import.meta.url)));
const symbols = [...new Set(roster.groups.flatMap(g => g.tickers.map(t => t.ticker)))].sort();
const dates = Array.from({length: 252}, (_, i) =>
  new Date(Date.parse('2026-10-23T00:00:00Z') - (251 - i) * 86400000)
    .toISOString().slice(0, 10));
function fixture() {
  const individual = Object.fromEntries(symbols.map(symbol => [symbol, {
    symbol,
    latest252ScoredSessions: 252,
    latest252MissingScores: 0,
    latestScore: 50,
    history: dates.map((date, i) => ({
      date, score: 50, status: 'ADAPTIVE_PROVISIONAL',
      realSessionCount: 40 + i
    }))
  }]));
  return {contract: 'THEME_NINE_R25_PRIVATE_INDIVIDUAL_ETF_R2_V1',
    status: 'PRIVATE_STAGE3_CALCULATED_NOT_PUBLISHED',
    publicationAuthorized: false, candidateRosterUnchanged: true,
    priceMode: 'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
    source: {
      rosterSha256: aum.candidateRosterSha256,
      manifestSha256: '8c6aa292da35310ce37093b73a331177582fb741d16d8a6423bee7413ddbcdb5',
      manifestRawPages: 121,
      latest252SpySessions: 252,
      latestSpySessionDate: '2026-10-23'
    }, latest252TradingDates: dates, individual};
}
test('documented AUM covers the approved unique 63 without a synthetic value', () => {
  assert.equal(symbols.length, 63);
  assert.equal(aum.rows.length, 63);
  assert.equal(new Set(aum.rows.map(r => r.ticker)).size, 63);
  assert.deepEqual(aum.rows.map(r => r.ticker).sort(), symbols);
  assert.equal(aum.rows.filter(r => r.aumAsOf === '2026-10-23').length, 42);
});
test('preflight audits full date grid and never computes a weighted score', () => {
  const got = inspectNineR32({r25: fixture(), roster, aum});
  assert.equal(got.status, 'PRECHECK_ONLY_NO_AGGREGATE');
  assert.equal(got.counts.latestEligibleScores, 63);
  assert.equal(got.counts.earlierDatedOfficialAum, 21);
  assert.equal(got.themeCounts.length, 9);
  assert.equal(got.themeCounts.reduce((n, t) => n + t.rosterPositions, 0), 64);
  assert.equal(got.d1Writes, 0);
  assert.equal(got.publicationWrites, 0);
  assert.equal('aggregateScore' in got, false);
});
test('latest price gap remains missing, not zero or backfilled', () => {
  const r25 = fixture();
  const v = r25.individual.BOTZ;
  v.history[251].score = null;
  v.history[251].status = 'NO_REAL_CLOSE';
  v.latestScore = null;
  v.latest252ScoredSessions = 251;
  v.latest252MissingScores = 1;
  const got = inspectNineR32({r25, roster, aum});
  assert.equal(got.counts.latestEligibleScores, 62);
  assert.equal(got.counts.latestScoreMissing, 1);
});
test('rejects fabricated values, changed provenance, and roster mutation', () => {
  const changed = fixture();
  changed.individual.BOTZ.history[250].score = 101;
  assert.throws(() => inspectNineR32({r25: changed, roster, aum}), /R25_SCORE_CONTRACT/);
  const changedSource = fixture();
  changedSource.source.manifestSha256 = 'f'.repeat(64);
  assert.throws(() => inspectNineR32({r25: changedSource, roster, aum}), /R25_SOURCE_MISMATCH/);
  const changedAum = {...aum, rows: aum.rows.slice(1)};
  assert.throws(() => inspectNineR32({r25: fixture(), roster, aum: changedAum}), /AUM_SYMBOLS/);
});
test('CMD file discovery emits precise errors for missing inputs', () => {
  const testFolder = path.dirname(fileURLToPath(import.meta.url));
  assert.throws(() => findR25(testFolder), /R25_JSON_NOT_NEXT_TO_CMD/);
  assert.throws(() => findR25(testFolder, path.join(testFolder, 'THIS_R25_FILE_DOES_NOT_EXIST.json')),
    /R25_SELECTED_FILE_NOT_FOUND/);
});
