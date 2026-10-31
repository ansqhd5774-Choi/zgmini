import test from 'node:test';
import assert from 'node:assert/strict';
import {needsOneFreshSourceAttempt} from '../tools/us-market-breadth-r1/manual-source-refresh.mjs';

test('fresh retry is allowed only for prior-success skip and stale verified session',()=>{
 const collection={job:'breadth',status:'SKIPPED',sourceStatus:'SKIPPED_ALREADY_SUCCESS'};
 const prepared={status:'LATEST_SESSION_NOT_STORED',prepared:false,expectedDate:'2026-10-30'};
 assert.equal(needsOneFreshSourceAttempt({collection,prepared,latestStoredTradeDate:'2026-10-29'}),true);
 assert.equal(needsOneFreshSourceAttempt({collection,prepared:{...prepared,status:'SOURCE_AUDIT_NOT_READY'},latestStoredTradeDate:'2026-10-29'}),true);
 assert.equal(needsOneFreshSourceAttempt({collection,prepared,latestStoredTradeDate:'2026-10-30'}),false);
 assert.equal(needsOneFreshSourceAttempt({collection:{...collection,sourceStatus:'SKIPPED_LOCKED'},prepared,latestStoredTradeDate:'2026-10-29'}),false);
 assert.equal(needsOneFreshSourceAttempt({collection,prepared:{...prepared,prepared:true},latestStoredTradeDate:'2026-10-29'}),false);
 assert.equal(needsOneFreshSourceAttempt({collection,prepared,latestStoredTradeDate:'UNAVAILABLE'}),false);
});
