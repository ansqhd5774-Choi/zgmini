// Approved R1.3: progress, never a calibrated probability. Pure stored-input calculation.
import {transitContinuity} from './transit-ais.mjs';
export const IRAN_PROGRESS_VERSION='IRAN_PROGRESS_R1_3_AIS';
export const WEIGHTS=Object.freeze({D:.30,C:.25,M:.20,H:.15,N:.10});
export const DAY=86400000;
const PAIRS=['IRN_ISR','IRN_USA'];
const AXES=[...PAIRS,'LINKED'];
const clamp=n=>Math.max(0,Math.min(100,n));
const score=n=>Number.isFinite(n)&&n>=0&&n<=100;
const time=n=>Number.isSafeInteger(n)&&n>0;
const pending=reason=>({status:'PENDING',score:null,reason});
export function absoluteCap(a){
 if(!Number.isFinite(a)||a<0)throw Error('INVALID_ATTACK_INTENSITY');
 return a===0?100:a<1?60:a<3?40:a<10?25:10;
}
export function attackAxis(a,b,{complete=false,major=false}={}){
 if(!complete)return pending('OBSERVATION_INCOMPLETE');
 if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<0)return pending('INVALID_ATTACK_INTENSITY');
 const trend=a+b===0?100:clamp(50+50*(b-a)/(a+b));
 return {status:'READY',score:Math.min(trend,absoluteCap(a),major?25:100),trend,recentDailyIntensity:a,previousDailyIntensity:b,major};
}
export function coverageReady(c,{start,end,now}){
 return c?.status==='VERIFIED'&&c.parserOk===true&&c.classificationOk===true&&c.materialPending===0
  &&c.requiredSources?.length>0&&c.requiredSources.every(s=>s.status==='VERIFIED'&&s.termsApproved===true)
  &&Array.isArray(c.knownGaps)&&c.knownGaps.length===0&&time(c.coverageFrom)&&time(c.coverageThrough)
  &&c.coverageFrom<=start&&c.coverageThrough>=end&&c.coverageThrough<=now&&time(c.lastVerifiedAt)
  &&c.lastVerifiedAt<=now&&now-c.lastVerifiedAt<=DAY;
}
function accepted(e,now){
 return e?.status==='VERIFIED'&&e.occurrenceVerified===true&&e.actorVerified===true&&e.connectionVerified===true
  &&e.severityVerified===true&&[1,3,10].includes(e.severity)&&AXES.includes(e.axis)
  &&time(e.eventAt)&&e.eventAt<=now&&time(e.verifiedAt)&&e.verifiedAt<=now&&e.evidence?.length>0;
}
export function latestEvents(events,now){
 const selected=new Map();
 for(const e of events??[]){
  if(!e?.eventId||!Number.isInteger(e.revision)||e.revision<1||!time(e.verifiedAt)||e.verifiedAt>now)continue;
  const old=selected.get(e.eventId);
  if(!old||e.revision>old.revision)selected.set(e.eventId,e);
 }
 return [...selected.values()];
}
function materialUnresolved(events,start,end,axis){
 return events.some(e=>e.material===true&&e.status==='PENDING_REVIEW'&&(e.axis===axis||!AXES.includes(e.axis))
  &&(!time(e.eventAt)||(e.eventAt>=start&&e.eventAt<end)));
}
export function military({events=[],coverage={},asOf,now=asOf}){
 if(!time(asOf)||asOf>now)return pending('INVALID_EVALUATION_TIME');
 const start=asOf-28*DAY,recent=asOf-7*DAY,rows=latestEvents(events,now),axes={};
 for(const axis of AXES){
  const malformed=events.some(e=>e.status==='VERIFIED'&&(e.axis===axis||!AXES.includes(e.axis))&&!accepted(e,now));
  const complete=coverageReady(coverage[axis],{start,end:asOf,now})&&!malformed&&!materialUnresolved(events,start,asOf,axis);
  const list=rows.filter(e=>e.axis===axis&&accepted(e,now)&&e.eventAt>=start&&e.eventAt<asOf);
  const r=list.filter(e=>e.eventAt>=recent),b=list.filter(e=>e.eventAt<recent);
  axes[axis]={...attackAxis(r.reduce((s,e)=>s+e.severity,0)/7,b.reduce((s,e)=>s+e.severity,0)/21,{complete,major:r.some(e=>e.severity===10)}),recentCount:r.length,previousCount:b.length};
 }
 if(Object.values(axes).some(x=>x.status!=='READY'))return {...pending('MILITARY_AXIS_PENDING'),axes};
 return {status:'READY',score:Math.min(...Object.values(axes).map(x=>x.score)),axes,observationAt:asOf};
}
export function ceasefire(s,now){
 if(s?.verified!==true||s.materialPending===true)return null;
 if(s.violationVerified===true||s.activeCombatVerified===true)return 0;
 if(s.endedVerified===true&&s.implementationVerified===true)return 100;
 if(s.mutualAgreementVerified!==true||!time(s.effectiveAt))return null;
 if(s.effectiveAt>now)return 20;
 if(s.implementationVerified!==true||!time(s.continuousFrom)||s.continuousFrom<s.effectiveAt
  ||!time(s.coverageThrough)||s.coverageThrough<now||s.continuousFrom>now)return null;
 const days=(now-s.continuousFrom)/DAY;
 return days<1?40:days<3?50:days<7?60:days<14?70:days<30?80:90;
}
function diplomacy(s){
 return s?.verified===true&&s.materialPending!==true&&[0,20,40,60,80,100].includes(s.diplomacyScore)?s.diplomacyScore:null;
}
export function relationStatus(s,events,axis,now){
 if(s?.verified!==true||s.materialPending===true)return 'UNKNOWN';
 if(s.endedVerified===true&&s.violationVerified===true)return 'RECONFLICT';
 const relapse=latestEvents(events,now).some(e=>e.axis===axis&&accepted(e,now)&&s.endedVerified===true
  &&time(s.endedAt)&&e.eventAt>=s.endedAt&&e.agreementViolationVerified===true);
 if(relapse)return 'RECONFLICT';
 if(s.endedVerified===true&&s.implementationVerified===true&&time(s.endedAt)&&s.endedAt<=now)return 'ENDED';
 if(s.activeCombatVerified===true||s.violationVerified===true)return 'ACTIVE';
 if(s.mutualAgreementVerified===true)return 'CEASEFIRE_PROGRESS';
 return 'UNKNOWN';
}
export function hormuz({events=[],coverage,transit,now}){
 const traffic=transitContinuity(transit,now);
 if(traffic.status!=='READY')return traffic;
 const asOf=traffic.observationAt;
 const rows=latestEvents(events,now);
 if(rows.some(e=>e.hormuz===true&&accepted(e,now)&&e.severity===10&&e.eventAt>=asOf&&e.eventAt<=now))
  return {status:'H_PENDING_NEW_EVENT',score:null,reason:'NEW_MAJOR_MARITIME_EVENT',observationAt:asOf};
 const start=asOf-28*DAY,recent=asOf-7*DAY;
 const complete=coverageReady(coverage,{start,end:asOf,now})&&!events.some(e=>e.hormuz===true&&e.status==='VERIFIED'&&!accepted(e,now))&&!events.some(e=>e.material===true&&e.hormuz===true
  &&e.status==='PENDING_REVIEW'&&(!time(e.eventAt)||e.eventAt>=start));
 const relevant=rows.filter(e=>e.hormuz===true&&accepted(e,now)&&e.eventAt>=start&&e.eventAt<asOf);
 const r=relevant.filter(e=>e.eventAt>=recent),b=relevant.filter(e=>e.eventAt<recent);
 const safety=attackAxis(r.reduce((s,e)=>s+e.severity,0)/7,b.reduce((s,e)=>s+e.severity,0)/21,{complete,major:r.some(e=>e.severity===10)});
 if(safety.status!=='READY')return pending('MARITIME_OBSERVATION_INCOMPLETE');
 const raw=.6*safety.score+.4*traffic.score,a=safety.recentDailyIntensity;
 return {status:'READY',score:Math.min(raw,a>0?Math.min(50,absoluteCap(a)):100,safety.major?25:100),safety,traffic,method:traffic.method,observationAt:asOf};
}
export function buildIranProgress(input,now=Date.now()){
 if(!time(now))throw Error('INVALID_CALCULATION_TIME');
 const events=input.events??[],relations=input.relations??{},states={};
 const ds=[],cs=[];
 for(const axis of PAIRS){const s=relations[axis];
  const fresh=time(s?.lastVerifiedAt)&&s.lastVerifiedAt<=now&&now-s.lastVerifiedAt<=DAY;
  states[axis]=fresh?relationStatus(s,events,axis,now):'UNKNOWN';
  ds.push(fresh?diplomacy(s):null);cs.push(fresh&&states[axis]!=='RECONFLICT'?ceasefire(s,now):states[axis]==='RECONFLICT'?0:null);
 }
 const m=military({events,coverage:input.coverage,asOf:now}),h=hormuz({events,coverage:input.hormuzCoverage,transit:input.transit,now});
 const n=input.nuclear;
 const validN=n?.verified===true&&n.materialPending!==true&&[0,20,40,60,80,100].includes(n.score)
  &&time(n.lastVerifiedAt)&&n.lastVerifiedAt<=now&&now-n.lastVerifiedAt<=DAY&&time(n.evidenceThrough)
  &&n.evidenceThrough<=now&&now-n.evidenceThrough<=90*DAY;
 const domains={D:ds.every(score)?Math.min(...ds):null,C:cs.every(score)?Math.min(...cs):null,M:m.score,H:h.score,N:validN?n.score:null};
 const ready=Object.values(domains).every(score);
 const sourcesAt=[...PAIRS.map(k=>relations[k]?.lastVerifiedAt),n?.lastVerifiedAt,...AXES.map(k=>input.coverage?.[k]?.lastVerifiedAt),input.hormuzCoverage?.lastVerifiedAt].filter(time);
 return {version:IRAN_PROGRESS_VERSION,status:ready?'READY':'PENDING',score:ready?Object.entries(WEIGHTS).reduce((s,[k,w])=>s+domains[k]*w,0):null,
  domains,relations:states,overallEnded:PAIRS.every(k=>states[k]==='ENDED'),military:m,hormuz:h,
  calculatedAt:now,observationAt:ready?Math.min(now,h.observationAt):null,lastVerifiedAt:ready?Math.min(...sourcesAt):null,
  interpretation:'종전 진전도 0~100점. 종전 확률이 아닙니다.',historyMode:'AS_PUBLISHED',
  missing:Object.entries(domains).filter(([,v])=>v===null).map(([k])=>k)};
}
