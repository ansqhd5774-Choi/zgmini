import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {RELEASE_SOURCES} from '../lib/release-calendar.mjs';
import {buildEconomicModelInputCensus} from '../scripts/audit-market-calendar-economic-inputs.mjs';
import {buildSourceLinkRegistry,describeOfficialCalendarCoverage} from '../lib/market-calendar-source-links.mjs';
import {classifyEconomicModelInput} from '../lib/market-calendar-source-classifier.mjs';
import {ECONOMIC_INPUT_SOURCE_KEYS,ECONOMIC_INPUT_SOURCE_MANIFEST_SHA256,
 ECONOMIC_CALENDAR_SOURCE_REGISTRY} from '../lib/market-calendar-economic-input-index.mjs';

test('current source contracts reproduce all 293 appearances and 283 unique model inputs',()=>{
 const fresh=buildEconomicModelInputCensus();
 assert.equal(fresh.appearances,293);
 assert.equal(fresh.uniqueCount,283);
 assert.equal(fresh.duplicateAppearances,10);
 assert.equal(fresh.manifestSha256,ECONOMIC_INPUT_SOURCE_MANIFEST_SHA256);
 assert.equal(ECONOMIC_INPUT_SOURCE_KEYS.length,283);
 const snapshot=ECONOMIC_INPUT_SOURCE_KEYS.map(([provider,sourceId,geography,kind,usedByDomains])=>
  ({provider,sourceId,geography,kind,usedByDomains}));
 assert.deepEqual(snapshot,fresh.unique);
 assert.equal(createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),fresh.manifestSha256);
});

test('all registered economic model inputs receive one explicit eligibility class',()=>{
 const rows=ECONOMIC_INPUT_SOURCE_KEYS.flatMap(([provider,sourceId,geography,kind,domains])=>{
  const origin=kind==='PROVIDER_SERIES'?'RAW_SERIES':kind==='PROVIDER_FIELD'?'API_FIELD':'DERIVED_SIGNAL';
  return domains.map(area=>({area,provider,sourceId,geography,origin,
   ...classifyEconomicModelInput({provider,sourceId,kind})}));
 });
 const r=buildSourceLinkRegistry(rows,{releaseSources:RELEASE_SOURCES});
 assert.equal(r.occurrenceCount,293);
 assert.equal(r.uniqueInputCount,283);
 assert.equal(r.duplicateOccurrences,10);
 assert.deepEqual(r.byOrigin,{RAW_SERIES:276,API_FIELD:3,DERIVED_SIGNAL:4});
 assert.deepEqual(r.byEligibility,{OFFICIAL_RELEASE:186,CADENCE_POLICY:72,
  MARKET_DAILY:21,UNSCHEDULED:4,VARIABLE:0});
 assert.equal(ECONOMIC_CALENDAR_SOURCE_REGISTRY.uniqueInputCount,r.uniqueInputCount);
});

test('identical official releases may serve multiple inputs without manufacturing events',()=>{
 const r=ECONOMIC_CALENDAR_SOURCE_REGISTRY;
 const all=[
  {id:'employment',source:'bls',date:'2027-01-08',title:'Employment Situation',sourceUrl:'https://www.bls.gov/schedule/'},
  {id:'bls-business-employment-dynamics',source:'bls',date:'2027-01-29',title:'Business Employment Dynamics',sourceUrl:'https://www.bls.gov/'},
  {id:'census-business-formation-statistics-december-2026',source:'census',date:'2027-01-13',title:'Business Formation Statistics',sourceUrl:'https://www.census.gov/'},
 ];
 const before=JSON.stringify(all);
 const x=describeOfficialCalendarCoverage(r,{events:all},{today:'2027-01-01'});
 assert.equal(x.totalInputs,283);
 assert.ok(x.officialWithPublishedEvent>100); // BED has 114 input keys on one event.
 assert.ok(x.officialAwaitingPublishedEvent>0);
 assert.equal(x.syntheticEventsCreated,0);
 assert.equal(JSON.stringify(all),before);
});

test('unannounced state/metro 2027 releases are never promoted to confirmed dates',()=>{
 const r=ECONOMIC_CALENDAR_SOURCE_REGISTRY;
 const onlyBed=[{id:'bls-business-employment-dynamics',source:'bls',date:'2027-06-01'}];
 const x=describeOfficialCalendarCoverage(r,{events:onlyBed},{today:'2027-01-01'});
 assert.ok(x.officialWithPublishedEvent< x.officialEligible);
 assert.equal(x.syntheticEventsCreated,0);
});
