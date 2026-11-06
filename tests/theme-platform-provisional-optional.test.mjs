import test from 'node:test';
import assert from 'node:assert/strict';
import {createVerifiedOptionalProvisionalCalculator} from
 '../scripts/pc-writer/theme-platform-provisional-optional.mjs';
import {planOperationalBatch} from '../scripts/pc-writer/theme-platform-operational.mjs';
import {identity} from '../scripts/pc-writer/theme-platform.mjs';
import {DC_POWER_PUBLIC_VERSION} from '../worker/theme-data-center-power-r1.mjs';
import {DC_POWER_PROVISIONAL_VERSION,DC_POWER_PROVISIONAL_PRICE_MODE} from
 '../worker/theme-data-center-power-provisional-r1.mjs';
import {SPACE_SATELLITE_R2_PUBLIC_VERSION} from '../worker/theme-space-satellite-r2.mjs';
import {SPACE_PROVISIONAL_VERSION,SPACE_PROVISIONAL_PRICE_MODE} from
 '../worker/theme-space-satellite-provisional-r1.mjs';

const now=new Date('2026-10-31T12:00:00Z');
const asOf='2026-10-30T12:00:00.000Z',storedAt=Date.parse('2026-10-30T12:30:00Z');
const storedSourceAt='2026-10-29T10:00:00Z',base='2026-10-28';
const themes=planOperationalBatch().registry.themes;
const hist=Array.from({length:251},(_,i)=>({
 date:new Date(Date.UTC(2026,0,1)+i*86400000).toISOString().slice(0,10),score:45}));
hist.push({date:base,score:50});

function fixture(group){
 const theme=themes.find(t=>t.operational.family===group),isDc=group==='data-center';
 const etfs=isDc?['DTCR','GRID']:['UFO','NASA','WARP','ROKT'];
 const confirmed={status:'READY',version:isDc?DC_POWER_PUBLIC_VERSION:SPACE_SATELLITE_R2_PUBLIC_VERSION,
  phase:'CONFIRMED',theme:theme.label,etfs,referenceSymbol:'SPY',
  methodologyVersion:theme.methodologyVersion,observationDate:base,score:50,
  sourceVersion:'GMH_MANIFEST_SHA256_'+'a'.repeat(64)+
   (isDc?'':'_SPY_SHA256_'+'e'.repeat(64)),
  licensingRiskAcceptedByPublisher:true,history:structuredClone(hist)};
 const point=isDc?{date:'2026-10-29',score:55,etfs}:
  {date:'2026-10-29',score:55,etfs:['UFO','NASA','ROKT'],
   weightsPercent:{UFO:40,NASA:30,ROKT:30}};
 const record={status:'READY',phase:'PROVISIONAL',
  version:isDc?DC_POWER_PROVISIONAL_VERSION:SPACE_PROVISIONAL_VERSION,
  theme:theme.label,referenceSymbol:'SPY',methodologyVersion:theme.methodologyVersion,
  individualStocksUsed:0,publicationAuthorized:true,derivedOnlyNoRaw:true,
  upstreamCommercialRightsVerified:false,derivedLicenseVerified:false,
  sourcePriceReconciled:false,
  sourcePriceMode:isDc?DC_POWER_PROVISIONAL_PRICE_MODE:SPACE_PROVISIONAL_PRICE_MODE,
  sourceName:'MARKETPARQUET_ALREADY_STORED_SEVEN_THEME_ARCHIVE',
  sourceVersion:(isDc?'DC_POWER_R8_':'SPACE_R8_')+'b'.repeat(64),
  sourceStoredAt:storedSourceAt,asOf,confirmedObservationDate:base,
  confirmedScore:50,observationDate:point.date,points:[point],
  sourceFiles:[{date:base,sha256:'c'.repeat(64)},{date:point.date,sha256:'d'.repeat(64)}]};
 if(isDc){
  Object.assign(record,{etfs,licensingRiskAcceptedByPublisher:true,
   overlapPriceDifferences:{DTCR:.01,GRID:.02,SPY:.01}});
 }else{
  Object.assign(record,{approvedBasket:true,aumAsOf:Object.fromEntries(etfs.map(s=>[s,base])),
   overlapPriceDifferences:{UFO:.01,NASA:.02,ROKT:.01,SPY:.01}});
 }
 const sourceVersion=isDc?confirmed.sourceVersion:identity({
  spaceManifestSha256:'a'.repeat(64),sharedSpyManifestSha256:'e'.repeat(64)});
 return {theme,confirmed,record,confirmedResult:{rows:[{
  label:theme.label,sourceVersion,observationDate:base,score:50,
  history:structuredClone(hist)}]}};
}

for(const group of ['data-center','space']){
 test(group+' provisional replays an actual published D1 record without writes',async()=>{
  const {theme,confirmed,record,confirmedResult}=fixture(group),reads=[];
  let builds=0;
  const readFeed=async key=>{reads.push(key);return {body:
   key===theme.operational.physicalFeeds.confirmed?confirmed:record,storedAt};};
  const build=async({dataRoot,confirmed:input,now:at})=>{
   builds++;assert.equal(dataRoot,'fixture');assert.equal(input,confirmed);
   assert.equal(at,Date.parse(record.asOf));
   return {status:'PRIVATE_PROVISIONAL_CANDIDATE',record};
  };
  const calculate=createVerifiedOptionalProvisionalCalculator({readFeed,now,
   buildDc:build,buildSpace:build});
  const answer=await calculate({dataRoot:'fixture',theme,group,confirmedResult});
  assert.equal(answer.artifactSha256.length,64);
  assert.equal(answer.rows.length,1);
  assert.deepEqual(answer.rows[0].etfs,theme.etfs);
  assert.equal(answer.rows[0].observationDate,record.observationDate);
  assert.equal(answer.rows[0].sourceVersion,record.sourceVersion);
  assert.equal(answer.currentVisibility,'READY');
  assert.deepEqual(reads,[theme.operational.physicalFeeds.confirmed,
   theme.operational.physicalFeeds.provisional]);
  assert.equal(builds,1);
 });
}

for(const group of ['data-center','space']){
 test(group+' old D1 result replays exactly but is not currently displayable',async()=>{
  const {theme,confirmed,record,confirmedResult}=fixture(group);
  const calculate=createVerifiedOptionalProvisionalCalculator({
   now:new Date('2026-11-20T12:00:00Z'),
   readFeed:async key=>({body:key===theme.operational.physicalFeeds.confirmed?
    confirmed:record,storedAt}),
   buildDc:async()=>({status:'PRIVATE_PROVISIONAL_CANDIDATE',record}),
   buildSpace:async()=>({status:'PRIVATE_PROVISIONAL_CANDIDATE',record})});
  const answer=await calculate({dataRoot:'fixture',theme,group,confirmedResult});
  assert.equal(answer.rows.length,1);
  assert.equal(answer.currentVisibility,'STALE');
  assert.equal(answer.historicalReaderContract,'VALID_AT_PUBLISHED_TIME');
 });
}

test('missing actual D1 provisional base fails closed before local replay',async()=>{
 const {theme,confirmed,confirmedResult}=fixture('data-center');let builds=0;
 const calculate=createVerifiedOptionalProvisionalCalculator({now,
  readFeed:async key=>key===theme.operational.physicalFeeds.confirmed?
   {body:confirmed,storedAt}:null,
  buildDc:async()=>{builds++;return null;}});
 await assert.rejects(calculate({dataRoot:'fixture',theme,group:'data-center',confirmedResult}),
  /THEME_OPTIONAL_PROVISIONAL_D1_MISSING/);
 assert.equal(builds,0);
});

test('different published and replayed provisional sources cannot be marked VERIFIED',async()=>{
 const {theme,confirmed,record,confirmedResult}=fixture('data-center');
 const calculate=createVerifiedOptionalProvisionalCalculator({now,
  readFeed:async key=>({body:key===theme.operational.physicalFeeds.confirmed?
   confirmed:record,storedAt}),
  buildDc:async()=>({status:'PRIVATE_PROVISIONAL_CANDIDATE',
   record:{...record,sourceVersion:'DC_POWER_R8_'+'f'.repeat(64)}})});
 await assert.rejects(calculate({dataRoot:'fixture',theme,group:'data-center',confirmedResult}),
  /THEME_OPTIONAL_PROVISIONAL_D1_REPLAY_MISMATCH/);
});

test('stale D1 stored_at cannot pass the existing public Reader validator',async()=>{
 const {theme,confirmed,record,confirmedResult}=fixture('space');
 const calculate=createVerifiedOptionalProvisionalCalculator({now,
  readFeed:async key=>({body:key===theme.operational.physicalFeeds.confirmed?
   confirmed:record,storedAt:Date.parse('2026-01-01T00:00:00Z')}),
  buildSpace:async()=>({status:'PRIVATE_PROVISIONAL_CANDIDATE',record})});
 await assert.rejects(calculate({dataRoot:'fixture',theme,group:'space',confirmedResult}),
  /THEME_OPTIONAL_PUBLIC_READER_REJECTED/);
});

test('confirmed source lineage cannot differ from the stored calculator evidence',async()=>{
 const {theme,confirmed,record,confirmedResult}=fixture('space');
 confirmed.sourceVersion=confirmed.sourceVersion.replace('_SPY_SHA256_'+'e'.repeat(64),
  '_SPY_SHA256_'+'f'.repeat(64));
 const calculate=createVerifiedOptionalProvisionalCalculator({now,
  readFeed:async key=>({body:key===theme.operational.physicalFeeds.confirmed?
   confirmed:record,storedAt}),
  buildSpace:async()=>({status:'PRIVATE_PROVISIONAL_CANDIDATE',record})});
 await assert.rejects(calculate({dataRoot:'fixture',theme,group:'space',confirmedResult}),
  /THEME_OPTIONAL_STORED_CONFIRMED_NOT_EQUAL_D1/);
});
