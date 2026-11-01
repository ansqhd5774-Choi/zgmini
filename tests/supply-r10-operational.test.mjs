import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {collectSupplyR10,buildSupplyR10} from '../scripts/pc-writer/supply-r10.mjs';
import {additionalCollectionEntries} from '../scripts/pc-writer/additional-collection-health.mjs';
test('missing and old stored inputs cannot publish fake R10 values',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-supply-test-'));
 assert.equal(buildSupplyR10(base).status,'PENDING');
 fs.mkdirSync(path.join(base,'supply-r10'));
 fs.writeFileSync(path.join(base,'supply-r10','inputs.json'),JSON.stringify({sourceStoredAt:1}));
 assert.equal(buildSupplyR10(base,{now:8*86400000}).status,'STALE');
});
test('daily collection cache does not change provider success timestamp',async()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-supply-cache-'));
 fs.writeFileSync(path.join(base,'local-supply-r10-collection.json'),JSON.stringify({status:'COLLECTED',checkedAt:1000}));
 assert.deepEqual(await collectSupplyR10(base,{now:2000}),{status:'CACHED',checkedAt:1000});
});
test('provider failure is delayed instead of retried every cycle',async()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-supply-retry-'));
 fs.writeFileSync(path.join(base,'local-supply-r10-collection.json'),JSON.stringify({status:'SOURCE_FAILED',checkedAt:1000}));
 assert.equal((await collectSupplyR10(base,{now:2000})).status,'RETRY_DEFERRED');
});
test('new collection health entry requires actual verified storage',()=>{
 const entries=additionalCollectionEntries({supply:{status:'COLLECTED',checkedAt:1000,storageVerified:true}});
 assert.equal(entries.find(r=>r.id==='job:supplyR10').outcome,'success');
 const failure=additionalCollectionEntries({supply:{status:'SOURCE_FAILED',checkedAt:1000}}).find(r=>r.id==='job:supplyR10');
 assert.equal(failure.storedAt,null);assert.equal(failure.outcome,'failure');
});
