import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {marketOperationalStore,readStoredMarketInputs,storedMarketResponse} from '../worker/market-operational-store.mjs';
import {runMarketOperationalRefresh,MARKET_COLLECTION_JOBS} from '../worker/market-operational-refresh.mjs';
function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 const db={prepare(sql){const statement=sqlite.prepare(sql);const bound=args=>({bind:(...values)=>bound(values),run:async()=>statement.run(...args),first:async()=>statement.get(...args)});return bound([])}};
 return {sqlite,db,store:marketOperationalStore(db)};
}
const now=Date.parse('2026-09-30T00:00:00Z');
const score={status:'SUCCESS',domains:Array.from({length:12},(_,i)=>({id:String(i),score:i===0?0:null})),overall:{score:null,status:'PARTIAL'}};
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
test('collection persists inputs before calculation and public reads perform no collection',async()=>{
 const {store,db,sqlite}=fixture();let calls=0;
 const out=await runMarketOperationalRefresh({env:{DB:db},store,job:'macro',now,
  collectors:{macro:async()=>{calls++;return {series:{A:[{value:0}]},external:{},networkLog:['private-key']}}},
  calculate:async(_env,s,time)=>{const raw=await readStoredMarketInputs(s,time);assert.equal(raw.series.A[0].value,0);assert.equal(raw.networkLog,undefined);await s.writeScore(score,time);return {readyDomains:1}}});
 assert.equal(out.status,'COMPLETE');
 const freshInstance=marketOperationalStore(db);
 for(let i=0;i<3;i++)assert.deepEqual(await (await storedMarketResponse(new Request('https://zgmini.kr/api/market-score'),{store:freshInstance,now})).json(),score);
 assert.equal(calls,1);sqlite.close();
});
test('stored stream supports complete frame, zero and null; expired storage never invokes providers',async()=>{
 const {store,sqlite}=fixture();await store.writeScore(score,now);
 const r=await storedMarketResponse(new Request('https://zgmini.kr/api/market-score',{headers:{accept:'application/x-ndjson'}}),{store,now});
 const frame=JSON.parse(await r.text());assert.equal(frame.type,'complete');assert.equal(frame.body.domains[0].score,0);
 const stale=await storedMarketResponse(new Request('https://zgmini.kr/api/market-score'),{store,now:now+30*60000});assert.equal(stale.status,503);assert.equal((await stale.json()).overall.score,null);sqlite.close();
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
