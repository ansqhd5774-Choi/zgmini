import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateR18} from '../scripts/pc-writer/market-calendar-r18-verified-cycle.mjs';

const source='e778f58d056e45c515fac95b4ed48295f6a3ed1a';
const installedAt=Date.parse('2026-10-27T09:14:15Z');
const bls=[
 {source:'bls',id:'employment',date:'2026-11-06',title:'Employment Situation',sourceUrl:'https://www.bls.gov/schedule/'},
 {source:'bls',id:'jolts',date:'2026-11-03',title:'Job Openings and Labor Turnover Survey',sourceUrl:'https://www.bls.gov/schedule/'},
];
const bea={source:'bea',id:'pce',date:'2026-10-30',title:'Personal Income and Outlays',sourceUrl:'https://www.bea.gov/news/schedule'};
function fixture(){
 const body={status:'READY',updatedAt:'2026-10-27T09:22:00.000Z',sources:{bls:{status:'READY'}},events:[...bls,bea]};
 return {installedAt,
  collection:{at:'2026-10-27T09:20:00Z',lane:'core',releaseCalendar:{status:'READY',providerRequests:4}},
  writer:{at:'2026-10-27T09:23:00Z',status:'VERIFIED',mode:'PUBLISH',source},
  ledger:{at:Date.parse('2026-10-27T09:23:00Z'),status:'VERIFIED',source},
  db:{state:'FOUND',output:{storedAt:Date.parse('2026-10-27T09:21:00Z'),body},
   bls:{storedAt:Date.parse('2026-10-27T09:20:00Z'),body:{text:'saved official feed'}},attemptAt:Date.parse('2026-10-27T09:20:00Z')},
  remote:{state:'FOUND',body},baselineEvents:bls.slice(0,1),expandedEvents:bls};
}
test('R18 only passes a new-source VERIFIED writer and exact public readback',()=>{
 const r=evaluateR18(fixture());
 assert.equal(r.decision,'BLS_VERIFIED_PUBLIC_READBACK_PASS');
 assert.equal(r.comparison.savedBlsMatchesExpanded,true);
 assert.deepEqual(r.sqlite.bySource,{bls:2,bea:1,fed:0,census:0});
});
test('R18 treats pre-install stored BLS input/output as waiting, not success',()=>{
 const f=fixture();f.db.bls.storedAt=installedAt-1000;
 assert.equal(evaluateR18(f).decision,'WAIT_FIRST_REGULAR_BLS_COLLECTION');
});
test('R18 distinguishes source failure and preserves prior data',()=>{
 const f=fixture();f.db.output.body.sources.bls.status='SOURCE_FAILED';
 assert.equal(evaluateR18(f).decision,'BLS_SOURCE_FAILED_PREVIOUS_DATA_PRESERVED');
 const previousInput=fixture();previousInput.db.bls.storedAt=installedAt-60_000;
 previousInput.db.output.body.sources.bls.status='SOURCE_FAILED';
 assert.equal(evaluateR18(previousInput).decision,'BLS_SOURCE_FAILED_PREVIOUS_DATA_PRESERVED');
});
test('R18 blocks duplicate and missing original BLS releases',()=>{
 const duplicates=fixture();duplicates.db.output.body.events.push(bls[0]);
 assert.equal(evaluateR18(duplicates).decision,'BLS_PARSER_OR_STORED_EVENT_MISMATCH_STOP');
 const missing=fixture();missing.baselineEvents=[{...bls[0],date:'2026-11-07'}];
 assert.equal(evaluateR18(missing).decision,'BLS_PARSER_OR_STORED_EVENT_MISMATCH_STOP');
});
test('R18 distinguishes verified local publication from public readback',()=>{
 const notYet=fixture();notYet.writer.source='7ac573fcf977c5fab97f2aea44c12555fd86dd9f';
 assert.equal(evaluateR18(notYet).decision,'WAIT_NEW_SOURCE_VERIFIED_PUBLICATION');
 const different=fixture();different.remote.body={...different.remote.body,events:bls};
 assert.equal(evaluateR18(different).decision,'WAIT_REMOTE_EXACT_EVENT_READBACK');
 const unreachable=fixture();unreachable.remote={state:'UNAVAILABLE'};
 assert.equal(evaluateR18(unreachable).decision,'WAIT_REMOTE_HTTP_READBACK');
});
