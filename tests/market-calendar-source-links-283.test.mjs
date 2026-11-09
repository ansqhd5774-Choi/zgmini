import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSourceLinkRegistry,describeOfficialCalendarCoverage,normalizeSourceKey}
 from '../lib/market-calendar-source-links.mjs';

const scheduled=(area='employment')=>({area,provider:'BLS_CES',sourceId:'CES0000000001',
 geography:'US',origin:'RAW_SERIES',eligibility:'OFFICIAL_RELEASE',
 officialLinks:[{source:'bls',id:'employment'}]});
const daily={area:'credit',provider:'FRED',sourceId:'DGS2',geography:'US',
 origin:'RAW_SERIES',eligibility:'MARKET_DAILY'};
const virtual={area:'flows',provider:'SEC',sourceId:'FUND_FLOW_NET',geography:'US',
 origin:'DERIVED_SIGNAL',eligibility:'UNSCHEDULED'};

test('keeps 1:N areas and source-to-release many-to-one without new events',()=>{
 const rows=[scheduled(),scheduled('growth'),daily,{...daily,area:'liquidity'},virtual];
 const r=buildSourceLinkRegistry(rows,{releaseSources:{bls:{url:'https://www.bls.gov'}}});
 assert.equal(r.occurrenceCount,5);
 assert.equal(r.uniqueInputCount,3);
 assert.equal(r.duplicateOccurrences,2);
 assert.deepEqual(r.byEligibility,{OFFICIAL_RELEASE:1,CADENCE_POLICY:0,
  MARKET_DAILY:1,UNSCHEDULED:1,VARIABLE:0});
 assert.equal(r.byOrigin.DERIVED_SIGNAL,1);
 assert.deepEqual(r.entries.find(x=>x.sourceId==='CES0000000001').areas,['employment','growth']);
 const before={status:'READY',events:[{id:'employment',source:'bls',date:'2027-01-08',
  title:'Employment Situation',sourceUrl:'https://www.bls.gov'}]};
 const copy=JSON.stringify(before);
 assert.deepEqual(describeOfficialCalendarCoverage(r,before,{today:'2027-01-01'}),{
  totalInputs:3,officialEligible:1,officialWithPublishedEvent:1,
  officialAwaitingPublishedEvent:0,nonOfficial:2,syntheticEventsCreated:0});
 assert.equal(JSON.stringify(before),copy);
 assert.equal(describeOfficialCalendarCoverage(r,before,{today:'2027-02-01'}).officialAwaitingPublishedEvent,1);
});

test('does not conflate identical series from different providers',()=>{
 assert.notEqual(normalizeSourceKey({provider:'BLS',sourceId:'CPIAUCSL'}),
  normalizeSourceKey({provider:'FRED',sourceId:'CPIAUCSL'}));
 assert.notEqual(normalizeSourceKey({provider:'DOL',sourceId:'ETA539',geography:'CA'}),
  normalizeSourceKey({provider:'DOL',sourceId:'ETA539',geography:'NY'}));
});

test('fails closed on official link absence and unknown release supplier',()=>{
 assert.throws(()=>buildSourceLinkRegistry([{...scheduled(),officialLinks:[]}]),/SOURCE_LINK_ELIGIBILITY_MISMATCH/);
 assert.throws(()=>buildSourceLinkRegistry([scheduled()],{releaseSources:{bea:{}}}),/SOURCE_RELEASE_PROVIDER_UNKNOWN/);
});

test('fails closed on conflicting semantics for reused stored source',()=>{
 assert.throws(()=>buildSourceLinkRegistry([scheduled(),{...scheduled('growth'),eligibility:'MARKET_DAILY',officialLinks:[]}]),
  /SOURCE_DUPLICATE_SEMANTIC_CONFLICT/);
});

test('Census period-bearing IDs match an official prefix without guessed dates',()=>{
 const input={area:'growth',provider:'CENSUS_BFS',sourceId:'BA_BA',geography:'US',
  origin:'RAW_SERIES',eligibility:'OFFICIAL_RELEASE',
  officialLinks:[{source:'census',idPrefix:'census-business-formation-statistics-'}]};
 const r=buildSourceLinkRegistry([input],{releaseSources:{census:{}}});
 const events=[{source:'census',id:'census-business-formation-statistics-december-2026',date:'2027-01-13'}];
 assert.equal(describeOfficialCalendarCoverage(r,{events},{today:'2027-01-01'}).officialWithPublishedEvent,1);
 assert.equal(describeOfficialCalendarCoverage(r,{events},{today:'2027-02-01'}).officialWithPublishedEvent,0);
});

test('rejects malformed identifiers and does not output stored observations',()=>{
 assert.throws(()=>normalizeSourceKey({provider:'FRED',sourceId:'../../secret'}),/SOURCE_KEY_INVALID/);
 const r=buildSourceLinkRegistry([virtual]);
 assert.deepEqual(r.entries[0].officialLinks,[]);
 assert.equal(JSON.stringify(r).includes('providerCalls'),false);
});
