import test from 'node:test';
import assert from 'node:assert/strict';
import {mayAuditStoredUsBreadth} from '../tools/us-market-breadth-r1/manual-collector-policy.mjs';

test('audits only verified complete or prior-success breadth collection',()=>{
 assert.equal(mayAuditStoredUsBreadth({job:'breadth',status:'COMPLETE'}),true);
 assert.equal(mayAuditStoredUsBreadth({job:'breadth',status:'SKIPPED',sourceStatus:'SKIPPED_ALREADY_SUCCESS'}),true);
 for(const report of [
  {job:'breadth',status:'SKIPPED',sourceStatus:'SKIPPED_LOCKED'},
  {job:'breadth',status:'SKIPPED',sourceStatus:'SKIPPED_STORAGE_CONFIGURATION_MISSING'},
  {job:'breadth',status:'BACKLOG'},
  {job:'breadth',status:'SOURCE_FAILED'},
  {job:'macro',status:'COMPLETE'},
  null,
 ])assert.equal(mayAuditStoredUsBreadth(report),false);
});
