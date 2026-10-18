import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyR4Actors,buildR4ReviewCandidates} from '../lib/iran-progress/claim-review-r4.mjs';
const now=Date.parse('2026-10-18T04:00:00Z');
const quote='Houthi drones attacked a Saudi oil installation near Riyadh.';
const article=()=>({sourceUrl:'https://example.invalid/article',rightsReceiptId:'approved-fixture',
 text:quote+' Another sentence provides context.',publishedDate:'2026-10-17'});
const c=(actors=['Houthis','Saudi Arabia'])=>({quote,eventAt:'2026-10-16',actors,type:'MILITARY_ATTACK'});
test('Houthi attack against Saudi target is independently scoped, not attributed to Iran',()=>{
 const result=buildR4ReviewCandidates(article(),[c()],{now});
 assert.equal(result.status,'REVIEW_PENDING');
 assert.equal(result.items[0].axis,'YEMEN_HOUTHI');
 assert.equal(result.items[0].eventVerified,false);
 assert.equal(result.items[0].scoringEligible,false);
 assert.equal(result.scoringEligible,false);
});
test('Iran-backed does not imply a directly executed Iran-US or Iran-Israel attack',()=>{
 assert.equal(classifyR4Actors(['IRAN','HOUTHI']),'LINKED_UNVERIFIED');
 assert.equal(classifyR4Actors(['IRAN','HOUTHI','USA']),'YEMEN_HOUTHI');
 assert.equal(classifyR4Actors(['IRAN','HOUTHI','ISRAEL']),'YEMEN_HOUTHI');
 assert.equal(classifyR4Actors(['HOUTHI','USA']),'YEMEN_HOUTHI');
 assert.equal(classifyR4Actors(['IRAN','USA']),'IRN_USA');
 assert.equal(classifyR4Actors(['IRAN','ISRAEL']),'IRN_ISR');
 assert.equal(classifyR4Actors(['HOUTHI','YEMEN']),'YEMEN_HOUTHI');
});
test('source-exact candidate duplicates collapse without multiplying evidence or score',()=>{
 const result=buildR4ReviewCandidates(article(),[c(),c()],{now});
 assert.equal(result.items.length,1);
 assert.equal(result.acceptedCandidateCount,1);
 assert.equal(result.verification,'NOT_PERFORMED');
});
test('hallucinated quotations, unsupported event types, future events and AI scores are rejected',()=>{
 const hallucination={...c(),quote:'Nonexistent quote claimed by the model.'};
 const fakeScore={...c(),score:100};
 const future={...c(),eventAt:'2027-01-01'};
 const wrongType={...c(),type:'DECLARED_PEACE_PROBABILITY_100'};
 const result=buildR4ReviewCandidates(article(),[hallucination,fakeScore,future,wrongType],{now});
 assert.equal(result.acceptedCandidateCount,0);
 assert.equal(result.rejectedCount,4);
});
test('title-only and unlicensed raw input cannot be presented as source-verified fact',()=>{
 const a=article();delete a.rightsReceiptId;
 assert.equal(buildR4ReviewCandidates(a,[c()],{now}).status,'REVIEW_INPUT_INCOMPLETE');
 assert.equal(buildR4ReviewCandidates({...a,rightsReceiptId:'ok',text:''},[c()],{now}).items.length,0);
});
test('article publication and event date remain distinct and unknown event date stays null',()=>{
 const result=buildR4ReviewCandidates(article(),[{...c(),eventAt:null}],{now});
 assert.equal(result.items[0].sourcePublishedDate,'2026-10-17');
 assert.equal(result.items[0].eventDateCandidate,null);
 assert.equal(result.items[0].occurrenceVerified,false);
});
