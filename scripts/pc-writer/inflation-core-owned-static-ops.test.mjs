import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {makeCoreOwnedInflationStaticOps}
 from './inflation-core-owned-static-ops.mjs';
import {runCoreOwnedInflationStaticOnce,INFLATION_CORE_STATIC_SCOPE}
 from './inflation-core-owned-static-once.mjs';
import {MANUAL_STORE_OPERATION}
 from './inflation-causal-candidate-manual-official-store-r1.mjs';

const id='c131d4c4-b788-4a1c-9f60-146dd6f7abb1';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture({foreignRoot=false,ppi=true}={}){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'w01-core-ops-'));
 const second=foreignRoot?fs.mkdtempSync(path.join(os.tmpdir(),'w01-foreign-')):home;
 fs.writeFileSync(path.join(home,'local-cycle.lock'),
  JSON.stringify({pid:process.pid,at:Date.now()}));
 const calls=[];
 const writer={
  verify:async()=>calls.push('lease'),
  claimOnce:async()=>calls.push('claim'),
  release:async x=>calls.push('release:'+x.retain)
 };
 const controller={
  authenticateExistingB:async()=>({
   status:'APPROVED_B',scope:INFLATION_CORE_STATIC_SCOPE,requestId:id,
   runCount:1,coreExecution:'CURRENT_CORE_OWNED_LOCK',
   exactOfficialSources:true,exactTwoTargets:true,
   dbWrites:false,d1Writes:false,taskChanges:false,sourceChanges:false,
   manifestSha256:'a'.repeat(64),
  }),
  assertCoreAcquisitionOrigin:async()=>({originAuthenticated:true,
   source:'CURRENT_CORE_ACQUISITION',pid:process.pid}),
  tryAcquireSharedWriterLease:async()=>writer,
  readCurrentSourcePreimage:async()=>calls.push('preimage'),
  recordOnceJournal:async(_,phase)=>calls.push('journal:'+phase),
 };
 const sourceA=Buffer.from('official-bls-test');
 const sourceB=Buffer.from('official-census-test');
 let requests=0;
 const fetchImpl=async url=>{
  calls.push('official:'+url);requests++;
  const bytes=url.includes('census.gov')?sourceB:sourceA;
  return {ok:true,status:200,body:{
   getReader:()=>({read:async()=>({done:true})})
  }};
 };
 // Test with a real bounded body reader so the source hash is retained.
 const fetchReal=async url=>{
  requests++;
  const bytes=url.includes('census.gov')?sourceB:sourceA;
  let consumed=false;
  return {ok:true,status:200,body:{getReader:()=>({
   read:async()=>consumed?{done:true}:{done:false,value:(consumed=true,bytes)}
  })}};
 };
 const parse=async()=>({plan:{documents:{bls:{series:{WPSFD4:[{date:'2026-01-01',value:1}]}}}}});
 const apply=async ({base,blsBytes,censusBytes,withApprovedWriterB})=>{
  const names=['bls-cpi-ppi3.json','census-m3-manufacturing-inventories.json'];
  const dir=path.join(base,'inflation-causal-candidates-r1'),raw=path.join(dir,'raw');
  const targets=names.map(name=>path.join(dir,name));
  return withApprovedWriterB({operation:MANUAL_STORE_OPERATION,targets},async lease=>{
   assert.equal(lease.scope,'APPROVED_WRITER_B');
   assert.equal(lease.requestId,id);
   fs.mkdirSync(raw,{recursive:true});
   const archives={};
   for(const [key,bytes] of [['bls',blsBytes],['census',censusBytes]]){
    const file=path.join(raw,key+'.dat');
    fs.writeFileSync(file,bytes,{flag:'wx'});
    archives[key]={file,hash:hash(bytes)};
   }
   const writes={};
   for(const [i,key] of ['bls','census'].entries()){
    const data=Buffer.from(JSON.stringify({source:key}));
    fs.writeFileSync(targets[i],data,{flag:'wx'});
    writes[key]={sha256:hash(data)};
   }
   return {status:'SAVED_READBACK',requestId:id,
    archives,writes,apiCalls:0,dbWrites:0,d1Writes:0,
    coreCheckpointWrites:0};
  });
 };
 return {home,second,calls,controller,sourceA,sourceB,parse,apply,
  fetchImpl:fetchReal,requests:()=>requests,cleanup:()=>{
   fs.rmSync(home,{recursive:true,force:true});
   if(second!==home)fs.rmSync(second,{recursive:true,force:true});
  }};
}
test('Core-owned adapter uses existing two official URLs and readback under owned lease',async()=>{
 const f=fixture();try{
  const adapter=makeCoreOwnedInflationStaticOps({base:f.home,
   approvedRoot:f.second,controller:f.controller,
   fetchImpl:f.fetchImpl,parse:f.parse,apply:f.apply});
  const result=await runCoreOwnedInflationStaticOnce({requestId:id,adapter});
  assert.equal(result.status,'PASS');
  assert.equal(result.providerCalls,2);
  assert.equal(f.requests(),2);
  assert.ok(f.calls.indexOf('claim')<f.calls.indexOf('journal:COMPLETED'));
  assert.equal(f.calls.at(-1),'release:false');
 }finally{f.cleanup();}
});
test('different canonical Core data roots prevent official GET',async()=>{
 const f=fixture({foreignRoot:true});try{
  const adapter=makeCoreOwnedInflationStaticOps({base:f.home,
   approvedRoot:f.second,controller:f.controller,
   fetchImpl:f.fetchImpl,parse:f.parse,apply:f.apply});
  const result=await runCoreOwnedInflationStaticOnce({requestId:id,adapter});
  assert.equal(result.status,'STOP');
  assert.equal(result.code,'INFL_CORE_STATIC_ROOT_MISMATCH_STOP');
  assert.equal(f.requests(),0);
 }finally{f.cleanup();}
});
test('missing PPI preimage stops after GET but before applying data',async()=>{
 const f=fixture({ppi:false});try{
  const adapter=makeCoreOwnedInflationStaticOps({base:f.home,
   approvedRoot:f.second,controller:f.controller,
   fetchImpl:f.fetchImpl,parse:async()=>({plan:{documents:{bls:{series:{WPSFD4:[]}}}}}),
   apply:()=>{throw Error('should-not-apply');}});
  const result=await runCoreOwnedInflationStaticOnce({requestId:id,adapter});
  assert.equal(result.status,'STOP');
  assert.equal(result.code,'INFL_CORE_STATIC_PPI_PREIMAGE_STOP');
  assert.equal(f.requests(),2);
  assert.ok(f.calls.includes('journal:CLAIMED_UNTOUCHED_STOP'));
 }finally{f.cleanup();}
});

test('without verified original Core lock acquisition attestation, no supplier GET',async()=>{
 const f=fixture();try{
  f.controller.assertCoreAcquisitionOrigin=async()=>({originAuthenticated:false});
  const adapter=makeCoreOwnedInflationStaticOps({base:f.home,
   approvedRoot:f.second,controller:f.controller,
   fetchImpl:f.fetchImpl,parse:f.parse,apply:f.apply});
  const result=await runCoreOwnedInflationStaticOnce({requestId:id,adapter});
  assert.equal(result.status,'STOP');
  assert.equal(result.code,'INFL_CORE_STATIC_ORIGIN_UNATTESTED_STOP');
  assert.equal(f.requests(),0);
  assert.ok(!f.calls.includes('claim'));
 }finally{f.cleanup();}
});
