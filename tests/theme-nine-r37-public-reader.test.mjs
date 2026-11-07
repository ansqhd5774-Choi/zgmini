import test from 'node:test';
import assert from 'node:assert/strict';
import {readThemeEtfOnly,THEME_ETF_ONLY_PAIRS,THEME_ETF_ONLY_PUBLIC_KEY,THEME_ETF_ONLY_PUBLIC_VERSION,THEME_ETF_ONLY_METHOD} from '../worker/theme-etf-only-public.mjs';
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

test('expired L7 cannot hide independently fresh R37 confirmed themes',async()=>{
 const oldDay='2026-10-12';
 const oldDates=Array.from({length:252},(_,i)=>
  new Date(Date.parse(oldDay+'T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
 const seed={status:'READY',version:THEME_ETF_ONLY_PUBLIC_VERSION,
  methodologyVersion:THEME_ETF_ONLY_METHOD,publicationAuthorized:true,
  upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,
  individualStocksUsed:0,scoreMethod:'ETF_ONLY_PROXY',
  sourcePriceMode:'UNADJUSTED_HOURLY_CLOSE_PROXY_DISCLOSED',
  weights:{trend:.4,relativeStrength:.2,volatility:.4},pairWeight:.5,
  sourceVersion:'VERIFIED_LEGACY',sourceStoredAt:'2026-10-13T00:00:00Z',
  publishedAt:'2026-10-13T00:00:00Z',observationDate:oldDay,
  themes:THEME_ETF_ONLY_PAIRS.map(t=>({...t,latestScore:40,
   history:oldDates.map(date=>({date,score:40}))}))};
 const source=(r37,{storedAt=now-1000}={})=>({prepare(sql){return {bind(key){return {async first(){
  if(sql.includes('market_public_snapshots_v1'))return {body:JSON.stringify(seed),stored_at:now-1000};
  if(key===THEME_NINE_R37_KEY)return {body:JSON.stringify(r37),stored_at:storedAt};
  return null;
 }};}};}});
 const response=await readThemeEtfOnly(source(ready),{now});
 assert.equal(response.status,200);
 const publicFeed=await response.json();
 assert.equal(publicFeed.status,'READY');
 assert.equal(publicFeed.phase,'CONFIRMED');
 assert.equal(publicFeed.modelRevision,THEME_NINE_R37_VERSION);
 assert.equal(publicFeed.methodologyVersion,THEME_NINE_R37_METHOD);
 assert.equal(publicFeed.themes.length,8);
 assert.equal(publicFeed.themes.find(t=>t.theme==='AI·반도체'),undefined);
 assert.equal(publicFeed.themes[0].history.length,252);
 assert.deepEqual(publicFeed.themes[0].etfs,THEME_NINE_R37_ROSTER[0].etfs);
 assert.equal(publicFeed.provisional.points.length,0);
 // Existing R54 publication-base callers must not silently switch methods.
 const publicationBase=await readThemeEtfOnly(source(ready),{now,includeNineR37:false});
 assert.equal(publicationBase.status,503);
 assert.equal((await publicationBase.json()).reason,'STORED_DATA_STALE');
 // Invalid/expired/unauthorized R37 must never relabel an expired L7 as fresh.
 for(const candidate of [
  source(ready,{storedAt:now-9*86400000}),
  source({...ready,publicationAuthorized:false}),
  source({...ready,rosterSha256:'0'.repeat(64)}),
 ]){
  const rejected=await readThemeEtfOnly(candidate,{now});
  assert.equal(rejected.status,503);
  assert.equal((await rejected.json()).reason,'STORED_DATA_STALE');
 }
});

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

test('R54 new R37 anchor rechecks a newer biotech sidecar and keeps R32 methodology',async()=>{
 const earlierDates=Array.from({length:252},(_,i)=>
  new Date(Date.parse('2026-10-20T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
 const biotechDates=Array.from({length:252},(_,i)=>
  new Date(Date.parse('2026-10-21T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
 const legacy={status:'READY',version:THEME_ETF_ONLY_PUBLIC_VERSION,
  methodologyVersion:THEME_ETF_ONLY_METHOD,publicationAuthorized:true,
  upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,
  individualStocksUsed:0,scoreMethod:'ETF_ONLY_PROXY',
  sourcePriceMode:'UNADJUSTED_HOURLY_CLOSE_PROXY_DISCLOSED',
  weights:{trend:.4,relativeStrength:.2,volatility:.4},pairWeight:.5,
  sourceVersion:'VERIFIED_LEGACY',sourceStoredAt:'2026-10-27T00:00:00Z',
  publishedAt:'2026-10-27T00:00:00Z',observationDate:'2026-10-20',
  themes:THEME_ETF_ONLY_PAIRS.map(t=>({...t,latestScore:40,
   history:earlierDates.map(date=>({date,score:40}))}))};
 const biotech={status:'READY',version:'THEME_BIOTECH_GMH_CONTINUATION_R2_PUBLIC_V1',
  theme:'바이오테크',etfs:['IBB','XBI'],referenceSymbol:'SPY',
  methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',individualStocksUsed:0,
  scoreMethod:'ETF_ONLY_PROXY',
  sourcePriceMode:'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12',
  phase:'CONFIRMED',provisional:{points:[]},publicationAuthorized:true,
  localBarsVerified:true,derivedOnlyNoRaw:true,licensingRiskAcceptedByPublisher:true,
  anonymousScopeIndependentlyConfirmed:false,upstreamCommercialRightsVerified:false,
  derivedLicenseVerified:false,sourcePriceReconciled:false,
  fullHistoryIndependentlyReconciled:false,
  rightsBasis:'OFFICIAL_TERMS_DERIVED_WORKS_ANONYMOUS_SCOPE_UNCONFIRMED',
  sourceTermsUrl:'https://getmarkethistory.com/docs/terms',
  sourceStoredAtKind:'VERIFIED_LOCAL_MARKET_BARS',
  sourceTimestampBasis:'MANIFEST_GET_REQUEST_AT',
  sourceVersion:'GMH_MANIFEST_SHA256_'+sha,
  candidateRevisionId:'BIOTECH_CONFIRMED_CONTINUATION_R6_'+('a'.repeat(16)),
  candidateFileSha256:sha,sourceStoredAt:'2026-10-27T00:00:00Z',
  asOf:'2026-10-27T00:00:00Z',publishedAt:'2026-10-27T00:00:00Z',
  observationDate:'2026-10-21',score:36,
  history:biotechDates.map(date=>({date,score:36})),
  sourceLineage:{mode:'PRESERVED_OLD_PUBLISHED_SCORES_PLUS_NEW_GMH_CONFIRMED',
   previousPublicObservationDate:'2026-10-19',firstNewDate:'2026-10-20',
   newPrivateSourceVersion:'GMH_MANIFEST_SHA256_'+sha,
   sourceReceivedThrough:'2026-10-27T00:00:00Z'},
  reconciliation:{existingOverlappingDatesPreserved:250,newConfirmedDates:2}};
 const counts=new Map();
 let rejectSecondR37=false,r37Reads=0;
 const store={prepare(sql){return {bind(key){return {async first(){
  counts.set(key,(counts.get(key)??0)+1);
  if(sql.includes('market_public_snapshots_v1'))return {body:JSON.stringify(legacy),stored_at:now-1000};
  if(key===THEME_NINE_R37_KEY){
   r37Reads++;
   if(rejectSecondR37&&r37Reads===2)return null;
  }
  const value=key===THEME_NINE_R37_KEY?ready:key==='theme-biotech-optional-r2'?biotech:null;
  return value?{body:JSON.stringify(value),stored_at:now-1000}:null;
 }};}};}};
 const baselineResponse=await readThemeEtfOnly(store,{now,includeNineR37:false});
 const before=await baselineResponse.json();
 assert.equal(before.themes.length,7);
 const response=await readThemeEtfOnly(store,{now});
 const result=await response.json();
 assert.equal(response.status,200);
 assert.equal(result.confirmedObservationDate,'2026-10-23');
 assert.equal(result.themes.length,8);
 const added=result.themes.find(t=>t.theme==='바이오·신약');
 assert.equal(added?.score,50);
 assert.deepEqual(added.etfs,THEME_NINE_R37_ROSTER.at(-1).etfs);
 assert.equal(result.methodologyVersion,THEME_NINE_R37_METHOD);
 assert.equal(counts.get('theme-biotech-optional-r2'),3);
 rejectSecondR37=true;
 r37Reads=0;
 const failedReplay=await (await readThemeEtfOnly(store,{now})).json();
 assert.equal(failedReplay.themes.length,7);
 assert.equal(failedReplay.confirmedObservationDate,'2026-10-23');
 assert.deepEqual(failedReplay.themes[0].history.at(-1),{date:'2026-10-23',score:50});
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

test('an independently verified newer R32 date advances without rewriting the legacy anchor',async()=>{
 const newerDate='2026-10-26';
 const newer={...ready,observationDate:newerDate,
  themes:ready.themes.map(t=>({...t,history:t.history.map((p,i)=>
   i===251?{...p,date:newerDate}:p)}))};
 assert.equal(eligibleNineR37(newer,baseline,
  {now,storedAt:now-1000,independentAnchor:true}),true);
 assert.equal(eligibleNineR37(newer,baseline,
  {now,storedAt:now-1000}),false);
 const visible=await addVerifiedNineR37(db(newer),baseline,{now});
 assert.equal(visible.confirmedObservationDate,newerDate);
 assert.equal(visible.themes[0].history.at(-1).date,newerDate);
 assert.equal(visible.themes.length,10);
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
