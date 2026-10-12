import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {publicFeedStore,readPublicFeed,savedJson,FEED_POLICY} from '../worker/public-feed-store.mjs';
import {refreshPublicFeeds} from '../worker/public-feed-refresh.mjs';
import {marketOperationalStore} from '../worker/market-operational-store.mjs';
function fixture(){
 const sql=new DatabaseSync(':memory:');
 const db={prepare(text){const stmt=sql.prepare(text);const bound=args=>({bind:(...a)=>bound(a),run:()=>stmt.run(...args),first:async()=>stmt.get(...args)});return bound([])},async batch(stmts){sql.exec('BEGIN');try{const rows=[];for(const s of stmts)rows.push(s.run());sql.exec('COMMIT');return rows}catch(e){sql.exec('ROLLBACK');throw e}}};
 return {sql,db,store:publicFeedStore(db),locks:marketOperationalStore(db)};
}
const now=Date.parse('2026-10-01T00:00:00Z');
test('later collection cannot replace a newer CNN observation with older data',async()=>{
 const {sql,db,store,locks}=fixture();await store.initialize();
 const original={status:'verified',score:45,observedAt:'2026-10-01T00:00:00Z'};
 await store.writeOutput('fear-greed',original,now);
 const out=await refreshPublicFeeds({env:{DB:db},store,locks,now:now+FEED_POLICY['fear-greed'].intervalMs,maxFeedsPerRun:1,collectors:{'fear-greed':async()=>Response.json({status:'verified',score:38,observedAt:'2026-09-28T00:00:00Z'})}});
 assert.equal(out.feeds.find(x=>x.key==='fear-greed').status,'FAILED');
 assert.deepEqual((await store.readOutput('fear-greed')).body,original);
 assert.equal((await store.readOutput('fear-greed')).storedAt,now);
 sql.close();
});
test('empty/stale public reads never fetch; stored zero survives and daily history is preserved',async()=>{
 const {sql,db,store}=fixture();const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('NETWORK_FORBIDDEN')};
 try{
  assert.equal((await readPublicFeed(db,'fear-greed',{now})).status,503);
  await store.initialize();await store.writeOutput('fear-greed',{status:'verified',score:0},now);
  const r=await readPublicFeed(db,'fear-greed',{now});assert.equal(r.headers.get('x-data-source'),'STORED');assert.equal((await r.json()).score,0);
  assert.equal((await readPublicFeed(db,'fear-greed',{now:now+6*3600000})).status,200);
  assert.equal((await readPublicFeed(db,'fear-greed',{now:now+8*86400000-1})).status,200);
  assert.equal((await readPublicFeed(db,'fear-greed',{now:now+8*86400000})).status,503);
  await store.writeOutput('fear-greed',{status:'verified',score:1},now+86400000);
  assert.equal(sql.prepare("SELECT count(*) n FROM public_feed_snapshots_v1 WHERE kind='output'").get().n,3);
 }finally{globalThis.fetch=original;sql.close()}
});
test('normalization consumes read-back input; persistence failure prevents output',async()=>{
 const {sql,store}=fixture();await store.initialize();assert.deepEqual(await savedJson(Response.json({score:0}),store,'fear-greed',now),{score:0});
 assert.equal((await store.readInput('fear-greed')).body.score,0);
 await assert.rejects(()=>savedJson(Response.json({score:7}),{writeInput:async()=>{throw Error('disk')}},'fear-greed',now));sql.close();
});
test('scheduler stores output, retains last good data on failure, and honors durable retry cooldown',async()=>{
 const {sql,db,store,locks}=fixture();let calls=0;
 const collectors=Object.fromEntries(Object.keys(FEED_POLICY).map(key=>[key,async(s,t)=>{calls++;await s.writeInput(key,{score:0},t);return Response.json({status:'verified',score:(await s.readInput(key)).body.score})}]));
 let r=await refreshPublicFeeds({env:{DB:db},store,locks,collectors,now});assert.equal(r.status,'COMPLETE');assert.equal(calls,7);
 await refreshPublicFeeds({env:{DB:db},store,locks,collectors,now:now+60000});assert.equal(calls,7);
 collectors['fear-greed']=async()=>{calls++;throw Error('redacted')};
 r=await refreshPublicFeeds({env:{DB:db},store,locks,collectors,now:now+15*60000});assert.equal(r.status,'PARTIAL');assert.equal((await store.readOutput('fear-greed')).storedAt,now);
 await refreshPublicFeeds({env:{DB:db},store,locks,collectors,now:now+16*60000});assert.equal(calls,8);sql.close();
});
test('bounded scheduler attempts at most one due public feed per run and defers the rest',async()=>{
 const {sql,db,store,locks}=fixture();let calls=0;
 const collectors=Object.fromEntries(Object.keys(FEED_POLICY).map(key=>[key,async(s,t)=>{calls++;await s.writeInput(key,{score:0},t);return Response.json({status:'verified',score:0})}]));
 const first=await refreshPublicFeeds({env:{DB:db},store,locks,collectors,now,maxFeedsPerRun:1});
 assert.equal(calls,1);assert.equal(first.attempted,1);assert.equal(first.status,'BACKLOG');assert.equal(first.feeds.filter(x=>x.status==='DEFERRED').length,6);
 const second=await refreshPublicFeeds({env:{DB:db},store,locks,collectors,now,maxFeedsPerRun:1});
 assert.equal(calls,2);assert.equal(second.attempted,1);assert.equal(second.status,'BACKLOG');
 sql.close();
});
test('public feed routes contain no collector or live provider calls',()=>{
 for(const key of Object.keys(FEED_POLICY).filter(x=>x!=='core-pce')){
  const source=readFileSync(new URL(`../app/api/${key}/route.ts`,import.meta.url),'utf8');
  assert.match(source,/readPublicFeed/);assert.doesNotMatch(source,/\bfetch\s*\(|collect|refresh|waitUntil/);
 }
});
