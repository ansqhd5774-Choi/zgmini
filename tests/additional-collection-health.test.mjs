import {test} from 'node:test';import assert from 'node:assert/strict';
import {additionalCollectionEntries} from '../scripts/pc-writer/additional-collection-health.mjs';
import {collectionHealthSummary,COLLECTION_WINDOW_MS} from '../worker/collection-health.mjs';
const now=Date.UTC(2026,9,10),iran={finishedAt:now-1,storageVerified:true,sources:{gdelt:{status:'COLLECTED'}},backfill:{status:'CAUGHT_UP'},articleAnalysis:{feeds:[{status:'COLLECTED'}]}};
const alpaca={checkedAt:new Date(now-1).toISOString(),runRequests:15,status:'COLLECTED_PENDING_VALIDATION',completedGroups:55,totalGroups:55,errorCode:null};
test('retired R10 Alpaca is excluded from active health; supply remains unknown when missing',()=>{
 const entries=additionalCollectionEntries({iran,alpaca});assert.equal(entries.length,2);assert.equal(entries.find(x=>x.id==='job:assetR10Alpaca'),undefined);assert.equal(entries.find(x=>x.id==='job:supplyR10').outcome,'unknown');
 const summary=collectionHealthSummary(entries,now);assert.equal(summary.normal,1);assert.equal(summary.total,2);
});
test('missing reports and old reports cannot claim normal',()=>{
 assert.equal(collectionHealthSummary(additionalCollectionEntries(),now).normal,0);
 assert.equal(collectionHealthSummary(additionalCollectionEntries({iran,alpaca}),now+COLLECTION_WINDOW_MS).normal,0);
});
test('source failure overrides retained storage success',()=>{
 const rows=additionalCollectionEntries({iran:{...iran,sources:{gdelt:{status:'SOURCE_FAILED'}}},alpaca:{...alpaca,status:'BLOCKED',errorCode:'ALPACA_NETWORK_OR_STORAGE_ERROR'}});
 assert.equal(collectionHealthSummary(rows,now).failed,1);
});
test('historical R10 Alpaca records cannot restore a retired job to health',()=>{
 for(const record of [alpaca,{...alpaca,runRequests:0},{...alpaca,completedGroups:54}]){
  const entries=additionalCollectionEntries({alpaca:record});
  assert.equal(entries.length,2);
  assert.equal(entries.some(row=>row.id==='job:assetR10Alpaca'),false);
  assert.equal(collectionHealthSummary(entries,now).normal,0);
 }
});

test('retired AIS failures are excluded without hiding active source failures',()=>{
 const legacy={...iran,sources:{...iran.sources,ais:{status:'SOURCE_FAILED'},aisHealth:{status:'SOURCE_FAILED'}}};
 assert.equal(additionalCollectionEntries({iran:legacy})[0].outcome,'success');
 assert.equal(additionalCollectionEntries({iran:{...legacy,sources:{...legacy.sources,gdelt:{status:'SOURCE_FAILED'}}}})[0].outcome,'failure');
 assert.equal(additionalCollectionEntries({iran:{...legacy,sources:{ais:{status:'SOURCE_FAILED'}}}})[0].outcome,'unknown');
});
