import test from 'node:test';
import assert from 'node:assert/strict';
import {buildUKMTOResearchIndex} from '../lib/iran-progress/ukmto-incident-research-v14.mjs';
const index=()=>buildUKMTOResearchIndex(),one=n=>index().notices.find(x=>x.number===n);
const day=d=>index().listing.find(x=>x.day===d);
test('14 days and prior 28-day examples are not full verified event coverage',()=>{
 const r=index();assert.equal(r.listing.length,14);assert.equal(r.noticeCount,23);
 assert.equal(r.attackNotices,20);assert.equal(r.nonAttackNotices,3);
 assert.equal(r.explicitlyDatedAttackNotices,6);assert.equal(r.withoutExplicitOccurrenceDay,16); // 7 explicit dates include nonattack #152, 6 attacks.
 assert.equal(r.priorWindowExamples.length,8);
 assert.equal(r.dailyR4Computed,0);assert.equal(r.independentR4EventCount,0);
 assert.ok(r.listing.every(x=>x.r4Score===null&&!x.fullPrior28DaysVerified&&!x.asOfDayPcKnown));
});
test('explicit incident date is not automatically inferred from listing card day',()=>{
 assert.equal(one(166).explicitIncidentDate,'2026-10-11');
 assert.equal(one(166).boardDate,'2026-10-12');
 for(const n of [160,162,164,165,167,168,169,170,171,172,173,174,175,176])
  assert.equal(one(n).explicitIncidentDate,null);
 assert.ok(day('2026-10-12').incidentDateUnresolved.includes('UKMTO_168_26'));
});
test('2026-10-18 tug attack is explicit event date and unknown attacker',()=>{
 const n=one(177);
 assert.equal(n.explicitIncidentDate,'2026-10-18');
 assert.equal(n.attackActor,'UNKNOWN');assert.equal(n.scoringEligible,false);
 assert.deepEqual(day('2026-10-18').explicitlyDatedIncidentCandidates,['UKMTO_177_26']);
});
test('suspicious warning and general advisory are not false attacks',()=>{
 for(const n of [152,161,163])assert.ok(!['ATTACK','ATTACK_RECLASSIFIED'].includes(one(n).kind));
 assert.equal(day('2026-10-10').listedAttackReports,1);
 assert.equal(day('2026-10-05').listedAttackReports,2);
});
test('same vessel possible UKMTO-MPA duplicate is not resolved by similar board date',()=>{
 const r=index();assert.equal(r.duplicateRisks.length,4);
 assert.ok(r.duplicateRisks.every(d=>d.reason&&r.notices.some(n=>n.noticeId===d.a)));
 assert.equal(one(170).duplicateResolved,false);assert.equal(one(172).duplicateResolved,false);
});
test('reclassified UAV strike is single notice, not two different events',()=>{
 const n=one(165);assert.equal(n.kind,'ATTACK_RECLASSIFIED');
 assert.equal(index().notices.filter(x=>x.number===165).length,1);
 assert.equal(n.explicitIncidentDate,null);
});
test('no indexed attack fact claims historical PC source receipt, actor or severity validation',()=>{
 const r=index();
 assert.ok(r.notices.every(n=>n.exactProductURL===null&&!n.originalDocumentVerifiedLocally&&
  !n.r4VerifiedEvent&&!n.r4ActorVerified&&!n.severityVerified&&n.attackActor==='UNKNOWN'));
 assert.equal(r.autoPublish,false);assert.equal(r.productionReady,false);
 assert.equal(r.sourcePageLiveFullHistoryReadback,false);
});
test('refuse unexpected claims of verified event, full source text, actor, or duplicate resolution',()=>{
 for(const patch of [{r4VerifiedEvent:true},{attackActor:'IRAN'},{severityVerified:true},{duplicateResolved:true},
  {originalDocumentVerifiedLocally:true},{exactProductURL:'https://example.com/source.pdf'}]){
  const a=index().notices.map(x=>({...x}));Object.assign(a[0],patch);
  assert.throws(()=>buildUKMTOResearchIndex(a),/V14_/);
 }
});
test('reject future event date, duplicate notice numbers, invented board dates',()=>{
 const a=index().notices.map(x=>({...x}));a[0].explicitIncidentDate='2026-10-06';
 assert.throws(()=>buildUKMTOResearchIndex(a),/V14_INCIDENT_DATE_INVALID/);
 const b=index().notices.map(x=>({...x}));b[0].number=156;
 assert.throws(()=>buildUKMTOResearchIndex(b),/V14_DUPLICATE_NOTICE_NUMBER/);
 const c=index().notices.map(x=>({...x}));c[0].boardDate='2026-09-70';
 assert.throws(()=>buildUKMTOResearchIndex(c));
});
