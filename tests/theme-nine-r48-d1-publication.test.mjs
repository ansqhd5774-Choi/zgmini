import test from 'node:test';
import assert from 'node:assert/strict';
import {publishNineR48D1} from '../scripts/pc-writer/theme-nine-r48-d1-publication.mjs';
import {THEME_NINE_R37_KEY,THEME_NINE_R37_METHOD,THEME_NINE_R37_ROSTER,
 THEME_NINE_R37_ROSTER_SHA,THEME_NINE_R37_VERSION}
 from '../worker/theme-nine-r37-public.mjs';

const now=Date.parse('2026-10-27T03:00:00Z');
const dates=Array.from({length:252},(_,i)=>new Date(
  Date.parse('2026-10-26T00:00:00Z')-(251-i)*86_400_000).toISOString().slice(0,10));
const themes=THEME_NINE_R37_ROSTER.map(t=>({theme:t.theme,etfs:[...t.etfs],
  score:51,history:dates.map(date=>({date,score:51}))}));
const flags={publicationAuthorized:true,upstreamCommercialRightsVerified:true,
 derivedLicenseVerified:true,sourcePriceReconciled:true,
 sourceManifestVerified:true,privateReplayVerified:true,derivedOnlyNoRaw:true};
const allowed={status:'READY',version:THEME_NINE_R37_VERSION,
 methodologyVersion:THEME_NINE_R37_METHOD,sourceContract:
  'THEME_NINE_R47_PRIVATE_RECURRING_NINE_THEME_SHADOW_V1',
 sourcePriceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
 historicalAumMode:'FIXED_OFFICIAL_ISSUER_AUM_SNAPSHOT_WITH_ORIGINAL_DATES',
 rosterSha256:THEME_NINE_R37_ROSTER_SHA,benchmark:'SPY',
 individualStocksUsed:0,ETFPositions:64,uniqueETFs:63,
 rawManifestSha256:'a'.repeat(64),r25InputSha256:'b'.repeat(64),
 shadowSha256:'c'.repeat(64),officialAumEvidenceSha256:'d'.repeat(64),
 baselineManifestSha256:'e'.repeat(64),deltaManifestSha256:'f'.repeat(64),
 officialAumAsOf:Object.fromEntries([...new Set(THEME_NINE_R37_ROSTER
  .flatMap(t=>t.etfs))].map(s=>[s,'2026-10-23'])),
 observationDate:'2026-10-26',phase:'CONFIRMED',
 sourceStoredAt:'2026-10-27T01:00:00Z',publishedAt:'2026-10-27T01:05:00Z',
 themes,...flags};
const baseline={status:'READY',phase:'CONFIRMED',
 observationDate:'2026-10-26',confirmedObservationDate:'2026-10-26',
 themes:[...themes]};
function fake(initial=null){
 let row=initial?{body:JSON.stringify(initial),stored_at:now-1000}:null;
 const calls=[];
 return {calls,get row(){return row;},async query(sql,params,{write}={}){
   calls.push({sql,params,write});
   assert.match(sql,/public_feed_snapshots_v1/);
   if(!write){assert.equal(params[0],THEME_NINE_R37_KEY);
     return {results:row?[row]:[]};}
   if(sql.startsWith('INSERT')){
     if(row)return {meta:{changes:0}};
     assert.equal(params[0],THEME_NINE_R37_KEY);
     row={body:params[1],stored_at:params[2]};
   }else{
     assert.equal(params[2],THEME_NINE_R37_KEY);
     if(!row||row.stored_at!==params[3]||row.body!==params[4])
       return {meta:{changes:0}};
     row={body:params[0],stored_at:params[1]};
   }
   return {meta:{changes:1}};
 }};
}

test('unapproved private R47 candidate never reaches the D1 writer',async()=>{
 const db=fake();
 await assert.rejects(publishNineR48D1({query:db.query,record:{...allowed,
   publicationAuthorized:false},publicBase:baseline,now}),
   /PUBLICATION_EVIDENCE_OR_BASE_NOT_READY/);
 assert.equal(db.calls.length,0);
});

test('approved candidate writes ONLY new R37 key with CAS and readback',async()=>{
 const db=fake();
 const result=await publishNineR48D1({query:db.query,record:allowed,
   publicBase:baseline,now});
 assert.equal(result.status,'WRITTEN_AND_READBACK_VERIFIED');
 assert.equal(db.calls.filter(c=>c.write).length,1);
 assert.equal(JSON.parse(db.row.body).themes.length,9);
 assert.deepEqual(db.calls.filter(c=>c.write)[0].params[0],THEME_NINE_R37_KEY);
});

test('same day idempotent, but changed scores and older sessions fail safely',async()=>{
 const db=fake(allowed);
 const unchanged=await publishNineR48D1({query:db.query,record:allowed,
   publicBase:baseline,now,expectedStoredAt:now-1000});
 assert.equal(unchanged.status,'UNCHANGED');
 assert.equal(db.calls.filter(c=>c.write).length,0);
 const bad={...allowed,themes:allowed.themes.map((t,i)=>i===0?{
   ...t,score:52,history:[...t.history.slice(0,-1),{date:'2026-10-26',score:52}]
 }:t)};
 await assert.rejects(publishNineR48D1({query:db.query,record:bad,
   publicBase:baseline,now,expectedStoredAt:now-1000}),
   /D1_PRIOR_HISTORY_IMMUTABLE/);
 const later={...baseline,observationDate:'2026-10-27',
   confirmedObservationDate:'2026-10-27'};
 await assert.rejects(publishNineR48D1({query:db.query,record:allowed,
   publicBase:later,now,expectedStoredAt:now-1000}),
   /PUBLICATION_EVIDENCE_OR_BASE_NOT_READY/);
});

test('compare-and-swap mismatch prevents any D1 write',async()=>{
 const db=fake(allowed);
 await assert.rejects(publishNineR48D1({query:db.query,record:allowed,
   publicBase:baseline,now,expectedStoredAt:123}),/D1_CAS_EXPECTED_STAMP/);
 assert.equal(db.calls.filter(c=>c.write).length,0);
});
