import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BATCH_A_FRED_SERIES_IDS,
  DIAGNOSTIC_BEA_CROSSCHECKS,
  DIAGNOSTIC_BLS_FALLBACKS,
  diagnosticRoleIndex,
  diagnosticSeriesSpec,
} from '../lib/diagnostic-layer/input-registry.mjs';
import {
  batchARegistryCoverage,
  diagnosticFredUrl,
  fetchDiagnosticFredSeries,
  parseDiagnosticBeaSeries,
  parseDiagnosticBlsSeries,
  parseDiagnosticFredPage,
} from '../lib/diagnostic-layer/official-macro-adapters.mjs';

test('Batch A registry contains all evidence-locked FRED series', () => {
  const required = [
    'PCEPILFE','PCEPI','CPILFESL','CPIAUCSL',
    'PAYEMS','GDPC1','INDPRO','DPCERA3M086SBEA','UNRATE','RRSFS','DSPIC96',
    'SOFR','IORB','OBFR','WRESBAL','WTREGEN','RRPONTSYD','M2SL',
    'WLCFLPCL','WLCFLSCL','H41RESPPALDKNWW','WLCFOCEL','TLAACBM027NBOG',
    'DGS2','DGS5','DGS10','DGS30',
    'GDP','BOGZ1LM793164115Q','BOGZ1LM103164115Q','BOGZ1FL153064486Q',
    'BOGZ1FA153064475Q','BOGZ1FL153064475Q',
    'B471RC1Q027SBEA','A455RC1Q027SBEA','A464RC1Q027SBEA',
    'MCOILWTICO','MCOILBRENTEU','GASREGCOVM',
  ];
  assert.deepEqual([...BATCH_A_FRED_SERIES_IDS].sort(), [...required].sort());
});

test('evidence-locked inflation/recession/supply roles map to exact source IDs', () => {
  const roles = diagnosticRoleIndex();
  assert.equal(roles.get('inflation.corePce').seriesId, 'PCEPILFE');
  assert.equal(roles.get('inflation.headlinePceTargetBridge').seriesId, 'PCEPI');
  assert.equal(roles.get('inflation.coreCpi').seriesId, 'CPILFESL');
  assert.equal(roles.get('inflation.headlineCpi').seriesId, 'CPIAUCSL');
  assert.equal(roles.get('recession.realPce').seriesId, 'DPCERA3M086SBEA');
  assert.equal(roles.get('recession.disposableIncome').seriesId, 'DSPIC96');
  assert.equal(roles.get('supply.wti').seriesId, 'MCOILWTICO');
  assert.equal(roles.get('supply.brent').seriesId, 'MCOILBRENTEU');
  assert.equal(roles.get('supply.gasoline').seriesId, 'GASREGCOVM');
});

test('asset-bubble and debt evidence mappings are preserved', () => {
  const roles = diagnosticRoleIndex();
  assert.equal(roles.get('assetBubble.publicFinancialEquityValue').seriesId, 'BOGZ1LM793164115Q');
  assert.equal(roles.get('assetBubble.publicNonfinancialEquityValue').seriesId, 'BOGZ1LM103164115Q');
  assert.equal(roles.get('assetBubble.riskAssetShare').seriesId, 'BOGZ1FL153064486Q');
  assert.equal(roles.get('assetBubble.householdEquityTransactions').seriesId, 'BOGZ1FA153064475Q');
  assert.equal(roles.get('assetBubble.householdEquityHoldings').seriesId, 'BOGZ1FL153064475Q');
  assert.equal(roles.get('debt.netInterest').seriesId, 'B471RC1Q027SBEA');
  assert.equal(roles.get('debt.grossValueAdded').seriesId, 'A455RC1Q027SBEA');
  assert.equal(roles.get('debt.profitsBeforeTax').seriesId, 'A464RC1Q027SBEA');
});

test('registry never claims releaseDate/availableAt from current-vintage transport', () => {
  for (const id of BATCH_A_FRED_SERIES_IDS) {
    const spec = diagnosticSeriesSpec(id);
    assert.equal(spec.historyMode, 'CURRENT_VINTAGE_ONLY');
    assert.equal(spec.releaseDatePolicy, 'NULL_UNTIL_PROVEN');
    assert.equal(spec.availableAtPolicy, 'NULL_UNTIL_PROVEN');
  }
});

test('FRED URL is allowlisted and bounded', () => {
  const u = diagnosticFredUrl('PCEPILFE', 'fixture-secret', '2026-09-20', 0);
  assert.equal(u.hostname, 'api.stlouisfed.org');
  assert.equal(u.searchParams.get('series_id'), 'PCEPILFE');
  assert.equal(u.searchParams.get('sort_order'), 'asc');
  assert.equal(u.searchParams.get('limit'), '10000');
  assert.equal(u.searchParams.get('offset'), '0');
  assert.equal(u.searchParams.get('units'), 'lin');
  assert.throws(() => diagnosticFredUrl('NOT_REAL', 'x', '2026-09-20'), /INVALID_SERIES/);
  assert.throws(() => diagnosticFredUrl('PCEPILFE', '', '2026-09-20'), /KEY_MISSING/);
});

test('FRED parser keeps zero, drops dot, and never fabricates availability', () => {
  const out = parseDiagnosticFredPage({
    count: 3,
    offset: 0,
    units: 'lin',
    observations: [
      {date:'2026-06-01', value:'0', realtime_start:'2026-07-01', realtime_end:'2026-07-01'},
      {date:'2026-07-01', value:'.', realtime_start:'2026-08-01', realtime_end:'2026-08-01'},
      {date:'2026-08-01', value:'4.2', realtime_start:'2026-09-01', realtime_end:'2026-09-01'},
    ],
  }, 'PCEPILFE', '2026-09-20', 0);
  assert.equal(out.rows.length, 2);
  assert.equal(out.rows[0].value, 0);
  assert.equal(out.rows[0].releaseDate, null);
  assert.equal(out.rows[0].availableAt, null);
  assert.equal(out.rows[0].vintageMethod, 'CURRENT_VINTAGE_ONLY');
});

test('FRED parser rejects transformed, future, bad offset, and duplicate conflict', () => {
  const base = {count:1,offset:0,units:'lin',observations:[{date:'2026-08-01',value:'1'}]};
  assert.throws(() => parseDiagnosticFredPage({...base,units:'chg'}, 'PCEPILFE', '2026-09-20', 0), /TRANSFORMED_RESPONSE/);
  assert.throws(() => parseDiagnosticFredPage({...base,observations:[{date:'2026-10-01',value:'1'}]}, 'PCEPILFE', '2026-09-20', 0), /FUTURE_OBSERVATION/);
  assert.throws(() => parseDiagnosticFredPage({...base,offset:10000}, 'PCEPILFE', '2026-09-20', 0), /OFFSET_MISMATCH/);
  assert.throws(() => parseDiagnosticFredPage({
    count:2,offset:0,units:'lin',
    observations:[{date:'2026-08-01',value:'1'},{date:'2026-08-01',value:'2'}],
  }, 'PCEPILFE', '2026-09-20', 0), /DUPLICATE_CONFLICT/);
});

test('FRED fetch uses fixture transport, returns no secret, and preserves current-vintage honesty', async () => {
  let calls = 0;
  const result = await fetchDiagnosticFredSeries('PCEPILFE', {
    key:'fixture-secret',
    asOf:'2026-09-20',
    fetchImpl: async function(url, init) {
      calls += 1;
      assert.equal(this, globalThis);
      assert.equal(init.redirect, 'manual');
      assert.equal(new URL(url).searchParams.get('api_key'), 'fixture-secret');
      return Response.json({
        count:2,offset:0,limit:10000,units:'lin',
        observations:[
          {date:'2026-07-01',value:'100',realtime_start:'2026-08-01',realtime_end:'2026-08-01'},
          {date:'2026-08-01',value:'101',realtime_start:'2026-09-01',realtime_end:'2026-09-01'},
        ],
      });
    },
  });
  assert.equal(calls,1);
  assert.equal(result.status,'READY_CURRENT_VINTAGE');
  assert.equal(result.requestCount,1);
  assert.equal(result.rows.length,2);
  assert.equal(result.rows[0].availableAt,null);
  assert.ok(!JSON.stringify(result).includes('fixture-secret'));
});

test('FRED fetch paginates deterministically when count exceeds one page', async () => {
  let calls = 0;
  const start = Date.parse('1990-01-01T00:00:00Z');
  const firstPage = Array.from({length:10000},(_,i)=>({
    date:new Date(start + i*86400000).toISOString().slice(0,10),
    value:String(i),
  }));
  const result = await fetchDiagnosticFredSeries('DGS10', {
    key:'fixture-secret',
    asOf:'2026-09-20',
    fetchImpl: async url => {
      calls += 1;
      const offset = Number(new URL(url).searchParams.get('offset'));
      if (offset === 0) {
        return Response.json({count:10001,offset:0,units:'lin',observations:firstPage});
      }
      assert.equal(offset,10000);
      return Response.json({
        count:10001,offset:10000,units:'lin',
        observations:[{date:'2026-09-01',value:'4.1'}],
      });
    },
  });
  assert.equal(result.status,'READY_CURRENT_VINTAGE');
  assert.equal(result.requestCount,2);
  assert.equal(result.rows.length,10001);
  assert.equal(calls,2);
});

test('BLS cross-check mappings are exact and normalize M13 out', () => {
  assert.equal(DIAGNOSTIC_BLS_FALLBACKS.CPIAUCSL.seriesId,'CUSR0000SA0');
  assert.equal(DIAGNOSTIC_BLS_FALLBACKS.CPILFESL.seriesId,'CUSR0000SA0L1E');
  const rows = parseDiagnosticBlsSeries({
    status:'REQUEST_SUCCEEDED',
    Results:{series:[{seriesID:'CUSR0000SA0',data:[
      {year:'2026',period:'M13',value:'999'},
      {year:'2026',period:'M08',value:'334.1'},
    ]}]},
  }, 'CPIAUCSL');
  assert.deepEqual(rows.map(r=>[r.observationDate,r.value]), [['2026-08-01',334.1]]);
  assert.equal(rows[0].availableAt,null);
});

test('BEA cross-check mappings preserve only approved selectors', () => {
  assert.equal(DIAGNOSTIC_BEA_CROSSCHECKS.PCEPILFE.table,'T20804');
  assert.equal(DIAGNOSTIC_BEA_CROSSCHECKS.GDPC1.table,'T10106');

  const pce = parseDiagnosticBeaSeries({
    BEAAPI:{Results:{Data:[
      {LineDescription:'Personal consumption expenditures excluding food and energy',DataValue:'130.5',TimePeriod:'2026M07'},
      {LineDescription:'Market-based PCE excluding food and energy',DataValue:'130.0',TimePeriod:'2026M07'},
    ]}},
  }, 'PCEPILFE');
  assert.deepEqual(pce.map(r=>[r.observationDate,r.value]), [['2026-07-01',130.5]]);

  const gdp = parseDiagnosticBeaSeries({
    BEAAPI:{Results:{Data:[
      {LineNumber:'1',LineDescription:'Gross domestic product',DataValue:'24,269.613',TimePeriod:'2026Q2'},
      {LineNumber:'2',LineDescription:'Other',DataValue:'1',TimePeriod:'2026Q2'},
    ]}},
  }, 'GDPC1');
  assert.deepEqual(gdp.map(r=>[r.observationDate,r.value]), [['2026-04-01',24269.613]]);
});

test('Batch A coverage reports no fabricated historical availability', () => {
  const c = batchARegistryCoverage();
  assert.equal(c.fredSeries,38);
  assert.equal(c.blsCrossChecks,4);
  assert.equal(c.beaCrossChecks,2);
  assert.equal(c.releaseDateFabricated,false);
  assert.equal(c.availableAtFabricated,false);
});
