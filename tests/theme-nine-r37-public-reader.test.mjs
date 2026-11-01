import test from 'node:test';
import assert from 'node:assert/strict';
import {readThemeEtfOnly,THEME_ETF_ONLY_PUBLIC_KEY,THEME_ETF_ONLY_PUBLIC_VERSION,THEME_ETF_ONLY_METHOD} from '../worker/theme-etf-only-public.mjs';
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
const space={theme:'우주·위성',etfs:['UFO','NASA','WARP','ROKT'],score:50,history};
const baseline={status:'READY',observationDate:'2026-10-23',
 confirmedObservationDate:'2026-10-23',phase:'CONFIRMED',
 themes:[...THEME_NINE_R37_ROSTER.slice(0,7).map(t=>({theme:t.theme,etfs:['OLD'],score:50,history})),
  {theme:'바이오·신약',etfs:['IBB','XBI'],score:50,history},extra,space]};
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

test('R37 reader upgrades existing themes without introducing an eleventh theme',async()=>{
 const result=await addVerifiedNineR37(db(ready),baseline,{now});
 assert.equal(result.themes.length,10);
 assert.deepEqual(result.themes.map(t=>t.theme),baseline.themes.map(t=>t.theme));
 assert.deepEqual(result.themes.at(-2),extra);
 assert.deepEqual(result.themes.at(-1),space);
 assert.equal(result.themes.find(t=>t.theme==='AI·반도체'),undefined);
 assert.deepEqual(result.themes.find(t=>t.theme==='로봇·자동화').etfs,
  THEME_NINE_R37_ROSTER[0].etfs);
 assert.deepEqual(result.themes.find(t=>t.theme==='바이오·신약').etfs,
  THEME_NINE_R37_ROSTER.at(-1).etfs);
 assert.equal(result.modelRevision,THEME_NINE_R37_VERSION);
});

test('already-public AI is upgraded at its existing index',async()=>{
 const expanded={...baseline,themes:[...baseline.themes.slice(0,8),
  {theme:'AI·반도체',etfs:['OLD'],score:50,history},...baseline.themes.slice(8)]};
 const result=await addVerifiedNineR37(db(ready),expanded,{now});
 assert.equal(result.themes.length,11);
 assert.equal(result.themes[8].theme,'AI·반도체');
 assert.deepEqual(result.themes[8].etfs,THEME_NINE_R37_ROSTER[7].etfs);
});

test('provisional overlay preserves the ten-theme public scores including optional themes',async()=>{
 const baseScores=Object.fromEntries(baseline.themes.map(t=>[t.theme,47]));
 const publicBase={...baseline,phase:'PROVISIONAL',
  provisional:{asOf:'2026-10-26',points:[
   {date:'2026-10-26',scores:baseScores}]}};
 const upgradedScores=Object.fromEntries(THEME_NINE_R37_ROSTER.map(t=>[t.theme,63]));
 const provisionalReady={...ready,phase:'PROVISIONAL',
  provisional:{asOf:'2026-10-26',points:[
   {date:'2026-10-26',scores:upgradedScores}]}};
 const result=await addVerifiedNineR37(db(provisionalReady),publicBase,{now});
 const scores=result.provisional.points[0].scores;
 assert.equal(result.themes.length,10);
 assert.deepEqual(Object.keys(scores).sort(),Object.keys(baseScores).sort());
 assert.equal(scores['로봇·자동화'],63);
 assert.equal(scores['바이오·신약'],63);
 assert.equal(scores['데이터센터·전력'],47);
 assert.equal(scores['우주·위성'],47);
 assert.equal(scores['AI·반도체'],undefined);
});

test('missing, unauthorized and malformed new feeds leave the old feed untouched',async()=>{
 assert.equal(await addVerifiedNineR37(db(null),baseline,{now}),baseline);
 assert.equal(await addVerifiedNineR37(db({...ready,derivedLicenseVerified:false}),baseline,{now}),baseline);
 assert.equal(await addVerifiedNineR37(db({...ready,uniqueETFs:62}),baseline,{now}),baseline);
 assert.equal(eligibleNineR37({...ready,sourcePriceMode:'UNDECLARED'},baseline,{now,storedAt:now-1000}),false);
});

test('explicit anonymous-derived-work publisher acceptance is a separate, disclosed path',async()=>{
 const consent={...ready,upstreamCommercialRightsVerified:false,
  derivedLicenseVerified:false,sourcePriceReconciled:false,
  accountGoodStandingVerified:false,anonymousScopeIndependentlyConfirmed:false,
  licensingRiskAcceptedByPublisher:true,
  rightsBasis:'OFFICIAL_TERMS_DERIVED_WORKS_ANONYMOUS_SCOPE_UNCONFIRMED',
  sourceTermsUrl:'https://getmarkethistory.com/docs/terms'};
 assert.equal(eligibleNineR37(consent,baseline,{now,storedAt:now-1000}),true);
 const upgraded=await addVerifiedNineR37(db(consent),baseline,{now});
 assert.equal(upgraded.themes.length,10);
 assert.equal(upgraded.themes[0].etfs[0],'BOTZ');
 for(const altered of [
  {licensingRiskAcceptedByPublisher:false},
  {rightsBasis:'MADE_UP'},
  {sourceTermsUrl:'https://example.org'},
  {accountGoodStandingVerified:true},
  {anonymousScopeIndependentlyConfirmed:true},
  {derivedLicenseVerified:true},
  {sourceManifestVerified:false},
  {privateReplayVerified:false},
  {publicationAuthorized:false},
  {derivedOnlyNoRaw:false},
 ]){
  assert.equal(eligibleNineR37({...consent,...altered},baseline,
   {now,storedAt:now-1000}),false,JSON.stringify(altered));
 }
});

test('the public first provisional day may equal the confirmed anchor',async()=>{
 const two=[{date:'2026-10-23',scores:Object.fromEntries(
  THEME_NINE_R37_ROSTER.map(t=>[t.theme,50]))},
  {date:'2026-10-26',scores:Object.fromEntries(
   THEME_NINE_R37_ROSTER.map(t=>[t.theme,55]))}];
 const base2={...baseline,phase:'PROVISIONAL',
  provisional:{asOf:'2026-10-26',points:two}};
 const rec2={...ready,phase:'PROVISIONAL',
  provisional:{asOf:'2026-10-26',points:two}};
 assert.equal(eligibleNineR37(rec2,base2,{now,storedAt:now-1000}),true);
 const result=await addVerifiedNineR37(db(rec2),base2,{now});
 assert.deepEqual(result.provisional.points.map(p=>p.date),
  ['2026-10-23','2026-10-26']);
});

test('a newer legacy writer cannot revert a valid R32 publication to the old formula or relabel its date',async()=>{
 const newBase={...baseline,observationDate:'2026-10-26',confirmedObservationDate:'2026-10-26',
  themes:baseline.themes.map(t=>({...t,history:t.history.map((p,i)=>i===251?{...p,date:'2026-10-26'}:p)}))};
 const result=await addVerifiedNineR37(db(ready),newBase,{now});
 assert.equal(result.modelRevision,THEME_NINE_R37_VERSION);
 assert.equal(result.methodologyVersion,THEME_NINE_R37_METHOD);
 assert.equal(result.confirmedObservationDate,'2026-10-23');
 assert.equal(result.themes[0].history.at(-1).date,'2026-10-23');
 assert.deepEqual(result.themes[0].etfs,THEME_NINE_R37_ROSTER[0].etfs);
 assert.deepEqual(result.themes.at(-2),newBase.themes.at(-2));
 assert.deepEqual(result.themes.at(-1),newBase.themes.at(-1));
 // Strict publisher validation still requires current-day alignment.
 assert.equal(eligibleNineR37(ready,newBase,{now,storedAt:now-1000}),false);
});

test('independent R32 anchor still rejects forged future dates, broken histories and missing approval',async()=>{
 for(const edit of [{observationDate:'2026-10-28'},
  {publicationAuthorized:false},{sourceManifestVerified:false},
  {privateReplayVerified:false},{themes:ready.themes.map((t,i)=>i? t:{...t,history:t.history.slice(1)})}]){
  assert.equal(await addVerifiedNineR37(db({...ready,...edit}),baseline,{now}),baseline);
 }
});

test('publication-base read skips only R32 while ordinary requests still use approved R32',async()=>{
 const seed={version:THEME_ETF_ONLY_PUBLIC_VERSION,status:'READY',methodologyVersion:THEME_ETF_ONLY_METHOD,
  publicationAuthorized:true,upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,individualStocksUsed:0,
  scoreMethod:'ETF_ONLY_PROXY',sourcePriceMode:'UNADJUSTED_HOURLY_CLOSE_PROXY_DISCLOSED',
  weights:{trend:.4,relativeStrength:.2,volatility:.4},pairWeight:.5,
  sourceVersion:'seed',sourceStoredAt:ready.sourceStoredAt,publishedAt:ready.publishedAt,
  observationDate:ready.observationDate,themes:baseline.themes.slice(0,7).map((t,i)=>({...t,etfs:THEME_NINE_R37_ROSTER[i].etfs.slice(0,2),latestScore:50}))};
 let r32Reads=0;
 const source={prepare(sql){return {bind(key){return {async first(){
  if(sql.includes('market_public_snapshots_v1')&&key===THEME_ETF_ONLY_PUBLIC_KEY)return {body:JSON.stringify(seed),stored_at:now-1000};
  if(key===THEME_NINE_R37_KEY){r32Reads++;return {body:JSON.stringify(ready),stored_at:now-1000};}
  return null;
 }}}}}};
 const reference=await(await readThemeEtfOnly(source,{now,includeNineR37:false})).json();
 assert.equal(reference.methodologyVersion,THEME_ETF_ONLY_METHOD);assert.equal(r32Reads,0);
 const visible=await(await readThemeEtfOnly(source,{now})).json();
 assert.equal(visible.modelRevision,THEME_NINE_R37_VERSION);assert.equal(r32Reads,1);
 assert.deepEqual(visible.themes[0].etfs,THEME_NINE_R37_ROSTER[0].etfs);
});
