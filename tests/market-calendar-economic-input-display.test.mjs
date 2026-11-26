import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
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

test('PARTIAL calendar retains verified stored model-link lower bounds without claiming total coverage',()=>{
 const events=[
  {source:'bls',id:'employment',date:'2027-01-08'},
  {source:'bls',id:'employment',date:'2027-02-05'},
  {source:'bea',id:'pce',date:'2026-11-25'},
  {source:'census',id:'census-business-formation-statistics-october-2026',date:'2026-11-12'},
 ];
 const partial=economicInputCalendarCoverage({
  status:'PARTIAL',events,
  sources:{bls:{status:'READY'},bea:{status:'SOURCE_FAILED'},fed_fomc:{status:'SOURCE_FAILED'}},
 },{nextYear:2027});
 assert.ok(partial,'partial stored releases must be visible instead of hidden');
 assert.equal(partial.feedPartial,true);
 assert.equal(partial.totalInputs,283);
 assert.equal(partial.officialEligible,186);
 assert.equal(partial.officialStored,43,'only 15+25+3 unique source links, not 4 event rows');
 assert.equal(partial.nextYearConfirmed,15);
 assert.equal(partial.officialWithoutStored,143);
 assert.equal(partial.nonRelease,97);
 const ready=economicInputCalendarCoverage({status:'READY',events},{nextYear:2027});
 assert.equal(ready.feedPartial,false);
 assert.equal(ready.officialStored,partial.officialStored);
 assert.equal(ready.nextYearConfirmed,partial.nextYearConfirmed);
});

test('PARTIAL feed without usable stored events never implies all 186 providers are missing',()=>{
 const partial=economicInputCalendarCoverage({status:'PARTIAL',events:[]},{nextYear:2027});
 assert.ok(partial);
 assert.equal(partial.feedPartial,true);
 assert.equal(partial.officialStored,0);
 assert.equal(partial.nextYearConfirmed,0);
 assert.equal(economicInputCalendarCoverage({status:'PARTIAL'},{}),null);
 assert.equal(economicInputCalendarCoverage({status:'SOURCE_FAILED',events:[{source:'bls',id:'employment',date:'2027-01-01'}]},{}),null);
});

test('market calendar UI explicitly labels PARTIAL counts as known stored releases, not completion rates',()=>{
 const source=readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('economicInputCalendarCoverage(feed,{nextYear:nextCalendarYear})'));
 assert.ok(source.includes("modelCoverage.feedPartial?'공식 일정 일부 공급자 수집 실패 · 확인된 저장 일정만 기준 · ':''"));
 assert.ok(source.includes('확인된 저장 일정 기준·미수집 불확정'));
 assert.ok(source.includes('확인된 일정 기준·추가 발표 미확정'));
 assert.ok(source.includes('officialStored}/{modelCoverage.officialEligible'));
});
