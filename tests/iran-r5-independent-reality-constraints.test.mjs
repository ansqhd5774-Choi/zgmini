import test from 'node:test';
import assert from 'node:assert/strict';
import {
 auditR5HistoryAgainstReality,compareR5SensitivityShadows,
} from '../lib/iran-progress/daily-reality-check-r5.mjs';

const reviewedAt=Date.parse('2026-10-21T01:00:00Z'),reviewNow=Date.parse('2026-10-21T07:00:00Z');
const official={
 reviewStatus:'SOURCE_TEXT_REVIEWED',sourceKind:'OFFICIAL',
 front:'YEMEN_HOUTHI',phase:'FULL_SCALE_WAR',
 reportDate:'2026-10-09',assertedOngoingOn:'2026-10-09',
 sourceId:'UN_DPPA_YEMEN_2026_10_09',
 sourceUrl:'https://dppa.un.org/en/news/yemen-has-returned-to-full-scale-war-special-envoy-warns',
 reviewedAt,
};
const original={
 anchorDate:'2026-10-21',anchorScore:13,weightedPointScale:11.31,
 history:[{date:'2026-10-09',value:36.63},
          {date:'2026-10-20',value:13},
          {date:'2026-10-21',value:13}],
};
test('9 Oct UN full-scale-war assertion contradicts R5 backcast 36.63 against existing R4 band cap 24',()=>{
 const x=auditR5HistoryAgainstReality(original,[official],{reviewNow});
 assert.equal(x.status,'REALITY_CONTRADICTED');
 assert.equal(x.verifiedAnchors,1);
 assert.equal(x.contradictions.length,1);
 assert.deepEqual(x.contradictions[0].date,'2026-10-09');
 assert.equal(x.contradictions[0].score,36.63);
 assert.equal(x.contradictions[0].maximumCompatibleScore,24);
 assert.equal(x.productionReady,false);
});
test('a later independent fact-check may validate contemporaneously published historical evidence',()=>{
 const x=auditR5HistoryAgainstReality(original,[official],{reviewNow});
 assert.equal(x.rejectedAnchors,0);
 const invalid=auditR5HistoryAgainstReality(original,[{...official,reportDate:'2026-10-10'}],{reviewNow});
 assert.equal(invalid.status,'REALITY_EVIDENCE_INCOMPLETE');
 assert.equal(invalid.rejectedAnchors,1);
});
test('unverified external claims do not create reality anchors',()=>{
 const x=auditR5HistoryAgainstReality(original,[{...official,reviewStatus:'SEARCH_SNIPPET_ONLY'}],{reviewNow});
 assert.equal(x.status,'REALITY_EVIDENCE_INCOMPLETE');
 assert.equal(x.verifiedAnchors,0);
});
test('sensitivity comparison flags 11.31 mismatch, 21 as a *candidate*, never auto-selects or approves',()=>{
 const c=compareR5SensitivityShadows(original,[official],[11.31,16,21,24],{reviewNow});
 assert.equal(c.autoSelected,false);
 assert.equal(c.status,'SHADOW_COMPARISON_ONLY');
 assert.equal(c.trials[0].realismStatus,'REALITY_CONTRADICTED');
 assert.equal(c.trials[1].realismStatus,'REALITY_CONTRADICTED');
 assert.equal(c.trials[2].realismStatus,'NOT_CONTRADICTED_BUT_UNCALIBRATED');
 assert.equal(c.trials[3].realismStatus,'NOT_CONTRADICTED_BUT_UNCALIBRATED');
 assert.ok(Math.abs(c.trials[2].history[0].value-23.64)<0.05);
 assert.equal(c.trials[2].history.at(-1).value,13);
 assert.equal(c.trials[2].calibrated,false);
});
test('unknown review time, unsupported phase and duplicated evidence are fail-closed',()=>{
 assert.throws(()=>compareR5SensitivityShadows(original,[official],[11.31,11.31],{reviewNow}),/SENSITIVITY_INPUT_INVALID/);
 assert.equal(auditR5HistoryAgainstReality(original,[{...official,phase:'PEACE_IMPLEMENTATION'}],{reviewNow}).verifiedAnchors,0);
 assert.equal(auditR5HistoryAgainstReality(original,[official,official],{reviewNow}).verifiedAnchors,1);
});
