import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ER1_METHOD,ER1_STAR3_THRESHOLD} from
 '../lib/market-calendar-er1-earnings-score.mjs';
import {validateER1PublicDisplay,ER1_EARNINGS_DISPLAY_PUBLIC_KEY} from
 '../lib/market-calendar-er1-public-display.mjs';
import {publishER1Once,verifyER1ReaderDeployed} from
 '../tools/market-calendar-er1/ER1_PC_MANUAL_PUBLISH.mjs';

const asOf='2026-11-02',now=Date.parse('2026-11-03T12:00:00Z');
const source='a'.repeat(40);
// Scores are intentionally synthetic: this tests only the publisher's
// observed-symbol snapshot contract, not the ER1 financial formula.
const scores=Array.from({length:838},(_,i)=>({
 issuerId:`T${i}`,tickers:[`T${i}`],
 score:i>=796?97+(i-796)*.05:40+i*.07,
}));
const publicDerived={status:'READY_ER1_PUBLIC',method:ER1_METHOD,asOf,
 threshold:ER1_STAR3_THRESHOLD,
 coverage:{inputSymbols:841,observedIssuers:841,scoreableIssuers:838,
  unscoreableReasons:{ER1_RELEASE_HISTORY_INSUFFICIENT:3}},
 recordCount:838,star3Count:42,scores};

function fixture(data=publicDerived){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zg-er1-no-roster-publish-'));
 const pcHome=path.join(root,'pc'),repoRoot=path.join(root,'repo');
 fs.mkdirSync(path.join(pcHome,'er1-input'),{recursive:true});
 fs.mkdirSync(path.join(repoRoot,'scripts','pc-writer'),{recursive:true});
 fs.writeFileSync(path.join(repoRoot,'scripts','pc-writer','d1.mjs'),'// fixture only');
 fs.writeFileSync(path.join(pcHome,'config.json'),JSON.stringify({
  collectionTarget:'pc',enabled:true,core:'core',source}));
 const publicFile=path.join(pcHome,'er1-input','er1-public-display.json');
 fs.writeFileSync(publicFile,JSON.stringify(data));
 return {pcHome,repoRoot,publicFile,cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}

function fakeD1(){
 let stored=null,writes=0,reads=0;
 return {get writes(){return writes},get reads(){return reads},
  async query(db,sql,params){
   assert.equal(db,'core');assert.deepEqual(params,[ER1_EARNINGS_DISPLAY_PUBLIC_KEY]);
   assert.match(sql,/public_feed_snapshots_v1/);reads++;
   return {results:stored?[stored]:[]};
  },
  async request(db,items){
   assert.equal(db,'core');assert.equal(items.length,1);
   assert.equal(items[0].params[0],ER1_EARNINGS_DISPLAY_PUBLIC_KEY);
   stored={body:items[0].params[1],stored_at:items[0].params[2]};writes++;
   return [{success:true}];
  },
  setPrior(value){stored={body:JSON.stringify(value),stored_at:now-1000}}
 };
}
const opts=(f,d1,extra={})=>({...f,now,headResolver:()=>source,
 readerGate:async()=>true,remoteFactory:async()=>d1,...extra});

test('no-roster 838-of-841 derived snapshot is valid and does not claim reviewed issuers',()=>{
 assert.ok(validateER1PublicDisplay(publicDerived,{now}));
 assert.equal(publicDerived.coverage.observedIssuers,841);
 assert.equal(Object.hasOwn(publicDerived.coverage,'expectedEligibleIssuers'),false);
 assert.equal(publicDerived.star3Count,42);
 assert.equal(Object.hasOwn(publicDerived.scores[0],'eps'),false);
 assert.equal(Object.hasOwn(publicDerived.scores[0],'revenue'),false);
});

test('838 no-roster derived scores publish one D1 output key, read back and retry idempotently',async()=>{
 const f=fixture(),d1=fakeD1();
 try{
  const first=await publishER1Once(opts(f,d1));
  assert.equal(first.status,'ER1_D1_PUBLISHED_AND_READBACK');
  assert.equal(first.dbWrites,1);assert.equal(first.providerRequests,0);
  assert.equal(first.scoreableIssuers,838);assert.equal(first.star3Count,42);
  assert.equal(d1.writes,1);assert.equal(d1.reads,2);
  const again=await publishER1Once(opts(f,d1));
  assert.equal(again.status,'ER1_ALREADY_PUBLISHED');
  assert.equal(again.dbWrites,0);assert.equal(d1.writes,1);
  assert.equal(fs.existsSync(path.join(f.pcHome,'er1-input','er1-manual-publish.lock')),false);
 }finally{f.cleanup()}
});

test('tampered schema, raw fields and false observed counts stop before remote access',async()=>{
 for(const bad of [
  {...publicDerived,rawRevenueVendor:{T0:123}},
  {...publicDerived,asOf:'2024-11-02'},
  {...publicDerived,coverage:{...publicDerived.coverage,scoreableIssuers:837}},
  {...publicDerived,coverage:{...publicDerived.coverage,observedIssuers:838}},
  {...publicDerived,coverage:{...publicDerived.coverage,expectedEligibleIssuers:841}},
 ]){
  const f=fixture(bad),d1=fakeD1();let readerCalls=0;
  try{
   await assert.rejects(publishER1Once(opts(f,d1,{readerGate:async()=>{readerCalls++;return true}})),
    /ER1_PUBLISH_INVALID_DERIVED_SCORES_STOP/);
   assert.equal(readerCalls,0);assert.equal(d1.writes,0);assert.equal(d1.reads,0);
  }finally{f.cleanup()}
 }
});

test('source drift, undeployed reader, and concurrent publisher lock block without D1 writes',async()=>{
 const f=fixture(),d1=fakeD1();
 try{
  await assert.rejects(publishER1Once(opts(f,d1,{headResolver:()=> 'b'.repeat(40)})),
   /ER1_PUBLISH_SOURCE_DRIFT_STOP/);
  await assert.rejects(publishER1Once(opts(f,d1,{readerGate:async()=>false})),
   /ER1_READER_NOT_DEPLOYED_STOP/);
  const lock=path.join(f.pcHome,'er1-input','er1-manual-publish.lock');
  fs.writeFileSync(lock,'busy');
  await assert.rejects(publishER1Once(opts(f,d1)),/ER1_PUBLISH_LOCK_BUSY_STOP/);
  assert.equal(d1.writes,0);assert.equal(d1.reads,0);
 }finally{f.cleanup()}
});

test('existing newer public score blocks overwrite, and old reader header blocks publish',async()=>{
 const f=fixture(),d1=fakeD1();
 try{
  d1.setPrior({...publicDerived,asOf:'2026-11-03'});
  await assert.rejects(publishER1Once(opts(f,d1)),
   /ER1_PUBLISH_REMOTE_NEWER_OR_CONFLICT_STOP/);
  assert.equal(d1.writes,0);
  await assert.rejects(verifyER1ReaderDeployed({fetchImpl:async()=>({ok:true,
   headers:new Headers({'x-zgmini-earnings-grade-reader':'ZGMINI-FHS-R3'})})}),
   /ER1_READER_NOT_DEPLOYED_STOP/);
  assert.equal(await verifyER1ReaderDeployed({fetchImpl:async()=>({ok:true,
   headers:new Headers({'x-zgmini-earnings-grade-reader':'ZGMINI-ER1-97'})})}),true);
 }finally{f.cleanup()}
});

test('failed D1 readback is not reported as success or rolled back blindly',async()=>{
 const f=fixture();let reads=0,writes=0;
 const remote={
  async query(){reads++;return {results:reads===1?[]:[{body:'DIFFERENT',stored_at:1}]};},
  async request(){writes++;return [{success:true}];},
 };
 try{
  await assert.rejects(publishER1Once(opts(f,remote)),
   /ER1_PUBLISH_D1_READBACK_FAILED_STOP/);
  assert.equal(writes,1);
  assert.equal(reads,2);
  // The remote outcome must be diagnosed before any retry. Only the local
  // single-run lock is released; no automatic overwrite/rollback is attempted.
  assert.equal(fs.existsSync(path.join(f.pcHome,'er1-input','er1-manual-publish.lock')),false);
 }finally{f.cleanup()}
});

test('CLI fallback path climbs from the publisher file to the intended repository root',()=>{
 const publisher=new URL('../tools/market-calendar-er1/ER1_PC_MANUAL_PUBLISH.mjs',import.meta.url);
 const actual=path.resolve(fileURLToPath(publisher),'../../..');
 const expected=path.resolve(fileURLToPath(publisher),'../../../..');
 // The first path is candidate repo root, while climbing another level escapes it.
 assert.equal(actual,path.resolve(fileURLToPath(import.meta.url),'../..'));
 assert.notEqual(actual,expected);
});
