import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSpaceSatellitePublicR29} from
 '../scripts/pc-writer/theme-space-satellite-public-r29.mjs';
import {runSpacePublishR29} from
 '../scripts/pc-writer/theme-space-satellite-publish-r29.mjs';
import {SPACE_SATELLITE_PUBLIC_KEY} from '../worker/theme-space-satellite-r1.mjs';

const time=Date.parse('2026-10-26T06:00:00Z');
const dates=Array.from({length:252},(_,i)=>new Date(
 Date.parse('2026-02-14T00:00:00Z')+i*86_400_000).toISOString().slice(0,10));
const symbols=['UFO','NASA','WARP','ROKT'];
const history=dates.map(date=>({date,score:44.65075}));
const candidate={report:'SPACE_SATELLITE_R28_PC_SAVED_SOURCE_ONLY',
 status:'PRIVATE_CURRENT_APPROVED_BASKET_READY',publicationCompleted:false,
 sourceManifestSha256:'a'.repeat(64),sharedSpyManifestSha256:'b'.repeat(64),
 sourceStoredAt:'2026-10-25T14:00:00Z',scoreAsOf:dates.at(-1),
 latest:{date:dates.at(-1),score:44.65075,status:'APPROVED_THREE_PLUS_AUM',etfs:symbols},
 etfs:symbols,history,scoredDays:252,providerCalls:0,d1Writes:0,publicWrites:0,
 weighting:'APPROVED_NORMALIZED_CURRENT_ISSUER_AUM_FOR_THREE_PLUS',
 historicalWeightMode:'CURRENT_BASKET_FIXED_AUM_RETROSPECTIVE_NOT_HISTORICAL_AUM',
 sourcePriceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
 aumAsOf:{UFO:'2026-10-22',NASA:'2026-10-22',WARP:'2026-10-23',ROKT:'2026-10-22'}};
const base={status:'READY',observationDate:dates.at(-1),
 themes:Array.from({length:7},(_,index)=>({theme:'core-'+index,
  history:dates.map(date=>({date,score:50}))}))};
const checksum='c'.repeat(64);

test('R29 publisher validates private source and creates derived-only approved row',()=>{
 const record=buildSpaceSatellitePublicR29({candidate,base,
  candidateFileSha256:checksum,allowPublish:true,now:time});
 assert.equal(record.score,44.65075);
 assert.deepEqual(record.etfs,symbols);
 assert.equal(record.history.length,252);
 assert.equal(record.derivedOnlyNoRaw,true);
 assert.equal(record.publicationAuthorized,true);
 assert.equal(record.sourceVersion,
  'GMH_MANIFEST_SHA256_'+ 'a'.repeat(64)+'_SPY_SHA256_'+'b'.repeat(64));
 assert.throws(()=>buildSpaceSatellitePublicR29({candidate,base,
  candidateFileSha256:checksum,now:time}),/SPACE_R29_PUBLICATION_NOT_REQUESTED/);
 assert.throws(()=>buildSpaceSatellitePublicR29({candidate:{...candidate,
  scoredDays:251},base,candidateFileSha256:checksum,
  allowPublish:true,now:time}),/SPACE_R29_PRIVATE_RESULT_INCOMPLETE/);
});
test('without --publish, R29 never touches D1 or public endpoint',async()=>{
 let reads=0,writes=0;
 const out=await runSpacePublishR29({dataRoot:'not-accessed',
  pcAudit:()=>candidate,save:()=>({relativePath:'themes/space-satellite/derived/test.json',sha256:checksum}),
  publicRead:()=>{reads++;return base;},
  d1:{read:()=>{reads++;},writeVersioned:()=>{writes++;}},now:()=>time});
 assert.equal(out.status,'PRIVATE_CANDIDATE_SAVED_NOT_PUBLISHED');
 assert.equal(reads,0);assert.equal(writes,0);
 assert.equal(out.d1Writes,0);
});
test('opted-in first D1 publication checks CAS, exact readback, public API',async()=>{
 let value=null,reads=0,writes=0;
 const d1={async read(key){assert.equal(key,SPACE_SATELLITE_PUBLIC_KEY);
  return value;},async writeVersioned(key,record,expected){
  assert.equal(key,SPACE_SATELLITE_PUBLIC_KEY);
  assert.equal(expected,null);writes++;
  value={body:record,storedAt:time};return {status:'WRITTEN',changes:1};}};
 const out=await runSpacePublishR29({dataRoot:'not-accessed',allowPublish:true,
  pcAudit:()=>candidate,save:()=>({relativePath:'themes/space-satellite/derived/test.json',sha256:checksum}),
  publicRead:async()=>{reads++;
   return reads===1?base:{...base,themes:[...base.themes,{theme:'우주·위성',
    etfs:symbols,score:44.65075,history}]};},d1,now:()=>time});
 assert.equal(writes,1);
 assert.equal(out.status,'PUBLIC_API_VERIFIED');
 assert.equal(out.d1Writes,1);
 assert.equal(out.publicApiVisible,true);
});
test('missing actual history blocks publication without synthetic results',async()=>{
 let writes=0;
 const out=await runSpacePublishR29({dataRoot:'none',allowPublish:true,
  pcAudit:()=>({...candidate,scoredDays:251}),
  save:()=>{throw Error('SHOULD_NOT_SAVE');},
  d1:{writeVersioned:()=>{writes++;}},now:()=>time});
 assert.equal(out.status,'STOPPED');assert.equal(writes,0);
 assert.equal(out.reason,'SPACE_R29_PC_SCORE_NOT_COMPLETE');
});
test('105 scored days in a 252-date real history can be published with null gaps',async()=>{
 const partialHistory=history.map((p,i)=>i<147?{...p,score:null}:p);
 const partial={...candidate,scoredDays:105,history:partialHistory};
 const record=buildSpaceSatellitePublicR29({candidate:partial,base,
  candidateFileSha256:checksum,allowPublish:true,now:time});
 assert.equal(record.history.length,252);
 assert.equal(record.scoredDays,105);
 assert.equal(record.history[0].score,null);
 assert.equal(record.history.at(-1).score,44.65075);
 let stored=null;
 const out=await runSpacePublishR29({dataRoot:'not-accessed',allowPublish:true,
  pcAudit:()=>partial,save:()=>({relativePath:'test.json',sha256:checksum}),
  publicRead:async()=>stored?{...base,themes:[...base.themes,{theme:'우주·위성',
   etfs:symbols,score:44.65075,history:partialHistory}]}:base,
  d1:{read:async()=>stored,writeVersioned:async(_key,body)=>{
   stored={body,storedAt:time};return {status:'WRITTEN',changes:1};}},
  now:()=>time});
 assert.equal(out.status,'PUBLIC_API_VERIFIED');
 assert.equal(out.scoredDays,105);
 assert.equal(out.d1Writes,1);
});
