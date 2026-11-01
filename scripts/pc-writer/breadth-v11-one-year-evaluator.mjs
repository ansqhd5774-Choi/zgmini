/**
 * V11 independent annual SHADOW evaluator. No approved weights, input contract,
 * observation eligibility, B1-R5 score or public/PC writer is modified.
 *
 * Compare V9's EMA3 reset-after-gap with EMA3 continuing across the next
 * QUALIFIED observation. Unqualified dates NEVER receive a synthetic score.
 * This is a candidate, NOT an approved production scoring methodology.
 */
export const ANNUAL_SESSIONS=252;
export const V11_CANDIDATE='BREADTH_V11_OBSERVED_EMA3_CONTINUITY_SHADOW';
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const validScore=x=>finite(x)&&x>=0&&x<=100;
const round=x=>Math.round(x*1e9)/1e9;
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const mean=x=>x.length?round(x.reduce((a,b)=>a+b,0)/x.length):null;
const percentile95=xs=>!xs.length?null:xs.slice().sort((a,b)=>a-b)[Math.ceil(xs.length*.95)-1];
function metric(rows,dates){
 const valid=rows.filter(r=>validScore(r.score));
 const adjacent=[],observed=[],recovery=[],baselineMovement=[],directionPairs=[];
 for(let i=1;i<valid.length;i++){
  const a=valid[i-1],b=valid[i],distance=dates.indexOf(b.date)-dates.indexOf(a.date);
  const movement=Math.abs(b.score-a.score);observed.push(movement);
  if(distance===1)adjacent.push(movement);
  if(distance>1)recovery.push({date:b.date,gapSessions:distance-1,absoluteChange:round(movement)});
  const rawMove=b.raw-a.raw,displayMove=b.score-a.score;
  if(Math.abs(rawMove)>1e-9 && Math.abs(displayMove)>1e-9)directionPairs.push(Math.sign(rawMove)===Math.sign(displayMove));
 }
 return {observedDates:valid.length,missingDates:rows.length-valid.length,
  meanAbsAdjacentChange:mean(adjacent),adjacentPairs:adjacent.length,
  meanAbsObservedChange:mean(observed),observedPairs:observed.length,
  p95AbsObservedChange:percentile95(observed),
  maxAbsObservedChange:observed.length?round(Math.max(...observed)):null,
  recoveries:recovery,
  rawDirectionAgreement:directionPairs.length?{matched:directionPairs.filter(Boolean).length,compared:directionPairs.length}:null,
  lastScore:valid.at(-1)?.score??null,lastObservationDate:valid.at(-1)?.date??null};
}
export function evaluateV11Annual({marketDates,perDay,source=null,compareB1=null}={}){
 if(!Array.isArray(marketDates)||marketDates.length!==ANNUAL_SESSIONS||
  marketDates.some((x,i)=>!date(x)||(i>0&&x<=marketDates[i-1])))throw Error('V11_252_CALENDAR_REQUIRED');
 if(!Array.isArray(perDay)||perDay.length<ANNUAL_SESSIONS||
  perDay.some((r,i)=>!date(r?.date)||(i>0&&r.date<=perDay[i-1].date)))throw Error('V11_INPUT_SERIES_INVALID');
 const year=perDay.slice(-ANNUAL_SESSIONS);
 if(year.some((r,i)=>r.date!==marketDates[i]))throw Error('V11_ANNUAL_DATE_ALIGNMENT_FAILED');
 if(source?.methodologyVersion!=='BREADTH_R10_V9_FIXED_5F_VALID_OBSERVATION_SHADOW'||
    source?.quality?.noImputation!==true||source?.quality?.pitOfficialIndependentlyVerified!==false)
    throw Error('V11_FROZEN_V9_SOURCE_CONTRACT_NOT_VERIFIED');
 const reasons={},compared=[],base=[],cont=[];
 let lastContinuity=null,lastBase=null;
 // Use full supplied prefix for deterministic warm-up. The one-year evaluation
 // still includes EXACTLY the final 252 market sessions.
 const annualStart=perDay.length-ANNUAL_SESSIONS;
 for(let i=0;i<perDay.length;i++){
  const r=perDay[i],ready=r.status==='CANDIDATE_READY';
  if(!ready){
   if(i>=annualStart)reasons[r.reason??'UNSPECIFIED']=(reasons[r.reason??'UNSPECIFIED']??0)+1;
   lastBase=null;
   if(i>=annualStart){
    base.push({date:r.date,score:null,raw:null});
    cont.push({date:r.date,score:null,raw:null});
   }
   continue;
  }
  if(!validScore(r.score)||!validScore(r.ema3))throw Error('V11_INVALID_VERIFIED_PRICE_SCORE');
  const expectedBase=round(lastBase===null?r.score:lastBase+.5*(r.score-lastBase));
  if(Math.abs(expectedBase-r.ema3)>0.000001)throw Error('V11_BASELINE_RECOMPUTE_MISMATCH:'+r.date);
  lastBase=r.ema3;
  lastContinuity=round(lastContinuity===null?r.score:lastContinuity+.5*(r.score-lastContinuity));
  if(i>=annualStart){
   base.push({date:r.date,score:r.ema3,raw:r.score});
   cont.push({date:r.date,score:lastContinuity,raw:r.score});
   compared.push({date:r.date,baseline:r.ema3,candidate:lastContinuity,diff:round(lastContinuity-r.ema3)});
  }
 }
 const baseline=metric(base,marketDates),candidate=metric(cont,marketDates);
 const actualDayCoverage=baseline.observedDates/ANNUAL_SESSIONS;
 const last=compared.at(-1)??null;
 // Full 252 *actual observed* scores are a strict gate; a temporal one-year
 // span or nonzero score does NOT constitute a full-coverage historical pass.
 return {
  task:'BREADTH_V11_252_SESSION_COMPARE',status:'SHADOW_COMPARISON_COMPLETE',
  proposedMethod:V11_CANDIDATE,existingMethod:source.methodologyVersion,
  policy:'READ_ONLY_NO_NEW_DATES_NO_IMPUTATION_NO_PUBLIC_CUTOVER',
  year:{requiredMarketSessions:ANNUAL_SESSIONS,first:marketDates[0],last:marketDates.at(-1),
   observedValidDates:baseline.observedDates,missingDates:baseline.missingDates,
   observedCoverage:round(actualDayCoverage),missingReasons:reasons,
   qualification:'SOURCE_AUDITED_V9_98_PERCENT_PER_DATE',
   full252Observed:baseline.observedDates===ANNUAL_SESSIONS,
   completeYearStatus:baseline.observedDates===ANNUAL_SESSIONS?'FULL_252_OBSERVED':'PARTIAL_ANNUAL_EVIDENCE'},
  baseline,candidate,
  changes:{scoredDatesCompared:compared.length,changedScoreDates:compared.filter(x=>Math.abs(x.diff)>1e-8).length,
   maxAbsScoreDifference:compared.length?round(Math.max(...compared.map(x=>Math.abs(x.diff)))):null,
   meanAbsScoreDifference:mean(compared.map(x=>Math.abs(x.diff))),
   latest: last?{date:last.date,baseline:last.baseline,candidate:last.candidate,delta:last.diff}:null},
  sourceEvidence:{pitOfficialIndependentlyVerified:false,sourceVersion:source.methodologyVersion,
   noImputation:true,providerCalls:0,dbWrites:0,d1Writes:0,publications:0,taskChanges:0},
  benchmark:{status:compareB1?'UNVERIFIED_EXTERNAL_BENCHMARK':'NOT_AVAILABLE_SAME_DATE_STORED_B1_R5',
   note:'Predictive accuracy and improvement over B1-R5 require an independently verified, date-matched benchmark.'},
  decision:{productionPromotionApproved:false,
   scoreCalculationVerification:baseline.observedDates>0?'COMPUTED_ONLY':'NO_SCORES',
   oneYearComplete:baseline.observedDates===ANNUAL_SESSIONS,
   directionalSuperiorityProven:false,
   recommendation:'DO_NOT_CHANGE_PUBLIC_SCORE_OR_APPROVED_FORMULA'},
 };
}
