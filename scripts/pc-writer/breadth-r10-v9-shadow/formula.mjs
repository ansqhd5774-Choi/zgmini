/**
 * R10 V9 fixed five-factor, read-only Shadow proposal.
 * Removes F6 entirely and uses 20 PRIOR QUALIFIED sessions for F5 endpoint.
 * No fabricated dates, closes, volumes, scores, or dynamic redistribution.
 * NOT approved to replace live B1-R5 or prior R10 Shadow.
 */
import {dailyBreadth,emaObserved,endpointBreadth} from './audit.mjs';
export const METHOD='BREADTH_R10_V9_FIXED_5F_VALID_OBSERVATION_SHADOW';
export const FACTOR_WEIGHTS=Object.freeze({F1:0.20,F2:2/15,F3:0.20,F4:0.20,F5:4/15});
export const RULES=Object.freeze({dailyCoverage:0.98,minimumValidHistory:20,maxLookbackSessions:60,emaFinal:3,missingValuePolicy:'NO_IMPUTATION',
  missingDayPolicy:'NO_NEW_SCORE_EXPLICIT_STALE_LAST_VERIFIED',source:'PC_LOCAL_STORED_ONLY',status:'SHADOW_UNAPPROVED'});
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const round=x=>finite(x)?Number(x.toFixed(9)):null;
const missing=(reason,extra={})=>({status:'NOT_READY',score:null,reason,method:METHOD,...extra});

/** Inputs were separately audited in the upstream PIT/source pipeline.
 * A missing day is skipped. The current date must have qualified prices.
 */
export function computeFiveFactor({dates,days,byDate,memberByDate}={}){
  if(!Array.isArray(dates)||!Array.isArray(days)||dates.length!==days.length||dates.length<21||dates.length>60)
    return missing('WINDOW_INVALID');
  if(dates.some((d,i)=>!/^\d{4}-\d{2}-\d{2}$/.test(d)||(i&&d<=dates[i-1])||days[i]?.date!==d))return missing('DATES_UNVERIFIED');
  const latest=dates.at(-1),currentDay=days.at(-1);
  if(!currentDay.pass)return missing('LATEST_SOURCE_UNQUALIFIED',{latest});
  const qualified=[];
  for(let i=0;i<dates.length;i++){
    const date=dates[i];if(!days[i]?.pass)continue;
    const members=memberByDate.get(date),rows=byDate.get(date);
    if(!Array.isArray(members)||!(rows instanceof Map)||days[i].eligible<days[i].required)return missing('SOURCE_COVERAGE_DISAGREEMENT',{latest,date});
    const d=dailyBreadth(members,rows);
    if(!d)return missing('BREADTH_INPUT_INVALID',{latest,date});
    qualified.push({date,...d});
  }
  if(qualified.length<21)return missing('HISTORY_INSUFFICIENT',{latest,validDailySessions:qualified.length});
  if(qualified.at(-1).date!==latest)return missing('LATEST_SOURCE_UNQUALIFIED',{latest});
  const current=byDate.get(latest),members=memberByDate.get(latest);
  const previous=qualified.at(-21).date; // 20th PRIOR qualified observation, not a fixed calendar-date substitute.
  const F5=endpointBreadth(current,byDate.get(previous),members);
  if(!finite(F5.value))return missing('F5_TICKER_COVERAGE_FAIL',{latest,referenceDate:previous,f5Eligible:F5.eligible,f5Required:F5.required});
  const v=qualified.map(x=>x.dailyComposite),factors={F1:qualified.at(-1).F1,F2:qualified.at(-1).F2,
    F3:emaObserved(v,5),F4:emaObserved(v,20),F5:F5.value};
  if(Object.values(factors).some(x=>!finite(x)||x<0||x>100))return missing('FACTOR_INVALID',{latest});
  const score=Object.entries(FACTOR_WEIGHTS).reduce((s,[k,w])=>s+factors[k]*w,0);
  return {status:'CANDIDATE_READY',method:METHOD,score:round(score),latest,observationDate:latest,referenceDate:previous,
    factors:Object.fromEntries(Object.entries(factors).map(([k,x])=>[k,round(x)])),
    contributions:Object.fromEntries(Object.entries(FACTOR_WEIGHTS).map(([k,w])=>[k,round(w*factors[k])])),
    f5Eligible:F5.eligible,f5Required:F5.required,validDailySessions:qualified.length,
    missingDates:dates.filter((d,i)=>!days[i].pass),f6Used:false,approved:false};
}

/** Only exposure-layer choice: never claim the stale value is the current session's NEW score.
 * Reference dates should be an authoritative market-session ordered calendar.
 */
export function presentLastVerified({marketDates,asOf,verifiedScores,maxLagSessions=2}={}){
  if(!Array.isArray(marketDates)||!Array.isArray(verifiedScores)||marketDates.at(-1)!==asOf)
    return {status:'UNAVAILABLE',score:null,reason:'CALENDAR_OR_HISTORY_INVALID'};
  const valid=verifiedScores.filter(x=>x?.status==='CANDIDATE_READY'&&finite(x.score)&&x.observationDate<=asOf);
  const last=valid.at(-1);
  if(!last)return {status:'UNAVAILABLE',score:null,reason:'NO_VERIFIED_SCORE'};
  const index=marketDates.indexOf(last.observationDate),lag=marketDates.length-1-index;
  if(index<0||lag<0||lag>maxLagSessions)return {status:'UNAVAILABLE',score:null,reason:'STALE_LIMIT_EXCEEDED',latestVerifiedDate:last.observationDate,lagSessions:lag};
  return {status:lag===0?'READY':'STALE',score:last.score,asOf,observationDate:last.observationDate,
    lagSessions:lag,newObservation:lag===0,missingCurrent:lag>0,method:METHOD};
}

export function smoothFiveFactorSeries(rows=[]){
  let prev=null;return rows.map(x=>{
    if(x.status!=='CANDIDATE_READY'){prev=null;return {...x,ema3:null}}
    const score=x.score;
    if(!finite(score)||score<0||score>100)throw Error('SHADOW_SCORE_INVALID');
    prev=prev===null?score:prev+0.5*(score-prev);
    return {...x,ema3:round(prev)};
  });
}
