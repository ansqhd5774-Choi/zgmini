/** Publish the approved V11 EMA3 continuity candidate using verified V9 raw observations.
 * Keep all five factor weights, 98% input gates and missing-day nulls unchanged.
 * Does NOT declare complete 252-day coverage when history is incomplete.
 */
import {evaluateV11Annual} from './breadth-v11-one-year-evaluator.mjs';
import {projectV11PublicDomain,V11_METHOD} from '../../worker/breadth-v11-public-view.mjs';
import {V9_METHOD} from '../../worker/breadth-v9-public-view.mjs';
const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const round=x=>Math.round(x*1e9)/1e9;
const FACTOR_KEYS=Object.freeze(['F1','F2','F3','F4','F5']);
export function buildV11PublicRecord({latest,verified}={}){
 if(!latest||!verified||latest.methodologyVersion!==V9_METHOD||
    verified.methodologyVersion!==V9_METHOD||latest.quality?.noImputation!==true||
    verified.status!=='SHADOW_READY')return null;
 const rows=latest.evaluation?.perDay;
 if(!Array.isArray(rows)||rows.length!==252||rows.at(-1)?.date!==latest.asOf)return null;
 const last=rows.findLast(r=>r.status==='CANDIDATE_READY');
 const quality=verified.evaluation?.scoreSummary?.latest;
 if(!last||!quality||quality.date!==last.date||!valid(last.score)||
    !valid(last.ema3)||!valid(quality.ema3)||!valid(verified.display?.score)||
    Math.abs(quality.ema3-last.ema3)>1e-6||
    Math.abs(verified.display.score-last.ema3)>1e-6)return null;
 const f=quality.factors;
 if(!f||['F1','F2','F3','F4','F5'].some(k=>!valid(f[k])))return null;
 const evaluation=evaluateV11Annual({marketDates:rows.map(r=>r.date),perDay:rows,source:latest});
 let previous=null;
 const trend=[];
 for(const row of rows){
  if(row.status!=='CANDIDATE_READY'){
   if(row.score!==null||row.ema3!==null)return null;
   continue; // no value on an unqualified market date
  }
  if(!valid(row.score))return null;
  previous=round(previous===null?row.score:previous+0.5*(row.score-previous));
  trend.push({label:row.date,value:previous});
 }
 const factorHistory=Object.fromEntries(FACTOR_KEYS.map(k=>[k,[]]));
 let previousIndex=null;
 for(let index=0;index<rows.length;index++){
  const row=rows[index];
  if(row.status!=='CANDIDATE_READY'){
   if(row.factors!==null)return null;
   continue;
  }
  if(!row.factors||FACTOR_KEYS.some(k=>!valid(row.factors[k])))return null;
  const breakBefore=previousIndex!==null&&index-previousIndex>1;
  for(const k of FACTOR_KEYS)factorHistory[k].push({
   date:row.date,value:row.factors[k],breakBefore
  });
  previousIndex=index;
 }
 if(FACTOR_KEYS.some(k=>factorHistory[k].length!==trend.length))return null;
 const score=trend.at(-1)?.value;
 if(!valid(score)||trend.at(-1)?.label!==last.date||
    Math.abs(score-evaluation.changes.latest.candidate)>1e-6||
    trend.length!==evaluation.year.observedValidDates)return null;
 const record={
  version:1,methodologyVersion:V11_METHOD,
  source:'PC_LOCAL_B1_R3_STORED_TIME_LABELED_NOT_OFFICIAL_PIT_ATTESTED',
  asOfDate:latest.asOf,observationDate:last.date,score,
  phase:latest.asOf===last.date?'OBSERVED':'CARRY_FORWARD',
  sourceStoredAt:latest.sourceStoredAt??verified.sourceStoredAt??null,
  factors:Object.fromEntries(['F1','F2','F3','F4','F5'].map(k=>[k,f[k]])),
  trend,factorHistory,
  annualValidation:{requiredSessions:252,observedSessions:trend.length,
   missingSessions:252-trend.length,completeYear:trend.length===252},
 };
 return projectV11PublicDomain(record)?record:null;
}
