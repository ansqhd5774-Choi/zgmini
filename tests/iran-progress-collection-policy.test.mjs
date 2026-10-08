import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectionSlot,collectionInstallReady,completedCollectionSlot,collectionTaskReadback} from '../scripts/iran-progress/collection-policy.mjs';
test('KST six-hour collection boundaries',()=>{
 const a=Date.parse('2026-10-08T14:59:59Z'),b=Date.parse('2026-10-08T15:00:00Z');
 assert.equal(collectionSlot(b),collectionSlot(a)+1);
});
test('scheduler omitted default false wake setting is valid, explicit wake is rejected',()=>{
 const xml='runner IgnoreNew '+['00','06','12','18'].map(h=>`T${h}:00:00+09:00`).join(' ');
 assert.equal(collectionTaskReadback(xml,'runner'),true);
 assert.equal(collectionTaskReadback(xml+'<WakeToRun>true</WakeToRun>','runner'),false);
 assert.equal(collectionTaskReadback(xml.replace('T18:00:00+09:00',''),'runner'),false);
});
test('only completed slots suppress retries',()=>{
 const now=Date.now(),slot=collectionSlot(now);
 assert.equal(completedCollectionSlot({slot,completed:false},now),false);
 assert.equal(completedCollectionSlot({slot,completed:true},now),true);
 assert.equal(completedCollectionSlot({slot:slot-1,completed:true},now),false);
});
test('collection installation requires stored evidence, not READY scoring',()=>{
 const report={version:'IRAN_COLLECTION_R14',storageVerified:true,finishedAt:Date.now(),backfill:{status:'RUNNING',archivesSaved:1},score:null};
 assert.equal(collectionInstallReady(report),true);
 assert.equal(collectionInstallReady({...report,storageVerified:false}),false);
 assert.equal(collectionInstallReady({...report,backfill:{status:'SOURCE_FAILED',archivesSaved:1}}),false);
 assert.equal(collectionInstallReady({...report,backfill:{status:'RUNNING',archivesSaved:0}}),false);
});
