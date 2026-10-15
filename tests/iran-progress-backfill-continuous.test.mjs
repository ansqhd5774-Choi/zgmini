import {test} from 'node:test';import assert from 'node:assert/strict';
import {runContinuousBackfill} from '../scripts/iran-progress/backfill-continuous-r14.mjs';
const now=Date.parse('2026-10-09T00:00:00Z'),target=now-1800000;
test('initial backfill proceeds immediately to the next bounded chunk and reads back progress',async()=>{
 let cp={nextAt:target-900000,archivesSaved:4},calls=0;const reports=[];
 const r=await runContinuousBackfill({clock:()=>now,readCheckpoint:()=>({...cp}),runChunk:async()=>{calls++;cp.nextAt+=900000;cp.archivesSaved++;return {status:'CAUGHT_UP',processed:1,...cp};},onProgress:r=>reports.push(r)});
 assert.equal(calls,2);assert.equal(r.status,'CAUGHT_UP');assert.equal(r.processed,2);assert.equal(reports[0].status,'RUNNING');assert.equal(r.publication,'NOT_REQUESTED');
});
test('429 stops immediately, keeps checkpoint and does not invoke another chunk',async()=>{
 const cp={nextAt:target-900000,archivesSaved:4};let calls=0;
 const r=await runContinuousBackfill({clock:()=>now,readCheckpoint:()=>cp,runChunk:async()=>{calls++;return {status:'SOURCE_FAILED',httpStatus:429,retryAt:now+21600000};}});
 assert.equal(calls,1);assert.equal(r.httpStatus,429);assert.equal(cp.archivesSaved,4);
});
test('stored cooldown prevents any source request',async()=>{
 const r=await runContinuousBackfill({clock:()=>now,readCheckpoint:()=>({nextAt:target,archivesSaved:4,retryAt:now+1}),runChunk:()=>assert.fail('must not fetch')});
 assert.equal(r.status,'DEFERRED');
});
test('lease held stops without repeated child launches',async()=>{
 let calls=0;const cp={nextAt:target,archivesSaved:4};
 const r=await runContinuousBackfill({clock:()=>now,readCheckpoint:()=>cp,runChunk:async()=>{calls++;return {status:'RUNNING',reason:'LEASE_HELD'};}});
 assert.equal(calls,1);assert.equal(r.reason,'LEASE_HELD');
});
test('run bound retains resumable progress instead of failure',async()=>{
 let cp={nextAt:target-10*900000,archivesSaved:4};
 const r=await runContinuousBackfill({maxChunks:1,clock:()=>now,readCheckpoint:()=>({...cp}),runChunk:async()=>{cp.nextAt+=900000;cp.archivesSaved++;return {status:'RUNNING',processed:1,...cp};}});
 assert.equal(r.status,'RUNNING');assert.equal(r.reason,'BOUNDED_RUN_LIMIT_REACHED');assert.equal(r.checkpoint.archivesSaved,5);
});
test('checkpoint mismatch cannot be reported as successful progress',async()=>{
 await assert.rejects(()=>runContinuousBackfill({clock:()=>now,readCheckpoint:()=>({nextAt:target,archivesSaved:4}),runChunk:async()=>({status:'RUNNING',processed:1,nextAt:target+900000,archivesSaved:5})}),/READBACK_MISMATCH/);
});
