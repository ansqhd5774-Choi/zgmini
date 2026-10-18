import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from '../scripts/iran-progress/store.mjs';
import {auditIranLocalReadOnly} from '../scripts/iran-progress/reality-audit-r4.mjs';
const now=Date.parse('2026-10-18T04:00:00Z');
test('read-only audit distinguishes 50 news queue items from 4 rule matches and 3 Ollama decisions',()=>{
 const store=openStore(':memory:');
 try{
  const items=Array.from({length:50},(_,i)=>({
   url:'https://example.invalid/a/'+i,analyzedAt:now,
   reason:i<4?'ACCEPTED':i<30?'OUT_OF_SCOPE':'NO_EXPLICIT_CHANGE_RULE'
  }));
  store.checkpoint('continuous-news-queue-r3',{items});
  store.checkpoint('continuous-news-last-run-r3',{status:'ANALYZED_NO_CHANGE',checkedAt:now,
   analyzed:50,accepted:4,pending:0,failed:0});
  for(let i=0;i<50;i++)store.putCandidate({id:'candidate-'+i,title:'fixture'},now);
  for(let i=0;i<3;i++)store.putDecision('discovery:'+i,{status:'CANDIDATE_ONLY'},now);
  store.putDecision('article-ai:1',{status:'CANDIDATE_ONLY'},now);
  const before=store.db.prepare('SELECT COUNT(*) AS n FROM decisions').get().n;
  const a=auditIranLocalReadOnly(store.db);
  assert.equal(a.r3.queueTotal,50);
  assert.equal(a.r3.queueAnalyzed,50);
  assert.equal(a.r3.queueAccepted,4);
  assert.equal(a.r3.queueRejected,46);
  assert.equal(a.r3.queueRejectionReasons.OUT_OF_SCOPE,26);
  assert.equal(a.candidateDiscovery.total,50);
  assert.equal(a.candidateDiscovery.decisions,3);
  assert.equal(a.articleOllama.storedDecisions,1);
  assert.equal(a.ollamaCalls,0);
  assert.equal(a.dbWrites,0);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM decisions').get().n,before);
 }finally{store.close();}
});
test('empty ledger audit does not create scores, rewrite checkpoints or claim success',()=>{
 const store=openStore(':memory:');
 try{
  const a=auditIranLocalReadOnly(store.db);
  assert.equal(a.r3.latestRunStatus,'NO_RUN');
  assert.equal(a.r3.queueTotal,0);
  assert.equal(a.r3.lastValidScore,null);
  assert.equal(a.candidateDiscovery.total,0);
  assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM checkpoints').get().n,0);
 }finally{store.close();}
});
