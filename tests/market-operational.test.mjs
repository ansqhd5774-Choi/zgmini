import {DIAGNOSTIC_FRED_SERIES} from '../lib/diagnostic-layer/input-registry.mjs';
import {PUBLIC_DISPLAY_MAX_AGE_MS} from '../worker/public-display-freshness.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {marketOperationalStore,readStoredMarketInputs,storedMarketResponse} from '../worker/market-operational-store.mjs';
import {runMarketOperationalRefresh,MARKET_COLLECTION_JOBS} from '../worker/market-operational-refresh.mjs';
function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 const db={prepare(sql){const statement=sqlite.prepare(sql);const bound=args=>({bind:(...values)=>bound(values),run:async()=>statement.run(...args),first:async()=>statement.get(...args),all:async()=>({results:statement.all(...args)})});return bound([])}};
 return {sqlite,db,store:marketOperationalStore(db)};
}
const now=Date.parse('2026-09-30T00:00:00Z');
const score={status:'SUCCESS',domains:Array.from({length:12},(_,i)=>({id:String(i),score:i===0?0:null})),overall:{score:null,status:'PARTIAL'}};

test('failed or empty credit acquisition preserves the last valid batch and does not calculate',async()=>{
 const old={external:{dvpRepoRows:[{observationDate:'2026-09-29',value:0}],triPartyRepoRows:[{observationDate:'2026-09-29',value:0}],cmdiRows:[{observationDate:'2026-09-25',market:0,hy:0,ig:0}]}};
 for(const candidate of [{external:{dvpRepoRows:[],triPartyRepoRows:[],cmdiRows:[]}},{external:{...old.external,cmdiRows:[]}}]){
  const {store,db,sqlite}=fixture();await store.writeInput('credit',old,now-1);await store.writeScore(score,now-1);
  const out=await runMarketOperationalRefresh({env:{DB:db},store,job:'credit',now,collectors:{credit:async()=>candidate},calculate:()=>{throw Error('MUST_NOT_CALCULATE')}});
  assert.deepEqual(out,{status:'SOURCE_FAILED',job:'credit',reason:'CREDIT_INPUT_NOT_VALID'});
  assert.deepEqual((await store.readInput('credit')).body,old);assert.equal((await store.readInput('credit')).storedAt,now-1);
  assert.equal((await store.readScore()).storedAt,now-1);
  assert.equal(sqlite.prepare("SELECT status FROM market_collection_jobs_v1 WHERE job='credit'").get().status,'SOURCE_FAILED');sqlite.close();
 }
});
test('BIS failures and empty successful responses never write or calculate',async()=>{
 for(const status of ['REQUEST_FAILED','HTTP_ERROR','QUOTA_EXCEEDED','READY_CURRENT_VINTAGE_RAW']){
  const {store,db,sqlite}=fixture();
  const out=await runMarketOperationalRefresh({env:{DB:db},store,job:'bisTc',now,collectors:{bisTc:async()=>({status,external:{bisDebtGdpParsed:null}})},calculate:()=>{throw Error('MUST_NOT_CALCULATE')}});
  assert.equal(out.status,'SOURCE_FAILED');
  assert.equal(sqlite.prepare("SELECT count(*) n FROM market_input_batches_v1").get().n,0);
  assert.equal(sqlite.prepare("SELECT status FROM market_collection_jobs_v1 WHERE job='bisTc'").get().status,'SOURCE_FAILED');
  sqlite.close();
 }
});
test('empty macro cannot replace stored source, create slices or refresh score',async()=>{
 const {store,db,sqlite}=fixture();const old={series:{PAYEMS:[{observationDate:'2026-09-01',value:0}]}};
 await store.writeInput('macro',old,now-1);await store.writeScore(score,now-1);
 const out=await runMarketOperationalRefresh({env:{DB:db},store,job:'macro',now,collectors:{macro:async()=>({series:{},providerSummary:{fred:{requested:42,ready:0,failed:[{status:'REQUEST_FAILED'}]}}})},calculate:()=>{throw Error('MUST_NOT_CALCULATE')}});
 assert.deepEqual(out,{status:'SOURCE_FAILED',job:'macro',reason:'MACRO_NO_READY_SERIES'});
 assert.deepEqual((await store.readInput('macro')).body,old);assert.equal((await store.readScore()).storedAt,now-1);
 assert.equal(sqlite.prepare("SELECT count(*) n FROM market_input_batches_v1 WHERE batch_key LIKE 'projection-macro:%'").get().n,0);sqlite.close();
});
test('large normalized history is compressed in storage and restored without value loss',async()=>{
 const {store,sqlite}=fixture();
 const input={series:{A:Array.from({length:75000},(_,i)=>({date:'2026-09-30',value:i%3===0?0:i%3===1?null:i}))}};
 assert.ok(JSON.stringify(input).length>1800000);
 await store.writeInput('macro',input,now);
 const stored=sqlite.prepare('SELECT body FROM market_input_batches_v1').get().body;
 assert.ok(stored.startsWith('gzip:'));assert.ok(stored.length<1800000);
 assert.deepEqual((await store.readInput('macro')).body,input);sqlite.close();
});

test('partial or falsely ready rates cannot erase complete stored input or calculate a broken score',async()=>{
 const ids=['EFFR','DFEDTARL','DFEDTARU','DGS3MO','DGS2','DGS10','DFII10'];
 const old={rateR2:{status:'READY',series:Object.fromEntries(ids.map(id=>[id,[{observationDate:'2026-09-29',value:0}]]))}};
 for(const candidate of [
  {status:'PARTIAL',series:{DFII10:old.rateR2.series.DFII10},failures:[{provider:'NYFED_EFFR',status:'TIMEOUT'}]},
  {status:'READY',series:{EFFR:old.rateR2.series.EFFR}},
  {status:'READY',series:{...old.rateR2.series,DFEDTARU:[{observationDate:'2026-09-29',value:null}]}},
 ]){
  const {store,db,sqlite}=fixture();await store.writeInput('rates',old,now-1);await store.writeScore(score,now-1);
  const out=await runMarketOperationalRefresh({env:{DB:db},store,job:'rates',now,collectors:{rates:async()=>({rateR2:candidate})},calculate:()=>{throw Error('MUST_NOT_CALCULATE')}});
  assert.equal(out.status,'SOURCE_FAILED');assert.equal(out.reason,'RATES_INPUT_NOT_READY');
  assert.deepEqual((await store.readInput('rates')).body,old);assert.equal((await store.readScore()).storedAt,now-1);
  assert.ok(await store.claim('pipeline',now+1));sqlite.close();
 }
});

test('complete official rates including zero are stored before calculation',async()=>{
 const {store,db,sqlite}=fixture();
 const input={rateR2:{status:'READY',series:Object.fromEntries(['EFFR','DFEDTARL','DFEDTARU','DGS3MO','DGS2','DGS10','DFII10'].map(id=>[id,[{observationDate:'2026-09-29',value:0}]]))}};
 let calls=0;const out=await runMarketOperationalRefresh({env:{DB:db},store,job:'rates',now,collectors:{rates:async()=>input},calculate:async()=>{calls++;assert.deepEqual((await store.readInput('rates')).body.rateR2,input.rateR2);return {readyDomains:12};}});
 assert.equal(out.status,'COMPLETE');assert.equal(calls,1);sqlite.close();
});
test('collection persists inputs before calculation and public reads perform no collection',async()=>{
 const {store,db,sqlite}=fixture();let calls=0;
 const out=await runMarketOperationalRefresh({env:{DB:db},store,job:'macro',now,
  collectors:{macro:async()=>{calls++;return {series:Object.fromEntries(Object.keys(DIAGNOSTIC_FRED_SERIES).map(id=>[id,[{observationDate:'2026-09-01',value:0}]])),external:{},networkLog:['private-key']}}},
  calculate:async(_env,s,time)=>{const raw=await readStoredMarketInputs(s,time);assert.equal(raw.series.PAYEMS[0].value,0);assert.equal(raw.networkLog,undefined);await s.writeScore(score,time);return {readyDomains:1}}});
 assert.equal(out.status,'COMPLETE');
 const freshInstance=marketOperationalStore(db);
 for(let i=0;i<3;i++)assert.deepEqual(await (await storedMarketResponse(new Request('https://zgmini.kr/api/market-score'),{store:freshInstance,now})).json(),score);
 assert.equal(calls,1);sqlite.close();
});
test('stored stream supports complete frame, zero and null; expired storage never invokes providers',async()=>{
 const {store,sqlite}=fixture();await store.writeScore(score,now);
 const r=await storedMarketResponse(new Request('https://zgmini.kr/api/market-score',{headers:{accept:'application/x-ndjson'}}),{store,now});
 const frame=JSON.parse(await r.text());assert.equal(frame.type,'complete');assert.equal(frame.body.domains[0].score,0);
 const retained=await storedMarketResponse(new Request('https://zgmini.kr/api/market-score'),{store,now:now+PUBLIC_DISPLAY_MAX_AGE_MS-1});assert.equal(retained.status,200);assert.deepEqual(await retained.json(),score);
 const stale=await storedMarketResponse(new Request('https://zgmini.kr/api/market-score'),{store,now:now+PUBLIC_DISPLAY_MAX_AGE_MS});assert.equal(stale.status,503);assert.equal((await stale.json()).overall.score,null);sqlite.close();
});
test('lease excludes concurrent collectors and daily input history survives later collection',async()=>{
 const {store,db,sqlite}=fixture();const id=await store.claim('pipeline',now);
 const blocked=await runMarketOperationalRefresh({env:{DB:db},store,now,collectors:{macro:()=>{throw Error('must not execute')}}});assert.equal(blocked.status,'ALREADY_RUNNING');
 await store.finish('pipeline',id,now,'IDLE');
 await store.writeInput('macro',{series:{A:[1]}},now);await store.writeInput('macro',{series:{A:[2]}},now+86400000);
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM market_input_batches_v1').get().n,2);
 assert.deepEqual((await store.readInput('macro')).body.series.A,[2]);assert.equal(await store.next(MARKET_COLLECTION_JOBS),'macroCredit');sqlite.close();
});
test('failed source does not fabricate score and releases lease',async()=>{
 const {store,db,sqlite}=fixture();
 const r=await runMarketOperationalRefresh({env:{DB:db},store,job:'rates',now,collectors:{rates:()=>{throw Error('secret-url')}},calculate:()=>{throw Error('must not calculate')}});
 assert.deepEqual(r,{status:'ERROR',job:'rates',phase:'COLLECT'});assert.equal(await store.readScore(),null);assert.ok(await store.claim('pipeline',now+1));sqlite.close();
});
test('scheduled score persistence continues the existing liquidity trend history',async()=>{
 const {store,sqlite}=fixture();
 await store.writeScore({status:'SUCCESS',asOfDate:'2026-09-30',domains:[{id:'liquidity',status:'READY',score:0}]},now);
 const row=sqlite.prepare('SELECT * FROM market_liquidity_active_history_v1').get();
 assert.equal(row.score,0);assert.equal(row.as_of_date,'2026-09-30');
 await store.writeScore({status:'SUCCESS',asOfDate:'2026-09-30',domains:[{id:'liquidity',status:'PARTIAL',score:null}]},now+1);
 assert.equal(sqlite.prepare('SELECT score FROM market_liquidity_active_history_v1').get().score,0);sqlite.close();
});
