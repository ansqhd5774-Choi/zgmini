import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {recordCollectionChecks,readCollectionChecks} from '../scripts/pc-writer/collection-checks.mjs';

test('validated publication waiting is success; cache and quota skips cannot renew it',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zg-health-'));
 try{
  const report={at:'2026-10-07T00:00:00Z',lane:'korea',status:'WAITING_PUBLICATION',providers:{krx:{requests:1,statuses:{200:1}}}};
  recordCollectionChecks(base,report);
  const at=readCollectionChecks(base).korea.checkedAt;
  assert.equal(readCollectionChecks(base).korea.outcome,'success');
  recordCollectionChecks(base,{...report,at:'2026-10-07T01:00:00Z',status:'COMPLETE',providers:{}});
  assert.equal(readCollectionChecks(base).korea.checkedAt,at);
  recordCollectionChecks(base,{...report,at:'2026-10-07T02:00:00Z',status:'ERROR'});
  assert.equal(readCollectionChecks(base).korea.outcome,'failure');
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test('HTTP 200 with failed validation stays failed; cached feeds are not new checks',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zg-health-'));
 try{
  recordCollectionChecks(base,{at:'2026-10-07T00:00:00Z',lane:'core',status:'SOURCE_FAILED',job:'macro',providers:{fred:{requests:1,statuses:{200:1}}},feeds:[{key:'fear-greed',status:'CACHED'}]});
  const checks=readCollectionChecks(base);
  assert.equal(checks['job:macro'].outcome,'failure');assert.equal(checks['feed:fear-greed'],undefined);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});
