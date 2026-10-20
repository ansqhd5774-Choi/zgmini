/**
 * R5 research-only model: 2026-10-21 provisional reality assessment -> dated replay.
 * No provider calls, no DB writes, no D1, no changes to R3 weights or rules.
 * All chronology uses source publication dates, NOT unverified event occurrence dates.
 */
import {R3_RULES,validDate,trustedR3Url} from './reference-flow-r3.mjs';
import {FLOW_WEIGHTS} from './reference-flow-r1.mjs';

export const R5_SHADOW_VERSION='IRAN_DAILY_REALITY_ANCHOR_SHADOW_R5_1';
export const R5_REFERENCE=Object.freeze({
  date:'2026-10-21',
  score:13,
  evidenceStatus:'USER_ACCEPTED_PROVISIONAL_ASSESSMENT_NOT_INDEPENDENTLY_VERIFIED',
  probability:false,
});
const DAY=86400000;
const RULES=new Map(R3_RULES.map(r=>[r.id,r]));
const POSITIVE_REQUIRE_INDEPENDENT_CONFIRMATION=new Set([
  'CEASEFIRE_IMPLEMENTED','MILITARY_WITHDRAWAL','MARITIME_REOPENED',
  'NUCLEAR_SIGNED','INSPECTIONS_RESUMED'
]);
const round=n=>Number(n.toFixed(2));
const dayAt=d=>Date.parse(d+'T00:00:00Z');
const dayStr=at=>new Date(at).toISOString().slice(0,10);
const logistic=z=>z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
const logit=p=>Math.log(p/(1-p));
function validatedEvents(events,asOfDate){
 if(!Array.isArray(events)||events.length>100000)throw Error('R5_EVENTS_INVALID');
 const byKey=new Map();
 for(const e of events){
  if(e?.accepted!==true)continue;
  const rule=RULES.get(e.rule);
  if(!rule||rule.type!==e.type||rule.delta!==e.delta||
    !validDate(e.date)||e.date>asOfDate||
    !trustedR3Url(e.sourceUrl)||
    typeof e.eventKey!=='string'||!e.eventKey.length)
   throw Error('R5_ACCEPTED_EVENT_CONTRACT_INVALID');
  const old=byKey.get(e.eventKey);
  if(old&&(old.date!==e.date||old.rule!==e.rule||old.delta!==e.delta))
   throw Error('R5_EVENT_IDENTITY_COLLISION');
  // An identical event reported by multiple sources counts exactly once.
  if(!old||e.sourceUrl.localeCompare(old.sourceUrl)<0)byKey.set(e.eventKey,e);
 }
 return [...byKey.values()];
}
function dailyChanges(events){
 const rows=new Map();
 for(const e of events){
  const entry=rows.get(e.date)??{date:e.date,reported:0,verified:0,negative:0,
    permittedPositive:0,unconfirmedPositive:0,net:0,adverseVeto:false};
  const contribution=e.delta*FLOW_WEIGHTS[e.type];
  entry.reported++;
  if(e.eventVerified===true)entry.verified++;
  if(contribution<0)entry.negative+=contribution;
  else if(contribution>0){
   if(e.eventVerified===true&&POSITIVE_REQUIRE_INDEPENDENT_CONFIRMATION.has(e.rule))
    entry.permittedPositive+=contribution;
   else entry.unconfirmedPositive+=contribution;
  }
  rows.set(e.date,entry);
 }
 for(const x of rows.values()){
  // A worse actual day must not display a positive net improvement.
  x.adverseVeto=x.negative<0&&x.permittedPositive+x.negative>0;
  x.net=x.adverseVeto?0:x.negative+x.permittedPositive;
  for(const k of ['negative','permittedPositive','unconfirmedPositive','net'])
   x[k]=round(x[k]);
 }
 return rows;
}
/**
 * Log-odds continuity avoids the R3 military-floor clipping.
 * The derivative d(score)/d(weighted-event-points) is 1 at the anchor.
 * The transform is a CANDIDATE, not calibrated evidence of real-war intensity.
 */
export function calculateIranDailyAnchorShadow(events,{
  asOfDate,anchorDate=R5_REFERENCE.date,anchorScore=R5_REFERENCE.score,
  collectionCheckedAt=null,collectionStatus='UNVERIFIED'
}={}){
 if(!validDate(anchorDate)||!validDate(asOfDate)||anchorDate>asOfDate||
  !Number.isFinite(anchorScore)||anchorScore<=0||anchorScore>=100)
  throw Error('R5_REFERENCE_OR_ASOF_INVALID');
 const unique=validatedEvents(events,asOfDate);
 const changes=dailyChanges(unique);
 const base=anchorScore/100;
 const derivative=100*base*(1-base);
 const z0=logit(base),anchorAt=dayAt(anchorDate),end=dayAt(asOfDate);
 const weightedBefore=new Map(),weightedAfter=new Map();
 let z=z0;
 // Backcast begins with the anchor's *end-of-day* assessed state.
 // Δ(date) maps yesterday -> today. Reverse it to obtain yesterday.
 for(let at=anchorAt;at>=end-60*DAY&&at>=dayAt('2020-01-01');at-=DAY){
  weightedBefore.set(dayStr(at),z);
  z-=(changes.get(dayStr(at))?.net??0)/derivative;
 }
 z=z0;
 for(let at=anchorAt+DAY;at<=end;at+=DAY){
  z+=(changes.get(dayStr(at))?.net??0)/derivative;
  weightedAfter.set(dayStr(at),z);
 }
 const start=end-13*DAY,history=[];
 // Where no pre-anchor dated evidence is available, history is a carried model
 // estimate, NEVER a confirmed war-state observation.
 for(let at=start;at<=end;at+=DAY){
  const date=dayStr(at),entry=changes.get(date);
  let valueZ;
  if(at>=anchorAt)valueZ=at===anchorAt?z0:weightedAfter.get(date);
  else if(weightedBefore.has(date))valueZ=weightedBefore.get(date);
  else throw Error('R5_BACKCAST_WINDOW_EXCEEDED');
  const value=round(100*logistic(valueZ));
  history.push({date,value,carried:!entry||entry.net===0,
    reportedEvents:entry?.reported??0,verifiedEvents:entry?.verified??0,
    suppressedPositivePoints:entry?.unconfirmedPositive??0,
    adverseVeto:entry?.adverseVeto??false,
    observation:'MODELLED_FROM_REPORTED_EVENTS_NOT_WAR_STATE_MEASUREMENT',
    anchorDate:date===anchorDate});
 }
 const current=history.at(-1);
 return {version:R5_SHADOW_VERSION,status:'SHADOW_UNCALIBRATED',
  score:current.value,rawScore:current.value,asOfDate,anchorDate,anchorScore,
  anchorEvidenceStatus:R5_REFERENCE.evidenceStatus,
  weights:{...FLOW_WEIGHTS},weightedPointScale:round(derivative),
  eventCount:unique.length,history,newsCollection:{status:collectionStatus,checkedAt:collectionCheckedAt},
  finalDay:changes.get(asOfDate)??null,asOfIsAnchor:asOfDate===anchorDate,
  calibrated:false,independentCurrentRealityVerified:false,productionReady:false,
  probability:false,historyMode:'PUBLICATION_DATE_ANCHORED_SHADOW',
  limitations:['13_IS_PROVISIONAL_NOT_VERIFIED_GROUND_TRUTH',
    'REPORTS_NOT_INDEPENDENT_EVENTS','MISSING_REPORTS_ARE_NOT_PEACE',
    'POSITIVE_CHANGES_REQUIRE_INDEPENDENT_VERIFICATION',
    'NO_AUTO_PUBLISH','R3_MILITARY_FLOOR_BYPASSED_ONLY_IN_SHADOW']};
}
