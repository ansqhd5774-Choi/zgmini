import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewR3HeadlineV41 as review,reviewR3SourceVersionsV41 as versions,
 reviewR3HeldPairV41 as held} from '../lib/iran-progress/r3-liveblog-source-review-v41.mjs';
const url='https://www.aljazeera.com/news/liveblog/2026/10/18/iran-war';
const a=title=>({title,sourceUrl:url,date:'2026-10-18',summary:''});
const first="Iran war live: Israeli settlers attack EU diplomats; drones target Riyadh";
const last="Iran war live: Ships attacked off UAE, Yemen; drones downed near Riyadh";
test('actual V40 L10 latest headline is flagged despite R3 currently accepting it',()=>{
 const x=review(a(last));assert.equal(x.originalR3.accepted,true);
 assert.equal(x.originalR3.rule,'MILITARY_ATTACK');
 assert.equal(x.originalR3.actor,'IRAN');assert.equal(x.originalR3.target,'ships');
 assert.equal(x.originalR3.location,'riyadh');
 assert.equal(x.status,'REVIEW_REQUIRED');
 assert.ok(x.issues.includes('LIVEBLOG_MULTIPLE_UNRESOLVED_CLAIMS'));
 assert.ok(x.issues.includes('GENERIC_HEADLINE_CONTEXT_MISREAD_AS_ATTACKER'));
 assert.equal(x.incidentDayVerified,false);
 assert.equal(x.candidateShouldBeHeldOnFutureClassifierRevision,true);
});
test('earlier V40 liveblog title is not promoted into a new attack',()=>{
 const x=review(a(first));assert.equal(x.originalR3.accepted,false);
 assert.equal(x.candidateShouldBeHeldOnFutureClassifierRevision,false);
 assert.equal(x.claimOccurrenceVerified,false);
});
test('ordinary direct military event remains unflagged by candidate audit',()=>{
 const x=review({title:'Houthis fired missiles at Aden airport',
  sourceUrl:'https://www.bbc.com/news/articles/source',date:'2026-10-18'});
 assert.equal(x.originalR3.accepted,true);assert.equal(x.originalR3.rule,'MILITARY_ATTACK');
 assert.equal(x.status,'NO_NEW_R3_REVIEW_FLAG');
});
test('a single-clause live update does not get rejected just for its label',()=>{
 const x=review(a('Iran war live: Iran launched missiles at US base'));
 assert.equal(x.liveblogHeadline,true);assert.equal(x.independentClauseCount,1);
 assert.equal(x.candidateShouldBeHeldOnFutureClassifierRevision,false);
});
test('source revisions preserve 2 different same-URL article headlines and true storage order',()=>{
 const x=versions([
  {...a(first),receiptHash:'a'.repeat(64),storedAt:Date.parse('2026-10-18T03:00:06.728Z')},
  {...a(last),receiptHash:'b'.repeat(64),storedAt:Date.parse('2026-10-18T09:00:02.827Z')}
 ]);
 assert.equal(x.variantCount,2);assert.equal(x.titleChanged,true);
 assert.equal(x.versions[0].headlineReview.originalR3.accepted,false);
 assert.equal(x.versions[1].headlineReview.status,'REVIEW_REQUIRED');
 assert.equal(x.cannotBackdateSourceRevision,true);
 assert.equal(x.score,null);assert.equal(x.releaseScoreCorrectionAuthorized,false);
});
test('source revision ordering and date mismatches fail closed',()=>{
 const x={...a(first),receiptHash:'a'.repeat(64),storedAt:1234567890};
 assert.throws(()=>versions([x,x]),/LINEAGE_INVALID/);
 assert.throws(()=>versions([x,{...x,receiptHash:'b'.repeat(64),date:'2026-10-17',storedAt:1234567891}]),/LINEAGE_INVALID/);
 assert.throws(()=>versions([{...x,receiptHash:'invalid'}]),/LINEAGE_INVALID/);
});
test('separate published days do not prove or disprove H01 same-incident identity',()=>{
 const x=held({heldDay:'2026-10-14',sourcePublicationDay:'2026-10-14',
  relatedPublicationDay:'2026-10-13',sourceReceiptPresent:true,relatedReceiptPresent:true});
 assert.equal(x.publicationDatesDiffer,true);assert.equal(x.sameIncidentProven,false);
 assert.equal(x.independentIncidentCount,null);assert.equal(x.noScoreChange,true);
});
test('same dates also cannot certify a duplicate',()=>{
 const x=held({heldDay:'2026-10-14',sourcePublicationDay:'2026-10-14',
  relatedPublicationDay:'2026-10-14',sourceReceiptPresent:true,relatedReceiptPresent:true});
 assert.equal(x.publicationDatesDiffer,false);assert.equal(x.sameIncidentProven,false);
});
test('no fabricated H01 receipt and verified incident claim permitted',()=>{
 const args={heldDay:'2026-10-14',sourcePublicationDay:'2026-10-14',
  relatedPublicationDay:'2026-10-13',sourceReceiptPresent:true,relatedReceiptPresent:true};
 assert.throws(()=>held({...args,relatedReceiptPresent:false}),/INPUT_INVALID/);
 assert.throws(()=>held({...args,incidentIdentityVerified:true}),/INPUT_INVALID/);
});
test('no source URL or date garbage accepted',()=>{
 for(const d of [{...a(last),date:'2026-10-32'},{...a(last),sourceUrl:''},{...a(last),title:''}])
 assert.throws(()=>review(d),/INPUT_INVALID/);
});
test('audit is pure and cannot mutate input or output to publish R3',()=>{
 const input=Object.freeze(a(last)),x=review(input);
 assert.equal(input.title,last);assert.equal(x.currentR3ScoreUnchanged,true);
 assert.equal(x.dbWrites,0);assert.equal(x.providerCalls,0);assert.equal(x.published,false);
});
