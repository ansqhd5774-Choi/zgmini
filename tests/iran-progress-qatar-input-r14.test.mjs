import test from 'node:test';import assert from 'node:assert/strict';
import {qatarHistoricalAssertion} from '../scripts/iran-progress/qatar-observation-input-r14.mjs';
import {hash} from '../scripts/iran-progress/store.mjs';
const now=Date.parse('2026-10-09T00:00:00Z');
const receipt=()=>{const excerpt='talks are ongoing, messages are being exchanged between Washington and Tehran, and Qatar is acting as a mediator between the parties';return {
 version:'IRAN_OFFICIAL_DIPLOMACY_OBSERVATION_R14',sourceUrl:'https://mofa.gov.qa/en/qatar/latest-articles/latest-news/details/2026/10/06/foreign-ministry--mediation-efforts-between-washington-and-tehran-continue',
 sourceClass:'OFFICIAL_MEDIATOR',publicationDate:'2026-10-06',eventDate:'2026-10-06',axis:'IRN_USA',excerpt,excerptHash:hash(excerpt),bodyHash:'a'.repeat(64),
 mediatorReportedTalksOngoing:true,mutualEndAgreementVerified:false,implementationVerified:false};};
test('historical contact retains original observation date and blocks current readiness',()=>{
 const r=receipt(),a=qatarHistoricalAssertion(r,'official-diplomacy-observation:'+hash(r),now);
 assert.equal(a.value.diplomacyScore,20);assert.equal(a.value.materialPending,true);
 assert.equal(a.value.lastVerifiedAt,Date.parse('2026-10-06T00:00:00Z'));assert.equal(a.currentStateVerified,false);
 assert.equal(a.value.mutualAgreementVerified,undefined);
});
test('changed source, quote or agreement claim cannot become a trusted assertion',()=>{
 for(const field of ['sourceUrl','excerpt','mutualEndAgreementVerified']){const r=receipt();r[field]=field==='mutualEndAgreementVerified'?true:'changed';
 assert.throws(()=>qatarHistoricalAssertion(r,'official-diplomacy-observation:'+hash(r),now),/UNSUPPORTED/);}
});
