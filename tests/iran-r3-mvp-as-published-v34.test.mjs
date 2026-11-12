import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeR3PublishedCaptureV34 as capture,reviewR3MvpCapturesV34 as review}
 from '../lib/iran-progress/as-published-observation-v34.mjs';
const t=Date.parse('2026-10-19T00:00:00Z');
const doc=(publication=t-3600000,score=36.3)=>({
 version:'IRAN_REFERENCE_FLOW_R3',status:'REFERENCE',score,
 publishedAt:publication,collectionCheckedAt:publication-30000,
 asOfDate:'2026-10-18',historyMode:'RETROSPECTIVE_PUBLICATION_DATE',
 lastSignalDate:'2026-10-18',history:[{date:'2026-10-11',value:40},{date:'2026-10-18',value:score}],
 newsCollection:{status:'ANALYZED_NO_CHANGE'}
});
test('V33-like R3 public snapshot becomes one observed point, not two article-date observations',()=>{
 const x=capture(doc(),{capturedAt:t});const out=review([x],{now:t});
 assert.equal(out.snapshotsObserved,1);assert.equal(out.daysWithActualPublicCaptures,1);
 assert.equal(out.netObservedDelta,null);assert.equal(x.retrospectiveArticleChangePoints,2);
 assert.equal(x.derivedFromArticleTimeline,false);
});
test('a new published score is a genuine observed change',()=>{
 const a=capture(doc(),{capturedAt:t});
 const b=capture(doc(t+3600000,33.9),{capturedAt:t+7200000});
 const out=review([a,b],{now:t+7200000});
 assert.equal(out.actualObservedScoreChanges,1);assert.equal(out.publicationRefreshes,1);
 assert.equal(out.netObservedDelta,-2.4);
});
test('fresh publication with same score is not an observed score change',()=>{
 const a=capture(doc(),{capturedAt:t});
 const b=capture(doc(t+3600000),{capturedAt:t+7200000});
 assert.equal(review([a,b],{now:t+7200000}).actualObservedScoreChanges,0);
 assert.equal(review([a,b],{now:t+7200000}).publicationRefreshes,1);
});
test('repeat capture without newer publication remains unchanged',()=>{
 const a=capture(doc(),{capturedAt:t});
 const b=capture(doc(),{capturedAt:t+3600000});
 assert.equal(review([a,b],{now:t+3600000}).publicationRefreshes,0);
});
test('publication timestamp regression fails closed',()=>{
 const a=capture(doc(),{capturedAt:t});
 const b=capture(doc(t-7200000),{capturedAt:t+3600000});
 assert.throws(()=>review([a,b],{now:t+3600000}),/PUBLICATION_TIMESTAMP_REGRESSION/);
});
test('score silently changes with identical publication timestamp fails closed',()=>{
 const a=capture(doc(),{capturedAt:t});
 const b=capture(doc(t-3600000,32),{capturedAt:t+3600000});
 assert.throws(()=>review([a,b],{now:t+3600000}),/SAME_PUBLICATION_SCORE_CHANGED/);
});
test('invalid or future scores and publication dates fail closed',()=>{
 for(const patch of [{score:101},{score:null},{publishedAt:t+3600000},
  {collectionCheckedAt:t},{version:'IRAN_PROGRESS_R4'}, {status:'PENDING'}])
  assert.throws(()=>capture({...doc(),...patch},{capturedAt:t}),/PUBLIC_CAPTURE_INVALID/);
});
test('retrospective chart cannot fake daily published history',()=>{
 const d={...doc(),historyMode:'AS_PUBLISHED'};
 assert.throws(()=>capture(d,{capturedAt:t}),/PUBLIC_CAPTURE_INVALID/);
 const h={...doc(),history:[{date:'2026-10-18',value:1},{date:'2026-10-17',value:36.3}]};
 assert.throws(()=>capture(h,{capturedAt:t}),/PUBLIC_CAPTURE_INVALID/);
});
test('delayed collection is diagnosed but latest last-known score retained',()=>{
 const r=capture({...doc(t-5*86400000),status:'UPDATE_DELAYED',
  collectionCheckedAt:t-5*86400000-10000},{capturedAt:t});
 const s=review([r],{now:t});assert.equal(s.status,'COLLECTION_DELAYED');assert.equal(s.lastScore,36.3);
});
test('unsorted duplicate captures, future values, and non-observation guards fail closed',()=>{
 const a=capture(doc(),{capturedAt:t});
 assert.throws(()=>review([a,a],{now:t}),/UNSORTED/);
 assert.throws(()=>review([a],{now:t-1}),/UNSORTED/);
 assert.throws(()=>review([{...a,observedPublicSnapshot:false}],{now:t}),/UNSORTED/);
});
test('empty ledger remains unknown instead of manufacturing a flat trend',()=>{
 const out=review([],{now:t});assert.equal(out.snapshotsObserved,0);
 assert.equal(out.lastScore,null);assert.equal(out.netObservedDelta,null);
});
