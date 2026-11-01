import test from 'node:test';
import assert from 'node:assert/strict';
import {R5_EVIDENCE_BENCHMARKS,makeReviewedR5Benchmarks,evaluateR5Candidate21} from '../lib/iran-progress/reality-gated-candidate-r5.mjs';
import {auditR5HistoryAgainstReality,compareR5SensitivityShadows} from '../lib/iran-progress/daily-reality-check-r5.mjs';

const trial={anchorDate:'2026-10-21',anchorScore:13,weightedPointScale:11.31,
 history:[
 {date:'2026-10-08',value:36.63},{date:'2026-10-09',value:36.63},
 {date:'2026-10-10',value:36.63},{date:'2026-10-11',value:36.63},
 {date:'2026-10-12',value:32.82},{date:'2026-10-13',value:31.28},
 {date:'2026-10-14',value:24.38},{date:'2026-10-15',value:20.69},
 {date:'2026-10-16',value:18.59},{date:'2026-10-17',value:18.07},
 {date:'2026-10-18',value:17.55},{date:'2026-10-19',value:16.55},
 {date:'2026-10-20',value:13},{date:'2026-10-21',value:13},
 ]};
const reviewNow=Date.parse('2026-10-21T01:00:00Z');
const id=name=>R5_EVIDENCE_BENCHMARKS.find(x=>x.id===name);
const selected=[
 'UN_OSESGY_2026_10_09','UN_CHILDREN_CONFLICT_2026_10_15',
 'AP_TAIZ_2026_10_20','REUTERS_2026_10_20_SHABWA',
];
test('independent historical phase evidence includes 9 & 15 Oct severe Yemen conflict, 20 Oct Taiz as separate report',()=>{
 assert.equal(id(selected[0]).phase,'FULL_SCALE_WAR');
 assert.equal(id(selected[1]).phase,'FULL_SCALE_WAR');
 assert.equal(id(selected[2]).phase,'ACTIVE_COMBAT');
 assert.notEqual(id(selected[2]).sourceUrl,id(selected[3]).sourceUrl);
 const a=makeReviewedR5Benchmarks({reviewedAt:reviewNow,allowList:selected});
 const candidates=compareR5SensitivityShadows(trial,a,[11.31,21],{reviewNow});
 assert.equal(candidates.trials[0].realismStatus,'REALITY_CONTRADICTED');
 assert.deepEqual(candidates.trials[0].contradictoryDays.map(x=>x.date),['2026-10-09']);
 assert.equal(candidates.trials[1].realismStatus,'NOT_CONTRADICTED_BUT_UNCALIBRATED');
 assert.ok(candidates.trials[1].history.find(x=>x.date==='2026-10-09').value<=24);
 assert.ok(candidates.trials[1].history.find(x=>x.date==='2026-10-15').value<=24);
 const review=auditR5HistoryAgainstReality({history:candidates.trials[1].history},a,{reviewNow});
 assert.equal(review.verifiedAnchors,4);
 assert.equal(review.datesWithoutVerifiedConstraint,11);
 assert.equal(review.productionReady,false);
});
test('multiple compatible front anchors cannot validate an exact 13-point value for Oct21',()=>{
 const anchors=makeReviewedR5Benchmarks({reviewedAt:reviewNow,allowList:R5_EVIDENCE_BENCHMARKS.map(x=>x.id)});
 const estimate=evaluateR5Candidate21(trial,{anchors,reviewNow});
 assert.equal(estimate.candidateScore,13);
 assert.equal(estimate.status,'REALITY_INPUT_INCOMPLETE');
 assert.equal(estimate.coverageOfAllFrontsVerified,false);
 assert.equal(estimate.realityReferenceScoreVerified,false);
 assert.equal(estimate.productionReady,false);
});
