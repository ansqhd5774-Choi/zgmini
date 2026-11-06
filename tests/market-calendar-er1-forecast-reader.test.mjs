import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreER1ForecastIssuers,FORECAST_METHOD} from
  '../lib/market-calendar-er1-forecast-score.mjs';
import {makeER1PublicDisplay,validateER1PublicDisplay} from
  '../lib/market-calendar-er1-public-display.mjs';
import {earningsDisplaySnapshot,earningsDisplayResponse} from
  '../lib/earnings-api-display.mjs';
import {ER1_METHOD,ER1_STAR3_THRESHOLD} from
  '../lib/market-calendar-er1-earnings-score.mjs';

const asOf='2026-11-06';
const days=Array.from({length:14},(_,i)=>
  new Date(Date.parse(asOf+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
const event=(ticker,date=asOf)=>({ticker,company:ticker,date,marketSession:'after_market',
  time:null,priority:true,verification:'VENDOR_UNVERIFIED',source:'earnings-api'});
const display=(events,coveredDays=days)=>earningsDisplaySnapshot({status:'READY_PRIVATE',
  scope:'PC_PRIVATE',publicDisplay:false,redistribution:false,
  publicationStatus:'HELD_UNCONFIRMED',checkedAt:'2026-11-06T05:00:00Z',
  coveredDays,recordCount:events.length,priorityCount:events.length,
  events});
const issuer=(symbol,epsEstimate,revenueEstimate)=>({issuerId:symbol,
  tickers:[symbol],earningsSymbol:symbol,releases:[{symbol,date:asOf,
  eps:999,revenue:999999,epsEstimate,revenueEstimate}]});
const forecast=()=>scoreER1ForecastIssuers([
  issuer('LOSS',-1,100),issuer('GAIN',3,100),issuer('MISS',null,null)
],{asOf});
const request='https://zgmini.kr/api/earnings-calendar-display?start='+asOf+'&end='+asOf;

test('forecast public contract exposes scores only, not actual or forecast EPS',()=>{
  const result=forecast(),snapshot=makeER1PublicDisplay(result);
  assert.equal(snapshot.method,FORECAST_METHOD);
  assert.equal(snapshot.recordCount,2);
  assert.equal(snapshot.coverage.observedIssuers,3);
  assert.equal(snapshot.coverage.scoreableIssuers,2);
  assert.equal(Object.hasOwn(snapshot.coverage,'estimateOnly'),false);
  assert.ok(snapshot.scores.every(r=>Object.keys(r).sort().join(',')===
    'issuerId,score,tickers'));
  assert.equal(validateER1PublicDisplay(snapshot)?.method,FORECAST_METHOD);
  assert.equal(validateER1PublicDisplay({...snapshot,epsEstimate:1}),null);
});

test('unscored issuer is one star on announcement day, not an invented 0',async()=>{
  const source=display([event('MISS'),event('LOSS'),event('GAIN')]);
  const score=makeER1PublicDisplay(forecast());
  const response=earningsDisplayResponse(source,request,null,null,score);
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/예상 EPS 점수 미산출 · 중요도 1[^>]*>★<\/div>/);
  assert.match(html,/ER1 예상 EPS ·/);
  assert.doesNotMatch(html,/기업 실적 점수 0\.00점/);
  const filtered=earningsDisplayResponse(source,request+'&importance=1',
    null,null,score);
  assert.equal(filtered.headers.get('x-display-count'),'1');
  assert.match(await filtered.text(),/MISS/);
});

test('without a valid forecast cohort or with actual-only snapshot, hyphen remains',async()=>{
  const source=display([event('MISS')]);
  const noScores=await earningsDisplayResponse(source,request).text();
  assert.match(noScores,/기업 실적 점수 없음">-<\/div>/);
  const snapshot=makeER1PublicDisplay(forecast());
  const bad={...snapshot,method:'INVALID'};
  assert.equal(validateER1PublicDisplay(bad),null);
  const badHtml=await earningsDisplayResponse(source,request,null,null,bad).text();
  assert.match(badHtml,/기업 실적 점수 없음">-<\/div>/);
  assert.doesNotMatch(badHtml,/예상 EPS 점수 미산출/);
});

test('legacy actual-only method still excludes same-day hindsight and remains readable tomorrow',async()=>{
  const actual={status:'READY_ER1_PUBLIC',method:ER1_METHOD,asOf,
    threshold:ER1_STAR3_THRESHOLD,
    coverage:{inputSymbols:1,observedIssuers:1,scoreableIssuers:1,
      unscoreableReasons:{}},recordCount:1,star3Count:0,
    scores:[{issuerId:'LOSS',tickers:['LOSS'],score:60}]};
  assert.ok(validateER1PublicDisplay(actual));
  const source=display([event('LOSS'),event('LOSS','2026-11-07')]);
  const sameDay=await earningsDisplayResponse(source,request,null,null,actual).text();
  assert.match(sameDay,/기업 실적 점수 없음">-<\/div>/);
  const tomorrowReq=request.replace('end=2026-11-06','end=2026-11-07')
    .replace('start=2026-11-06','start=2026-11-07');
  const tomorrow=await earningsDisplayResponse(source,tomorrowReq,null,null,actual).text();
  assert.match(tomorrow,/ER1 실제 EPS·매출/);
  assert.match(tomorrow,/60\.00점/);
});

test('December forecast does not rewrite dates preceding the as-of day',async()=>{
  const date='2026-12-06';
  const coveredDays=Array.from({length:14},(_,i)=>
    new Date(Date.parse('2026-12-01T00:00:00Z')+i*86400000).toISOString().slice(0,10));
  const source=display([event('MISS','2026-12-05'),event('MISS',date)],coveredDays);
  const score={...makeER1PublicDisplay(forecast()),asOf:date};
  const previousNow=Date.now;
  try{
    Date.now=()=>Date.parse('2026-12-07T00:00:00Z');
    const before=await earningsDisplayResponse(source,
      'https://zgmini.kr/api/earnings-calendar-display?start=2026-12-05&end=2026-12-05',
      null,score).text();
    assert.match(before,/기업 실적 점수 없음">-<\/div>/);
    const on=await earningsDisplayResponse(source,
      `https://zgmini.kr/api/earnings-calendar-display?start=${date}&end=${date}`,
      null,score).text();
    assert.match(on,/예상 EPS 점수 미산출 · 중요도 1[^>]*>★<\/div>/);
  }finally{Date.now=previousNow;}
});

test('existing December actual-only grading keeps its previously approved date behavior',async()=>{
  const coveredDays=Array.from({length:14},(_,i)=>
    new Date(Date.parse('2026-12-01T00:00:00Z')+i*86400000).toISOString().slice(0,10));
  const source=display([event('LEGACY','2026-12-01')],coveredDays);
  const legacy={status:'READY_ER1_PUBLIC',method:ER1_METHOD,asOf:'2026-12-06',
    threshold:ER1_STAR3_THRESHOLD,
    coverage:{inputSymbols:1,observedIssuers:1,scoreableIssuers:1,
      unscoreableReasons:{}},recordCount:1,star3Count:1,
    scores:[{issuerId:'LEGACY',tickers:['LEGACY'],score:99}]};
  const previousNow=Date.now;
  try{
    Date.now=()=>Date.parse('2026-12-07T00:00:00Z');
    const html=await earningsDisplayResponse(source,
      'https://zgmini.kr/api/earnings-calendar-display?start=2026-12-01&end=2026-12-01',
      null,legacy).text();
    assert.match(html,/기업 실적 점수 99\.00점/);
    assert.match(html,/★★★/);
    // Original generic ER1 third-argument fallback is still used when a
    // dedicated December snapshot has not been supplied.
    const generic=await earningsDisplayResponse(source,
      'https://zgmini.kr/api/earnings-calendar-display?start=2026-12-01&end=2026-12-01',
      legacy).text();
    assert.match(generic,/기업 실적 점수 99\.00점/);
  }finally{Date.now=previousNow;}
});
