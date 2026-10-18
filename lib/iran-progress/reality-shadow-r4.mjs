/**
 * R4 reality-anchored EXPERIMENT ONLY.
 * This module does not read feeds, call Ollama, touch a DB, or publish.
 * Input must be externally verified and saved in the local evidence ledger.
 * Phase thresholds and weights are UNAPPROVED calibration candidates.
 */
export const IRAN_R4_SHADOW_VERSION='IRAN_R4_REALITY_ANCHOR_SHADOW_V1';
export const IRAN_R4_FRONT_IDS=Object.freeze(['IRN_USA','IRN_ISR','YEMEN_HOUTHI']);
export const IRAN_R4_WEIGHTS=Object.freeze({D:0.20,C:0.35,M:0.25,H:0.10,N:0.10});
export const IRAN_R4_BANDS=Object.freeze({
 CRITICAL_ESCALATION:Object.freeze({min:0,max:9}),
 FULL_SCALE_WAR:Object.freeze({min:10,max:24}),
 ACTIVE_COMBAT:Object.freeze({min:25,max:39}),
 VERIFIED_DEESCALATION:Object.freeze({min:40,max:49}),
 FRAGILE_TRUCE:Object.freeze({min:50,max:59}),
 CEASEFIRE_EARLY:Object.freeze({min:60,max:74}),
 CEASEFIRE_SUSTAINED:Object.freeze({min:75,max:89}),
 PEACE_IMPLEMENTATION:Object.freeze({min:90,max:99}),
 ENDED:Object.freeze({min:100,max:100}),
});
const DAY=86400000;
const HOUR=3600000;
const R4_PHASE_ORDER=Object.keys(IRAN_R4_BANDS);
const score=n=>Number.isFinite(n)&&n>=0&&n<=100;
const time=n=>Number.isSafeInteger(n)&&n>0;
const round=n=>Number(n.toFixed(2));
const knownURL=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port;}catch{return false;}};
const pending=(reason,missing=[],detail={})=>({version:IRAN_R4_SHADOW_VERSION,status:'SHADOW_PENDING',score:null,reason,missing,...detail,productionReady:false});
export function verifiedEvidence(refs,now,{maxAge=72*HOUR}={}){
 if(!Array.isArray(refs)||refs.length===0)return false;
 return refs.every(r=>r?.verified===true&&['OFFICIAL','INDEPENDENT_REPORT'].includes(r.sourceKind)&&typeof r.sourceId==='string'&&r.sourceId.length>0
  &&knownURL(r.url)&&time(r.observedAt)&&time(r.verifiedAt)&&r.observedAt<=r.verifiedAt&&r.verifiedAt<=now
  &&now-r.verifiedAt<=maxAge);
}
export function verifyR4Front(front,now){
 if(!front||!IRAN_R4_FRONT_IDS.includes(front.id))return 'FRONT_ID_INVALID';
 if(!Object.hasOwn(IRAN_R4_BANDS,front.phase))return 'PHASE_UNSUPPORTED';
 if(front.phaseVerified!==true||!time(front.phaseObservedAt)||!time(front.phaseVerifiedAt)
  ||front.phaseObservedAt>front.phaseVerifiedAt||front.phaseVerifiedAt>now||now-front.phaseVerifiedAt>72*HOUR)
  return 'PHASE_OBSERVATION_UNVERIFIED_OR_STALE';
 if(!verifiedEvidence(front.phaseEvidence,now))return 'PHASE_EVIDENCE_MISSING_OR_STALE';
 if(!time(front.coverageThrough)||front.coverageThrough>now||now-front.coverageThrough>DAY)return 'FRONT_COVERAGE_STALE';
 const m=front.military;
 if(m?.verified!==true||m.eventsDeduplicated!==true||m.fullCoverageVerified!==true
  ||!time(m.coverageFrom)||m.coverageFrom>now-28*DAY||!time(m.coverageThrough)
  ||m.coverageThrough>now||now-m.coverageThrough>DAY
  ||![m.recentSeverity,m.priorSeverity].every(n=>Number.isFinite(n)&&n>=0)
  ||!verifiedEvidence(m.coverageEvidence,now))return 'MILITARY_28_DAY_VERIFICATION_REQUIRED';
 if(!Number.isInteger(front.diplomacyStage)||front.diplomacyStage<0||front.diplomacyStage>5
  ||!['ACTIVE_COMBAT','UNILATERAL','AGREED_NOT_EFFECTIVE','EFFECTIVE','ENDED'].includes(front.ceasefireStatus))
  return 'FRONT_DOMAIN_INPUT_INVALID';
 const phase=front.phase;
 if(phase==='VERIFIED_DEESCALATION'&&!(m.recentSeverity/7<m.priorSeverity/21&&front.deescalationVerified===true))
  return 'DEESCALATION_NOT_VERIFIED';
 const truce=['FRAGILE_TRUCE','CEASEFIRE_EARLY','CEASEFIRE_SUSTAINED','PEACE_IMPLEMENTATION','ENDED'];
 if(truce.includes(phase)&&front.ceasefireStatus==='ACTIVE_COMBAT')return 'TRUCE_NOT_SUPPORTED_BY_STATUS';
 if(['CEASEFIRE_EARLY','CEASEFIRE_SUSTAINED','PEACE_IMPLEMENTATION','ENDED'].includes(phase)){
  if(front.mutualCeasefireVerified!==true||!time(front.ceasefireEffectiveAt)
   ||front.ceasefireEffectiveAt>now||!Number.isInteger(front.ceasefireVerifiedDays)
   ||front.ceasefireVerifiedDays<0||front.ceasefireVerifiedDays>Math.floor((now-front.ceasefireEffectiveAt)/DAY)
   ||!['EFFECTIVE','ENDED'].includes(front.ceasefireStatus))return 'CEASEFIRE_IMPLEMENTATION_NOT_VERIFIED';
 }
 if(phase==='CEASEFIRE_EARLY'&&front.ceasefireVerifiedDays>=14)return 'PHASE_DURATION_CONTRADICTION';
 if(phase==='CEASEFIRE_SUSTAINED'&&front.ceasefireVerifiedDays<14)return 'SUSTAINED_CEASEFIRE_NOT_VERIFIED';
 if(phase==='PEACE_IMPLEMENTATION'&&(front.ceasefireVerifiedDays<30||front.peaceFrameworkVerified!==true))
  return 'PEACE_IMPLEMENTATION_NOT_VERIFIED';
 if(phase==='ENDED'&&(front.endedVerified!==true||front.implementationVerified!==true||front.ceasefireVerifiedDays<30))
  return 'OFFICIAL_END_NOT_VERIFIED';
 if(['CRITICAL_ESCALATION','FULL_SCALE_WAR','ACTIVE_COMBAT'].includes(phase)
  &&front.ceasefireStatus!=='ACTIVE_COMBAT')return 'ACTIVE_COMBAT_CONTRADICTION';
 if(phase==='CRITICAL_ESCALATION'&&front.criticalEscalationVerified!==true)return 'CRITICAL_ESCALATION_NOT_VERIFIED';
 if(phase==='FULL_SCALE_WAR'&&front.fullScaleWarVerified!==true)return 'FULL_SCALE_WAR_NOT_VERIFIED';
 return null;
}
function ceasefireScore(front){
 if(front.ceasefireStatus==='ACTIVE_COMBAT')return 0;
 if(front.ceasefireStatus==='UNILATERAL')return 15;
 if(front.ceasefireStatus==='AGREED_NOT_EFFECTIVE')return 30;
 if(front.ceasefireStatus==='ENDED')return 100;
 const days=front.ceasefireVerifiedDays;
 return days<1?45:days<3?55:days<7?65:days<14?75:days<30?85:95;
}
export function militarySeverityScore(recentSeverity,priorSeverity){
 const a7=recentSeverity/7,a21=priorSeverity/21;
 // Candidate decay shape; requires real-event calibration before production.
 return round(100*Math.exp(-(0.7*a7+0.3*a21)/3));
}
function verifyBackgroundDomain(domain,now,{maxAge}){
 return domain?.verified===true&&score(domain.score)&&time(domain.observedAt)
  &&time(domain.verifiedAt)&&domain.observedAt<=domain.verifiedAt
  &&domain.verifiedAt<=now&&now-domain.verifiedAt<=maxAge
  &&verifiedEvidence(domain.evidence,now,{maxAge});
}
export function calculateIranR4RealityShadow(input,now){
 if(!time(now))return pending('INVALID_AS_OF');
 if(!input||typeof input!=='object')return pending('INPUT_MISSING');
 const fronts=IRAN_R4_FRONT_IDS.map(id=>input.fronts?.[id]);
 const missing=[];
 for(let i=0;i<fronts.length;i++){
  const reason=verifyR4Front(fronts[i],now);
  if(reason||fronts[i]?.id!==IRAN_R4_FRONT_IDS[i])missing.push({front:IRAN_R4_FRONT_IDS[i],reason:reason??'FRONT_ID_MISMATCH'});
 }
 if(!verifyBackgroundDomain(input.maritime,now,{maxAge:72*HOUR}))missing.push({domain:'H',reason:'MARITIME_VERIFIED_OBSERVATION_REQUIRED'});
 if(!verifyBackgroundDomain(input.nuclear,now,{maxAge:30*DAY}))missing.push({domain:'N',reason:'NUCLEAR_VERIFIED_STATUS_REQUIRED'});
 if(missing.length)return pending('VERIFIED_REALITY_INPUT_INCOMPLETE',missing);
 const phase=fronts.reduce((worst,front)=>R4_PHASE_ORDER.indexOf(front.phase)<R4_PHASE_ORDER.indexOf(worst)?front.phase:worst,'ENDED');
 const band=IRAN_R4_BANDS[phase];
 const domains={
  D:Math.min(...fronts.map(f=>f.diplomacyStage*20)),
  C:Math.min(...fronts.map(ceasefireScore)),
  M:Math.min(...fronts.map(f=>militarySeverityScore(f.military.recentSeverity,f.military.priorSeverity))),
  H:input.maritime.score,
  N:input.nuclear.score,
 };
 const weighted=Object.entries(IRAN_R4_WEIGHTS).reduce((total,[key,weight])=>total+weight*domains[key],0);
 const value=phase==='ENDED'?100:round(band.min+(band.max-band.min)*weighted/100);
 return {
  version:IRAN_R4_SHADOW_VERSION,status:'SHADOW_READY',productionReady:false,
  score:value,phase,allowedRange:{...band},unanchoredWeightedScore:round(weighted),
  domains,weights:IRAN_R4_WEIGHTS,
  frontPhases:Object.fromEntries(fronts.map(f=>[f.id,f.phase])),
  frontMilitary:Object.fromEntries(fronts.map(f=>[f.id,militarySeverityScore(f.military.recentSeverity,f.military.priorSeverity)])),
  asOf:now,interpretation:'Verified observed cessation/war-state progress, not a probability.',
  limitations:['SHADOW ONLY','PHASE_LABELS_REQUIRE_VERIFIED_HUMAN_OR_MACHINE_AUDIT','UNAPPROVED_BANDS_WEIGHTS_AND_DECAY','NO_AUTO_PUBLISH'],
 };
}
/** Independent calibration oracle: rejects scores inconsistent with audited active phases. */
export function assessR4ScoreAgainstReality(proposedScore,input,now){
 const computed=calculateIranR4RealityShadow(input,now);
 if(computed.status!=='SHADOW_READY')return {status:'UNASSESSABLE',reason:computed.reason,missing:computed.missing??[]};
 if(!score(proposedScore))return {status:'INVALID_SCORE',expectedRange:computed.allowedRange};
 return {status:proposedScore>=computed.allowedRange.min&&proposedScore<=computed.allowedRange.max?'COMPATIBLE':'INCOMPATIBLE',
  proposedScore,expectedRange:computed.allowedRange,bottleneck:computed.phase,shadowScore:computed.score};
}
