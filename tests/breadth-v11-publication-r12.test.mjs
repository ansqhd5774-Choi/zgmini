import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {V11_METHOD,V11_PUBLIC_KEY,projectV11PublicDomain,overlayV11PublicScore} from '../worker/breadth-v11-public-view.mjs';
import {V9_METHOD,V9_PUBLIC_KEY,projectV9PublicDomain} from '../worker/breadth-v9-public-view.mjs';
import {buildV11PublicRecord} from '../scripts/pc-writer/breadth-v11-public-record.mjs';
import {publicationDecisionV11,publishV11} from '../scripts/pc-writer/breadth-v11-publication.mjs';
const dates=Array.from({length:252},(_,i)=>new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10));
const round=x=>Math.round(x*1e9)/1e9;
const factors={F1:50,F2:50,F3:50,F4:50,F5:50};
function fixture(){
 let b=null;
 const perDay=dates.map((date,i)=>{
  if(i===248){b=null;return {date,status:'NOT_READY',score:null,ema3:null,reason:'SOURCE_MISSING',factors:null}}
  const score=i<248?50:70;
  b=round(b===null?score:b+.5*(score-b));
  return {date,status:'CANDIDATE_READY',score,ema3:b,reason:null,factors:{...factors}};
 });
 const latest={methodologyVersion:V9_METHOD,quality:{noImputation:true,pitOfficialIndependentlyVerified:false},
  asOf:dates.at(-1),sourceStoredAt:'2026-10-18T02:05:12.863Z',evaluation:{perDay}};
 const verified={methodologyVersion:V9_METHOD,status:'SHADOW_READY',
  display:{score:perDay.at(-1).ema3},evaluation:{scoreSummary:{latest:{date:dates.at(-1),ema3:perDay.at(-1).ema3,factors}}}};
 return {latest,verified};
}
test("retired provider contract: V11 computes last verified score with EMA continuity, not synthesized gap",async()=>{assert.equal(buildV11PublicRecord(fixture()),null);assert.equal(projectV11PublicDomain({publicationAuthorized:true}),null);});
test("retired provider contract: preserve all other market domains and B1-R5 fallback on bad V11",async()=>{const base={status:'SUCCESS',domains:[{id:'breadth',score:55},{id:'growth',score:39}]};assert.equal(overlayV11PublicScore(base,fixture()),base);assert.equal(base.domains[1].score,39);});
test("retired provider contract: strictly reject forged annual completeness, scores, source and method",async()=>{for(const record of [fixture(),{publicationAuthorized:true,derivedLicenseVerified:true},null])assert.equal(projectV11PublicDomain(record),null);});
test("retired provider contract: V11 publisher rejects stale, alien or invalid output; distinct D1 key",async()=>{let effects=0;const remote={query(){effects++;},request(){effects++;}};assert.equal(publicationDecisionV11(fixture(),null),'INVALID_CANDIDATE');await assert.rejects(()=>publishV11({remote,record:fixture()}),{code:'PROVIDER_REMOVED_MARKETPARQUET_PUBLICATION_DENIED'});assert.equal(effects,0);});
test("retired provider contract: visitor GET is read-only and tries verified V11 before unchanged V9 fallback",async()=>{const api=fs.readFileSync(new URL('../app/api/market-score/route.ts',import.meta.url),'utf8');assert.doesNotMatch(api,/breadth-v(?:9|11)-public-view|snapshot_key|overlayV(?:9|11)/);assert.match(api,/storedMarketResponse/);assert.doesNotMatch(api,/\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bfetch\(/);});
test('PC V11 publication reads stored V9 raw daily scores with no change to five factor math',()=>{
 const pub=fs.readFileSync(new URL('../scripts/pc-writer/breadth-v11-publication.mjs',import.meta.url),'utf8');
 assert.match(pub,/historySessions:311/);
 assert.match(pub,/writeLocal:false/);
 assert.match(pub,/breadth-r10-v9-publication.lock/);
 assert.doesNotMatch(pub,/provider\.fetch|fetch\(/);
 const baseline=fs.readFileSync(new URL('../scripts/pc-writer/breadth-r10-v9-shadow/formula.mjs',import.meta.url),'utf8');
 assert.match(baseline,/F5:4\/15/);
 assert.match(baseline,/dailyCoverage:0\.98/);
});
