import test from 'node:test';
import assert from 'node:assert/strict';
import {publicationPlan} from '../scripts/pc-writer/theme-ten-r77-retry-gate.mjs';

const now=new Date('2026-10-29T14:55:00Z');
test('only exact confirmed date already present in private candidate is eligible',()=>{
 assert.deepEqual(publicationPlan({publicBase:{status:'READY',confirmedObservationDate:'2026-10-27'},
  candidateDates:['2026-10-27'],now}),{allowed:true,date:'2026-10-27',alreadyR37:false});
 assert.equal(publicationPlan({publicBase:{status:'READY',confirmedObservationDate:'2026-10-28'},
  candidateDates:['2026-10-27'],now}).allowed,false);
});

test('existing daily task protection window blocks concurrent manual publication',()=>{
 assert.deepEqual(publicationPlan({publicBase:{status:'READY',confirmedObservationDate:'2026-10-27'},
  candidateDates:['2026-10-27'],now:new Date('2026-10-29T04:30:00Z')}),
  {allowed:false,reason:'SCHEDULE_PROTECTION_WINDOW'});
});
