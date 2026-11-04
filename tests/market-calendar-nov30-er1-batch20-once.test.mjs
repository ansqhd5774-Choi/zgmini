import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {runNovemberBatch20Private} from '../scripts/pc-writer/market-calendar-nov30-er1-batch20-once.mjs';
import {scoreER1Issuers} from '../lib/market-calendar-er1-earnings-score.mjs';
import {makeER1PublicDisplay,validateER1PublicDisplay} from '../lib/market-calendar-er1-public-display.mjs';

const NOW=Date.parse('2026-11-04T20:00:00Z');
const SYMBOLS=Array.from({length:20},(_,i)=>'B'+String(i+1).padStart(2,'0'));
const EVENTS=SYMBOLS.map((ticker,i)=>({date:'2026-11-'+
 String(6+i).padStart(2,'0'),ticker}));
const raw=symbol=>{
 const index=Number(symbol.slice(1));
 return ['2026-10-20','2026-07-20','2026-04-20','2026-01-20']
  .map((date,n)=>({symbol,date,eps:1.5+index/10,
   revenue:10000000+index*1000000-n*100000}));
};
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-er1-nov20-'));
 const input=path.join(root,'er1-input');fs.mkdirSync(input,{recursive:true});
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 return {root,input};
}
function initialCache(f){
 const dest=path.join(f.input,'nov30-er1-probe');
 fs.mkdirSync(dest,{recursive:true});
 for(const symbol of SYMBOLS.slice(0,3)){
  fs.writeFileSync(path.join(dest,symbol+'.json'),JSON.stringify({
   storedAt:'2026-11-04T12:00:00Z',body:raw(symbol)}),{flag:'wx'});
 }
}
test('real scorer: reuse three + only seventeen new GETs, twenty private scores',async t=>{
 const f=fixture(t);initialCache(f);let calls=0;
 const opts={pcHome:f.root,requireWindows:false,clock:()=>NOW,
  calendarLoader:async()=>EVENTS,scorer:scoreER1Issuers,
  publicSerializer:makeER1PublicDisplay,
  env:{EARNINGS_API_KEY:'test_secret_only_fixture'},
  fetcher:async url=>{
   calls++;const symbol=new URL(url).searchParams.get('symbol');
   assert.ok(SYMBOLS.slice(3).includes(symbol));
   return {ok:true,status:200,text:async()=>JSON.stringify(raw(symbol))};
  }};
 const result=await runNovemberBatch20Private(opts);
 assert.equal(result.status,'PASS',result.code);
 assert.equal(result.candidateLimit,20);
 assert.equal(result.providerRequestLimit,17);
 assert.equal(result.selectedSymbols,20);
 assert.equal(result.providerCalls,17);
 assert.equal(result.reusedActualSymbols,3);
 assert.equal(result.stagedActualSymbols,17);
 assert.equal(result.scoreableIssuers,20);
 assert.equal(result.highestScore,98.5);
 assert.equal(result.star3Count,1);
 assert.equal(result.d1Writes,0);
 assert.equal(calls,17);
 const derived=JSON.parse(fs.readFileSync(path.join(f.input,
  'nov30-er1-batch20-derived','current.json'),'utf8'));
 assert.ok(validateER1PublicDisplay(derived,{now:NOW}));
 assert.ok(!JSON.stringify(derived).includes('10000000'));
 const again=await runNovemberBatch20Private(opts);
 assert.equal(again.status,'PASS',again.code);
 assert.equal(again.providerCalls,0);
 assert.equal(again.reusedActualSymbols,20);
 assert.equal(again.highestScore,98.5);
 assert.equal(calls,17);
});
test('429 midway preserves partial verified raw checkpoint and does not calculate',async t=>{
 const f=fixture(t);initialCache(f);let calls=0;
 const result=await runNovemberBatch20Private({
  pcHome:f.root,requireWindows:false,clock:()=>NOW,
  calendarLoader:async()=>EVENTS,scorer:()=>{throw Error('unexpected scoring')},
  env:{EARNINGS_API_KEY:'test_secret_only_fixture'},
  fetcher:async url=>{
   calls++;
   return calls===2?{status:429,ok:false}:
    {status:200,ok:true,text:async()=>JSON.stringify(raw(
     new URL(url).searchParams.get('symbol')))};
  }
 });
 assert.equal(result.status,'PARTIAL',result.code);
 assert.equal(result.code,'NOV30_ER1_PROVIDER_QUOTA_STOP');
 assert.equal(result.reusedActualSymbols,3);
 assert.equal(result.stagedActualSymbols,1);
 assert.equal(result.providerCalls,2);
 assert.equal(result.d1Writes,0);
 assert.ok(fs.existsSync(path.join(f.input,'nov30-er1-batch20','B04.json')));
 assert.ok(!fs.existsSync(path.join(f.input,'nov30-er1-batch20-derived','current.json')));
});
test('missing pilot cache never exceeds 17 new provider requests',async t=>{
 const f=fixture(t);let calls=0;
 const result=await runNovemberBatch20Private({
  pcHome:f.root,requireWindows:false,clock:()=>NOW,
  calendarLoader:async()=>EVENTS,
  env:{EARNINGS_API_KEY:'test_secret_only_fixture'},
  fetcher:async url=>{
   calls++;
   return {ok:true,status:200,text:async()=>JSON.stringify(raw(
    new URL(url).searchParams.get('symbol')))};
  }
 });
 assert.equal(result.status,'PARTIAL');
 assert.equal(result.code,'NOV30_ER1_PROVIDER_BUDGET_STOP');
 assert.equal(result.providerCalls,17);
 assert.equal(result.stagedActualSymbols,17);
 assert.equal(calls,17);
 assert.equal(result.d1Writes,0);
});
