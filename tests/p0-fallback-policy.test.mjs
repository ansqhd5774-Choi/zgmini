import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateFallbackEligibility as decide, FALLBACK_MAPPINGS, ALLOWED_PRIMARY_FAILURES} from '../lib/market-data/fallback-policy.mjs';
import {normalizeShadowSeries} from '../lib/market-data/fred-bls-shadow.mjs';
const fetchedAt = '2026-09-12T00:00:00.000Z';
const points = Array.from({length: 18}, (_, i) => ({date: new Date(Date.UTC(2025, 2 + i, 1)).toISOString().slice(0, 10), value: 100 + i}));
// Synthetic test inputs emulate trusted internal provenance; never runtime data.
const quality = {dataOrigin: 'PROVIDER', status: 'PASS', requiredHistoryVerified: true, observationPolicy: 'LATEST_AVAILABLE'};
const secondary = metric => ({...normalizeShadowSeries(metric, points, {fetchedAt}), transportMode: 'FRED_API_V1', providerUpdatedDataIsCurrent: 'unknown'});
const failure = status => ({status, failureOrigin: 'PROVIDER'});
const primary = metric => ({...secondary(metric), status: 'SUCCESS'});
const run = (primaryResult = failure('TIMEOUT'), secondaryResult = secondary('unemployment'), metricId = 'unemployment', q = quality) => decide({metricId, primary: primaryResult, secondary: secondaryResult, quality: q});
test('successful BLS, including zero, preserved without inspecting secondary', () => {
  const p = {...primary('unemployment'), currentValue: 0};
  const r = decide({metricId: 'unemployment', primary: p, get secondary() {throw Error('must not inspect');}});
  assert.equal(r.decision, 'USE_PRIMARY'); assert.equal(r.selected.currentValue, 0); assert.equal(r.fallbackUsed, false);
});
for (const status of ALLOWED_PRIMARY_FAILURES) test(`provider ${status} eligible`, () => {
  const r = run(failure(status)); assert.equal(r.decision, 'USE_SECONDARY'); assert.equal(r.fallbackReason, status);
});
for (const origin of ['SEMANTIC', 'CODE', undefined]) test(`ambiguous/semantic/code failure ${origin} blocks`, () => {
  assert.equal(run({status:'INVALID_RESPONSE',failureOrigin:origin}).decision,'BLOCKED');
});
for (const status of ['SEMANTIC_MISMATCH','UNIT_MISMATCH','AUTH_FAILED','API_ERROR','VALUE_DIFFERENCE']) test(`unsupported or semantic ${status} not silently aliased`, () => {
  assert.equal(run(failure(status)).decision,'BLOCKED');
});
test('primary semantic or unit failure blocks even if secondary valid', () => {
  assert.equal(run({...failure('TIMEOUT'),semantic:'FAIL'}).decision,'BLOCKED');
  assert.equal(run({...primary('unemployment'),unit:'wrong'}).decision,'BLOCKED');
});
test('only missing batch member switches; other three BLS results retained', () => {
  const decisions=Object.keys(FALLBACK_MAPPINGS).map(metric=>run(metric==='unemployment'?failure('MISSING_SERIES'):primary(metric),secondary(metric),metric));
  assert.deepEqual(decisions.map(d=>d.decision),['USE_PRIMARY','USE_PRIMARY','USE_SECONDARY','USE_PRIMARY']);
});
test('PPI mapping confirmed: valid equivalent secondary eligible', () => {
  assert.equal(FALLBACK_MAPPINGS.ppi.semanticEquivalent,'YES');
  assert.equal(run(failure('TIMEOUT'),secondary('ppi'),'ppi').decision,'USE_SECONDARY');
});
test('PPI supplied official five-month observations and metadata match', () => {
  // User-supplied official evidence; no live API retrieval in this test.
  const bls = [['2026-04',156.061],['2026-05',156.864],['2026-06',156.667],['2026-07',156.784],['2026-08',157.411]];
  const fred = [['2026-04',156.061],['2026-05',156.864],['2026-06',156.667],['2026-07',156.784],['2026-08',157.411]];
  assert.deepEqual(bls, fred);
  const m = FALLBACK_MAPPINGS.ppi;
  assert.equal(m.sourceSeriesId,'WPSFD4'); assert.equal(m.transportSeriesId,'PPIFIS');
  assert.equal(m.unit,'Index Nov 2009=100'); assert.equal(m.frequency,'Monthly');
  assert.equal(m.seasonalAdjustment,'SA'); assert.equal(m.authority,'BLS');
  assert.equal(m.revisionSensitive,true); assert.equal(m.mappingQualification,'VINTAGE_SENSITIVE');
});
test('PPI eligibility still requires exact YoY baselines and matching metadata', () => {
  for (const patch of [{rawYearAgo:undefined},{rawPreviousYearAgo:undefined},{yearAgoObservedAt:'2025-07-01'},{rawYearAgo:0},{unit:'Index 1982=100'},{seasonalAdjustment:'NSA'},{semantic:'FAIL'}]) {
    assert.equal(run(failure('TIMEOUT'),{...secondary('ppi'),...patch},'ppi').decision,'BLOCKED');
  }
});
for (const [field, value] of [['semantic','FAIL'],['status','MISSING_OBSERVATION'],['unit','wrong'],['frequency','Daily'],['seasonalAdjustment','NSA'],['semanticUnit','level'],['transportMode','FRED_GRAPH_CSV'],['sourceSeriesId','WRONG'],['transportSeriesId','WRONG'],['currentValue',NaN],['previousValue',Infinity],['previousObservedAt','2026-06-01'],['observedAt','invalid'],['fetchedAt','invalid'],['providerUpdatedDataIsCurrent',false],['fixture',true],['example',true],['synthetic',true]]) test(`secondary ${field}=${String(value)} blocked`, () => {
  const r=run(failure('TIMEOUT'),{...secondary('unemployment'),[field]:value});
  assert.equal(r.decision,'BLOCKED'); assert.equal(r.selected,null); assert.equal(r.fallbackUsed,false);
});
test('secondary stale/future rejected without selecting a newer provider automatically', () => {
  assert.equal(run(failure('TIMEOUT'),{...secondary('unemployment'),fetchedAt:'2027-01-01'}).decision,'BLOCKED');
  assert.equal(run(failure('TIMEOUT'),{...secondary('unemployment'),fetchedAt:'2026-07-01'}).decision,'BLOCKED');
  const p={...primary('unemployment'),observedAt:'2026-07-01',previousObservedAt:'2026-06-01'};
  assert.equal(run(p).selected.observedAt,'2026-07-01');
});
for (const q of [{}, {...quality,dataOrigin:'FIXTURE'},{...quality,status:'STALE'},{...quality,requiredHistoryVerified:false},{...quality,observationPolicy:'FORWARD_FILL'}]) test('unverified provenance/history/policy blocked '+JSON.stringify(q), () => {
  assert.equal(run(failure('TIMEOUT'),secondary('unemployment'),'unemployment',q).decision,'BLOCKED');
});
for (const metric of ['cpi','ppi','unemployment','payroll']) test(`${metric}: accepted formula inputs identical, no conversion in decision`, () => {
  const s=secondary(metric),r=run(failure('TIMEOUT'),s,metric);
  assert.equal(r.decision,'USE_SECONDARY');assert.equal(r.selected.currentValue,s.currentValue);assert.equal(r.selected.previousValue,s.previousValue);
  assert.equal(r.selected.sourceSeries,FALLBACK_MAPPINGS[metric].sourceSeriesId);
});
test('CPI exact YoY baseline and payroll prior month mandatory', () => {
  assert.equal(run(failure('TIMEOUT'),{...secondary('cpi'),rawYearAgo:undefined},'cpi').decision,'BLOCKED');
  assert.equal(run(failure('TIMEOUT'),{...secondary('cpi'),yearAgoObservedAt:'2025-07-01'},'cpi').decision,'BLOCKED');
  assert.equal(run(failure('TIMEOUT'),{...secondary('payroll'),priorObservedAt:'2026-05-01'},'payroll').decision,'BLOCKED');
});
test('fallback failure cannot supply a live selected result', () => {
  const r=run(failure('TIMEOUT'),{...secondary('unemployment'),status:'TIMEOUT'});
  assert.deepEqual(r,{decision:'BLOCKED',reason:'SECONDARY_NOT_VALID',fallbackUsed:false,selected:null});
});
test('whitelist excludes secret and raw response fields; input objects untouched', () => {
  const s={...secondary('unemployment'),api_key:'private-fixture-secret',headers:{cookie:'private-fixture-secret'},rawBody:'private-fixture-secret'};
  const before=structuredClone(s), r=run(failure('TIMEOUT'),s);
  assert.ok(!JSON.stringify(r).includes('private-fixture-secret'));assert.deepEqual(s,before);
});
