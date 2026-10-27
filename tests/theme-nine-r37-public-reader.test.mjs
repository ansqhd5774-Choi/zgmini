import test from 'node:test';
import assert from 'node:assert/strict';
import {
 addVerifiedNineR37,eligibleNineR37,THEME_NINE_R37_KEY,
 THEME_NINE_R37_METHOD,THEME_NINE_R37_ROSTER,
 THEME_NINE_R37_ROSTER_SHA,THEME_NINE_R37_VERSION,
} from '../worker/theme-nine-r37-public.mjs';

const now=Date.parse('2026-10-27T01:00:00Z');
const dates=Array.from({length:252},(_,i)=>
 new Date(Date.parse('2026-10-23T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
const history=dates.map(date=>({date,score:50}));
const extra={theme:'데이터센터·전력',etfs:['GRID'],score:50,history};
const baseline={status:'READY',observationDate:'2026-10-23',
 confirmedObservationDate:'2026-10-23',phase:'CONFIRMED',
 themes:[...THEME_NINE_R37_ROSTER.slice(0,7).map(t=>({theme:t.theme,etfs:['OLD'],score:50,history})),extra]};
const sha='a'.repeat(64);
const ready={status:'READY',version:THEME_NINE_R37_VERSION,
 methodologyVersion:THEME_NINE_R37_METHOD,
 sourceContract:'THEME_NINE_R32_PRIVATE_STAGE5_SHADOW_V1',
 sourcePriceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
 historicalAumMode:'FIXED_OFFICIAL_ISSUER_AUM_SNAPSHOT_WITH_ORIGINAL_DATES',
 rosterSha256:THEME_NINE_R37_ROSTER_SHA,benchmark:'SPY',
 individualStocksUsed:0,ETFPositions:64,uniqueETFs:63,
 publicationAuthorized:true,upstreamCommercialRightsVerified:true,
 derivedLicenseVerified:true,sourcePriceReconciled:true,
 sourceManifestVerified:true,privateReplayVerified:true,derivedOnlyNoRaw:true,
 rawManifestSha256:sha,r25InputSha256:sha,shadowSha256:sha,
 officialAumEvidenceSha256:sha,observationDate:'2026-10-23',phase:'CONFIRMED',
 sourceStoredAt:'2026-10-27T00:55:00Z',publishedAt:'2026-10-27T00:56:00Z',
 officialAumAsOf:Object.fromEntries(
  [...new Set(THEME_NINE_R37_ROSTER.flatMap(t=>t.etfs))].map(t=>[t,'2026-10-23'])),
 themes:THEME_NINE_R37_ROSTER.map(t=>({theme:t.theme,etfs:[...t.etfs],score:50,history})),
};
const db=(record)=>({prepare(){return {bind(key){
 assert.equal(key,THEME_NINE_R37_KEY);
 return {async first(){return record?{body:JSON.stringify(record),stored_at:now-1000}:null;}};
}};}});

test('R37 reader overlays nine verified scores without losing other themes',async()=>{
 const result=await addVerifiedNineR37(db(ready),baseline,{now});
 assert.equal(result.themes.length,10);
 assert.deepEqual(result.themes.at(-1),extra);
 assert.equal(result.themes.find(t=>t.theme==='AI·반도체').history.length,252);
 assert.equal(result.modelRevision,THEME_NINE_R37_VERSION);
});

test('missing, unauthorized and malformed new feeds leave the old feed untouched',async()=>{
 assert.equal(await addVerifiedNineR37(db(null),baseline,{now}),baseline);
 assert.equal(await addVerifiedNineR37(db({...ready,derivedLicenseVerified:false}),baseline,{now}),baseline);
 assert.equal(await addVerifiedNineR37(db({...ready,uniqueETFs:62}),baseline,{now}),baseline);
 assert.equal(eligibleNineR37({...ready,sourcePriceMode:'UNDECLARED'},baseline,{now,storedAt:now-1000}),false);
});

test('a newer legacy date can never be overwritten by an older R37 score',async()=>{
 const newBase={...baseline,observationDate:'2026-10-26',confirmedObservationDate:'2026-10-26',
  themes:baseline.themes.map(t=>({...t,history:t.history.map((p,i)=>i===251?{...p,date:'2026-10-26'}:p)}))};
 assert.equal(await addVerifiedNineR37(db(ready),newBase,{now}),newBase);
});
