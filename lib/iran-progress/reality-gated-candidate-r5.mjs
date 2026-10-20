/**
 * R5 candidate calibration CHECK — no live scores, no provider requests.
 * Uses independent verified dated phase caps to reject an overly optimistic
 * retrospective backcast. A score passing caps is NOT validated ground truth.
 */
import {compareR5SensitivityShadows,auditR5HistoryAgainstReality} from './daily-reality-check-r5.mjs';

export const R5_EVIDENCE_SCALE_CANDIDATE=21;
export const R5_EVIDENCE_BENCHMARKS=Object.freeze([
  // Minimal metadata only. The report date is not a fabricated attack date.
  Object.freeze({
    id:'UN_DPPA_2026_10_08',date:'2026-10-08',
    sourceUrl:'https://dppa.un.org/en/news/todays-top-news-yemen-libya-central-africa-afghanistan',
    sourceKind:'OFFICIAL',front:'YEMEN_HOUTHI',phase:'ACTIVE_COMBAT',
    note:'Ongoing multi-front fighting and cross-border attacks, no verified ceasefire'
  }),
  Object.freeze({
    id:'UN_OSESGY_2026_10_09',date:'2026-10-09',
    sourceUrl:'https://osesgy.unmissions.org/en/news/briefing-by-the-un-special-envoy-for-yemen-hans-grundberg-to-the-security-council-3',
    sourceKind:'OFFICIAL',front:'YEMEN_HOUTHI',phase:'FULL_SCALE_WAR',
    note:'UN envoy explicitly reports full-scale war across several fronts'
  }),
  Object.freeze({
    id:'UN_OSESGY_2026_10_11',date:'2026-10-11',
    sourceUrl:'https://osesgy.unmissions.org/en/news/statement-by-un-special-envoy-for-yemen-hans-grundberg-on-latest-attacks-against-saudi',
    sourceKind:'OFFICIAL',front:'YEMEN_HOUTHI',phase:'ACTIVE_COMBAT',
    note:'UN condemns continuing Saudi civilian-infrastructure attacks'
  }),
]);
export function makeReviewedR5Benchmarks({reviewedAt,allowList}={}){
 if(!Number.isSafeInteger(reviewedAt)||reviewedAt<1||!Array.isArray(allowList)||
   new Set(allowList).size!==allowList.length)
  throw Error('R5_REVIEW_PROVENANCE_REQUIRED');
 // The above metadata NEVER implicitly means source-text reviewed.
 return R5_EVIDENCE_BENCHMARKS.filter(r=>allowList.includes(r.id)).map(r=>({
  reviewStatus:'SOURCE_TEXT_REVIEWED',
  sourceKind:r.sourceKind,sourceId:r.id,sourceUrl:r.sourceUrl,
  reportDate:r.date,assertedOngoingOn:r.date,front:r.front,
  phase:r.phase,reviewedAt,
 }));
}
/**
 * Compute 21 candidate from unapproved original 11.31 Shadow history, and
 * explicitly fail publication if independent evidence is incomplete.
 * Only research source-date constraints, not proof of current 13 correctness.
 */
export function evaluateR5Candidate21(shadow,{anchors=[],reviewNow=Date.now()}={}){
 const options=[shadow.weightedPointScale,R5_EVIDENCE_SCALE_CANDIDATE]
  .filter((v,i,a)=>a.indexOf(v)===i);
 const compared=compareR5SensitivityShadows(shadow,anchors,options,{reviewNow});
 const candidate=compared.trials.find(t=>t.scale===R5_EVIDENCE_SCALE_CANDIDATE);
 const comparison=auditR5HistoryAgainstReality({history:candidate.history},anchors,{reviewNow});
 const supportedDates=new Set(anchors.filter(a=>a.reviewStatus==='SOURCE_TEXT_REVIEWED')
  .map(a=>a.assertedOngoingOn));
 const hasFullscale=anchors.some(a=>a.reviewStatus==='SOURCE_TEXT_REVIEWED'&&a.phase==='FULL_SCALE_WAR');
 const missingConclusiveEvidence=!hasFullscale||supportedDates.size<3||
  !supportedDates.has('2026-10-09')||
  !supportedDates.has('2026-10-20')||
  !supportedDates.has('2026-10-21');
 return {
  status:comparison.contradictions.length?'REALITY_CONTRADICTED':
   missingConclusiveEvidence?'REALITY_INPUT_INCOMPLETE':'RESEARCH_CONSTRAINTS_NOT_CONTRADICTED',
  sensitivity:R5_EVIDENCE_SCALE_CANDIDATE,
  candidateHistory:candidate.history,
  candidateScore:candidate.history.at(-1)?.value??null,
  contradictions:comparison.contradictions,
  independentSourceDateCount:supportedDates.size,
  realityReferenceScoreVerified:false,
  coverageOfAllFrontsVerified:false,
  selectedForProduction:false,productionReady:false,
  note:'K=21 is a feasibility comparator, NOT exact calibration. No automatic publication.',
 };
}
