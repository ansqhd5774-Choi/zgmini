import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAumWeightedThemeShadow, weightEtfsByFundNetAssets} from '../lib/market-score/theme-etf-aum-weight-r1.mjs';

const on = (ticker, netAssetsUSD, date='2026-10-21', score=undefined) => ({
  ticker, netAssetsUSD, netAssetsAsOf: date, source: 'ISSUER_OFFICIAL', ...(score === undefined ? {} : {score}),
});
const candidate = (a, b, date='2026-10-21') => weightEtfsByFundNetAssets({date, etfs:[on('QTUM',a,date),on('WQTM',b,date)]});

test('pure fund-size proportionality, without floors, caps or square-root transformations', () => {
  const a = candidate(1_000_000_000, 10_000_000).weights;
  assert.ok(Math.abs(a[0].weight-100/101)<1e-12);
  assert.ok(Math.abs(a[1].weight-1/101)<1e-12);
  const b = candidate(10_000_000, 10_000_000).weights;
  assert.deepEqual(b.map(x=>x.weight),[.5,.5]);
  const c = candidate(100_000_000_000,10_000_000).weights;
  assert.ok(c[1].weight<.0001);
});

test('2026-10-21 issuer figures yield QTUM 94.4013% and WQTM 5.5987%', () => {
  const x = candidate(5_364_800_000,318_171_540).weights;
  assert.ok(Math.abs(x[0].weight*100-94.4013173784)<1e-8);
  assert.ok(Math.abs(x[1].weight*100-5.5986826216)<1e-8);
});

test('score composition uses exactly the fund weights', () => {
  const x=weightEtfsByFundNetAssets({date:'2026-10-21',etfs:[
    on('QTUM',1_000_000_000,'2026-10-21',80),
    on('WQTM',10_000_000,'2026-10-21',10),
  ]});
  assert.ok(Math.abs(x.score-(80*100+10)/101)<1e-12);
});

test('invalid and missing fund history never gets guessed or backfilled',()=>{
  assert.throws(()=>weightEtfsByFundNetAssets({date:'2026-10-21',etfs:[on('QTUM',100),on('WQTM',0)]}),/NET_ASSETS_INVALID/);
  assert.throws(()=>weightEtfsByFundNetAssets({date:'2026-10-21',etfs:[on('QTUM',100),on('WQTM',10,'2026-10-20')]}),/NOT_SAME_DATE/);
  assert.throws(()=>weightEtfsByFundNetAssets({date:'2026-10-21',etfs:[on('QTUM',100,'2026-10-21',50),on('WQTM',10)]}),/SCORE_COVERAGE_INCOMPLETE/);
  assert.throws(()=>buildAumWeightedThemeShadow({theme:'양자컴퓨팅',etfTickers:['QTUM','WQTM'],observations:[
    {date:'2026-10-21',etfs:[on('QTUM',100,'2026-10-21',50),on('WQTM',10,'2026-10-21',60)]},
  ]}),/252_OBSERVATIONS_REQUIRED/);
});

test('fully sourced 252-date fixture stays private and weights change by actual date',()=>{
  const rows = Array.from({length:252},(_,i)=>{
    const d=new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10);
    return {date:d,etfs:[on('QTUM',100+i,d,65),on('WQTM',100,d,35)]};
  });
  const result=buildAumWeightedThemeShadow({theme:'양자컴퓨팅',etfTickers:['QTUM','WQTM'],observations:rows});
  assert.equal(result.history.length,252);
  assert.equal(result.status,'PRIVATE_RESEARCH_READY_NOT_PUBLIC');
  assert.equal(result.publicationAuthorized,false);
  assert.ok(result.history.at(-1).weights[0].weight>result.history[0].weights[0].weight);
  assert.ok(result.latestScore>50);
});
