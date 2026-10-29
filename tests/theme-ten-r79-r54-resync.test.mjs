import test from 'node:test';
import assert from 'node:assert/strict';
import {r79Plan} from './theme-ten-r79-r54-resync.mjs';

const candidateDates=['2026-10-27'];
const base={status:'READY',themes:Array(10).fill({}),
  confirmedObservationDate:'2026-10-27',modelRevision:null};
const outside=new Date('2026-10-30T06:00:00Z');

test('R79 permits approved date-matched R54 resync outside existing tasks',()=>{
  assert.deepEqual(r79Plan({base,candidateDates,now:outside}),
    {allowed:true,date:'2026-10-27',alreadyR37:false});
});
test('R79 blocks the existing 11:15–14:15 KST task window',()=>{
  assert.deepEqual(r79Plan({base,candidateDates,
    now:new Date('2026-10-30T03:00:00Z')}),
  {allowed:false,reason:'SCHEDULE_PROTECTION_WINDOW'});
});
test('R79 refuses missing date-matched private candidate',()=>{
  assert.deepEqual(r79Plan({base,candidateDates:[],now:outside}),
    {allowed:false,reason:'EXACT_DATED_PRIVATE_CANDIDATE_MISSING'});
});
test('R79 identifies an already recovered public reader without a new write',()=>{
  assert.deepEqual(r79Plan({base:{...base,
    modelRevision:'THEME_LEGACY_NINE_R37_PUBLIC_V1'},candidateDates,now:outside}),
    {allowed:true,date:'2026-10-27',alreadyR37:true});
});
