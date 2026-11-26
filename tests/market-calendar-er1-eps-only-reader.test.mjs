import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scoreER1ForecastIssuers,FORECAST_METHOD,FORECAST_LEGACY_METHOD} from
  '../lib/market-calendar-er1-forecast-score.mjs';
import {makeER1PublicDisplay,validateER1PublicDisplay} from
  '../lib/market-calendar-er1-public-display.mjs';
import {earningsDisplaySnapshot,earningsDisplayResponse} from
  '../lib/earnings-api-display.mjs';

const day='2026-11-06';
const days=Array.from({length:14},(_,i)=>
  new Date(Date.parse(day+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
const issuer=(symbol,epsEstimate,revenueEstimate)=>({issuerId:symbol,
  tickers:[symbol],earningsSymbol:symbol,releases:[{symbol,date:day,
  eps:999,revenue:999999,epsEstimate,revenueEstimate}]});
const source=()=>earningsDisplaySnapshot({status:'READY_PRIVATE',
  scope:'PC_PRIVATE',publicDisplay:false,redistribution:false,
  publicationStatus:'HELD_UNCONFIRMED',checkedAt:'2026-11-06T05:00:00Z',
  coveredDays:days,recordCount:3,priorityCount:3,events:
  ['LOSS','GAIN','MISS'].map(ticker=>({ticker,company:ticker,date:day,
    marketSession:'after_market',time:null,priority:true,
    verification:'VENDOR_UNVERIFIED',source:'earnings-api'}))});
const req=`https://zgmini.kr/api/earnings-calendar-display?start=${day}&end=${day}`;

test('EPS-only forecast keeps positive above loss regardless of revenue',async()=>{
  const result=scoreER1ForecastIssuers([
    issuer('LOSS',-1,1000000),issuer('GAIN',1,null),issuer('MISS',null,9999999)
  ],{asOf:day});
  assert.equal(result.method,FORECAST_METHOD);
  assert.equal(result.coverage.scoreableIssuers,2);
  assert.equal(result.coverage.unscoreableReasons.ER1_FORECAST_EPS_MISSING,1);
  const index=Object.fromEntries(result.rankings.map(r=>[r.issuerId,r.score]));
  assert.ok(index.GAIN>index.LOSS);
  const pub=makeER1PublicDisplay(result);
  const checked=validateER1PublicDisplay(pub);
  assert.equal(checked.method,FORECAST_METHOD);
  const html=await earningsDisplayResponse(source(),req,null,null,pub).text();
  assert.match(html,/ER1 예상 EPS · 2026-11-06 기준/);
  assert.equal((html.match(/>★<\/div>/g)??[]).length,2);
  assert.match(html,/기업 실적 점수 없음">-<\/div>/);
  assert.doesNotMatch(html,/예상 EPS 자료 없음 · 별 1개/);
  assert.doesNotMatch(html,/ER1 예상 EPS·매출/);
});

test('previous 60-40 forecast D1 snapshot remains valid during method migration',async()=>{
  const result=scoreER1ForecastIssuers([
    issuer('LOSS',-1,1000),issuer('GAIN',1,100),issuer('MISS',null,null)
  ],{asOf:day});
  const previous={...makeER1PublicDisplay(result),method:FORECAST_LEGACY_METHOD};
  assert.equal(validateER1PublicDisplay(previous)?.method,FORECAST_LEGACY_METHOD);
  const html=await earningsDisplayResponse(source(),req,null,null,previous).text();
  assert.match(html,/ER1 예상 EPS·매출 · 2026-11-06 기준/);
  assert.match(html,/기업 실적 점수 없음">-<\/div>/);
  assert.doesNotMatch(html,/예상 EPS 또는 매출 자료 없음 · 별 1개/);
});
