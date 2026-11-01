import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildSpaceSatellitePublicR32} from
 '../scripts/pc-writer/theme-space-satellite-public-r32.mjs';
import {runSpacePublishR32} from
 '../scripts/pc-writer/theme-space-satellite-publish-r32.mjs';
import {spaceSatelliteD1R29} from
 '../scripts/pc-writer/theme-space-satellite-d1-r29.mjs';
import {eligibleSpaceSatelliteR2,SPACE_SATELLITE_R2_PUBLIC_KEY,
 SPACE_SATELLITE_R2_PUBLIC_VERSION,addVerifiedSpaceSatelliteR2} from
 '../worker/theme-space-satellite-r2.mjs';
import {addVerifiedSpaceSatellite,SPACE_SATELLITE_PUBLIC_KEY} from
 '../worker/theme-space-satellite-r1.mjs';
import {buildSpaceSatellitePublicR29} from
 '../scripts/pc-writer/theme-space-satellite-public-r29.mjs';

const now=Date.parse('2026-10-26T06:00:00Z');
const dates=Array.from({length:252},(_,i)=>new Date(
 Date.parse('2026-02-14T00:00:00Z')+i*86_400_000).toISOString().slice(0,10));
const etfs=['UFO','NASA','WARP','ROKT'];
const history=dates.map((date,i)=>({date,score:i<147?34.88492:44.65075}));
const candidate={report:'SPACE_SATELLITE_R28_PC_SAVED_SOURCE_ONLY',
 status:'PRIVATE_CURRENT_APPROVED_BASKET_READY',publicationCompleted:false,
 providerCalls:0,d1Writes:0,publicWrites:0,sourceManifestSha256:'a'.repeat(64),
 sharedSpyManifestSha256:'b'.repeat(64),sourceStoredAt:'2026-10-25T13:36:20Z',
 scoreAsOf:dates.at(-1),etfs,history,scoredDays:252,
 latest:{date:dates.at(-1),score:44.65075,status:'APPROVED_THREE_PLUS_AUM',etfs},
 weighting:'APPROVED_NORMALIZED_CURRENT_ISSUER_AUM_FOR_THREE_PLUS',
 historicalWeightMode:'CURRENT_ROSTER_DATE_ELIGIBLE_AUM_WITH_REAL_SINGLE_ETF_HISTORY',
 historyFallbackPolicy:'LONGEST_VERIFIED_SESSIONS_TIE_CURRENT_AUM',
 sourcePriceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
 aumAsOf:{UFO:'2026-10-22',NASA:'2026-10-22',WARP:'2026-10-23',ROKT:'2026-10-22'}};
const base={status:'READY',observationDate:dates.at(-1),themes:Array.from({length:9},
 (_,i)=>({theme:'core-'+i,history:history.map(row=>({date:row.date,score:50}))}))};
const sha='c'.repeat(64);

test('R32 252-day record accepts real old UFO points and keeps current score',()=>{
 const record=buildSpaceSatellitePublicR32({candidate,base,
  candidateFileSha256:sha,allowPublish:true,now});
 assert.equal(record.version,SPACE_SATELLITE_R2_PUBLIC_VERSION);
 assert.equal(record.score,44.65075);
 assert.equal(record.history.length,252);
 assert.equal(record.history[0].score,34.88492);
 assert.equal(record.history.at(-1).score,44.65075);
 assert.equal(record.scoredDays,252);
 assert.equal(eligibleSpaceSatelliteR2(record,base,{now,storedAt:now}),true);
 assert.equal(eligibleSpaceSatelliteR2({...record,scoredDays:105},base,{now,storedAt:now}),false);
});
test('R32 D1 reader wins over R1 but cannot read or overwrite original R1 key',async()=>{
 const record=buildSpaceSatellitePublicR32({candidate,base,
  candidateFileSha256:sha,allowPublish:true,now});
 let readKeys=[];
 const db={prepare(){return {bind(key){readKeys.push(key);return {async first(){
  if(key===SPACE_SATELLITE_R2_PUBLIC_KEY)return {body:JSON.stringify(record),stored_at:now};
  throw Error('Original R1 row must remain untouched when R2 is READY');
 }};}};}};
 const result=await addVerifiedSpaceSatellite(db,base,{now});
 assert.equal(result.themes.length,10);
 assert.deepEqual(readKeys,[SPACE_SATELLITE_R2_PUBLIC_KEY]);
 assert.equal(result.themes.at(-1).history[0].score,34.88492);
 const direct=await addVerifiedSpaceSatelliteR2(db,base,{now});
 assert.equal(direct.themes.at(-1).score,44.65075);
});
test('missing or invalid R2 snapshot leaves the original R1 score visible',async()=>{
 const r1=buildSpaceSatellitePublicR29({candidate:{...candidate,
  history:history.map((point,i)=>i<147?{...point,score:null}:point),
  scoredDays:105,
  historicalWeightMode:'CURRENT_BASKET_FIXED_AUM_RETROSPECTIVE_NOT_HISTORICAL_AUM'},
  base,candidateFileSha256:sha,allowPublish:true,now});
 for(const invalidNew of [null,{body:'invalid-json',stored_at:now},
  {body:JSON.stringify({...r1,version:'wrong'}),stored_at:now}]){
  const queried=[];
  const db={prepare(){return {bind(key){queried.push(key);return {async first(){
   return key===SPACE_SATELLITE_R2_PUBLIC_KEY?invalidNew:{body:JSON.stringify(r1),stored_at:now};
  }};}};}};
  const result=await addVerifiedSpaceSatellite(db,base,{now});
  assert.equal(result.themes.at(-1).score,44.65075);
  assert.equal(result.themes.at(-1).history[0].score,null);
  assert.deepEqual(queried,[SPACE_SATELLITE_R2_PUBLIC_KEY,SPACE_SATELLITE_PUBLIC_KEY]);
 }
});
test('R32 publication writes only new D1 key and validates public readback',async()=>{
 let stored=null,reads=0,writes=0;
 const d1={async read(key){assert.equal(key,SPACE_SATELLITE_R2_PUBLIC_KEY);return stored;},
  async writeVersioned(key,record,expected){
   assert.equal(key,SPACE_SATELLITE_R2_PUBLIC_KEY);assert.equal(expected,null);
   writes++;stored={body:record,storedAt:now};return {status:'WRITTEN',changes:1};}};
 const report=await runSpacePublishR32({dataRoot:'unused',allowPublish:true,
  pcAudit:()=>candidate,save:()=>({relativePath:'private.json',sha256:sha}),
  publicRead:async()=>{reads++;return reads===1?base:{...base,themes:[...base.themes,
   {theme:'우주·위성',score:44.65075,etfs,history}]};},
  d1,now:()=>now});
 assert.equal(report.report,'SPACE_SATELLITE_R32_PC_PUBLICATION');
 assert.equal(report.status,'PUBLIC_API_VERIFIED');
 assert.equal(report.d1Writes,1);assert.equal(report.scoredDays,252);
 assert.equal(writes,1);
});
test('D1 adapter permits R2 key alone with explicit version; other keys denied',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-r32-d1-'));
 try{
  fs.mkdirSync(path.join(root,'pc-writer'));
  fs.writeFileSync(path.join(root,'pc-writer','config.json'),JSON.stringify({
   account:'a'.repeat(32),core:'12345678-1234-1234-1234-123456789abc'}));
  const store=await spaceSatelliteD1R29({dataRoot:root,
   tokenFn:async()=> 'fixture-seven-auth-token',
   publicKey:SPACE_SATELLITE_R2_PUBLIC_KEY,
   publicVersion:SPACE_SATELLITE_R2_PUBLIC_VERSION,
   fetchImpl:async()=>{throw Error('not called');}});
  await assert.rejects(store.read(SPACE_SATELLITE_PUBLIC_KEY),
   /SPACE_R29_D1_READ_KEY_DENIED/);
  await assert.rejects(store.writeVersioned('existing-theme-key',{},null),
   /SPACE_R29_D1_WRITE_KEY_DENIED/);
  await assert.rejects(spaceSatelliteD1R29({dataRoot:root,tokenFn:async()=> 'x',
   publicKey:'arbitrary-existing-theme-key',publicVersion:SPACE_SATELLITE_R2_PUBLIC_VERSION}),
  /SPACE_R29_D1_PUBLIC_CONTRACT_DENIED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('R32 D1 CAS writes the new versioned row and verifies readback without R1 SQL',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-r32-cas-'));
 try{
  fs.mkdirSync(path.join(root,'pc-writer'));
  fs.writeFileSync(path.join(root,'pc-writer','config.json'),JSON.stringify({
   account:'a'.repeat(32),core:'12345678-1234-1234-1234-123456789abc'}));
  const record=buildSpaceSatellitePublicR32({candidate,base,
   candidateFileSha256:sha,allowPublish:true,now});
  let persisted=null,inserts=0;
  const fetchImpl=async(_url,opts)=>{
   const [{sql,params}]=JSON.parse(opts.body).batch;
   if(sql.startsWith('SELECT')){
    assert.equal(params[0],SPACE_SATELLITE_R2_PUBLIC_KEY);
    return {ok:true,json:async()=>({success:true,result:[{success:true,
     results:persisted?[{body:persisted.body,stored_at:persisted.storedAt}]:[]}]})};
   }
   assert.match(sql,/^INSERT INTO public_feed_snapshots_v1/);
   assert.equal(params[1],SPACE_SATELLITE_R2_PUBLIC_KEY);
   inserts++;persisted={body:params[3],storedAt:params[4]};
   return {ok:true,json:async()=>({success:true,result:[{success:true,
    meta:{changes:1}}]})};
  };
  const store=await spaceSatelliteD1R29({dataRoot:root,
   tokenFn:async()=> 'fixture-seven-auth-token',fetchImpl,clock:()=>now,
   publicKey:SPACE_SATELLITE_R2_PUBLIC_KEY,
   publicVersion:SPACE_SATELLITE_R2_PUBLIC_VERSION});
  const written=await store.writeVersioned(SPACE_SATELLITE_R2_PUBLIC_KEY,record,null);
  assert.equal(written.status,'WRITTEN');assert.equal(inserts,1);
  assert.deepEqual((await store.read(SPACE_SATELLITE_R2_PUBLIC_KEY)).body,record);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
