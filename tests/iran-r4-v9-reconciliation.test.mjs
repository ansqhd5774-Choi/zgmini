import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reconcileR4CuratedCSV,toReviewSummary} from '../scripts/iran-progress/v9-reconcile-r4.mjs';
const csv=readFileSync(new URL('./fixtures/iran-r4-v8-public-curated-20261005-18.csv',import.meta.url),'utf8');
const data=()=>reconcileR4CuratedCSV(csv);
const find=snippet=>data().casebook.find(x=>x.description.includes(snippet));
test('14 calendar days are reconciled, missing verification never invents a score',()=>{
 const r=data();assert.equal(r.days.length,14);assert.equal(r.sourceRows,20);
 assert.equal(r.r4ComputedDays,0);assert.equal(r.independentlyVerifiedR4Events,0);
 assert.ok(r.days.every(d=>d.r4Score===null&&!d.r4VerifiedInputReady));
 assert.equal(r.provisional18Used,false);assert.equal(r.autoPublish,false);
});
test('unknown incident dates do not borrow publication dates',()=>{
 const rows=data().casebook.filter(x=>!x.eventDateCandidate);
 assert.equal(rows.length,2);
 assert.ok(rows.every(x=>x.eventNature==='INCIDENT_DATE_UNKNOWN_NOT_DAY_EVENT'));
});
test('a late official report does not imply the fact was known on the incident date',()=>{
 const r=data(),x=r.casebook.find(x=>x.eventObjectId==='ON_PEACE');
 assert.equal(x.eventDateCandidate,'2026-10-05');assert.equal(x.reportDay,'2026-10-08');
 assert.equal(x.evidencePublishedAfterIncident,true);assert.equal(x.sourceStoredAt,null);
 assert.equal(r.days.find(d=>d.date==='2026-10-05').retrospectiveOnlyCandidates,1);
});
test('UKMTO 156 and On Peace remain possible duplicates, not automatically merged',()=>{
 const r=data(),c=r.potentialDuplicateClusters[0];
 assert.equal(c.members.length,2);assert.equal(c.merged,false);
 assert.notEqual(r.casebook.find(x=>x.eventObjectId==='UKMTO_156_26').id,
 r.casebook.find(x=>x.eventObjectId==='ON_PEACE').id);
});
test('Singapore incident pairs stay separate; attacker is not inferred from maritime incidents',()=>{
 const a=find('GFS PRIDE'),b=find('GFS GISELLE');
 assert.equal(a.eventObjectId,'GFS_PRIDE');assert.equal(b.eventObjectId,'GFS_GISELLE');
 assert.notEqual(a.id,b.id);assert.equal(a.reportDay,'2026-10-14');
 assert.equal(a.eventDateCandidate,'2026-10-13');
 assert.equal(a.actorVerified,false);assert.equal(b.actorVerified,false);
 assert.equal(a.severity,null);assert.equal(b.severity,null);
});
test('UN full-scale-war assessment is not a 9 October newly observed attack',()=>{
 const u=find('UN special envoy');
 assert.equal(u.eventNature,'WAR_PHASE_REPORT_NOT_NEW_ATTACK');
 assert.equal(u.reportedStrikeCandidate,false);assert.equal(u.severity,null);
});
test('Qatar talks are not a ceasefire and Egypt statements are not military participation',()=>{
 assert.equal(find('Qatar foreign ministry').eventNature,'DIPLOMACY_ONLY_NOT_CEASEFIRE');
 const e=data().casebook.filter(x=>x.front==='YEMEN_HOUTHI_CONTEXT');
 assert.equal(e.length,2);assert.ok(e.every(x=>x.eventNature==='POLITICAL_SUPPORT_ONLY_NOT_COMBAT'&&!x.reportedStrikeCandidate));
});
test('invalid input/unsafe source and tampered verified label fail closed',()=>{
 assert.throws(()=>reconcileR4CuratedCSV(csv.replace('https://www.ukmto.org/','http://www.ukmto.org/')),/URL_INVALID/);
 assert.throws(()=>reconcileR4CuratedCSV(csv.replace(/NO(?:\r?\n)/,'YES\n')),/CONTRACT_INVALID/);
 assert.throws(()=>reconcileR4CuratedCSV(csv.replace('2026-10-09,YEMEN_HOUTHI,2026-10-09','2026-10-04,YEMEN_HOUTHI,2026-10-09')),/CONTRACT_INVALID/);
 assert.throws(()=>reconcileR4CuratedCSV(csv.replace('2026-10-14,2026-10-14,Singapore MPA confirms GFS GISELLE','2026-10-14,2026-10-13,Singapore MPA confirms GFS GISELLE')),/CONTRACT_INVALID/);
});
test('summary does not contain full articles or claim production readiness',()=>{
 const r=toReviewSummary(data());
 assert.equal(r.sourceRows,20);assert.equal(r.days.length,14);
 assert.equal(r.productionScoreEligible,false);assert.equal(r.publicR3Changed,false);
 assert.ok(!Object.hasOwn(r,'casebook'));
});
