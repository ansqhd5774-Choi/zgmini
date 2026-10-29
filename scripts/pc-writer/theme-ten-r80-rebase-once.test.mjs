import test from 'node:test';
import assert from 'node:assert/strict';
import {r80Plan} from './theme-ten-r80-rebase-once.mjs';

const morning=new Date('2026-10-30T00:00:00Z');
const protectedHour=new Date('2026-10-30T03:00:00Z');
const base={status:'READY',confirmedObservationDate:'2026-10-27',
  modelRevision:null,themes:Array.from({length:10},(_,i)=>({theme:`t${i}`}))};

test('only the exact dated private R48 candidate and existing ten themes may run',()=>{
 assert.deepEqual(r80Plan({base,candidates:['2026-10-27'],now:morning}),
  {allowed:true,date:'2026-10-27'});
 assert.equal(r80Plan({base:{...base,themes:base.themes.slice(0,9)},
  candidates:['2026-10-27'],now:morning}).reason,'PUBLIC_BASE_NOT_READY');
 assert.equal(r80Plan({base,candidates:['2026-10-26'],now:morning}).reason,
  'DATED_R48_CANDIDATE_MISSING');
});

test('protects existing task hours and never repeats an already adopted R37 read-model',()=>{
 assert.equal(r80Plan({base,candidates:['2026-10-27'],now:protectedHour}).reason,
  'SCHEDULE_PROTECTION_WINDOW');
 assert.equal(r80Plan({base:{...base,modelRevision:'THEME_LEGACY_NINE_R37_PUBLIC_V1'},
  candidates:['2026-10-27'],now:morning}).reason,'ALREADY_R37_PUBLIC');
});

test('refuses a non-READY base and invalid observation dates',()=>{
 assert.equal(r80Plan({base:{...base,status:'STALE'},
  candidates:['2026-10-27'],now:morning}).reason,'PUBLIC_BASE_NOT_READY');
 assert.equal(r80Plan({base:{...base,confirmedObservationDate:'unknown'},
  candidates:['2026-10-27'],now:morning}).reason,'PUBLIC_BASE_NOT_READY');
});
