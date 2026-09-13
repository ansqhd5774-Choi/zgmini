import test from 'node:test';
import assert from 'node:assert/strict';
import {createKfgV2PostcheckHandler, summarizeKfgV2Postcheck} from '../worker/kfg-v2-postcheck.mjs';

const operator = 'operator@example.test';
const env = {DB: {}, KFG_V2_CANARY_OPERATOR_EMAIL: operator};
const request = method => new Request('https://zgmini.kr/api/internal/kfg-v2-postcheck', {method});
const fixture = (historyCount = 311) => ({
  checkpoint: {successfulDatesTotal: 620, oldestProcessedDate: '20240222', latestProcessedDate: '20260910', status: 'COMPLETE'},
  dates: {distinctTradingDates: 620, uniqueSuccessfulDates: 620},
  raw: {totalRows: 2, minRowsPerDate: 0, maxRowsPerDate: 2, averageRowsPerDate: 1, zeroRowDates: 1, duplicateDateSecurityPairs: 0},
  coverageRows: [{date: '20240222', returnCoverage: 0, tradingValueCoverage: 0.5, marketCapCoverage: 1}, {date: '20260910', returnCoverage: 1, tradingValueCoverage: 1, marketCapCoverage: 1}],
  breadth: {snapshotCount: 620, distinctDates: 620, duplicateDates: 0, missingDates: 0, invalidScoreCount: 0, scoreOutside0To100: 0},
  historyCounts: [{securityId: 'fixture', historyCount}],
});

test('unauthenticated and operator mismatch reject before reader', async () => {
  let reads = 0;
  const handler = createKfgV2PostcheckHandler({env, authenticate: async () => null, reader: async () => { reads++; return fixture(); }});
  assert.equal((await handler(request('GET'))).status, 401);
  const mismatch = createKfgV2PostcheckHandler({env, authenticate: async () => ({userId: 'u', email: 'other@example.test'}), reader: async () => { reads++; return fixture(); }});
  assert.equal((await mismatch(request('GET'))).status, 403);
  assert.equal(reads, 0);
});

test('operator success is read-only and summary is safe', async () => {
  let reads = 0;
  const handler = createKfgV2PostcheckHandler({env, authenticate: async () => ({userId: 'u', email: operator}), reader: async () => { reads++; return fixture(); }});
  const response = await handler(request('GET'));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(reads, 1);
  assert.equal(body.finalStates.backfillComplete, true);
  assert.equal(body.finalStates.compositeReady, false);
  assert.equal(body.rawHistory.zeroRowDates, 1);
  assert.equal(body.factorReadiness.momentum.ready, false);
  assert.equal(body.research.productionEligible, false);
  assert.equal(JSON.stringify(body).includes(operator), false);
  assert.equal(JSON.stringify(body).includes('securityId'), false);
});

test('310 history is not Momentum ready; 311 is ready', () => {
  assert.equal(summarizeKfgV2Postcheck(fixture(310)).factorReadiness.momentum.ready, false);
  assert.equal(summarizeKfgV2Postcheck(fixture(311)).factorReadiness.momentum.ready, true);
});

test('duplicate and coverage checks remain summary-only', () => {
  const body = summarizeKfgV2Postcheck({...fixture(), dates: {distinctTradingDates: 620, uniqueSuccessfulDates: 619}, raw: {...fixture().raw, duplicateDateSecurityPairs: 2}, breadth: {...fixture().breadth, missingDates: 1}});
  assert.equal(body.checkpoint.duplicateDates, 1);
  assert.equal(body.rawHistory.duplicateDateSecurityPairs, 2);
  assert.equal(body.breadth.missingDates, 1);
  assert.equal(body.coverage.return.minimum, 0);
});

test('research summary discloses current-vintage gate without enabling production', () => {
  const body = summarizeKfgV2Postcheck({...fixture(), research: {
    methodologyVersion: 'kr-research-v2-1.0.0',
    historyMode: 'RECONSTRUCTED_CURRENT_VINTAGE',
    pointInTimeVerified: false,
    historicalVintageVerified: false,
    publicationLagStatus: 'UNCONFIRMED',
    sourcePublishedAt: null,
    readiness: {momentum:{ready:false},strength:{ready:false},volatility:{ready:false}},
    composite: {status: 'UNAVAILABLE', score: null},
  }});
  assert.equal(body.research.historyMode, 'RECONSTRUCTED_CURRENT_VINTAGE');
  assert.equal(body.research.pointInTimeVerified, false);
  assert.equal(body.research.historicalVintageVerified, false);
  assert.equal(body.research.productionEligible, false);
});
