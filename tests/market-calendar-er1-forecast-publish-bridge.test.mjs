import {test} from 'node:test';
import assert from 'node:assert/strict';
import {forecastRowsFromSaved} from '../lib/market-calendar-er1-forecast-saved-adapter.mjs';
import {scoreER1ForecastIssuers} from
  '../lib/market-calendar-er1-forecast-score.mjs';
import {prepareForecastMonth,stageForecastMonth,publishForecastMonth,
  FORECAST_PUBLIC_KEYS,EXPECTED_FORECAST_METHOD} from '../lib/market-calendar-er1-forecast-publish-bridge.mjs';

const asOf='2026-11-06';
const row=(symbol,epsEstimate,revenueEstimate)=>({symbol,name:symbol,
  eps:999,revenue:999999,epsEstimate,revenueEstimate});
const saved=month=>Array.from({length:month==='2026-11'?30:31},(_,i)=>{
  const day=month+'-'+String(i+1).padStart(2,'0');
  const data=i===19?[row('POS',10,100)]:i===20?[row('ZERO',0,100)]:
    i===21?[row('NEG',-2,100)]:i===22?[row('MISS',null,100)]:[];
  return {day,storedAt:'2026-11-06T05:00:00Z',body:{date:day,
    pre:data,after:[],notSupplied:[]}};
});
const serialize=result=>({status:'READY_ER1_PUBLIC',method:result.method,
  asOf:result.asOf,threshold:result.threshold,
  coverage:Object.fromEntries(Object.entries(result.coverage).filter(([k])=>
    ['inputSymbols','observedIssuers','scoreableIssuers',
      'unscoreableReasons'].includes(k))),
  recordCount:result.rankings.length,star3Count:result.star3Count,
  scores:result.rankings.map(({issuerId,tickers,score})=>({issuerId,tickers,score}))});
const prepare=month=>prepareForecastMonth({month,asOf,
  savedDays:saved(month),adapter:forecastRowsFromSaved,
  scorer:scoreER1ForecastIssuers,publicSerializer:serialize});

test('November: saved EPS signs and magnitudes score, missing is ★1 not 0',()=>{
  const out=prepare('2026-11');
  assert.equal(out.publicKey,FORECAST_PUBLIC_KEYS['2026-11']);
  assert.equal(out.observedIssuers,4);
  assert.equal(out.scoreableIssuers,3);
  assert.equal(out.missingOneStar,1);
  assert.equal(out.providerCalls,0);
  const body=JSON.parse(out.body);
  assert.equal(body.method,EXPECTED_FORECAST_METHOD);
  assert.equal(body.scores.length,3);
  assert.equal(body.coverage.observedIssuers,4);
  assert.ok(!JSON.stringify(body).includes('epsEstimate'));
  assert.ok(!JSON.stringify(body).includes('revenueEstimate'));
  assert.ok(!JSON.stringify(body).includes('999999'));
  const scores=Object.fromEntries(body.scores.map(x=>[x.issuerId,x.score]));
  assert.ok(scores.NEG<scores.ZERO&&scores.ZERO<scores.POS);
  assert.equal(scores.MISS,undefined);
});

test('December: same scorer/adapter uses 31 saved days and separate public key',()=>{
  const out=prepare('2026-12');
  assert.equal(out.publicKey,FORECAST_PUBLIC_KEYS['2026-12']);
  assert.equal(out.observedIssuers,4);
  assert.equal(out.missingOneStar,1);
});

test('incomplete saved 30-day input is blocked before local staging or D1',()=>{
  assert.throws(()=>prepareForecastMonth({month:'2026-11',asOf,
    savedDays:saved('2026-11').slice(0,29),adapter:forecastRowsFromSaved,
    scorer:scoreER1ForecastIssuers,publicSerializer:serialize}),
  /ER1_FORECAST_BRIDGE_SAVED_DAYS_INCOMPLETE/);
});

test('a public serializer leaking raw EPS is blocked before publishing',()=>{
  assert.throws(()=>prepareForecastMonth({month:'2026-11',asOf,
    savedDays:saved('2026-11'),adapter:forecastRowsFromSaved,
    scorer:scoreER1ForecastIssuers,publicSerializer:result=>({
      ...serialize(result),epsEstimate:123})}),
  /ER1_FORECAST_BRIDGE_PUBLIC_CONTRACT_STOP/);
});

test('local staging and D1 publication are distinct verified steps',async()=>{
  const out=prepare('2026-11');let staged=0,published=0;
  const stagedReceipt=await stageForecastMonth(out,{saveDerived:async body=>{
    staged++;assert.equal(body,out.body);return out.bodySha256;}});
  assert.equal(staged,1);assert.equal(published,0);
  await assert.rejects(publishForecastMonth(out,stagedReceipt,{syncD1:{
    publicKey:out.publicKey,run:async()=>{
     published++;return {code:'NOV30_ER1_D1_VERIFIED',wrote:true};}},
    storedAt:Date.now()}),/ER1_FORECAST_BRIDGE_B_AUTH_STOP/);
  assert.equal(published,0);
  const result=await publishForecastMonth(out,stagedReceipt,{approvedB:true,
    approvedBodySha256:out.bodySha256,storedAt:Date.now(),
    remote:'mock',core:'mock',syncD1:{publicKey:out.publicKey,run:async input=>{
      published++;assert.equal(input.body,out.body);
      return {code:'NOV30_ER1_D1_VERIFIED',wrote:true};}}});
  assert.equal(result.status,'PASS');assert.equal(published,1);
  assert.equal(result.d1Writes,1);
});

test('stage checksum mismatch and unverified D1 receipt fail closed',async()=>{
  const out=prepare('2026-12');
  await assert.rejects(stageForecastMonth(out,{saveDerived:async()=>'wrong'}),
    /ER1_FORECAST_BRIDGE_STAGE_READBACK_STOP/);
  await assert.rejects(publishForecastMonth(out,{readyForB:true,
    bodySha256:out.bodySha256},{approvedB:true,
    approvedBodySha256:out.bodySha256,storedAt:Date.now(),
    syncD1:{publicKey:out.publicKey,run:async()=>({code:'DEC31_ER1_SUBMITTED',wrote:true})}}),
    /ER1_FORECAST_BRIDGE_D1_READBACK_STOP/);
});

test('month-scoped D1 receipt rejects a November helper used for December',async()=>{
  const out=prepare('2026-12');let called=0;
  await assert.rejects(publishForecastMonth(out,{readyForB:true,
    bodySha256:out.bodySha256},{approvedB:true,
    approvedBodySha256:out.bodySha256,storedAt:Date.now(),
    syncD1:{publicKey:FORECAST_PUBLIC_KEYS['2026-11'],run:async()=>{
      called++;return {code:'NOV30_ER1_D1_VERIFIED',wrote:true};}}}),
    /ER1_FORECAST_BRIDGE_B_AUTH_STOP/);
  assert.equal(called,0);
});
