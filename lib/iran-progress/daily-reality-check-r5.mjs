/**
 * Independent historical constraints for R5 RESEARCH ONLY.
 * A verified dated public war-state assertion is a possible UPPER score bound.
 * A compatible score is not thereby proven correct. Never fetch or auto-promote
 * an external publication into the local verified event ledger.
 */
import {IRAN_R4_BANDS,IRAN_R4_FRONT_IDS} from './reality-shadow-r4.mjs';
import {validDate} from './reference-flow-r3.mjs';

export const R5_REALITY_CHECK_VERSION='IRAN_R5_HISTORICAL_PHASE_REVIEW_V1';
const RESTRICTIVE=new Set(['CRITICAL_ESCALATION','FULL_SCALE_WAR','ACTIVE_COMBAT']);
const isVerified=a=>a?.reviewStatus==='SOURCE_TEXT_REVIEWED'&&
 ['OFFICIAL','INDEPENDENT_REPORT'].includes(a.sourceKind)&&
 IRAN_R4_FRONT_IDS.includes(a.front)&&
 RESTRICTIVE.has(a.phase)&&validDate(a.reportDate)&&
 validDate(a.assertedOngoingOn)&&a.reportDate<=a.assertedOngoingOn&&
 typeof a.sourceId==='string'&&a.sourceId.length>0&&
 typeof a.sourceUrl==='string'&&/^https:\/\//.test(a.sourceUrl)&&
 Number.isSafeInteger(a.reviewedAt)&&a.reviewedAt>0;
export function auditR5HistoryAgainstReality(shadow,anchors,{reviewNow=Date.now()}={}){
 if(!Array.isArray(shadow?.history)||shadow.history.length>14||!Array.isArray(anchors)||
  anchors.length>100||!Number.isSafeInteger(reviewNow)||reviewNow<1)
  throw Error('R5_REALITY_AUDIT_INPUT_INVALID');
 const dates=new Map();
 for(const entry of shadow.history){
  if(!validDate(entry.date)||!Number.isFinite(entry.value)||entry.value<0||entry.value>100||
   dates.has(entry.date))throw Error('R5_REALITY_HISTORY_INVALID');
  dates.set(entry.date,entry);
 }
 const accepted=[],rejected=[],unique=new Set();
 for(const row of anchors){
  const fingerprint=JSON.stringify([row?.sourceId,row?.front,row?.phase,row?.assertedOngoingOn]);
  if(unique.has(fingerprint))continue;
  unique.add(fingerprint);
  if(!isVerified(row)||row.reviewedAt>reviewNow||!dates.has(row.assertedOngoingOn)){
   rejected.push({sourceId:typeof row?.sourceId==='string'?row.sourceId:null,
    reason:'INDEPENDENT_EVIDENCE_UNVERIFIED_OUTSIDE_WINDOW_OR_FUTURE'});continue;
  }
  accepted.push(row);
 }
 const contradictory=[],notContradicted=[];
 for(const date of dates.keys()){
  const dateAnchors=accepted.filter(r=>r.assertedOngoingOn===date);
  if(!dateAnchors.length)continue;
  const cap=Math.min(...dateAnchors.map(a=>IRAN_R4_BANDS[a.phase].max));
  const item={date,score:dates.get(date).value,
   maximumCompatibleScore:cap,fronts:[...new Set(dateAnchors.map(r=>r.front))].sort(),
   sourceIds:[...new Set(dateAnchors.map(r=>r.sourceId))].sort(),
   phaseBandStatus:'UNAPPROVED_R4_CANDIDATE'};
  if(item.score>cap)contradictory.push(item);
  else notContradicted.push(item);
 }
 return {version:R5_REALITY_CHECK_VERSION,
  status:contradictory.length?'REALITY_CONTRADICTED':
   accepted.length?'NOT_CONTRADICTED_BUT_UNCALIBRATED':'REALITY_EVIDENCE_INCOMPLETE',
  contradictions:contradictory,compatibleButUncalibrated:notContradicted,
  verifiedAnchors:accepted.length,rejectedAnchors:rejected.length,
  datesWithoutVerifiedConstraint:shadow.history.length-contradictory.length-notContradicted.length,
  productionReady:false,
  note:'One dated current-war constraint can disprove an overoptimistic score, never prove exact score; bands not approved.'};
}


/**
 * Compare mathematical sensitivity ONLY. Reuse the same dated R5 event input,
 * immutable reference anchor and independent phase constraints. Never select
 * a coefficient because it happens to match an individual retrospective date.
 */
export function compareR5SensitivityShadows(shadow,anchors,scales,{reviewNow=Date.now()}={}){
 if(!Number.isFinite(shadow?.anchorScore)||shadow.anchorScore<=0||
    shadow.anchorScore>=100||!Number.isFinite(shadow?.weightedPointScale)||
    shadow.weightedPointScale<=0||!Array.isArray(scales)||scales.length<1||scales.length>12||
    scales.some(k=>!Number.isFinite(k)||k<=0||k>100)||
    new Set(scales).size!==scales.length)throw Error('R5_SENSITIVITY_INPUT_INVALID');
 const origin=shadow.anchorScore/100,z0=Math.log(origin/(1-origin)),base=shadow.weightedPointScale;
 const logistic=z=>z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
 const trial=scales.map(scale=>{
  const history=shadow.history.map(point=>{
   if(!Number.isFinite(point.value)||point.value<=0||point.value>=100)
    throw Error('R5_SENSITIVITY_SCORE_PRECISION_INVALID');
   const p=point.value/100,z=Math.log(p/(1-p));
   return {...point,value:Number((100*logistic(z0+(z-z0)*base/scale)).toFixed(2))};
  });
  const audit=auditR5HistoryAgainstReality({history},anchors,{reviewNow});
  return {scale,history,realismStatus:audit.status,
   contradictoryDays:audit.contradictions,
   verifiedDates:audit.verifiedAnchors,
   productionReady:false,calibrated:false};
 });
 return {status:'SHADOW_COMPARISON_ONLY',anchorScore:shadow.anchorScore,
  trials:trial,autoSelected:false,productionReady:false,
  note:'A variant with fewer violations is not automatically a validated real-world equation.'};
}
