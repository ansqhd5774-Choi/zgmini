import test from 'node:test';
import assert from 'node:assert/strict';
import {runR29} from '../scripts/pc-writer/market-calendar-r29-pc-apply.mjs';

test('R29 installer refuses unknown PC Core task before any mutation',()=>{
 const report=runR29({apply:true,getRoot:()=>null,getTask:()=>'',dataRoot:'/not-an-operational-path'});
 assert.equal(report.decision,'EXACT_CORE_ORIGIN_CHANGED_STOP');
 assert.deepEqual(report.changedFiles,[]);
 assert.equal(report.backupCreated,false);
 assert.equal(report.forcedCollection,false);
 assert.equal(report.publisherExecuted,false);
 assert.equal(report.gitPushed,false);
});

test('R29 installer refuses missing or tampered package files',()=>{
 const report=runR29({apply:true,candidatePaths:['/missing1','/missing2','/missing3'],
  getRoot:()=>{throw Error('MUST_NOT_DISCOVER_PC');}});
 assert.equal(report.decision,'R29_PREFLIGHT_READ_FAILED_STOP');
 assert.equal(report.newSource,null);
});
