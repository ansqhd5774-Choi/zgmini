import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore,hash} from '../scripts/iran-progress/store.mjs';
import {
 calculateOperationalR5,resolveReviewedR5SourceRevision,
 assertR5ProvisionalPublicationReady,assertR5RealityPublicationReady,
} from '../scripts/iran-progress/operate-r5.mjs';
import {R3_FEEDS} from '../scripts/iran-progress/continuous-news-r3.mjs';
import {CLASSIFIER_VERSION,classifyR3Article} from '../lib/iran-progress/reference-flow-r3.mjs';
import {validateIranR5Public} from '../lib/iran-progress/daily-public-r5.mjs';

const now=Date.parse('2026-10-21T10:00:00Z');
const oldSource={
 sourceUrl:'https://www.bbc.co.uk/news/articles/cv0ld6lrr2zeo',
 title:'Houthi missile strike on Yemen camp kills 50 security recruits, local authorities say',
 date:'2026-10-19',summary:'Initial death toll of one camp strike',
};
const revisedSource={...oldSource,
 title:'Houthi missile strike on Yemen camp kills 73 security recruits, local authorities say',
 date:'2026-10-20',summary:'Updated death toll of the same camp strike',
};
function withStore(callback){
 const store=openStore(':memory:');
 try{
  store.putSource('news-metadata:'+hash(oldSource),oldSource,Date.parse('2026-10-20T09:00:05Z'));
  store.putSource('news-metadata:'+hash(revisedSource),revisedSource,Date.parse('2026-10-20T15:00:13Z'));
  store.checkpoint('continuous-news-last-run-r3',{
   classifierVersion:CLASSIFIER_VERSION,status:'UPDATED',
   feeds:R3_FEEDS.map(({id})=>({id,status:'COLLECTED',checkedAt:now-1000})),
   lastDiscoverySuccessAt:now-1000,
  });
  return callback(store);
 }finally{store.close();}
}

test('reviewed BBC revision is ONE attack: original 19 Oct publication, 20 Oct death toll update',()=>{
 withStore(store=>{
  const {body,shadow}=calculateOperationalR5(store,{now});
  assert.equal(body.acceptedEventCount,1);
  assert.equal(body.history.length,14);
  assert.equal(body.history[0].date,'2026-10-08');
  assert.equal(body.history.at(-1).date,'2026-10-21');
  assert.equal(body.history.at(-1).value,body.score);
  assert.equal(body.score,13);
  assert.equal(body.history.find(e=>e.date==='2026-10-19').reportedEvents,1);
  assert.equal(body.history.find(e=>e.date==='2026-10-20').reportedEvents,0);
  assert.equal(body.history.reduce((x,p)=>x+p.reportedEvents,0),1);
  assert.equal(body.sensitivityScale,21);
  assert.equal(validateIranR5Public(body,now),true);
  assert.equal(shadow.calibrated,false);
  assert.doesNotThrow(()=>assertR5ProvisionalPublicationReady(shadow,body,{now}));
  assert.throws(()=>assertR5RealityPublicationReady(shadow),
   /R5_REALITY_CALIBRATION_NOT_APPROVED_FOR_PUBLICATION/);
 });
});

test('reviewed revision must match both immutable receipts and unchanged classification',()=>{
 const revised=classifyR3Article(revisedSource);
 assert.equal(revised.accepted,true);
 const original=classifyR3Article(oldSource);
 assert.equal(original.rule,'MILITARY_ATTACK');
 const event=resolveReviewedR5SourceRevision(revised,[oldSource,revisedSource]);
 assert.equal(event.date,'2026-10-19');
 assert.equal(event.delta,-12);
 assert.equal(event.eventKey,original.eventKey);
 assert.throws(()=>resolveReviewedR5SourceRevision(revised,[oldSource,
  {...revisedSource,title:'Houthi missile strike on Yemen camp kills 74 security recruits, local authorities say'}]),
  /R5_REVIEWED_REVISION_PROVENANCE_CHANGED/);
 assert.throws(()=>resolveReviewedR5SourceRevision(revised,[oldSource,revisedSource,revisedSource]),
  /R5_UNREVIEWED_SOURCE_REVISION/);
 assert.throws(()=>resolveReviewedR5SourceRevision(revised,[{...oldSource,date:'2026-10-20'},revisedSource]),
  /R5_REVIEWED_REVISION_PROVENANCE_CHANGED/);
});

test('unreviewed revision of another accepted URL still blocks provisional publication',()=>{
 withStore(store=>{
  const base={sourceUrl:'https://www.bbc.com/news/articles/other-unreviewed-attack',
   title:'Houthi missile strike on Yemen camp kills 40 security recruits, local authorities say',
   date:'2026-10-20',summary:''};
  store.putSource('news-metadata:'+hash(base),base,Date.parse('2026-10-20T11:00:00Z'));
  const modified={...base,title:'Houthi missile strike on Yemen camp kills 41 security recruits, local authorities say'};
  store.putSource('news-metadata:'+hash(modified),modified,Date.parse('2026-10-20T12:00:00Z'));
  assert.throws(()=>calculateOperationalR5(store,{now}),/R5_UNREVIEWED_SOURCE_REVISION/);
 });
});

test('provisional publication requires valid live shadow, never an arbitrary payload',()=>{
 withStore(store=>{
  const {body,shadow}=calculateOperationalR5(store,{now});
  assert.throws(()=>assertR5ProvisionalPublicationReady(shadow,{...body,score:19},{now}),
   /R5_PROVISIONAL_PUBLICATION_GATE_FAILED/);
  assert.throws(()=>assertR5ProvisionalPublicationReady({...shadow,
   latePriorPublicationDateCount:1},body,{now}),/R5_PROVISIONAL_PUBLICATION_GATE_FAILED/);
  assert.throws(()=>assertR5ProvisionalPublicationReady({...shadow,
   productionReady:true},body,{now}),/R5_PROVISIONAL_PUBLICATION_GATE_FAILED/);
  assert.throws(()=>assertR5ProvisionalPublicationReady(shadow,body,{now:now+86400001}),
   /R5_PROVISIONAL_PUBLICATION_GATE_FAILED/);
 });
});
