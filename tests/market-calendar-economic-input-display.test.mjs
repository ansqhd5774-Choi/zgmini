import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {
 ECONOMIC_MODEL_INPUT_TOTAL,ECONOMIC_OFFICIAL_LINK_COUNTS,ECONOMIC_NON_RELEASE_COUNTS,
 modelInputsForCalendarEvent,economicInputCalendarCoverage,
} from '../lib/market-calendar-economic-input-display.mjs';

test('283 model inputs are divided into 186 official and 97 date-ineligible inputs',()=>{
 assert.equal(ECONOMIC_MODEL_INPUT_TOTAL,283);
 assert.equal(ECONOMIC_OFFICIAL_LINK_COUNTS.length,14);
 assert.equal(ECONOMIC_OFFICIAL_LINK_COUNTS.reduce((s,x)=>s+x.inputs,0),186);
 assert.equal(Object.values(ECONOMIC_NON_RELEASE_COUNTS).reduce((s,n)=>s+n,0),97);
});

test('same release reappearing every month does not multiply source counts',()=>{
 const event={source:'bls',id:'employment',date:'2027-01-01'};
 const feed={status:'READY',events:[event,{...event,date:'2027-02-01'},
  {source:'bls',id:'bls-business-employment-dynamics',date:'2027-01-27'}]};
 assert.equal(modelInputsForCalendarEvent(event),15);
 assert.equal(modelInputsForCalendarEvent({source:'wrong',id:'employment'}),0);
 assert.equal(modelInputsForCalendarEvent({source:'bls',id:'bls-business-employment-dynamics'}),114);
 const c=economicInputCalendarCoverage(feed,{nextYear:2027});
 assert.equal(c.officialStored,129);
 assert.equal(c.nextYearConfirmed,129);
 assert.equal(c.officialWithoutStored,57);
});

test('unknown or failed feed never implies 186 missing releases',()=>{
 assert.equal(economicInputCalendarCoverage(null,{nextYear:2027}),null);
 assert.equal(economicInputCalendarCoverage({status:'SOURCE_FAILED',events:[]},{nextYear:2027}),null);
 assert.equal(economicInputCalendarCoverage({status:'READY'},{}),null);
});

test('counts-only public links match private inventory when it exists in this checkout',async t=>{
 const path=new URL('../lib/market-calendar-economic-input-index.mjs',import.meta.url);
 if(!existsSync(path)){t.skip('UI branch predates model-input source registry; full parity required in main integration');return;}
 const {ECONOMIC_CALENDAR_SOURCE_REGISTRY:r,ECONOMIC_INPUT_SOURCE_MANIFEST_SHA256:sha}=await import(path.href);
 const {MODEL_INPUT_SOURCE_MANIFEST_SHA256}=await import('../lib/market-calendar-economic-input-display.mjs');
 assert.equal(sha,MODEL_INPUT_SOURCE_MANIFEST_SHA256);
 const expected=new Map();
 for(const e of r.entries)for(const link of e.officialLinks){
  const key=JSON.stringify([link.source,link.id??null,link.idPrefix??null]);
  expected.set(key,(expected.get(key)??0)+1);
 }
 assert.equal(expected.size,ECONOMIC_OFFICIAL_LINK_COUNTS.length);
 for(const link of ECONOMIC_OFFICIAL_LINK_COUNTS){
  const key=JSON.stringify([link.source,link.id??null,link.idPrefix??null]);
  assert.equal(expected.get(key),link.inputs,`count drift for ${key}`);
 }
 assert.deepEqual({...r.byEligibility,VARIABLE:0},{OFFICIAL_RELEASE:186,CADENCE_POLICY:72,MARKET_DAILY:21,UNSCHEDULED:4,VARIABLE:0});
});
