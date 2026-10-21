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
  Object.freeze({
    id:'REUTERS_2026_10_14_YEMEN_AID',date:'2026-10-14',
    sourceUrl:'https://www.reuters.com/world/middle-east/yemen-hospitals-overwhelmed-by-surge-war-casualties-red-cross-warns-2026-10-14/',
    sourceKind:'INDEPENDENT_REPORT',front:'YEMEN_HOUTHI',phase:'ACTIVE_COMBAT',
    note:'Continuing active hostilities and large casualties; not a proof of incident completeness'
  }),
  Object.freeze({
    id:'UN_CHILDREN_CONFLICT_2026_10_15',date:'2026-10-15',
    sourceUrl:'https://childrenandarmedconflict.un.org/en/news/yemen-heightened-hostilities-put-children-serious-risk-grave-violations-and-threaten-hard-won',
    sourceKind:'OFFICIAL',front:'YEMEN_HOUTHI',phase:'FULL_SCALE_WAR',
    note:'15 Oct official UN statement describes hostilities intensified to full-scale; not proof of other fronts or a verified exact numeric score'
  }),
  Object.freeze({
    id:'AP_TAIZ_2026_10_20',date:'2026-10-20',
    sourceUrl:'https://apnews.com/article/8a036054a8f0cd38ff8ee0101947f708',
    sourceKind:'INDEPENDENT_REPORT',front:'YEMEN_HOUTHI',phase:'ACTIVE_COMBAT',
    note:'Distinct Oct20 Taiz residential strike reported; Shabwa fatality revisions must not count as a second strike'
  }),
  Object.freeze({
    id:'REUTERS_2026_10_15_ADEN',date:'2026-10-15',
    sourceUrl:'https://www.reuters.com/world/middle-east/saudi-led-coalition-says-houthis-attempted-attack-dozens-saudi-facilities-2026-10-15/',
    sourceKind:'INDEPENDENT_REPORT',front:'YEMEN_HOUTHI',phase:'ACTIVE_COMBAT',
    note:'Reported palace attack and continuing war, not exact casualty count ground truth'
  }),
  Object.freeze({
    id:'REUTERS_2026_10_16_TAIZ',date:'2026-10-16',
    sourceUrl:'https://www.reuters.com/world/middle-east/yemens-besieged-taiz-families-take-shelter-houthis-close-2026-10-16/',
    sourceKind:'INDEPENDENT_REPORT',front:'YEMEN_HOUTHI',phase:'ACTIVE_COMBAT',
    note:'Continuing siege and fighting in Taiz, not a new independently unique attack event'
  }),
  Object.freeze({
    id:'REUTERS_2026_10_20_SHABWA',date:'2026-10-20',
    sourceUrl:'https://www.reuters.com/world/middle-east/death-toll-houthi-attack-yemen-training-camp-rises-73-2026-10-20/',
    sourceKind:'INDEPENDENT_REPORT',front:'YEMEN_HOUTHI',phase:'ACTIVE_COMBAT',
    note:'Updating casualties of earlier training-camp assault, not a new attack'
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


/**
 * Derive a mathematical *lower bound* on the candidate scale from one dated
 * independently reviewed upper-limit constraint. It does not identify a best
 * coefficient; every larger coefficient can satisfy the same upper bound.
 */
export function minimumScaleForHistoricalCap(shadow,{date,maxScore}={}){
 if(!Number.isFinite(shadow?.weightedPointScale)||shadow.weightedPointScale<=0||
  !Number.isFinite(shadow?.anchorScore)||shadow.anchorScore<=0||
  shadow.anchorScore>=100||typeof date!=='string'||
  !Number.isFinite(maxScore)||maxScore<=shadow.anchorScore||maxScore>=100||
  !Array.isArray(shadow.history))
  throw Error('R5_SCALE_LIMIT_INPUT_INVALID');
 const point=shadow.history.find(h=>h.date===date);
 if(!point||!Number.isFinite(point.value)||point.value<=0||point.value>=100||
  point.value<=shadow.anchorScore)
  throw Error('R5_SCALE_LIMIT_UNIDENTIFIABLE');
 const logit=p=>Math.log(p/(1-p));
 const numerator=(logit(point.value/100)-logit(shadow.anchorScore/100))*shadow.weightedPointScale;
 const denominator=logit(maxScore/100)-logit(shadow.anchorScore/100);
 const threshold=numerator/denominator;
 return {date,maxScore,minimumAllowedScale:threshold,
  smallestWholeNumberCandidate:Math.ceil(threshold),
  empiricallyCalibrated:false,autoSelected:false,
  note:'Necessary boundary from one upper limit, not an independently validated optimum.'};
}
