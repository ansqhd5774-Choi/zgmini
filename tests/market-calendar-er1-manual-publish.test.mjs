import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {scoreER1Issuers} from '../lib/market-calendar-er1-earnings-score.mjs';
import {makeER1PublicDisplay,ER1_EARNINGS_DISPLAY_PUBLIC_KEY} from
 '../lib/market-calendar-er1-public-display.mjs';
import {publishER1Once,verifyER1ReaderDeployed} from
 '../tools/market-calendar-er1/ER1_PC_MANUAL_PUBLISH.mjs';

const asOf='2026-11-02',now=Date.parse('2026-11-02T12:00:00Z');
const source='a'.repeat(40);
const rows=Array.from({length:838},(_,i)=>({eligible:true,issuerId:`T${i}`,
 tickers:[`T${i}`],earningsSymbol:`T${i}`,
 releases:[{date:'2026-10-30',symbol:`T${i}`,eps:1,revenue:i+1}]}));
const publicDerived=makeER1PublicDisplay(scoreER1Issuers(rows,{asOf,expectedEligibleIssuers:838}));

function fixture(data=publicDerived){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zg-er1-publish-'));
 const pcHome=path.join(root,'pc'),repoRoot=path.join(root,'repo');
 fs.mkdirSync(path.join(pcHome,'er1-input'),{recursive:true});
 fs.mkdirSync(path.join(repoRoot,'scripts','pc-writer'),{recursive:true});
 fs.writeFileSync(path.join(repoRoot,'scripts','pc-writer','d1.mjs'),'// mocked only');
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
  }};
}
const opts=(f,d1,extra={})=>({...f,now,headResolver:()=>source,
 readerGate:async()=>true,remoteFactory:async()=>d1,...extra});

test('ER1 838 synthetic derived scores publish one D1 key with exact readback and idempotency',async()=>{
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

test('unreviewed / stale / raw-metric payloads stop before reader and D1 activity',async()=>{
 for(const bad of [
  {...publicDerived,rawRevenueVendor:{T0:123}},
  {...publicDerived,asOf:'2024-11-02'},
  {...publicDerived,coverage:{...publicDerived.coverage,scoreableIssuers:837}},
 ]){
  const f=fixture(bad),d1=fakeD1();let readerCalls=0;
  try{
   await assert.rejects(publishER1Once(opts(f,d1,{readerGate:async()=>{readerCalls++;return true}})),
    /ER1_PUBLISH_INVALID_DERIVED_SCORES_STOP/);
   assert.equal(readerCalls,0);assert.equal(d1.writes,0);assert.equal(d1.reads,0);
  }finally{f.cleanup()}
 }
});

test('PC source drift blocks D1, and old public reader header blocks the publish',async()=>{
 const f=fixture(),d1=fakeD1();
 try{
  await assert.rejects(publishER1Once(opts(f,d1,{headResolver:()=>"b".repeat(40)})),
   /ER1_PUBLISH_SOURCE_DRIFT_STOP/);
  assert.equal(d1.writes,0);
  await assert.rejects(publishER1Once(opts(f,d1,{readerGate:async()=>false})),
   /ER1_READER_NOT_DEPLOYED_STOP/);
  assert.equal(d1.reads,0);
 }finally{f.cleanup()}
});

test('reader deployment proof accepts only new ER1 header',async()=>{
 const fetchImpl=async()=>({ok:true,headers:new Headers({
  'x-zgmini-earnings-grade-reader':'ZGMINI-FHS-R3'})});
 await assert.rejects(verifyER1ReaderDeployed({fetchImpl}),
  /ER1_READER_NOT_DEPLOYED_STOP/);
 assert.equal(await verifyER1ReaderDeployed({fetchImpl:async()=>({ok:true,
  headers:new Headers({'x-zgmini-earnings-grade-reader':'ZGMINI-ER1-97'})})}),true);
});
