import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BATCH_A_FRED_SERIES_IDS,
  BATCH_B_FRED_SERIES_IDS,
  diagnosticRoleIndex,
  diagnosticSeriesSpec,
} from '../lib/diagnostic-layer/input-registry.mjs';
import {fetchDiagnosticFredSeries} from '../lib/diagnostic-layer/official-macro-adapters.mjs';
import {
  OFR_MNEMONICS,
  fetchOfrRepoSeries,
  ofrRepoUrl,
  parseOfrRepoTimeseries,
} from '../lib/diagnostic-layer/batch-b-official-adapters.mjs';
import {
  buildBatchBKnownComponents,
  buildInflationExpectationsComponent,
  buildOfrRepoGapComponent,
} from '../lib/diagnostic-layer/batch-b-components.mjs';

const monthly = (count, fn) => Array.from({length:count}, (_, i) => {
  const y = 2000 + Math.floor(i / 12);
  const m = i % 12 + 1;
  return {observationDate:`${y}-${String(m).padStart(2,'0')}-01`, value:fn(i)};
});

const daily = (count, fn) => {
  const start = Date.UTC(2020,0,1);
  return Array.from({length:count}, (_, i) => {
    const date = new Date(start + i * 86400000).toISOString().slice(0,10);
    return {observationDate:date, value:fn(i)};
  });
};

test('Batch B adds only EXPINF5YR and preserves Batch A 41-series scope', () => {
  assert.equal(BATCH_A_FRED_SERIES_IDS.length,41);
  assert.deepEqual([...BATCH_B_FRED_SERIES_IDS],['EXPINF5YR']);
  const spec = diagnosticSeriesSpec('EXPINF5YR');
  assert.equal(spec.authority,'CLEVELAND_FED');
  assert.deepEqual([...spec.roles],['inflation.inflationExpectations']);
  assert.equal(diagnosticRoleIndex().get('inflation.inflationExpectations').seriesId,'EXPINF5YR');
});

test('generic FRED adapter accepts Cleveland Fed EXPINF5YR without changing transport policy', async () => {
  const result = await fetchDiagnosticFredSeries('EXPINF5YR', {
    key:'fixture-secret',
    asOf:'2026-09-20',
    fetchImpl: async function(url, init) {
      assert.equal(this,globalThis);
      assert.equal(init.redirect,'manual');
      const u = new URL(url);
      assert.equal(u.searchParams.get('series_id'),'EXPINF5YR');
      return Response.json({
        count:2,offset:0,units:'lin',
        observations:[
          {date:'2026-07-01',value:'2.1',realtime_start:'2026-08-01',realtime_end:'2026-08-01'},
          {date:'2026-08-01',value:'2.0',realtime_start:'2026-09-01',realtime_end:'2026-09-01'},
        ],
      });
    },
  });
  assert.equal(result.status,'READY_CURRENT_VINTAGE');
  assert.equal(result.authority,'CLEVELAND_FED');
  assert.equal(result.rows.length,2);
  assert.equal(result.rows[0].availableAt,null);
  assert.ok(!JSON.stringify(result).includes('fixture-secret'));
});

test('R14 expectations score uses abs(EXPINF5YR-2) inverse expanding percentile with 60M warmup', () => {
  const rows = monthly(80, i => 1.5 + i/100);
  const out = buildInflationExpectationsComponent(rows);
  assert.equal(out.target,2);
  assert.equal(out.distance[0].value,0.5);
  assert.equal(out.score[0].validHistory,60);
  assert.equal(out.lookAheadSafe,false);
});

test('expectations score is prefix-stable under future appended observations', () => {
  const prefix = monthly(70, i => 1.7 + i/200);
  const a = buildInflationExpectationsComponent(prefix).score;
  const b = buildInflationExpectationsComponent([
    ...prefix,
    {observationDate:'2010-01-01',value:9},
  ]).score;
  const before = new Map(a.map(r=>[r.observationDate,r.value]));
  const after = new Map(b.map(r=>[r.observationDate,r.value]));
  for (const [date,value] of before) assert.equal(after.get(date),value);
});

test('OFR endpoint is exact and mnemonic allowlisted', () => {
  assert.equal(ofrRepoUrl(OFR_MNEMONICS.DVP).toString(),
    'https://data.financialresearch.gov/v1/series/timeseries?mnemonic=REPO-DVP_AR_TOT-P');
  assert.equal(ofrRepoUrl(OFR_MNEMONICS.TRI_PARTY).searchParams.get('mnemonic'),'REPO-TRIV1_AR_TOT-P');
  assert.throws(() => ofrRepoUrl('NOT-ALLOWED'),/INVALID_OFR_MNEMONIC/);
});

test('OFR parser accepts validated [date,value] shape and does not fabricate availability', () => {
  const rows = parseOfrRepoTimeseries([
    ['2026-09-16',3.67],
    ['2026-09-17',3.83],
    ['2026-09-21',4.00],
  ], OFR_MNEMONICS.DVP, '2026-09-20');
  assert.equal(rows.length,2);
  assert.equal(rows[0].observationDate,'2026-09-16');
  assert.equal(rows[0].releaseDate,null);
  assert.equal(rows[0].availableAt,null);
  assert.equal(rows[0].vintageMethod,'CURRENT_VINTAGE_ONLY');
});

test('OFR parser rejects conflicts and invalid numeric values', () => {
  assert.throws(() => parseOfrRepoTimeseries([
    ['2026-09-16',1],['2026-09-16',2],
  ], OFR_MNEMONICS.DVP, '2026-09-20'), /DUPLICATE_CONFLICT/);
  assert.throws(() => parseOfrRepoTimeseries([
    ['2026-09-16','not-number'],
  ], OFR_MNEMONICS.DVP, '2026-09-20'), /INVALID_NUMERIC/);
});

test('OFR fetch is one bounded public request and returns no request URL', async () => {
  let calls=0;
  const result = await fetchOfrRepoSeries(OFR_MNEMONICS.DVP, {
    asOf:'2026-09-20',
    fetchImpl: async function(url, init) {
      calls += 1;
      assert.equal(this,globalThis);
      assert.equal(init.redirect,'follow');
      assert.equal(new URL(url).hostname,'data.financialresearch.gov');
      return Response.json([['2026-09-16',3.61],['2026-09-17',3.83]]);
    },
  });
  assert.equal(calls,1);
  assert.equal(result.status,'READY_CURRENT_VINTAGE');
  assert.equal(result.requestCount,1);
  assert.equal(result.rows.length,2);
  assert.ok(!('url' in result));
});

test('R7 repo gap is abs(DVP-TriParty) with 252-overlap inverse expanding percentile', () => {
  const dvp = daily(300, i => 2 + i/1000);
  const tri = daily(300, i => 2.1 + (i%7)/1000);
  const out = buildOfrRepoGapComponent(dvp,tri);
  assert.equal(out.raw.length,300);
  assert.ok(Math.abs(out.raw[0].value-0.1)<1e-12);
  assert.equal(out.score[0].validHistory,252);
  assert.equal(out.status,'READY_CURRENT_VINTAGE');
});

test('Batch B remains explicit PARTIAL for full Funding Stress', () => {
  const out = buildBatchBKnownComponents({
    inflationExpectations:monthly(70,i=>2+i/1000),
    dvpRepo:daily(300,i=>2+i/1000),
    triPartyRepo:daily(300,i=>2.1+i/2000),
  });
  assert.equal(out.inflationExpectations.status,'READY_CURRENT_VINTAGE');
  assert.equal(out.repoGap.status,'READY_CURRENT_VINTAGE');
  assert.equal(out.fundingStress.status,'PARTIAL');
  assert.ok(out.fundingStress.missing.includes('bankEmergencyScore'));
});
