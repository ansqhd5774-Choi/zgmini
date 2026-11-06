import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreER1ForecastIssuers,FORECAST_METHOD,
  FORECAST_WEIGHTS,FORECAST_STAR3_THRESHOLD} from './market-calendar-er1-forecast-score.mjs';

const day='2026-11-06';
const future=(symbol,extra={})=>({symbol,date:'2026-11-20',
  eps:null,revenue:null,epsEstimate:1.25,revenueEstimate:100,...extra});
const issuer=(symbol,releases)=>({issuerId:symbol,tickers:[symbol],
  earningsSymbol:symbol,releases});

test('unreported forecast-only issuer is scored, with explicit estimate basis',()=>{
  const out=scoreER1ForecastIssuers([
    issuer('FOO',[future('FOO')]),
    issuer('BAR',[future('BAR',{epsEstimate:-0.5,revenueEstimate:40})])
  ],{asOf:day});
  assert.equal(out.status,'READY_SHADOW');
  assert.equal(out.method,FORECAST_METHOD);
  assert.deepEqual(FORECAST_WEIGHTS,{revenuePercentile:60,epsProfitability:40});
  assert.equal(FORECAST_STAR3_THRESHOLD,97);
  assert.equal(out.coverage.estimateOnly,2);
  assert.equal(out.coverage.scoreableIssuers,2);
  assert.equal(out.rankings[0].basis,'ESTIMATE');
  assert.equal(out.previewOnly,true);
});

test('future actual numbers cannot leak into a pre-announcement score',()=>{
  const rows=[issuer('NEXT',[future('NEXT',{eps:999,revenue:999999999,
    epsEstimate:0.75,revenueEstimate:10})])];
  const first=scoreER1ForecastIssuers(rows,{asOf:day});
  rows[0].releases[0].eps=-999;
  rows[0].releases[0].revenue=1;
  const second=scoreER1ForecastIssuers(rows,{asOf:day});
  assert.equal(first.rankings[0].score,second.rankings[0].score);
  assert.equal(first.rankings[0].basis,'ESTIMATE');
});

test('forecast EPS and recent historic actual revenue yield MIXED, not missing zero',()=>{
  const x=scoreER1ForecastIssuers([
    issuer('MIX',[
      future('MIX',{epsEstimate:-0.2,revenueEstimate:null}),
      {symbol:'MIX',date:'2026-09-01',eps:0.6,revenue:100,
        epsEstimate:null,revenueEstimate:null}
    ])
  ],{asOf:day});
  assert.equal(x.coverage.mixed,1);
  assert.equal(x.rankings[0].epsBasis,'ESTIMATE');
  assert.equal(x.rankings[0].revenueBasis,'ACTUAL');
  assert.equal(x.coverage.scoreableIssuers,1);
});

test('absent forecasts and stale actual history remain unscored, not zero',()=>{
  const x=scoreER1ForecastIssuers([
    issuer('MISS',[future('MISS',{epsEstimate:null,revenueEstimate:null})]),
    issuer('STALE',[
      future('STALE',{epsEstimate:null,revenueEstimate:null}),
      {symbol:'STALE',date:'2026-04-01',eps:1,revenue:100}
    ]),
    issuer('ZERO',[future('ZERO',{epsEstimate:0,revenueEstimate:0})])
  ],{asOf:day});
  assert.equal(x.coverage.unscoreableReasons.ER1_FORECAST_METRICS_MISSING,2);
  assert.equal(x.coverage.scoreableIssuers,1);
  assert.equal(x.rankings[0].issuerId,'ZERO');
  assert.equal(x.rankings[0].score,50);
});

test('strict issuer alias and duplicate input validation still apply',()=>{
  const rows=[issuer('GOOG',[future('GOOG')]),issuer('GOOGL',[future('GOOGL')])];
  assert.throws(()=>scoreER1ForecastIssuers(rows,{asOf:day}),
    /ER1_FORECAST_SHARE_CLASS_SPLIT/);
  assert.throws(()=>scoreER1ForecastIssuers([
    issuer('FOO',[future('FOO')]),issuer('FOO',[future('FOO')])
  ],{asOf:day}),/ER1_FORECAST_ISSUER_INVALID/);
});

test('97-point star threshold is still respected with large forecast cohort',()=>{
  const rows=Array.from({length:50},(_,i)=>{
    const ticker='S'+String(i).padStart(3,'0');
    return issuer(ticker,[future(ticker,{epsEstimate:1,revenueEstimate:i+1})]);
  });
  const scored=scoreER1ForecastIssuers(rows,{asOf:day});
  assert.equal(scored.rankings[0].score,99.4);
  assert.equal(scored.rankings[0].importance,3);
  assert.equal(scored.star3Count,3);
});
