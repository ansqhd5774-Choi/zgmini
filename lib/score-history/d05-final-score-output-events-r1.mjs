// D05 source-only adapter: retain final calculated scores, not indicators or raw inputs.
import {createHash} from 'node:crypto';
export const D05_FINAL_EVENT_VERSION='D05_FINAL_SCORE_EVENT_R1';
const VALID_ID=/^(market|sector|theme):[\p{L}\p{N}][\p{L}\p{N}_.· -]{0,119}$/u;
const PHASES=new Set(['CONFIRMED','PROVISIONAL','UNSPECIFIED']);
const KEYS=['version','pointKind','scoreId','score','asOfDate','calculatedAt','calculatedDateKst','formulaVersion','phase','eventId'];
const validDay=x=>typeof x==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(x)&&
 Number.isFinite(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const validAt=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&
 Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const version=x=>typeof x==='string'&&x.length>0&&x.length<=160?x:null;
const kstDay=x=>new Date(Date.parse(x)+32400000).toISOString().slice(0,10);
function fingerprint(x){
 return createHash('sha256').update(JSON.stringify([D05_FINAL_EVENT_VERSION,x.scoreId,x.score,
 x.asOfDate,x.calculatedAt,x.formulaVersion,x.phase])).digest('hex');
}
function makeEvent({scoreId,score,asOfDate,calculatedAt,formulaVersion,phase}){
 if(!VALID_ID.test(scoreId))throw Error('D05_SCORE_ID_INVALID');
 if(!validScore(score))throw Error('D05_SCORE_INVALID');
 if(!validDay(asOfDate))throw Error('D05_SCORE_DATE_INVALID');
 if(!validAt(calculatedAt))throw Error('D05_CALCULATION_CLOCK_UNVERIFIED');
 if(!PHASES.has(phase))throw Error('D05_PHASE_INVALID');
 const item={version:D05_FINAL_EVENT_VERSION,pointKind:'ACTUAL_CALCULATED_FINAL_SCORE',
 scoreId,score,asOfDate,calculatedAt,calculatedDateKst:kstDay(calculatedAt),
 formulaVersion:version(formulaVersion),phase};
 return Object.freeze({...item,eventId:fingerprint(item)});
}
function requireEvent(e){
 if(!e||Object.keys(e).sort().join('|')!==[...KEYS].sort().join('|')||
  e.version!==D05_FINAL_EVENT_VERSION||e.pointKind!=='ACTUAL_CALCULATED_FINAL_SCORE'||
  !VALID_ID.test(e.scoreId)||!validScore(e.score)||!validDay(e.asOfDate)||
  !validAt(e.calculatedAt)||e.calculatedDateKst!==kstDay(e.calculatedAt)||
  !PHASES.has(e.phase)||e.formulaVersion!==version(e.formulaVersion)||
  e.eventId!==fingerprint(e))throw Error('D05_FINAL_EVENT_INVALID');
}
// calculatedAt must be a verified local calculation receipt, not publishedAt,
// updatedAt, D1 stored_at, API GET time or a reconstructed historical label.
export function captureFinalScoreOutputs({group,body,calculatedAt}={}){
 if(!validAt(calculatedAt))throw Error('D05_CALCULATION_CLOCK_UNVERIFIED');
 if(!['market','sector','theme'].includes(group))throw Error('D05_GROUP_INVALID');
 if(body?.status!==(group==='market'?'SUCCESS':'READY'))return Object.freeze([]);
 const output=[],seen=new Set(),phase=PHASES.has(body.phase)?body.phase:'UNSPECIFIED';
 const add=(item,id,day,method,scorePhase)=>{
  if(item?.status!=null&&item.status!=='READY')return;
  const scoreId=group+':'+id;
  if(seen.has(scoreId))throw Error('D05_SCORE_DUPLICATE');
  const event=makeEvent({scoreId,score:item?.score,asOfDate:item?.asOfDate??
   item?.observationDate??day,calculatedAt,formulaVersion:item?.methodologyVersion??
   method,phase:scorePhase});
  seen.add(scoreId);output.push(event);
 };
 if(group==='market'){
  add(body.overall,'overall',body.asOfDate,body.overall?.methodologyVersion,'UNSPECIFIED');
  if(!Array.isArray(body.domains))throw Error('D05_SCORE_OUTPUT_INVALID');
  for(const d of body.domains)if(d?.status==='READY')add(d,d.id,body.asOfDate,null,'UNSPECIFIED');
 }else if(group==='sector'){
  if(!Array.isArray(body.sectors))throw Error('D05_SCORE_OUTPUT_INVALID');
  for(const s of body.sectors)add(s,s?.id,body.observationDate,body.methodologyVersion,phase);
 }else{
  if(!Array.isArray(body.themes))throw Error('D05_SCORE_OUTPUT_INVALID');
  for(const t of body.themes)add(t,t?.id??t?.theme,body.observationDate,body.methodologyVersion,phase);
 }
 return Object.freeze(output);
}
// Pure memory operation. No existing DB/table/file is written by this module.
export function mergeFinalScoreEvents(prior=[],newEvents=[]){
 if(!Array.isArray(prior)||!Array.isArray(newEvents)||prior.length+newEvents.length>25000)
  throw Error('D05_EVENTS_INVALID');
 const found=new Map();
 for(const event of [...prior,...newEvents]){
  requireEvent(event);
  const key=event.scoreId+'|'+event.calculatedAt,existing=found.get(key);
  if(existing&&existing.eventId!==event.eventId)throw Error('D05_SAME_CLOCK_CONFLICT');
  if(!existing)found.set(key,event);
 }
 return Object.freeze([...found.values()].sort((a,b)=>
  a.calculatedAt.localeCompare(b.calculatedAt)||a.scoreId.localeCompare(b.scoreId)));
}
// Only selects actual stored events. Never fills missing dates or imports trend points.
export function finalScoreDailySnapshots(events,{fromDay='0000-00-00',toDay='9999-12-31'}={}){
 if(!Array.isArray(events)||fromDay!=='0000-00-00'&&!validDay(fromDay)||
  toDay!=='9999-12-31'&&!validDay(toDay)||fromDay>toDay)throw Error('D05_DATE_RANGE_INVALID');
 const chosen=new Map();
 for(const event of events){
  requireEvent(event);
  if(event.calculatedDateKst<fromDay||event.calculatedDateKst>toDay)continue;
  const key=event.scoreId+'|'+event.calculatedDateKst,old=chosen.get(key);
  if(!old||old.calculatedAt<event.calculatedAt)chosen.set(key,event);
  else if(old.calculatedAt===event.calculatedAt&&old.eventId!==event.eventId)
   throw Error('D05_SAME_CLOCK_CONFLICT');
 }
 return Object.freeze([...chosen.values()].sort((a,b)=>
  a.scoreId.localeCompare(b.scoreId)||a.calculatedDateKst.localeCompare(b.calculatedDateKst)));
}
