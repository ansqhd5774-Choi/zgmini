import {test} from 'node:test';import assert from 'node:assert/strict';
import {additionalCollectionEntries} from '../scripts/pc-writer/additional-collection-health.mjs';
import {collectionHealthSummary,COLLECTION_WINDOW_MS} from '../worker/collection-health.mjs';
const now=Date.UTC(2026,9,10),iran={finishedAt:now-1,storageVerified:true,sources:{gdelt:{status:'COLLECTED'}},backfill:{status:'CAUGHT_UP'},articleAnalysis:{feeds:[{status:'COLLECTED'}]}};
const alpaca={checkedAt:new Date(now-1).toISOString(),runRequests:15,status:'COLLECTED_PENDING_VALIDATION',completedGroups:55,totalGroups:55,errorCode:null};
test('two collection jobs added; analysis and 55 chunks are not separate jobs',()=>{
 const entries=additionalCollectionEntries({iran,alpaca});assert.equal(entries.length,2);
 const summary=collectionHealthSummary(entries,now);assert.equal(summary.normal,2);assert.equal(summary.total,2);
});
test('missing reports and old reports cannot claim normal',()=>{
 assert.equal(collectionHealthSummary(additionalCollectionEntries(),now).normal,0);
 assert.equal(collectionHealthSummary(additionalCollectionEntries({iran,alpaca}),now+COLLECTION_WINDOW_MS).normal,0);
});
test('source failure overrides retained storage success',()=>{
 const rows=additionalCollectionEntries({iran:{...iran,sources:{gdelt:{status:'SOURCE_FAILED'}}},alpaca:{...alpaca,status:'BLOCKED',errorCode:'ALPACA_NETWORK_OR_STORAGE_ERROR'}});
 assert.equal(collectionHealthSummary(rows,now).failed,2);
});
test('no-request replay and incomplete groups never turn green',()=>{
 assert.equal(collectionHealthSummary(additionalCollectionEntries({alpaca:{...alpaca,runRequests:0}}),now).normal,0);
 assert.equal(collectionHealthSummary(additionalCollectionEntries({alpaca:{...alpaca,completedGroups:54}}),now).normal,0);
});

test('retired AIS failures are excluded without hiding active source failures',()=>{
 const legacy={...iran,sources:{...iran.sources,ais:{status:'SOURCE_FAILED'},aisHealth:{status:'SOURCE_FAILED'}}};
 assert.equal(additionalCollectionEntries({iran:legacy})[0].outcome,'success');
 assert.equal(additionalCollectionEntries({iran:{...legacy,sources:{...legacy.sources,gdelt:{status:'SOURCE_FAILED'}}}})[0].outcome,'failure');
 assert.equal(additionalCollectionEntries({iran:{...legacy,sources:{ais:{status:'SOURCE_FAILED'}}}})[0].outcome,'unknown');
});
