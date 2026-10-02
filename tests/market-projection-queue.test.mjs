import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectionQueueConsumer,projectionQueueMessage,normalizeProjectionJob} from '../worker/market-projection-queue.mjs';

test('projection queue validates fixed ids',()=>{
  const msg=projectionQueueMessage('recession',{sourceVersion:'v1',sourceStoredAt:123});
  assert.deepEqual(normalizeProjectionJob(msg),{id:'recession',sourceVersion:'v1',sourceStoredAt:123});
  assert.throws(()=>projectionQueueMessage('unknown',{sourceStoredAt:1}),/INVALID_PROJECTION_ID/);
});

test('projection queue acks only after build and write',async()=>{
  const events=[];
  const consumer=createProjectionQueueConsumer({
    buildProjection:async(job)=>{events.push('build:'+job.id);return {body:{status:'READY',id:job.id},storedAt:456};},
    writeProjection:async(id,body,storedAt)=>{events.push(`write:${id}:${storedAt}`);assert.equal(body.status,'READY');},
  });
  let acked=0,retried=0;
  const out=await consumer({messages:[{body:{id:'recession',sourceStoredAt:123},ack(){acked++},retry(){retried++}}]},{},{});
  assert.equal(acked,1);assert.equal(retried,0);
  assert.deepEqual(events,['build:recession','write:recession:456']);
  assert.equal(out.results[0].status,'ACK');
});

test('projection queue retries failed jobs without acknowledging',async()=>{
  const consumer=createProjectionQueueConsumer({
    buildProjection:async()=>{throw Error('BOOM')},
    writeProjection:async()=>{throw Error('SHOULD_NOT_WRITE')},
  });
  let acked=0,retried=0;
  const out=await consumer({messages:[{body:{id:'recession',sourceStoredAt:123},ack(){acked++},retry(){retried++}}]},{},{});
  assert.equal(acked,0);assert.equal(retried,1);
  assert.equal(out.results[0].status,'RETRY');
});
