import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildNineR37PrivateCandidate} from '../scripts/pc-writer/theme-nine-r37-public-candidate.mjs';
import {
 addVerifiedNineR37,eligibleNineR37,THEME_NINE_R37_KEY,
 THEME_NINE_R37_ROSTER,
} from '../worker/theme-nine-r37-public.mjs';

const shadowBytes=readFileSync(new URL('../upload/THEME_NINE_R32_PRIVATE_SHADOW_18279_2554.json',import.meta.url));
const shadow=JSON.parse(shadowBytes);
const aumEvidenceBytes=readFileSync(new URL('../config/theme-nine-r26-official-aum-evidence.json',import.meta.url));
const roster=JSON.parse(readFileSync(new URL('../config/theme-nine-r20-approved-candidates.json',import.meta.url)));
const base=JSON.parse(readFileSync(new URL('../upload/THEME_NINE_R33_PUBLIC_BASELINE_28856_6920.json',import.meta.url)));
const now=Date.parse('2026-10-27T03:00:00.000Z');
const candidate=buildNineR37PrivateCandidate({
 shadow,shadowBytes,roster,aumEvidenceBytes,
 r25InputSha256:'12544ebc141148e7fbe61765670f9807520d87de7e9b14e4f41ec85e973f0987',
});
const ready=()=>({...candidate,
 status:'READY',sourceStoredAt:'2026-10-27T02:58:00.000Z',
 publishedAt:'2026-10-27T02:59:00.000Z',
 publicationAuthorized:true,upstreamCommercialRightsVerified:true,
 derivedLicenseVerified:true,sourcePriceReconciled:true,
 sourceManifestVerified:true,privateReplayVerified:true,
});
const fakeDb=(record,{storedAt=now-30_000,failed=false}={})=>({
 prepare(sql){
  assert.match(sql,/public_feed_snapshots_v1/);
  return {bind(key){
   assert.equal(key,THEME_NINE_R37_KEY);
   return {async first(){if(failed)throw new Error('D1 unavailable');
    return record?{body:JSON.stringify(record),stored_at:storedAt}:null;}};
  }};
 },
});

test('private converter faithfully maps nine 252-day histories without enabling publication',()=>{
 assert.equal(candidate.status,'PRIVATE_CANDIDATE_NOT_PUBLISHED');
 assert.equal(candidate.publicationAuthorized,false);
 assert.equal(candidate.providerCalls,0);
 assert.equal(candidate.d1Writes,0);
 assert.equal(candidate.schedulerWrites,0);
 assert.equal(candidate.ETFPositions,64);
 assert.equal(candidate.uniqueETFs,63);
 assert.equal(candidate.sourcePriceMode,'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE');
 assert.equal(candidate.themes.length,9);
 assert.ok(candidate.themes.every(t=>t.history.length===252));
 assert.deepEqual(candidate.themes.map(t=>t.theme),THEME_NINE_R37_ROSTER.map(t=>t.theme));
 assert.equal(candidate.themes[0].history.at(-1).score,shadow.themes[0].latest.score);
 assert.equal(candidate.observationDate,'2026-10-23');
 assert.equal(eligibleNineR37(candidate,base,{now,storedAt:now-30_000}),false);
});

test('authorized same-day candidate overlays only the eight currently public target themes',async()=>{
 const upgraded=await addVerifiedNineR37(fakeDb(ready()),base,{now});
 assert.notEqual(upgraded,base);
 assert.equal(upgraded.themes.length,10);
 assert.deepEqual(upgraded.themes.map(t=>t.theme),base.themes.map(t=>t.theme));
 assert.equal(upgraded.themes[0].theme,'로봇·자동화');
 assert.equal(upgraded.themes[0].score,shadow.themes[0].latest.score);
 assert.equal(upgraded.themes.find(t=>t.theme==='AI·반도체'),undefined);
 assert.deepEqual(upgraded.themes.find(t=>t.theme==='데이터센터·전력'),
  base.themes.find(t=>t.theme==='데이터센터·전력'));
 assert.deepEqual(upgraded.themes.find(t=>t.theme==='우주·위성'),
  base.themes.find(t=>t.theme==='우주·위성'));
 assert.equal(upgraded.modelRevision,ready().version);
});

test('new sidecar never substitutes stale Oct23 data for live Oct26 data',async()=>{
 const later={...base,observationDate:'2026-10-26',confirmedObservationDate:'2026-10-26',
  themes:base.themes.map(t=>({...t,history:t.history.map((p,i)=>i===251?{...p,date:'2026-10-26'}:p)}))};
 const result=await addVerifiedNineR37(fakeDb(ready()),later,{now});
 assert.equal(result,later);
});

test('rejects rights gate, roster drift, AUM date drift, and out-of-date D1 writes',async()=>{
 const badRights={...ready(),derivedLicenseVerified:false};
 const badRoster={...ready(),themes:ready().themes.map((t,i)=>i===0?{...t,etfs:['SPY',...t.etfs.slice(1)]}:t)};
 const badAum={...ready(),officialAumAsOf:{...ready().officialAumAsOf,BOTZ:'2026-10-24'}};
 for(const invalid of [badRights,badRoster,badAum]){
  assert.equal(eligibleNineR37(invalid,base,{now,storedAt:now-30_000}),false);
  assert.equal(await addVerifiedNineR37(fakeDb(invalid),base,{now}),base);
 }
 assert.equal(await addVerifiedNineR37(fakeDb(ready(),{storedAt:now-9*86_400_000}),base,{now}),base);
});

test('missing or failed D1 sidecar always leaves original feed unchanged',async()=>{
 assert.equal(await addVerifiedNineR37(fakeDb(null),base,{now}),base);
 assert.equal(await addVerifiedNineR37(fakeDb(ready(),{failed:true}),base,{now}),base);
});

test('mutated shadow bytes are rejected before any candidate is built',()=>{
 assert.throws(()=>buildNineR37PrivateCandidate({
  shadow,shadowBytes:new TextEncoder().encode('{}'),roster,aumEvidenceBytes,
  r25InputSha256:'12544ebc141148e7fbe61765670f9807520d87de7e9b14e4f41ec85e973f0987',
 }),/SHADOW_FILE_MISMATCH/);
});
