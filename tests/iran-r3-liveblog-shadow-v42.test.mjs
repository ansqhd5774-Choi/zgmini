import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReferenceFlowR3} from '../lib/iran-progress/reference-flow-r3.mjs';
import {compareR3LiveblogCandidateV42 as compare} from '../lib/iran-progress/r3-liveblog-shadow-v42.mjs';
const parts=[
 ['2026-10-12','MARITIME_DISRUPTION','MARITIME',-10,'Another Tanker Catches Fire in Strait of Hormuz after Hitting Sea Mine'],
 ['2026-10-12','MILITARY_WARNING','MILITARY',-2,'Iran Defense Chief Warns US against Playing with Fire'],
 ['2026-10-13','MILITARY_WARNING','MILITARY',-2,'Iranian Deputy FM Warns US of Wider Consequences of War'],
 ['2026-10-13','MILITARY_WARNING','MILITARY',-2,"Saudi minister vows 'serious response' to Houthi attacks on airports"],
 ['2026-10-14','MARITIME_DISRUPTION','MARITIME',-10,'Container Ship Sinks in Strait of Hormuz: IRGC Navy'],
 ['2026-10-14','MILITARY_ATTACK','MILITARY',-12,'Houthi missile hits Aramco building after Saudi-led coalition strike on Yemen fuel depot'],
 ['2026-10-15','MILITARY_ATTACK','MILITARY',-12,'Houthi missile attack on Yemeni presidential palace kills five, minister says'],
 ['2026-10-16','MARITIME_DISRUPTION','MARITIME',-10,'Another Tanker Catches Fire in Eastern Strait of Hormuz'],
 ['2026-10-17','MILITARY_WARNING','MILITARY',-2,'Egypt’s el-Sisi vows to defend Saudi Arabia from Houthi attacks'],
 ['2026-10-18','MILITARY_ATTACK','MILITARY',-12,'Iran war live: Ships attacked off UAE, Yemen; drones downed near Riyadh'],
 ['2026-10-18','MILITARY_WARNING','MILITARY',-2,'Iran Warns of More Devastating Response to Any US-Israeli Aggression'],
];
function sample(){
 return parts.map(([date,rule,type,delta,evidence],i)=>({
  date,rule,type,delta,evidence,accepted:true,eventVerified:false,
  sourceUrl:i===9?'https://www.aljazeera.com/news/liveblog/2026/10/18/iran-war':
    i===3||i===5||i===6?'https://www.bbc.co.uk/news/articles/iran-case-'+i:
    i===8?'https://www.aljazeera.com/news/2026/10/17/saudi-case':
      'https://www.tasnimnews.ir/en/news/2026/10/'+date.slice(-2)+'/12345/iran-case-'+i,
  eventKey:JSON.stringify([date,rule,i]),reason:rule
 }));
}
function input(rows=sample()){
 const built=buildReferenceFlowR3(rows,{asOfDate:'2026-10-18'});
 return {resolvedEvents:rows,asOfDate:'2026-10-18',
  storedResult:{version:built.version,score:built.score,eventCount:built.eventCount,domains:built.domains},
  heldCandidates:[{reason:'POSSIBLE_SAME_EVENT',date:'2026-10-14'}]};
}
test('V38 actual lead pattern reproduces original 36.3 under unchanged R3 formula',()=>{
 const s=input();
 assert.equal(s.storedResult.score,36.3);
 assert.equal(s.storedResult.eventCount,11);
 assert.equal(s.storedResult.domains.MILITARY,4);
 assert.equal(s.storedResult.domains.MARITIME,20);
});
test('one composite L10 is review-only and the what-if candidate is 38.7',()=>{
 const r=compare(input());
 assert.equal(r.status,'WHAT_IF_REPLAY_READY');
 assert.equal(r.baselineMatched,true);
 assert.equal(r.originalScore,36.3);
 assert.equal(r.candidateScore,38.7);
 assert.equal(r.scoreDelta,2.4);
 assert.equal(r.originalEventCount,11);
 assert.equal(r.candidateEventCount,10);
 assert.equal(r.flaggedCompositeHeadlineCount,1);
 assert.equal(r.candidateDomains.MILITARY,16);
 assert.equal(r.flaggedSignals[0].rule,'MILITARY_ATTACK');
 assert.equal(r.unresolvedHeldDuplicateCount,1);
 assert.equal(r.heldDuplicateAutoPromoted,false);
});
test('replay does not fake 11 actual historic public observations',()=>{
 const r=compare(input());
 assert.equal(r.notActualPublicationHistory,true);
 assert.equal(r.articleDateModelReplay.length,7);
 assert.equal(r.articleDateModelReplay.at(-1).candidate,38.7);
 assert.equal(r.articleDateModelReplay.at(-2).baseline,r.articleDateModelReplay.at(-2).candidate);
});
test('ordinary reported attacks, warnings and maritime leads are preserved',()=>{
 const rows=sample().filter((_,i)=>i!==9),s=input(rows);
 assert.equal(s.storedResult.score,38.7);
 const r=compare(s);
 assert.equal(r.status,'NO_LIVEBLOG_REVIEW_FLAGS');
 assert.equal(r.flaggedCompositeHeadlineCount,0);
 assert.equal(r.originalScore,r.candidateScore);
 assert.equal(r.originalEventCount,10);
});
test('baseline score mismatch blocks candidate output',()=>{
 const s=input();
 s.storedResult.score=38.7;
 const r=compare(s);
 assert.equal(r.status,'REPLAY_BLOCKED');
 assert.equal(r.reason,'STORED_BASELINE_PARITY_MISMATCH');
 assert.equal(r.candidateScore,null);
});
test('baseline event-count or domain mismatch blocks candidate output',()=>{
 for(const bad of [{eventCount:10},{domains:{DIPLOMACY:50}},{domains:{DIPLOMACY:50,CEASEFIRE:50,MILITARY:100,MARITIME:20,NUCLEAR:50}}]){
  const s=input();Object.assign(s.storedResult,bad);
  assert.equal(compare(s).status,'REPLAY_BLOCKED');
 }
});
test('empty and wrong-method checkpoints cannot be considered a valid replay',()=>{
 assert.equal(compare({}).status,'REPLAY_BLOCKED');
 assert.equal(compare({resolvedEvents:[],asOfDate:'2026-10-18',storedResult:{version:'IRAN_PROGRESS_R4',score:0,eventCount:0,domains:{}}}).status,'REPLAY_BLOCKED');
});
test('lost headline evidence blocks review, not accepted as clean',()=>{
 const s=input(),row=s.resolvedEvents[0];
 s.resolvedEvents[0]={...row,evidence:null};
 assert.equal(compare(s).reason,'LEDGER_OR_HEADLINE_PROVENANCE_INCOMPLETE');
});
test('unverified event identity is not manufactured for H01',()=>{
 const r=compare(input());
 assert.equal(r.heldDuplicateAutoPromoted,false);
 assert.equal(r.candidateIsNotObservedWarTruth,true);
 assert.equal(r.published,false);
 assert.equal(r.autoApplied,false);
});
test('held review candidates never inflate score',()=>{
 const s=input(),before=compare(s);
 s.heldCandidates.push({reason:'POSSIBLE_SAME_EVENT',date:'2026-10-13'});
 const after=compare(s);
 assert.equal(after.unresolvedHeldDuplicateCount,2);
 assert.equal(after.candidateScore,before.candidateScore);
});
test('pure replay never mutates signed input objects',()=>{
 const s=input();
 const original=JSON.stringify(s);
 const r=compare(s);
 assert.equal(JSON.stringify(s),original);
 assert.equal(r.operatingChanged,false);
 assert.equal(r.dbWrites,0);
 assert.equal(r.providerCalls,0);
 assert.equal(r.originalR3WeightsUnchanged,true);
 assert.equal(r.originalR3RuleDeltasUnchanged,true);
});
