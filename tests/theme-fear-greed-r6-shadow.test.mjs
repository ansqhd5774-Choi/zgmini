import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THEME_FEAR_GREED_R6_WEIGHTS,
  buildThemeFearGreedR6Shadow,
} from '../lib/market-score/theme-fear-greed-r6-shadow.mjs';

const AXIS_KEYS = ['trend', 'breadth', 'demand', 'relativeStrength', 'volatility'];
const axes = score => Object.fromEntries(AXIS_KEYS.map(key => [key, score]));
const baseDate = Date.parse('2025-01-01T00:00:00Z');
const date = i => new Date(baseDate + i * 86400000).toISOString().slice(0, 10);
const etf = (ticker, rank, score) => ({
  ticker, rank, referenceObservations: 756, normalization: 'R3_ROLLING_252',
  pitVerified: true, holdingsVerified: true, sourceVerified: true,
  sourceVersion: 'R3-VERIFIED-INPUT-FIXTURE', sourceStoredAt: '2026-10-18T00:00:00Z',
  history: Array.from({length:252}, (_, i) => ({date:date(i), axes:axes(score)})),
});
const make = (...scores) => scores.map((score,i) => etf(['AAA','BBB','CCC','DDD','EEE'][i], i+1, score));
const run = es => buildThemeFearGreedR6Shadow({themeId:'양자컴퓨팅', etfs:es});

test('R5 ETF weights are exact for 2, 3, 4, 5 funds', () => {
  for (const n of [2,3,4,5]) assert.ok(Math.abs(THEME_FEAR_GREED_R6_WEIGHTS[n].reduce((a,b)=>a+b,0)-1)<1e-12);
  assert.deepEqual(THEME_FEAR_GREED_R6_WEIGHTS[3], [0.5,0.3,0.2]);
  assert.deepEqual(THEME_FEAR_GREED_R6_WEIGHTS[5], [0.4,0.25,0.15,0.12,0.08]);
});

test('weighted R3 ETF points equal R5 66-point calculation and last chart point', () => {
  const result = run(make(80,60,40));
  assert.equal(result.status,'SHADOW_ONLY');
  assert.equal(result.publicationApproved,false);
  assert.ok(Math.abs(result.current-66)<1e-12);
  assert.equal(result.history.length,252);
  assert.equal(result.history.at(-1).score,result.current);
  assert.equal(result.history.at(-1).date,result.observationDate);
  assert.deepEqual(result.etfs.map(x=>x.weight),[0.5,0.3,0.2]);
});

test('2/4/5 ETF shadow combinations keep dates and never publish', () => {
  for (const scores of [[80,60],[80,60,40,20],[80,60,40,20,0]]) {
    const r = run(make(...scores));
    assert.equal(r.status,'SHADOW_ONLY');
    assert.equal(r.publicationApproved,false);
    assert.equal(r.history.length,252);
    assert.ok(r.current>=0&&r.current<=100);
  }
});

test('one or six ETFs cannot create a score',()=>{
  assert.equal(run(make(80)).status,'NOT_READY');
  assert.equal(run([...make(80,60,40,20,10),etf('FFF',6,1)]).status,'NOT_READY');
});

test('missing axes never turn into false 0 or trigger weight reallocation',()=>{
  const x=make(80,60,40); delete x[1].history[200].axes.breadth;
  const r=run(x); assert.equal(r.current,null);assert.equal(r.reason,'ETF_AXIS_MISSING');
});

test('out-of-range scores are rejected',()=>{
  const x=make(80,60);x[0].history[100].axes.trend=110;
  assert.equal(run(x).reason,'ETF_AXIS_OUT_OF_RANGE');
});

test('a missing reference, PIT/holdings provenance or normalization rejects the source',()=>{
  const x=make(80,60);x[0].referenceObservations=755;
  assert.equal(run(x).reason,'R3_REFERENCE_MISMATCH');
  x[0].referenceObservations=756;x[0].pitVerified=false;
  assert.equal(run(x).reason,'ETF_UPSTREAM_VERIFICATION_MISSING');
  x[0].pitVerified=true;x[0].normalization='other';
  assert.equal(run(x).reason,'R3_NORMALIZATION_NOT_VERIFIED');
});

test('ETF score history must have 252 daily entries aligned by date',()=>{
  const x=make(80,60);x[0].history.pop();
  assert.equal(run(x).reason,'ETF_SCORE_HISTORY_NOT_252');
  const y=make(80,60);y[0].history[100].date='2024-01-01';
  assert.equal(run(y).reason,'ETF_DATE_NOT_INCREASING');
  const z=make(80,60);z[1].history=z[1].history.map((row,i)=>({...row,date:date(i+1)}));
  assert.equal(run(z).reason,'ETF_DATE_MISMATCH');
});

test('duplicate ticker, wrong locked rank or missing lineage never score',()=>{
  const x=make(80,60);x[1].ticker=x[0].ticker;
  assert.equal(run(x).reason,'ETF_TICKER_DUPLICATE');
  const y=make(80,60);y[1].rank=4;
  assert.equal(run(y).reason,'ETF_RANK_NOT_LOCKED');
  const z=make(80,60);z[0].sourceVersion=null;
  assert.equal(run(z).reason,'ETF_SOURCE_LINEAGE_MISSING');
});

test('invalid calendar date is rejected',()=>{
  const x=make(80,60);x[0].history[30].date='2025-02-30';
  assert.equal(run(x).reason,'ETF_DATE_INVALID');
});
