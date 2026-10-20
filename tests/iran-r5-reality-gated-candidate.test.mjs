import test from 'node:test';
import assert from 'node:assert/strict';
import {
 R5_EVIDENCE_BENCHMARKS,makeReviewedR5Benchmarks,evaluateR5Candidate21
} from '../lib/iran-progress/reality-gated-candidate-r5.mjs';
import {compareR5SensitivityShadows} from '../lib/iran-progress/daily-reality-check-r5.mjs';

const now=Date.parse('2026-10-21T00:30:00Z');
const original={anchorDate:'2026-10-21',anchorScore:13,
 weightedPointScale:11.31,history:[
 {date:'2026-10-08',value:36.63},
 {date:'2026-10-09',value:36.63},
 {date:'2026-10-10',value:36.63},
 {date:'2026-10-11',value:36.63},
 {date:'2026-10-12',value:32.82},
 {date:'2026-10-13',value:31.28},
 {date:'2026-10-14',value:24.38},
 {date:'2026-10-15',value:20.69},
 {date:'2026-10-16',value:18.59},
 {date:'2026-10-17',value:18.07},
 {date:'2026-10-18',value:17.55},
 {date:'2026-10-19',value:16.55},
 {date:'2026-10-20',value:13},
 {date:'2026-10-21',value:13},
 ]};
test('R5 K=21 fixes 9 Oct UN contradiction but remains blocked without independent as-of 20 and 21 evidence',()=>{
 const anchors=makeReviewedR5Benchmarks({reviewedAt:now,allowList:R5_EVIDENCE_BENCHMARKS.map(x=>x.id)});
 const base=compareR5SensitivityShadows(original,anchors,[11.31],{reviewNow:now});
 assert.equal(base.trials[0].contradictoryDays.length,1);
 assert.equal(base.trials[0].contradictoryDays[0].date,'2026-10-09');
 const next=evaluateR5Candidate21(original,{anchors,reviewNow:now});
 assert.equal(next.status,'REALITY_INPUT_INCOMPLETE');
 assert.equal(next.candidateHistory.length,14);
 assert.equal(next.candidateHistory[1].value,23.64);
 assert.equal(next.candidateHistory.at(-1).value,13);
 assert.equal(next.independentSourceDateCount,3);
 assert.equal(next.contradictions.length,0);
 assert.equal(next.productionReady,false);
 assert.equal(next.selectedForProduction,false);
 assert.equal(next.realityReferenceScoreVerified,false);
});
test('multiple independent source days can refute too optimistic score, never prove one exact coefficient',()=>{
 assert.throws(()=>makeReviewedR5Benchmarks({reviewedAt:now,allowList:['UN_FAKE_1','UN_FAKE_1']}),/PROVENANCE_REQUIRED/);
 const noClaims=evaluateR5Candidate21(original,{anchors:[],reviewNow:now});
 assert.equal(noClaims.status,'REALITY_INPUT_INCOMPLETE');
 assert.equal(noClaims.productionReady,false);
 const anchors=makeReviewedR5Benchmarks({reviewedAt:now,allowList:R5_EVIDENCE_BENCHMARKS.map(x=>x.id)});
 const newContradiction=[...anchors,{...anchors[1],sourceId:'FAKE_2026_10_20',reportDate:'2026-10-20',
   assertedOngoingOn:'2026-10-20',phase:'CRITICAL_ESCALATION'}];
 const blocked=evaluateR5Candidate21(original,{anchors:newContradiction,reviewNow:now});
 assert.equal(blocked.status,'REALITY_CONTRADICTED');
 assert.equal(blocked.contradictions[0].date,'2026-10-20');
});
