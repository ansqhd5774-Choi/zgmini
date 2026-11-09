import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPrivateTenConfirmedSeedReferenceShadow as shadow}
 from '../worker/theme-ten-confirmed-seed-reference-shadow.mjs';
import {THEME_NINE_R37_ROSTER,THEME_NINE_R37_KEY,THEME_NINE_R37_METHOD,
 THEME_NINE_R37_VERSION,THEME_NINE_R37_ROSTER_SHA}
 from '../worker/theme-nine-r37-public.mjs';
import {DC_POWER_PUBLIC_KEY,DC_POWER_PUBLIC_VERSION}
 from '../worker/theme-data-center-power-r1.mjs';
import {SPACE_SATELLITE_R2_PUBLIC_KEY,SPACE_SATELLITE_R2_PUBLIC_VERSION,
 SPACE_SATELLITE_R2_PUBLIC_METHOD,SPACE_SATELLITE_R2_HISTORY_MODE,
 SPACE_SATELLITE_R2_SINGLE_POLICY}
 from '../worker/theme-space-satellite-r2.mjs';

const now=Date.parse('2026-11-09T12:00:00Z');
const time='2026-11-09T08:00:00Z';
const oldDate='2026-10-20';
const date='2026-11-07';
const sha='a'.repeat(64);
const dates=(last)=>Array.from({length:252},(_,i)=>
 new Date(Date.parse(last+'T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
const history=(last)=>dates(last).map(d=>({date:d,score:50}));
const expected=[...THEME_NINE_R37_ROSTER.filter(t=>t.theme!=='AI·반도체')
 .map(t=>t.theme),'데이터센터·전력','우주·위성'];

function makeRecords(){
 const oldHistory=history(oldDate),freshHistory=history(date);
 const seed={status:'READY',version:'VALIDATED_SEED_TEST_REFERENCE',
  observationDate:oldDate,
  themes:THEME_NINE_R37_ROSTER.slice(0,7).map(t=>
   ({theme:t.theme,latestScore:1,history:oldHistory}))};
 const aum=Object.fromEntries([...new Set(THEME_NINE_R37_ROSTER.flatMap(t=>t.etfs))]
  .map(s=>[s,'2026-10-19']));
 const r37={status:'READY',version:THEME_NINE_R37_VERSION,
  methodologyVersion:THEME_NINE_R37_METHOD,
  sourceContract:'THEME_NINE_R32_PRIVATE_STAGE5_SHADOW_V1',
  sourcePriceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
  historicalAumMode:'FIXED_OFFICIAL_ISSUER_AUM_SNAPSHOT_WITH_ORIGINAL_DATES',
  rosterSha256:THEME_NINE_R37_ROSTER_SHA,benchmark:'SPY',
  individualStocksUsed:0,ETFPositions:64,uniqueETFs:63,
  publicationAuthorized:true,derivedOnlyNoRaw:true,sourceManifestVerified:true,
  privateReplayVerified:true,upstreamCommercialRightsVerified:true,
  derivedLicenseVerified:true,sourcePriceReconciled:true,
  rawManifestSha256:sha,r25InputSha256:sha,shadowSha256:sha,
  officialAumEvidenceSha256:sha,officialAumAsOf:aum,
  phase:'CONFIRMED',observationDate:date,
  sourceStoredAt:time,publishedAt:time,sourceVersion:'R37_SOURCE_PROOF',
  provisional:{points:[]},
  themes:THEME_NINE_R37_ROSTER.map(t=>({theme:t.theme,etfs:t.etfs,
   score:50,history:freshHistory.map(x=>({...x}))}))};
 const dc={status:'READY',version:DC_POWER_PUBLIC_VERSION,
  theme:'데이터센터·전력',etfs:['DTCR','GRID'],referenceSymbol:'SPY',
  methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',
  scoreMethod:'ETF_ONLY_PROXY',individualStocksUsed:0,
  sourcePriceMode:'UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12',
  phase:'CONFIRMED',provisional:{points:[]},
  accountGoodStandingVerified:true,upstreamCommercialRightsVerified:true,
  derivedLicenseVerified:true,publicationAuthorized:true,
  derivedOnlyNoRaw:true,localBarsVerified:true,
  sourceTermsUrl:'https://getmarkethistory.com/docs/terms',
  sourceStoredAtKind:'VERIFIED_LOCAL_MARKET_BARS',
  sourceTimestampBasis:'MANIFEST_GET_REQUEST_AT',
  sourceVersion:'GMH_MANIFEST_SHA256_'+sha,
  candidateFileSha256:sha,sourceStoredAt:time,publishedAt:time,asOf:time,
  observationDate:date,score:50,history:freshHistory.map(x=>({...x}))};
 const space={status:'READY',version:SPACE_SATELLITE_R2_PUBLIC_VERSION,
  theme:'우주·위성',etfs:['UFO','NASA','WARP','ROKT'],
  referenceSymbol:'SPY',methodologyVersion:SPACE_SATELLITE_R2_PUBLIC_METHOD,
  weighting:'APPROVED_NORMALIZED_CURRENT_ISSUER_AUM_FOR_THREE_PLUS',
  historicalWeightMode:SPACE_SATELLITE_R2_HISTORY_MODE,
  historyFallbackPolicy:SPACE_SATELLITE_R2_SINGLE_POLICY,
  sourcePriceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
  individualStocksUsed:0,publicationAuthorized:true,approvedBasket:true,
  derivedOnlyNoRaw:true,priceManifestShaVerified:true,
  phase:'CONFIRMED',provisional:{points:[]},
  sourceVersion:'GMH_MANIFEST_SHA256_'+sha+'_SPY_SHA256_'+sha,
  candidateFileSha256:sha,sourceStoredAt:time,publishedAt:time,
  observationDate:date,score:50,
  history:freshHistory.map(x=>({...x})),scoredDays:252,
  aumAsOf:{UFO:'2026-10-19',NASA:'2026-10-19',WARP:'2026-10-19',ROKT:'2026-10-19'}};
 return {seed,r37,dc,space};
}
function fakeDb(records){
 const rows=new Map([
  ['public:theme-etf-only:r1',records.seed],
  [THEME_NINE_R37_KEY,records.r37],
  [DC_POWER_PUBLIC_KEY,records.dc],
  [SPACE_SATELLITE_R2_PUBLIC_KEY,records.space],
 ]);
 const calls=[];
 const db={prepare(sql){
  assert.match(sql,/^SELECT body,stored_at FROM (market_public_snapshots_v1|public_feed_snapshots_v1)/);
  return {bind(key){return {first:async()=>{
   calls.push(key);const record=rows.get(key);
   return record?{body:JSON.stringify(record),stored_at:now-4000}:null;
  }}}};
 },run(){throw Error('D1 write forbidden');},exec(){throw Error('D1 write forbidden');}};
 return {db,calls};
}
const validator=seed=>seed.status==='READY'&&
 seed.version==='VALIDATED_SEED_TEST_REFERENCE'&&seed.themes?.length===7;
const run=(records,other={})=>{
 const {db,calls}=fakeDb(records);
 return {promise:shadow(db,{now,validateLegacySeed:validator,...other}),calls};
};

test('fresh real-R37 + DC + R2-space guards yield exactly 8+2 PRIVATE confirmed',async()=>{
 const {promise,calls}=run(makeRecords());const result=await promise;
 assert.equal(result.status,'PRIVATE_CONFIRMED_SHADOW_VALIDATED_NOT_PUBLIC_READY');
 assert.equal(result.publicReady,false);
 assert.equal(result.themes.length,10);
 assert.deepEqual(result.themes.map(t=>t.theme),expected);
 assert.equal(result.providerCalls,0);assert.equal(result.d1Writes,0);
 assert.equal(result.schedulerWrites,0);
 assert.equal(calls.length,4);
});

test('outdated seven-seed score is never returned, and AI research name stays hidden',async()=>{
 const result=await run(makeRecords()).promise;
 assert.equal(result.themes[0].score,50);
 assert.equal(result.themes[0].history.at(-1).date,date);
 assert.ok(!result.themes.some(t=>t.theme==='AI·반도체'));
 assert.notEqual(result.observationDate,oldDate);
});

test('missing legacy validator blocks before any D1 reads',async()=>{
 const {db,calls}=fakeDb(makeRecords());
 const result=await shadow(db,{now});
 assert.equal(result.reason,'LEGACY_SEED_VALIDATOR_REQUIRED');
 assert.equal(calls.length,0);
});

test('seed absent or seed validator rejects: no public candidate',async()=>{
 const missing=makeRecords();missing.seed=null;
 assert.equal((await run(missing).promise).reason,'LEGACY_SEED_REFERENCE_UNAVAILABLE');
 const rejected=await run(makeRecords(),{validateLegacySeed:()=>false}).promise;
 assert.equal(rejected.reason,'LEGACY_SEED_REFERENCE_UNAVAILABLE');
 const thrown=await run(makeRecords(),{validateLegacySeed:()=>{throw Error('redacted');}}).promise;
 assert.equal(thrown.reason,'LEGACY_SEED_REFERENCE_UNAVAILABLE');
});

test('R37 confirmed feed absent or provisional: no 8+2 candidate',async()=>{
 const missing=makeRecords();missing.r37=null;
 assert.equal((await run(missing).promise).reason,'R37_CONFIRMED_NOT_ELIGIBLE');
 const wrong=makeRecords();wrong.r37.phase='PROVISIONAL';
 assert.equal((await run(wrong).promise).reason,'R37_CONFIRMED_NOT_ELIGIBLE');
});

test('R37 source rights/AUM/last score tampering must fail production validator',async()=>{
 for(const edit of [
  r=>r.publicationAuthorized=false,
  r=>r.officialAumEvidenceSha256='INVALID',
  r=>r.themes[0].history.at(-1).score=49,
 ]){
  const records=makeRecords();edit(records.r37);
  assert.equal((await run(records).promise).reason,'R37_CONFIRMED_NOT_ELIGIBLE');
 }
});

test('R37 future/stale stored times never pass',async()=>{
 const future=makeRecords();future.r37.sourceStoredAt='2026-11-10T00:00:00Z';
 assert.equal((await run(future).promise).reason,'R37_CONFIRMED_NOT_ELIGIBLE');
 const old=makeRecords();old.r37.publishedAt='2026-10-20T00:00:00Z';
 assert.equal((await run(old).promise).reason,'R37_CONFIRMED_NOT_ELIGIBLE');
});

test('missing DC and invalid/null DC score both block complete ten',async()=>{
 const missing=makeRecords();missing.dc=null;
 assert.equal((await run(missing).promise).reason,'DC_CONFIRMED_NOT_ELIGIBLE');
 const invalid=makeRecords();invalid.dc.history[10].score=null;
 assert.equal((await run(invalid).promise).reason,'DC_CONFIRMED_NOT_ELIGIBLE');
});

test('missing R2 and no R1 space blocks complete ten',async()=>{
 const missing=makeRecords();missing.space=null;
 assert.equal((await run(missing).promise).reason,'SPACE_CONFIRMED_NOT_ELIGIBLE');
});

test('R2 space allows partial-null history with true scoredDays count',async()=>{
 const records=makeRecords();records.space.history[40].score=null;
 records.space.scoredDays=251;
 const result=await run(records).promise;
 assert.equal(result.status,'PRIVATE_CONFIRMED_SHADOW_VALIDATED_NOT_PUBLIC_READY');
 assert.equal(result.themes.at(-1).history[40].score,null);
});

test('R2 invalid rights/source manifest rejects complete ten',async()=>{
 const records=makeRecords();records.space.priceManifestShaVerified=false;
 assert.equal((await run(records).promise).reason,'SPACE_CONFIRMED_NOT_ELIGIBLE');
});

test('old but overlapping DC/space dates are marked delayed, never relabeled',async()=>{
 const records=makeRecords();
 for(const feed of [records.dc,records.space]){
  feed.observationDate='2026-11-06';feed.history=history('2026-11-06');
 }
 const result=await run(records).promise;
 assert.equal(result.status,'PRIVATE_CONFIRMED_SHADOW_VALIDATED_NOT_PUBLIC_READY');
 assert.equal(result.themes.at(-2).observationDate,'2026-11-06');
 assert.equal(result.themes.at(-2).delayed,true);
 assert.equal(result.themes.at(-1).observationDate,'2026-11-06');
 assert.equal(result.themes.at(-1).delayed,true);
});
