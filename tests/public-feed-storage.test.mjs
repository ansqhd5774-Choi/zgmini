import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync} from 'node:fs';
import {publicFeedStore,readPublicFeed,savedJson,FEED_POLICY} from '../worker/public-feed-store.mjs';
import {refreshPublicFeeds,observeCnnCollector,planCnnMinuteEligibilityWait,CNN_MINUTE_ELIGIBILITY_WAIT_CAP_MS} from '../worker/public-feed-refresh.mjs';
import {marketOperationalStore} from '../worker/market-operational-store.mjs';
import {feedInput,feedOutput} from './helpers/public-feed-fixtures.mjs';
function fixture(){
 const sql=new DatabaseSync(':memory:');
 const db={prepare(text){const stmt=sql.prepare(text);const bound=args=>({bind:(...a)=>bound(a),run:()=>stmt.run(...args),first:async()=>stmt.get(...args)});return bound([])},async batch(stmts){sql.exec('BEGIN');try{const rows=[];for(const s of stmts)rows.push(s.run());sql.exec('COMMIT');return rows}catch(e){sql.exec('ROLLBACK');throw e}}};
 return {sql,db,store:publicFeedStore(db),locks:marketOperationalStore(db)};
}
const now=Date.parse('2026-10-01T00:00:00Z');
test('later collection cannot replace a newer CNN observation with older data',async()=>{
 const {sql,db,store,locks}=fixture();await store.initialize();
 const original={...feedOutput('fear-greed',now),score:45};
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
  await store.initialize();await store.writeOutput('fear-greed',feedOutput('fear-greed',now),now);
  const r=await readPublicFeed(db,'fear-greed',{now});assert.equal(r.headers.get('x-data-source'),'STORED');assert.equal((await r.json()).score,0);
  assert.equal((await readPublicFeed(db,'fear-greed',{now:now+6*3600000})).status,200);
  assert.equal((await readPublicFeed(db,'fear-greed',{now:now+8*86400000-1})).status,200);
  assert.equal((await readPublicFeed(db,'fear-greed',{now:now+8*86400000})).status,503);
  await store.writeOutput('fear-greed',{...feedOutput('fear-greed',now+86400000),score:1},now+86400000);
  assert.equal(sql.prepare("SELECT count(*) n FROM public_feed_snapshots_v1 WHERE kind='output'").get().n,3);
 }finally{globalThis.fetch=original;sql.close()}
});
test('normalization consumes read-back input; persistence failure prevents output',async()=>{
 const {sql,store}=fixture();await store.initialize();assert.deepEqual(await savedJson(Response.json(feedInput('fear-greed',now)),store,'fear-greed',now),feedInput('fear-greed',now));
 assert.equal((await store.readInput('fear-greed')).body.fear_and_greed.score,0);
 await assert.rejects(()=>savedJson(Response.json({score:7}),{writeInput:async()=>{throw Error('disk')}},'fear-greed',now));sql.close();
});
test('scheduler stores output, retains last good data on failure, and honors durable retry cooldown',async()=>{
 const {sql,db,store,locks}=fixture();let calls=0;
 const collectors=Object.fromEntries(Object.keys(FEED_POLICY).map(key=>[key,async(s,t)=>{calls++;await s.writeInput(key,feedInput(key,t),t);assert.deepEqual((await s.readInput(key)).body,feedInput(key,t));return Response.json(feedOutput(key,t))}]));
 let r=await refreshPublicFeeds({env:{DB:db},store,locks,collectors,now});assert.equal(r.status,'COMPLETE');assert.equal(calls,3);
 await refreshPublicFeeds({env:{DB:db},store,locks,collectors,now:now+60000});assert.equal(calls,3);
 collectors['fear-greed']=async()=>{calls++;throw Error('redacted')};
 r=await refreshPublicFeeds({env:{DB:db},store,locks,collectors,now:now+15*60000});assert.equal(r.status,'PARTIAL');assert.equal((await store.readOutput('fear-greed')).storedAt,now);
 await refreshPublicFeeds({env:{DB:db},store,locks,collectors,now:now+16*60000});assert.equal(calls,4);sql.close();
});
test('bounded scheduler attempts at most one due public feed per run and defers the rest',async()=>{
 const {sql,db,store,locks}=fixture();let calls=0;
 const collectors=Object.fromEntries(Object.keys(FEED_POLICY).map(key=>[key,async(s,t)=>{calls++;await s.writeInput(key,feedInput(key,t),t);return Response.json(feedOutput(key,t))}]));
 const first=await refreshPublicFeeds({env:{DB:db},store,locks,collectors,now,maxFeedsPerRun:1});
 assert.equal(calls,1);assert.equal(first.attempted,1);assert.equal(first.status,'BACKLOG');assert.equal(first.feeds.filter(x=>x.status==='DEFERRED').length,2);
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

test('removed regional feeds have no polling or public routes while CNN and Korea R7 remain',()=>{
 assert.deepEqual(Object.keys(FEED_POLICY),['fear-greed','market-data','core-pce']);
 for(const key of ['ftse-fear-greed','nikkei-fear-greed','kospi-fear-greed','kospi-history']){
  assert.equal(existsSync(new URL(`../app/api/${key}/route.ts`,import.meta.url)),false,key+' public route');
  assert.equal(existsSync(new URL(`../worker/feed-collectors/${key}.ts`,import.meta.url)),false,key+' collector');
 }
 const wiring=readFileSync(new URL('../worker/public-feed-collectors.ts',import.meta.url),'utf8');
 assert.match(wiring,/'fear-greed':cnn/);
 assert.doesNotMatch(wiring,/ftse-fear-greed|nikkei-fear-greed|kospi-fear-greed|kospi-history/);
 const ui=readFileSync(new URL('../app/country-fear-greed.tsx',import.meta.url),'utf8');
 assert.match(ui,/<CnnPanel\s*\/>/);
 assert.match(ui,/<KoreanCountryCard\s*\/>/);
 assert.doesNotMatch(ui,/showBreadth/,'retired breadth widgets must not mount or poll unavailable APIs');
 assert.doesNotMatch(ui,/ftse-fear-greed|nikkei-fear-greed|kospi-fear-greed|kospi-history/);
});


test('explicit PC CNN minute tick reuses durable feed lease and never calls other feeds',async()=>{
 const {sql,db,store,locks}=fixture();let calls=0;
 const collectors={'fear-greed':async(s,at)=>{calls++;await s.writeInput('fear-greed',feedInput('fear-greed',at),at);return Response.json(feedOutput('fear-greed',at))}};
 const args={env:{DB:db,ZGMINI_COMPUTE_TARGET:'pc'},store,locks,collectors,cnnMinuteOnly:true};
 await assert.rejects(()=>refreshPublicFeeds({...args,env:{DB:db},now}),/CNN_MINUTE_PC_ONLY/);
 const first=await refreshPublicFeeds({...args,now});assert.equal(first.attempted,1);assert.equal(first.feeds.length,1);
 await refreshPublicFeeds({...args,now:now+59_999});assert.equal(calls,1);
 await refreshPublicFeeds({...args,now:now+60_000});assert.equal(calls,2);
 const held=await locks.claim('public-feeds',now+120_000);
 assert.equal((await refreshPublicFeeds({...args,now:now+120_000})).status,'ALREADY_RUNNING');
 assert.equal(calls,2);await locks.finish('public-feeds',held,now+120_000,'IDLE');
 assert.equal(FEED_POLICY['fear-greed'].intervalMs,15*60_000);
 sql.close();
});
test('minute tick retains last good result and respects durable provider 429 cooldown across restarts',async()=>{
 const {sql,db,store,locks}=fixture();let calls=0;
 const collectors={'fear-greed':async(s,at)=>{calls++;if(calls===2)return new Response(null,{status:429,headers:{'retry-after':'600'}});await s.writeInput('fear-greed',feedInput('fear-greed',at),at);return Response.json(feedOutput('fear-greed',at))}};
 const args={env:{DB:db,ZGMINI_COMPUTE_TARGET:'pc'},store,locks,collectors,cnnMinuteOnly:true};
 await refreshPublicFeeds({...args,now});
 const at=now+60_000;
 assert.equal((await refreshPublicFeeds({...args,now:at})).status,'PARTIAL');
 assert.equal((await store.readOutput('fear-greed')).storedAt,now);
 assert.equal((await store.readAttempt('fear-greed')).body.retryAt,at+600_000);
 const secondStore=publicFeedStore(db);
 await refreshPublicFeeds({...args,store:secondStore,now:at+599_999});assert.equal(calls,2);
 await refreshPublicFeeds({...args,store:secondStore,now:at+600_000});assert.equal(calls,3);
 sql.close();
});


test('private CNN HTTP receipt preserves repeated source timestamps and failures without public rows',async()=>{
 const {sql,store}=fixture();await store.initialize();
 const sourceObservedAt='2026-10-01T00:00:00.000Z';
 const check={requestedAt:now+1000,checkedAt:now+1100,httpStatus:200,outcome:'VERIFIED',sourceObservedAt,score:15.831};
 assert.equal((await store.appendCnnHttpCheck(check)).status,'LOCAL_STORED');
 assert.equal((await store.appendCnnHttpCheck(check)).status,'UNCHANGED');
 await assert.rejects(()=>store.appendCnnHttpCheck({...check,score:16}),/CNN_HTTP_CHECK_CONFLICT/);
 await store.appendCnnHttpCheck({...check,requestedAt:now+61000,checkedAt:now+61100});
 await store.appendCnnHttpCheck({requestedAt:now+121000,checkedAt:now+121100,httpStatus:429,outcome:'HTTP_FAILED',sourceObservedAt:null,score:null});
 const row=sql.prepare("SELECT kind,body FROM public_feed_snapshots_v1 WHERE feed_key='fear-greed-http-checks'").get();
 assert.equal(row.kind,'input');
 const records=JSON.parse(row.body).checks;
 assert.equal(records.length,3);
 assert.equal(records[1].sourceObservedAt,sourceObservedAt);
 assert.equal(records[1].score,15.831);
 assert.equal(records[2].score,null);
 assert.equal(records[1].requestedAt-records[0].requestedAt,60_000);
 assert.equal(sql.prepare("SELECT count(*) n FROM public_feed_snapshots_v1 WHERE kind='output'").get().n,0);
 sql.close();
});

test('PC transport adapter preserves actual 429 and Retry-After from unchanged CNN collector',async()=>{
 const {collect}=await import('../worker/feed-collectors/fear-greed.ts');
 const {sql,store,db,locks}=fixture();
 const original=globalThis.fetch;
 let requests=0;
 const mock=async()=>{requests++;return new Response(null,{status:429,headers:{'retry-after':'600'}});};
 globalThis.fetch=mock;
 try{
  const at=Date.now();
  const args={env:{DB:db,ZGMINI_COMPUTE_TARGET:'pc'},store,locks,cnnMinuteOnly:true,collectors:{'fear-greed':observeCnnCollector(collect)}};
  const result=await refreshPublicFeeds({...args,now:at});
  assert.equal(result.status,'PARTIAL');
  assert.equal(requests,1);
  assert.equal(globalThis.fetch,mock);
  assert.equal((await store.readAttempt('fear-greed')).body.retryAt,at+600000);
  const receipt=JSON.parse(sql.prepare("SELECT body FROM public_feed_snapshots_v1 WHERE feed_key='fear-greed-http-checks'").get().body).checks;
  assert.equal(receipt.length,1);
  assert.equal(receipt[0].httpStatus,429);
  assert.equal(receipt[0].outcome,'HTTP_FAILED');
  assert.equal(receipt[0].sourceObservedAt,null);
  assert.equal(receipt[0].score,null);
  assert.ok(receipt[0].checkedAt>=receipt[0].requestedAt);
  assert.equal(await store.readOutput('fear-greed'),null);
  await refreshPublicFeeds({...args,now:at+60000});
  assert.equal(requests,1);
 }finally{globalThis.fetch=original;sql.close();}
});

test('W06 eligible minute phase waits only within cap, preserves 429 retry and synthetic timestamps',()=>{
 const start=Date.parse('2026-11-26T16:01:01.000Z');
 const prior={storedAt:Date.parse('2026-11-26T16:00:22.627Z')};
 const attempt={storedAt:prior.storedAt,body:{status:'ATTEMPTED'}};
 const planned=planCnnMinuteEligibilityWait({now:start,previous:prior,lastAttempt:attempt});
 assert.equal(CNN_MINUTE_ELIGIBILITY_WAIT_CAP_MS,25_000);
 assert.equal(planned.reason,'BOUNDED_WAIT_BEFORE_SHARED_LEASE');
 assert.equal(planned.waitMs,22_127);
 assert.equal(planCnnMinuteEligibilityWait({now:start-10_000,previous:prior,lastAttempt:attempt}).waitMs,0);
 assert.equal(planCnnMinuteEligibilityWait({now:start,previous:prior,
  lastAttempt:{...attempt,body:{status:'ATTEMPTED',retryAt:start+600_000}}}).reason,'RETRY_COOLDOWN_PRESERVED');
 assert.equal(planCnnMinuteEligibilityWait({now:start+60_000,previous:prior,lastAttempt:attempt}).waitMs,0);
 assert.equal(planCnnMinuteEligibilityWait({now:start,previous:null,lastAttempt:null}).waitMs,0);
});

test('W06 short due wait releases shared lease and resumes exact stored-output/readback path',async()=>{
 const {sql,db,store,locks}=fixture();await store.initialize();
 let calls=0,slept=0;
 const collector=async(s,at)=>{calls++;
  await s.writeInput('fear-greed',feedInput('fear-greed',at),at);
  return Response.json(feedOutput('fear-greed',at));};
 const args={env:{DB:db,ZGMINI_COMPUTE_TARGET:'pc'},store,locks,
  cnnMinuteOnly:true,collectors:{'fear-greed':collector}};
 let clockTime=now;
 const clock=()=>clockTime;
 const sleep=async ms=>{
  slept=ms;
  const lease=sql.prepare("SELECT lease_until,status FROM market_collection_jobs_v1 WHERE job='public-feeds'").get();
  assert.equal(lease.lease_until,0,'must not hold shared Core feed lease during bounded wait');
  clockTime+=ms;
 };
 const first=await refreshPublicFeeds({...args,now,clock,sleep});
 assert.equal(first.status,'COMPLETE');
 assert.equal(calls,1);assert.equal(slept,0);
 clockTime=now+45_000;
 const second=await refreshPublicFeeds({...args,now:clockTime,clock,sleep});
 assert.equal(second.status,'COMPLETE');
 assert.equal(second.feeds[0].status,'COMPLETE');
 assert.equal(calls,2);
 assert.equal(slept,15_500);
 assert.equal((await store.readOutput('fear-greed')).storedAt,now+60_500);
 const before=clockTime;
 clockTime+=15_000;const third=await refreshPublicFeeds({...args,now:clockTime,clock,sleep});
 assert.equal(third.feeds[0].status,'CACHED');
 assert.equal(calls,2);
 assert.equal(slept,15_500,'out-of-cap waits must not change duration');
 assert.equal(before,now+60_500);
 sql.close();
});
