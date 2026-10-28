import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {collectEarningsApiLocal,replayCachedEarningsDisplay} from '../scripts/pc-writer/earnings-api-local.mjs';
import {earningsApiNewYorkDay,earningsApiWindow,EARNINGS_API_ENDPOINT} from '../lib/earnings-api-calendar.mjs';
import {EARNINGS_API_R30_PRIVATE_KEY} from '../lib/earnings-api-private-projection.mjs';
import {EARNINGS_API_DISPLAY_KEY,earningsDisplayResponse} from '../lib/earnings-api-display.mjs';
import {publicFeedStore} from '../worker/public-feed-store.mjs';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';

const now=Date.parse('2026-10-29T15:00:00Z');
const prev=Date.parse('2026-10-28T15:00:00Z');
const priorDays=earningsApiWindow(prev),today=earningsApiNewYorkDay(now);
const privateSnapshot=(checkedAt=new Date(prev).toISOString())=>({
 status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,redistribution:false,
 publicationStatus:'HELD_UNCONFIRMED',checkedAt,attemptedNyDay:priorDays[0],
 coveredDays:priorDays,recordCount:1,priorityCount:1,
 events:[{id:'earnings-vendor-aapl-2026-10-30',date:priorDays[2],ticker:'AAPL',
  company:'Apple',marketSession:'unknown',kind:'earnings',country:'US',priority:true,
  verification:'VENDOR_UNVERIFIED',dateBasis:'America/New_York',time:null,source:'earnings-api',
  sourceUrl:EARNINGS_API_ENDPOINT}],
});
const memory=()=>{
 const inputs=new Map(),outputs=new Map();let writes=0;
 return {inputs,outputs,get writes(){return writes;},store:{
  readInput:async key=>inputs.get(key)??null,writeInput:async(key,body)=>{inputs.set(key,{body});},
  readOutput:async key=>outputs.get(key)??null,
  writeOutput:async(key,body)=>{writes++;outputs.set(key,{body});},
 }};
};

test('R33 replays existing R30 private events into HTML-only output with zero API requests',async()=>{
 const db=memory();db.inputs.set(EARNINGS_API_R30_PRIVATE_KEY,{body:privateSnapshot()});
 const result=await replayCachedEarningsDisplay({store:db.store,now});
 assert.equal(result.status,'READY_CACHED_DISPLAY');
 assert.equal(result.providerRequests,0);assert.equal(result.recordCount,1);
 assert.equal(db.writes,1);
 assert.equal(db.outputs.get(EARNINGS_API_DISPLAY_KEY).body.publicJsonFeed,false);
 const response=earningsDisplayResponse(db.outputs.get(EARNINGS_API_DISPLAY_KEY).body,
  'https://zgmini.kr/api/earnings-calendar-display?start=2026-10-29&end=2026-11-11');
 assert.equal(response.status,200);assert.match(await response.text(),/Apple/);
 const repeated=await replayCachedEarningsDisplay({store:db.store,now});
 assert.equal(repeated.status,'DISPLAY_ALREADY_READY');assert.equal(db.writes,1);
});

test('R33 also runs cached replay after a skipped daily collection without calling provider',async()=>{
 const db=memory(),previous=privateSnapshot(new Date(now).toISOString());
 // The stored private projection covers yesterday and still overlaps today.
 db.inputs.set(EARNINGS_API_R30_PRIVATE_KEY,{body:previous});
 const status={status:'READY',publicationStatus:'HELD_UNCONFIRMED',attemptedNyDay:today,
  checkedAt:new Date(now).toISOString(),coveredDays:earningsApiWindow(now),recordCount:1};
 db.inputs.set('release-calendar:earnings-api:status',{body:status});
 let calls=0;
 const result=await collectEarningsApiLocal({store:db.store,apiKey:'private-test-only',now,
  fetchImpl:async()=>{calls++;throw Error('UNEXPECTED_PROVIDER_CALL');}});
 assert.equal(calls,0);assert.equal(result.providerRequests,0);
 assert.equal(result.skipped,true);assert.equal(result.displayStatus,'READY_DISPLAY');
 assert.equal(db.writes,1);
});

test('R33 restores an absent R30 projection using already stored current-window raw inputs',async()=>{
 const db=memory(),days=earningsApiWindow(now);
 for(const day of days)db.inputs.set(`release-calendar:earnings-api:${day}`,{body:{
  requestedDate:day,sourceUrl:EARNINGS_API_ENDPOINT,
  text:JSON.stringify({date:day,pre:[],after:[],notSupplied:[{symbol:'AAPL',name:'Apple'}]}),
 }});
 const sourceState={status:'READY',publicationStatus:'HELD_UNCONFIRMED',attemptedNyDay:today,
  checkedAt:new Date(now).toISOString(),coveredDays:days,recordCount:14};
 const result=await replayCachedEarningsDisplay({store:db.store,now,sourceState});
 assert.equal(result.status,'READY_CACHED_DISPLAY');assert.equal(result.providerRequests,0);
 assert.equal(result.restoredProjection,true);assert.equal(result.recordCount,14);
 assert.equal(db.inputs.get(EARNINGS_API_R30_PRIVATE_KEY).body.scope,'PC_PRIVATE');
 assert.equal(db.outputs.get(EARNINGS_API_DISPLAY_KEY).body.rawVendorJsonExposed,false);
});

test('R33 stops replay for stale or out-of-window cache without publishing',async()=>{
 const db=memory(),stale=privateSnapshot('2026-10-25T11:00:00.000Z');
 db.inputs.set(EARNINGS_API_R30_PRIVATE_KEY,{body:stale});
 const result=await replayCachedEarningsDisplay({store:db.store,now});
 assert.equal(result.status,'CACHE_EXPIRED_OR_OUT_OF_WINDOW');
 assert.equal(db.writes,0);
});

test('R33 invalid private payload fails closed and does not use provider API',async()=>{
 const db=memory();db.inputs.set(EARNINGS_API_R30_PRIVATE_KEY,{body:{...privateSnapshot(),publicDisplay:true}});
 const result=await replayCachedEarningsDisplay({store:db.store,now});
 assert.equal(result.status,'CACHE_REPLAY_FAILED');assert.equal(result.providerRequests,0);
 assert.equal(db.writes,0);
});

test('R33 writes a durable HTML-only output to the existing PC SQLite schema',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r33-sqlite-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const db=localDatabase(path.join(dir,'core.sqlite'));
 try{
  const store=publicFeedStore(db);await store.initialize();
  await store.writeInput(EARNINGS_API_R30_PRIVATE_KEY,privateSnapshot(),prev);
  const result=await replayCachedEarningsDisplay({store,now});
  assert.equal(result.status,'READY_CACHED_DISPLAY');
  const persisted=await store.readOutput(EARNINGS_API_DISPLAY_KEY);
  assert.equal(persisted?.body?.status,'READY_DISPLAY');
  assert.equal(persisted?.body?.recordCount,1);
  assert.equal(persisted?.body?.publicJsonFeed,false);
 }finally{db.close();}
});
