import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreAll252} from '../scripts/pc-writer/theme-optional-score-r188.mjs';
import {calculateAiProvisionalWithRealPrices} from '../scripts/pc-writer/theme-ai-marketparquet-provisional-r2.mjs';

const SOURCE='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED';
const confirmed='2026-10-21',pending=['2026-10-22','2026-10-23'];
const iso=x=>new Date(x).toISOString().slice(0,10);
const days=Array.from({length:628},(_,i)=>iso(Date.parse(confirmed+'T00:00:00Z')-(627-i)*86400000));
function fixture(){
 const tables={SMH:new Map(),SOXX:new Map(),SPY:new Map()};
 for(let i=0;i<628;i++){
  tables.SMH.set(days[i],190+i*.18+Math.sin(i/14)*6);
  tables.SOXX.set(days[i],175+i*.16+Math.cos(i/19)*7);
  tables.SPY.set(days[i],420+i*.09+Math.sin(i/21)*5);
 }
 const privateVerifiedPrices={};
 for(const date of [confirmed,...pending]){
  const j=Date.parse(date+'T00:00:00Z')-Date.parse(confirmed+'T00:00:00Z');
  const extra=j/86400000;
  privateVerifiedPrices[date]={
   SMH:tables.SMH.get(confirmed)*(1+extra*.001),
   SOXX:tables.SOXX.get(confirmed)*(1+extra*.002),
   SPY:tables.SPY.get(confirmed)*(1+extra*.0015),
  };
 }
 const archived={status:'ACTUAL_TARGET_AND_OVERLAP_ROWS_VERIFIED',source:SOURCE,
  overlapDate:confirmed,targetDate:pending.at(-1),privateVerifiedPrices,
  dates:[confirmed,...pending].map(date=>({date,shaVerified:true,complete:true,
   coverage:{SMH:true,SOXX:true,SPY:true},sha256:'a'.repeat(64),sourceStoredAt:'2026-10-24T05:20:28Z'}))};
 return {privateGmh:{tables,dates:days},verifiedParquet:archived};
}

test('same approved R188 scorer computes 22nd and 23rd from actual appended EOD closes',()=>{
 const actual=fixture();
 const result=calculateAiProvisionalWithRealPrices({confirmedDate:confirmed,pendingDates:pending,
  ...actual,now:Date.parse('2026-10-24T12:00:00Z')});
 assert.equal(result.status,'PRIVATE_PROVISIONAL_SCORES_VERIFIED');
 assert.equal(result.points.length,2);
 assert.deepEqual(result.points.map(p=>p.date),pending);
 const prices=actual.verifiedParquet.privateVerifiedPrices;
 const series=Object.fromEntries(['SMH','SOXX','SPY'].map(symbol=>[symbol,
  [...days.map(d=>actual.privateGmh.tables[symbol].get(d)),...pending.map(d=>prices[d][symbol])]]));
 const a=scoreAll252(series.SMH,series.SPY),b=scoreAll252(series.SOXX,series.SPY);
 assert.deepEqual(result.points.map(p=>p.score),[250,251].map(i=>Number(((a[i]+b[i])/2).toFixed(5))));
 assert.equal(result.lineage.maxOverlapDifference,0);
 assert.equal(result.d1Writes,0);assert.equal(result.providerCalls,0);
});

test('refuses inconsistent split-adjusted vs hourly overlap price without silent scaling',()=>{
 const actual=fixture();actual.verifiedParquet.privateVerifiedPrices[confirmed].SMH*=1.06;
 assert.throws(()=>calculateAiProvisionalWithRealPrices({confirmedDate:confirmed,pendingDates:pending,
  ...actual,now:Date.parse('2026-10-24T12:00:00Z')}),/AI_CONFIRMED_TO_PROVISIONAL_PRICE_MODE_DRIFT/);
});

test('one real pending session is independently computed and no date is fabricated',()=>{
 const actual=fixture();
 const today=['2026-10-22'];
 actual.verifiedParquet.dates=actual.verifiedParquet.dates.slice(0,2);
 actual.verifiedParquet.targetDate=today[0];
 const result=calculateAiProvisionalWithRealPrices({confirmedDate:confirmed,pendingDates:today,
  ...actual,now:Date.parse('2026-10-24T12:00:00Z')});
 assert.deepEqual(result.points.map(p=>p.date),today);
});

test('missing target ETF, mismatched core pending date and absent 628-session base fail closed',()=>{
 const actual=fixture();
 delete actual.verifiedParquet.privateVerifiedPrices[pending[1]].SPY;
 assert.throws(()=>calculateAiProvisionalWithRealPrices({confirmedDate:confirmed,pendingDates:pending,
  ...actual}),/AI_PRIVATE_PARQUET_PRICES_MISSING/);
 const changed=fixture();changed.verifiedParquet.dates[2].date='2026-10-24';
 assert.throws(()=>calculateAiProvisionalWithRealPrices({confirmedDate:confirmed,pendingDates:pending,
  ...changed}),/AI_MARKETPARQUET_PROVENANCE_MISSING/);
 const short=fixture();short.privateGmh.dates=short.privateGmh.dates.slice(1);
 assert.throws(()=>calculateAiProvisionalWithRealPrices({confirmedDate:confirmed,pendingDates:pending,
  ...short}),/AI_GMH_CONFIRMED_WARMUP_MISSING/);
});
