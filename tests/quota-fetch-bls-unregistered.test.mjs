import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {randomUUID} from 'node:crypto';
import {createQuotaFetch} from '../scripts/pc-writer/quota-fetch.mjs';
import {
 BLS_UNREGISTERED_SCHEMA,
 reserveR6UnregisteredBlsBatch,
 inspectUnregisteredBlsSlots,
} from '../scripts/pc-writer/bls-unregistered-reservation.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const bls1='https://api.bls.gov/publicAPI/v1/timeseries/data/';
const bls2='https://api.bls.gov/publicAPI/v2/timeseries/data/';
const post=body=>({method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
function fixture({used=0,provisioned=true}={}){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'r6-bls-fetch-'));
 if(provisioned){
  const seed=JSON.stringify({schema:BLS_UNREGISTERED_SCHEMA,coverageAttested:true,
   requestTimes:Array(used).fill(Date.now()-1000),leases:{}});
  fs.writeFileSync(path.join(base,'bls-unregistered-reservations.json'),seed);
  fs.writeFileSync(path.join(base,'bls-unregistered-reservations.journal'),'');
  fs.writeFileSync(path.join(base,'bls-unregistered-reservations.anchor'),JSON.stringify({
   schema:'ZGMINI_BLS_UNREGISTERED_ANCHOR_V1',seedSha256:hash(seed),
   journalSha256:hash(''),sequence:0,
  }));
 }
 return base;
}
const clean=base=>fs.rmSync(base,{recursive:true,force:true});
const ok=()=>({status:200,ok:true,headers:new Headers()});

test('default-off wrapper keeps current BLS behavior without a new shared ledger',async()=>{
 const base=fixture({provisioned:false});
 let physical=0;
 try{
  const quota=createQuotaFetch({base,mode:'observe',originalFetch:async()=>{physical++;return ok();}});
  await quota.fetch(bls1,post({seriesid:['LNS14000000']}));
  assert.equal(physical,1);
  assert.equal(fs.existsSync(path.join(base,'bls-unregistered-reservations.journal')),false);
  assert.throws(()=>quota.fetchR6WithLease(randomUUID()),/PROVIDER_QUOTA_GUARD/);
 }finally{clean(base);}
});

test('v1 POST and v2 without key each reserve one unregistered physical slot',async()=>{
 const base=fixture();
 let physical=0;
 try{
  const quota=createQuotaFetch({base,mode:'observe',originalFetch:async()=>{physical++;return ok();},
   blsUnregistered:{enabled:true,approvedBase:base}});
  await quota.fetch(bls1,post({seriesid:['X']}));
  await quota.fetch(bls2,post({seriesid:['Y']}));
  assert.equal(physical,2);
  assert.equal(inspectUnregisteredBlsSlots({base,approvedBase:base}).used24h,2);
 }finally{clean(base);}
});

test('v2 registration key is distinct and does not consume unregistered slots',async()=>{
 const base=fixture();
 let physical=0;
 try{
  const quota=createQuotaFetch({base,mode:'observe',originalFetch:async()=>{physical++;return ok();},
   blsUnregistered:{enabled:true,approvedBase:base}});
  await quota.fetch(bls2,post({seriesid:['Y'],registrationkey:'TEST_ONLY_DO_NOT_PUBLISH'}));
  assert.equal(physical,1);
  assert.equal(inspectUnregisteredBlsSlots({base,approvedBase:base}).used24h,0);
 }finally{clean(base);}
});

test('Request.clone body classification never consumes the original POST body',async()=>{
 const base=fixture();
 let physical=0,seenBody=null;
 try{
  const quota=createQuotaFetch({base,mode:'observe',originalFetch:async request=>{
    physical++;seenBody=await request.text();return ok();
   },blsUnregistered:{enabled:true,approvedBase:base}});
  const request=new Request(bls2,post({seriesid:['Z']}));
  await quota.fetch(request);
  assert.equal(physical,1);
  assert.equal(JSON.parse(seenBody).seriesid[0],'Z');
  assert.equal(inspectUnregisteredBlsSlots({base,approvedBase:base}).used24h,1);
 }finally{clean(base);}
});

test('unknown BLS endpoint/body/key shape fail before any HTTP call',async()=>{
 const base=fixture();
 let physical=0;
 try{
  const quota=createQuotaFetch({base,mode:'observe',originalFetch:async()=>{physical++;return ok();},
   blsUnregistered:{enabled:true,approvedBase:base}});
  for(const [url,init] of [
   [bls2,{method:'POST',body:'{not-json'}],
   [bls2,{method:'POST',body:JSON.stringify({seriesid:[],registrationkey:0})}],
   ['https://api.bls.gov/publicAPI/v3/timeseries/data/',post({seriesid:[]})],
   [bls1,{method:'GET'}],
  ]){
   await assert.rejects(quota.fetch(url,init),error=>
    error.code==='PROVIDER_QUOTA_GUARD'&&error.provider==='BLS');
  }
  assert.equal(physical,0);
  assert.equal(inspectUnregisteredBlsSlots({base,approvedBase:base}).used24h,0);
 }finally{clean(base);}
});

test('R6 18 prepaid fetches spend their lease once; DOL and nineteenth BLS do not bypass',async()=>{
 const base=fixture({used:7});
 let physical=0,blsPhysical=0;
 const requestId=randomUUID();
 try{
  reserveR6UnregisteredBlsBatch({base,approvedBase:base,requestId,count:18});
  const quota=createQuotaFetch({base,mode:'observe',originalFetch:async input=>{
   physical++;if(String(input).startsWith(bls1))blsPhysical++;return ok();
  },blsUnregistered:{enabled:true,approvedBase:base}});
  const r6Fetch=quota.fetchR6WithLease(requestId);
  await r6Fetch('https://api.dol.gov/some-approved-endpoint');
  for(let i=0;i<18;i++)await r6Fetch(bls1,post({seriesid:['X']}));
  await assert.rejects(r6Fetch(bls1,post({seriesid:['X']})),error=>
   error.code==='PROVIDER_QUOTA_GUARD'&&error.reason==='BLS_UNREG_BATCH_EXHAUSTED');
  assert.equal(physical,19);
  assert.equal(blsPhysical,18);
  assert.equal(inspectUnregisteredBlsSlots({base,approvedBase:base}).used24h,25);
 }finally{clean(base);}
});

test('missing approved seed fails closed without provider traffic',async()=>{
 const base=fixture({provisioned:false});
 let physical=0;
 try{
  const quota=createQuotaFetch({base,mode:'observe',originalFetch:async()=>{physical++;return ok();},
   blsUnregistered:{enabled:true,approvedBase:base}});
  await assert.rejects(quota.fetch(bls1,post({seriesid:['X']})),error=>
   error.code==='PROVIDER_QUOTA_GUARD'&&error.reason==='BLS_UNREG_LEDGER_UNAVAILABLE');
  assert.equal(physical,0);
 }finally{clean(base);}
});

test('blocked BLS reservation never creates a phantom request in legacy quota ledger',async()=>{
 const base=fixture({used:25});
 let physical=0;
 try{
  const quota=createQuotaFetch({base,mode:'observe',originalFetch:async()=>{physical++;return ok();},
   blsUnregistered:{enabled:true,approvedBase:base}});
  await assert.rejects(quota.fetch(bls1,post({seriesid:['X']})),error=>
   error.code==='PROVIDER_QUOTA_GUARD'&&error.reason==='BLS_UNREG_25_PER_24H_STOP');
  assert.equal(physical,0);
  assert.equal(quota.summary().providers.BLS?.requests??0,0);
 }finally{clean(base);}
});

test('R6 lease rejects invalid IDs and keyed BLS requests without phantom usage',async()=>{
 const base=fixture();
 let physical=0;
 try{
  const quota=createQuotaFetch({base,mode:'observe',originalFetch:async()=>{physical++;return ok();},
   blsUnregistered:{enabled:true,approvedBase:base}});
  assert.throws(()=>quota.fetchR6WithLease('not-a-uuid'),error=>
   error.code==='PROVIDER_QUOTA_GUARD'&&error.reason==='BLS_R6_LEASE_ID_INVALID');
  const r6Fetch=quota.fetchR6WithLease(randomUUID());
  await assert.rejects(r6Fetch(bls2,post({seriesid:['X'],
   registrationkey:'DO_NOT_LOG_TEST_KEY'})),error=>
   error.code==='PROVIDER_QUOTA_GUARD'&&error.reason==='BLS_R6_LEASE_EXPECTED_UNREGISTERED');
  assert.equal(physical,0);
  assert.equal(quota.summary().providers.BLS?.requests??0,0);
  assert.equal(inspectUnregisteredBlsSlots({base,approvedBase:base}).used24h,0);
 }finally{clean(base);}
});
