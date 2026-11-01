import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {dcPowerCollectionWindow,runDcPowerCycleR2} from '../scripts/pc-writer/theme-data-center-power-cycle-r2.mjs';

const NOW=Date.parse('2026-10-25T04:00:00Z');
const manifest={version:1,themeId:'data-center-power',files:['DTCR','GRID','SPY'].map(symbol=>({
 path:`raw/${symbol}_${'a'.repeat(64)}.jsonl`,observationThrough:'2026-10-22'}))};
const candidate={status:'PRIVATE_CANDIDATE_NOT_PUBLISHED',themeId:'data-center-power',
 history:Array.from({length:252},(_,i)=>({date:'d'+i,score:14})),observationDate:'2026-10-22',
 score:14.75794,commonSessions:704,publicationAuthorized:false,publicWrites:0,d1Writes:0};

function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dc-power-cycle-'));
 const home=path.join(root,'themes','data-center-power');fs.mkdirSync(home,{recursive:true});
 fs.writeFileSync(path.join(home,'raw-manifest.json'),JSON.stringify(manifest));
 return {root,dispose:()=>fs.rmSync(root,{force:true,recursive:true})};
}

test('new day changes the exact bounded GET window without faking a price date',()=>{
 assert.deepEqual(dcPowerCollectionWindow(manifest,NOW),{start:'2026-10-16',end:'2026-10-25'});
 assert.deepEqual(dcPowerCollectionWindow(manifest,NOW+86400000),{start:'2026-10-16',end:'2026-10-26'});
});

test('private PC cycle computes from stored evidence with zero GET/D1/task changes',async()=>{
 const {root,dispose}=fixture();let calls=0,stored=0;
 try{
  const result=await runDcPowerCycleR2({dataRoot:root,now:()=>NOW,
   inspect:()=>({status:'SHA_VERIFIED'}),collector:async()=>{calls++;throw Error('UNAUTHORIZED_NETWORK');},
   calculate:()=>candidate,save:()=>{stored++;return {sha256:'a'.repeat(64)};}});
  assert.equal(result.status,'PRIVATE_CANDIDATE_VERIFIED_NOT_PUBLISHED');
  assert.equal(result.score,14.75794);assert.equal(result.providerCalls,0);
  assert.equal(result.d1Writes,0);assert.equal(result.schedulerWrites,0);
  assert.equal(calls,0);assert.equal(stored,1);
 }finally{dispose();}
});

test('bounded new-day GET reuses existing collector and preserves private scope',async()=>{
 const {root,dispose}=fixture();let sent;
 try{
  const result=await runDcPowerCycleR2({dataRoot:root,allowCollect:true,now:()=>NOW,
   inspect:()=>({status:'SHA_VERIFIED'}),collector:async request=>{
    sent=request;return {status:'PRIVATE_RAW_COLLECTION_COMPLETE',providerCalls:3};},
   calculate:()=>candidate,save:()=>({sha256:'a'.repeat(64)})});
  assert.deepEqual({start:sent.start,end:sent.end,maxRequests:sent.maxRequests},
   {start:'2026-10-16',end:'2026-10-25',maxRequests:4});
  assert.equal(result.status,'PRIVATE_CANDIDATE_VERIFIED_NOT_PUBLISHED');
  assert.equal(result.providerCalls,3);assert.equal(result.d1Writes,0);
 }finally{dispose();}
});

test('no D1 publish and no fabricated rights can be opted into by the private cycle',async()=>{
 const {root,dispose}=fixture();let calls=0;
 try{
  const result=await runDcPowerCycleR2({dataRoot:root,allowPublish:true,allowCollect:true,
   collector:async()=>{calls++;throw Error('UNAUTHORIZED_NETWORK');}});
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reason,'DC_POWER_R2_PUBLICATION_GATE_NOT_VERIFIED');
  assert.equal(calls,0);assert.equal(result.d1Writes,0);
 }finally{dispose();}
});

test('collector checkpoint exhaustion stops before any score output',async()=>{
 const {root,dispose}=fixture();let scored=0;
 try{
  const result=await runDcPowerCycleR2({dataRoot:root,allowCollect:true,now:()=>NOW,
   inspect:()=>({status:'SHA_VERIFIED'}),collector:async()=>({status:'CHECKPOINT_READY_TO_RESUME',providerCalls:4}),
   calculate:()=>{scored++;return candidate;}});
  assert.equal(result.status,'COLLECTION_RESUME_NEEDED');assert.equal(result.providerCalls,4);
  assert.equal(scored,0);assert.equal(result.d1Writes,0);
 }finally{dispose();}
});
