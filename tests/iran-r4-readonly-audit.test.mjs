import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

test('real event revision inventory excludes superseded revisions and separates Yemen from LINKED',()=>{
 const store=openStore(':memory:');
 try{
  const previous={eventId:'conflict-A',revision:1,axis:'LINKED',status:'VERIFIED',verifiedAt:now};
  store.putEvent(previous);
  store.putEvent({...previous,revision:2,status:'RETRACTED'});
  store.putEvent({eventId:'conflict-B',revision:1,axis:'IRN_USA',status:'VERIFIED',verifiedAt:now});
  store.checkpoint('verified-input',{coverage:{LINKED:{status:'VERIFIED',coverageThrough:now}},relations:{IRN_USA:{verified:true}}});
  const a=auditIranLocalReadOnly(store.db);
  assert.equal(a.r4InputInventory.latestEventCount,2);
  assert.equal(a.r4InputInventory.latestEventRevisions.find(e=>e.axis==='LINKED').status,'RETRACTED');
  assert.equal(a.r4InputInventory.coverage.LINKED.verified,true);
  assert.equal(a.r4InputInventory.coverage.YEMEN_HOUTHI.present,false);
  assert.ok(a.r4InputInventory.missingR4IndependentInputs.includes('YEMEN_HOUTHI_COVERAGE'));
  assert.equal(a.r4InputInventory.r13LinkedIsNotYemenProof,true);
  assert.equal(a.r4InputInventory.exactRealityScoreStatus,'NOT_CALCULATED');
 }finally{store.close();}
});

test('CMD audit uses approved E drive, writes only one TEMP log and performs no scheduler or deployment action',()=>{
 const cmd=fs.readFileSync(new URL('../scripts/iran-progress/r4-readonly-audit.cmd',import.meta.url),'utf8');
 assert.ok(cmd.includes(String.raw`E:\ZGmini\runtime\node.exe`));
 assert.ok(cmd.includes(String.raw`E:\ZGmini\data\iran-progress-r13\iran.sqlite`));
 assert.ok(cmd.includes(String.raw`%TEMP%\ZGMINI_IRAN_R4_READONLY_AUDIT.txt`));
 assert.doesNotMatch(cmd,/powershell|wsl|rdc|wrangler|git push|curl|schtasks|delete\s+from/i);
 const auditSource=fs.readFileSync(new URL('../scripts/iran-progress/reality-audit-r4.mjs',import.meta.url),'utf8');
 assert.match(auditSource,/readOnly:true/);
});

test('the 7/21-day event inventory never presents sparse articles as complete observed peace',()=>{
 const store=openStore(':memory:');
 try{
  const day=86400000;
  const e=(id,axis,at,severity,status='VERIFIED')=>({eventId:id,revision:1,axis,eventAt:at,
   verifiedAt:now,status,severity,occurrenceVerified:true,actorVerified:true,connectionVerified:true,severityVerified:true});
  store.putEvent(e('A','IRN_USA',now-day,3));
  store.putEvent(e('B','YEMEN_HOUTHI',now-15*day,10));
  store.putEvent(e('C','IRN_ISR',null,1,'PENDING_REVIEW'));
  store.putEvent(e('D','IRN_USA',now-2*day,1));
  store.putEvent({...e('D','IRN_USA',now-2*day,1),revision:2,status:'RETRACTED'});
  store.putEvent(e('E','IRN_USA',now-day,7));
  const snapshot=auditIranLocalReadOnly(store.db,now);
  const win=snapshot.r4InputInventory.militaryWindow;
  assert.equal(win.status,'EVENT_COUNTS_ONLY');
  assert.equal(win.latestRevisionCount,5);
  assert.equal(win.axes.IRN_USA.verifiedRecentCount,1);
  assert.equal(win.axes.IRN_USA.verifiedRecentSeverity,3);
  assert.equal(win.axes.IRN_USA.retractedCount,1);
  assert.equal(win.axes.IRN_USA.invalidVerifiedCount,1);
  assert.equal(win.axes.YEMEN_HOUTHI.verifiedPreviousSeverity,10);
  assert.equal(win.axes.IRN_ISR.pendingReviewCount,1);
  assert.equal(win.completeCoverageProven,false);
  assert.equal(win.zeroEventsDoNotProvePeace,true);
 }finally{store.close();}
});
