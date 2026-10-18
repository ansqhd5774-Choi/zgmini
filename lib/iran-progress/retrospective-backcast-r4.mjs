/**
 * Iran war retrospective score paths (independent research helpers only).
 * 18 is an analyst's provisional 2026-10-18 point estimate, not an official
 * measurement. Never publish a 14-day chart simply by subtracting R3 changes.
 */
import {calculateIranR4RealityShadow} from './reality-shadow-r4.mjs';
export const R4_BACKCAST_VERSION='IRAN_R4_BACKCAST_RESEARCH_V1';
const DAY=86400000;
const round=n=>Number(n.toFixed(2));
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
 Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const at=d=>Date.parse(d+'T00:00:00Z');
const dates14=end=>Array.from({length:14},(_,i)=>new Date(at(end)-(13-i)*DAY).toISOString().slice(0,10));
const cap=x=>Math.max(0,Math.min(100,round(x)));
const blank=(date,reason)=>({date,value:null,measured:false,reason});
/**
 * Illustrative reverse calculation using *existing R3 published-article deltas*.
 * NOT the R4 formula. No values prior to first supported article event.
 */
export function buildProvisionalR4AnchorBackcast({asOfDate,anchorScore,anchorReason,
 r3History}={}){
 if(!validDate(asOfDate)||!Number.isFinite(anchorScore)||anchorScore<0||anchorScore>100||
  typeof anchorReason!=='string'||anchorReason.trim().length<8||
  !Array.isArray(r3History)||r3History.length>14)
  throw Error('R4_ANCHOR_PREVIEW_INVALID');
 const range=dates14(asOfDate);
 const deltas=new Map();
 let previous='';
 for(const p of r3History){
  if(!validDate(p?.date)||p.date<=previous||p.date>asOfDate||
   !Number.isFinite(p?.delta)||!Number.isFinite(p?.value)||p.value<0||p.value>100||
   p.date<range[0])throw Error('R4_BACKCAST_DELTA_INVALID');
  previous=p.date;
  // Only net R3 changes on an actual source event date. A 50-point
  // R3 baseline and all preceding artificial carried values are excluded.
  if(p.delta!==0)deltas.set(p.date,p.delta);
 }
 if(!deltas.has(asOfDate))
  return {status:'INSUFFICIENT_EVENT_DATE',version:R4_BACKCAST_VERSION,
   anchorScore,history:range.map(d=>blank(d,'NO_DATED_EVENT_ON_ANCHOR_DAY')),
   productionReady:false};
 let cursor=anchorScore;
 const first=[...deltas.keys()].sort()[0];
 const backwards=[];
 for(let i=range.length-1;i>=0;i--){
  const date=range[i];
  if(date<first){backwards.push(blank(date,'PRE_OBSERVATION_WINDOW'));continue;}
  backwards.push({date,value:cap(cursor),measured:false,reason:date===asOfDate?
   'ANALYST_PROVISIONAL_ANCHOR':'R3_CHANGE_PROXY_REVERSE_CALCULATION',
   reportedEventChange:deltas.get(date)??null,
   carried:!deltas.has(date)});
  cursor=cap(cursor-(deltas.get(date)??0));
 }
 const history=backwards.reverse();
 return {status:'ILLUSTRATIVE_ONLY',version:R4_BACKCAST_VERSION,asOfDate,
  anchorScore,anchorReason,history,observedDays:history.filter(p=>p.value!==null).length,
  confidence:'UNVALIDATED',productionReady:false,
  historyMode:'RETROACTIVE_ANCHOR_USING_R3_NEWS_CHANGE_PROXY',
  notice:'This is not R4 historical truth. No R3 initialization 50, no invented earlier readings.',
  cannotPublish:true};
}
/** A genuine R4 history requires each day's independent verified input as of that date.
 * Empty/missing/contradictory days remain NULL, even after a current anchor is known.
 */
export function rebuildVerifiedR4DailyHistory({asOfDate,snapshots}={}){
 if(!validDate(asOfDate)||!Array.isArray(snapshots)||snapshots.length>14)
  throw Error('R4_DAILY_REPLAY_INPUT_INVALID');
 const range=dates14(asOfDate);
 const keyed=new Map();
 for(const x of snapshots){
  if(!validDate(x?.date)||x.date<range[0]||x.date>asOfDate||
   keyed.has(x.date)||!Number.isSafeInteger(x.asOf)||x.asOf<at(x.date)||
   x.asOf>=at(x.date)+DAY)throw Error('R4_REPLAY_DATE_OR_DUPLICATE_INVALID');
  keyed.set(x.date,x);
 }
 const history=range.map(date=>{
  const row=keyed.get(date);
  if(!row)return blank(date,'NO_VERIFIED_DAY_INPUT');
  const score=calculateIranR4RealityShadow(row.input,row.asOf);
  if(score.status!=='SHADOW_READY')return blank(date,score.reason??'VERIFICATION_INCOMPLETE');
  return {date,value:score.score,measured:true,phase:score.phase,
   verifiedAsOf:row.asOf,productionReady:false};
 });
 return {status:history.every(x=>x.measured)?'REPLAY_READY':'REPLAY_PARTIAL',
  version:R4_BACKCAST_VERSION,asOfDate,history,productionReady:false,
  historyMode:'AS_OF_DAY_VERIFIED_R4_RECONSTRUCTION',
  missingDates:history.filter(x=>x.value===null).map(x=>x.date),
  anchoredToAnalystEstimate:false};
}
