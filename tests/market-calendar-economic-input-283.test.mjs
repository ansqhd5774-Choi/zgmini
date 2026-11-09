import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {RELEASE_SOURCES,parseReleaseCalendar} from '../lib/release-calendar.mjs';
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
 assert.ok(x.officialWithStoredEvent>100); // BED has 114 input keys on one event.
 assert.ok(x.officialWithoutStoredEvent>0);
 assert.equal(x.syntheticEventsCreated,0);
 assert.equal(JSON.stringify(all),before);
});

test('unannounced state/metro 2027 releases are never promoted to confirmed dates',()=>{
 const r=ECONOMIC_CALENDAR_SOURCE_REGISTRY;
 const onlyBed=[{id:'bls-business-employment-dynamics',source:'bls',date:'2027-06-01'}];
 const x=describeOfficialCalendarCoverage(r,{events:onlyBed},{today:'2027-01-01'});
 assert.ok(x.officialWithStoredEvent< x.officialEligible);
 assert.equal(x.syntheticEventsCreated,0);
});

test('BLS state and metro releases do not borrow the national employment date',()=>{
 const r=ECONOMIC_CALENDAR_SOURCE_REGISTRY;
 const state=r.entries.find(x=>x.provider==='BLS_CES_SAE'&&x.sourceId==='SMS00000000000000022');
 const metro=r.entries.find(x=>x.provider==='BLS_CES_SAE'&&x.sourceId==='SMS99999990000000022');
 assert.deepEqual(state.officialLinks,[{source:'bls',idPrefix:'bls-state-employment-and-unemployment'}]);
 assert.deepEqual(metro.officialLinks,[{source:'bls',idPrefix:'bls-metropolitan-area-employment-and-unemployment'}]);
 const x=describeOfficialCalendarCoverage(buildSourceLinkRegistry([
  ...[state,metro].map(({provider,sourceId,geography,origin,eligibility,officialLinks})=>({
   area:'employment',provider,sourceId,geography,origin,eligibility,officialLinks})),
 ]),{events:[{source:'bls',id:'employment',date:'2027-01-08'}]},{today:'2027-01-01'});
 assert.equal(x.officialWithStoredEvent,0);
});

test('source associations match the current BLS, BEA, Census, and Fed parser IDs',()=>{
 const ics=(title,date)=>`BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:${date.replaceAll('-','')}T083000\nSUMMARY:${title}\nEND:VEVENT\nEND:VCALENDAR`;
 const bls=[
  ...parseReleaseCalendar(ics('State Employment and Unemployment (Monthly)','2026-11-20'),'bls'),
  ...parseReleaseCalendar(ics('Metropolitan Area Employment and Unemployment (Monthly)','2026-12-02'),'bls'),
  ...parseReleaseCalendar(ics('Job Openings and Labor Turnover Survey','2026-11-03'),'bls'),
  ...parseReleaseCalendar(ics('Producer Price Index','2026-11-13'),'bls'),
 ];
 const bea=parseReleaseCalendar(ics('Personal Income and Outlays, September 2026','2026-10-29'),'bea');
 const census=parseReleaseCalendar(`<table><tr><td>Full Report - Manufacturers' Shipments, Inventories and Orders</td><td>January 7, 2027</td><td>10:00 AM</td><td>November 2026</td></tr><tr><td>Business Formation Statistics</td><td>January 13, 2027</td><td>10:00 AM</td><td>December 2026</td></tr></table>`,'census');
 const fed=parseReleaseCalendar('<p><strong>2027:</strong> January 15</p>','fed');
 const links=ECONOMIC_CALENDAR_SOURCE_REGISTRY.entries;
 const matches=(provider,sourceId,events)=>{
  const input=links.find(x=>x.provider===provider&&x.sourceId===sourceId);
  assert.ok(input,provider+':'+sourceId);
  const subset=buildSourceLinkRegistry([{
   area:'test',provider,sourceId,geography:input.geography,origin:input.origin,
   eligibility:input.eligibility,officialLinks:input.officialLinks,
  }]);
  assert.equal(describeOfficialCalendarCoverage(subset,{events}).officialWithStoredEvent,1);
 };
 matches('BLS_CES_SAE','SMS00000000000000022',bls);
 matches('BLS_CES_SAE','SMS99999990000000022',bls);
 matches('BLS_JOLTS','JTS000000000000000JOL',bls);
 matches('FRED','PPIFIS',bls);
 matches('BEA','U20306:1',bea);
 matches('CENSUS_M3','MTM:NO',census);
 matches('CENSUS_BFS','BA_BA',census);
 matches('FRB_G17','IP:B50001',fed);
});
