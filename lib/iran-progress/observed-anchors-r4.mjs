/**
 * Independent reality contradiction checks for R4. No collection, Ollama, or scoring authority.
 * Only dated, reviewed reports can establish an upper bound; no bound proves an exact score.
 * Published news is NEVER automatically a verified incident or complete 28-day coverage.
 */
export const R4_ANCHOR_VERSION='R4_INDEPENDENT_WAR_CONSTRAINT_V1';
export const R4_ANCHOR_FRONTS=Object.freeze(['IRN_USA','IRN_ISR','YEMEN_HOUTHI']);
const HOUR=3600000;
const LIMITS={FULL_SCALE_WAR:24,ACTIVE_COMBAT:39,VIOLATED_CEASEFIRE:49};
const ACCEPTED=new Set(Object.keys(LIMITS));
const time=n=>Number.isSafeInteger(n)&&n>0;
function urlIsValid(s){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port;}catch{return false;}}
function acceptedObservation(row,asOf,{maxAgeHours=72}={}){
 return row&&row.reviewStatus==='HUMAN_REVIEWED'
  &&R4_ANCHOR_FRONTS.includes(row.front)
  &&ACCEPTED.has(row.condition)&&row.isDirectlyObserved===true
  &&['OFFICIAL','INDEPENDENT_REPORT'].includes(row.sourceKind)
  &&typeof row.sourceId==='string'&&row.sourceId.trim().length>0&&urlIsValid(row.sourceUrl)
  &&time(row.observationAt)&&time(row.publishedAt)&&time(row.reviewedAt)
  &&row.observationAt<=row.publishedAt&&row.publishedAt<=row.reviewedAt
  &&row.reviewedAt<=asOf&&row.observationAt<=asOf
  &&asOf-row.observationAt<=maxAgeHours*HOUR;
}
export function examineR4RealityAnchors(observations,asOf,{maxAgeHours=72}={}){
 if(!time(asOf)||!Number.isInteger(maxAgeHours)||maxAgeHours<1||maxAgeHours>168||!Array.isArray(observations))
  return {version:R4_ANCHOR_VERSION,status:'INVALID_INPUT',score:null};
 const eligible=[],excluded=[];
 for(const [index,row] of observations.entries()){
  if(acceptedObservation(row,asOf,{maxAgeHours}))eligible.push(row);
  else excluded.push({index,reason:'UNREVIEWED_UNSUPPORTED_OR_STALE'});
 }
 // These are negative constraints, not a score. One current active front can refute 80.
 const perFront={};
 for(const id of R4_ANCHOR_FRONTS){
  const related=eligible.filter(r=>r.front===id);
  if(related.length)perFront[id]={reportedCondition:related.reduce((best,r)=>LIMITS[r.condition]<LIMITS[best]?r.condition:best,related[0].condition),
   observationAt:Math.max(...related.map(r=>r.observationAt)),anchorCount:related.length,
   supportedSourceIds:[...new Set(related.map(r=>r.sourceId))].sort()};
 }
 const cap=eligible.length?Math.min(...eligible.map(x=>LIMITS[x.condition])):null;
 return {version:R4_ANCHOR_VERSION,status:cap===null?'INSUFFICIENT_EVIDENCE':'CONSTRAINT_ONLY',
  score:null,maximumCompatibleScore:cap,perFront,eligibleCount:eligible.length,excludedCount:excluded.length,
  excluded,fullInputCoverageVerified:false,calibrationStatus:'EXACT_SCORE_UNDETERMINED',
  limitations:['NO_AUTOMATIC_SOURCE_VERIFICATION','NO_EXACT_SCORE_INFERENCE','NO_28_DAY_MILITARY_COVERAGE_INFERENCE']};
}
export function auditR4ScoreAgainstAnchors(proposedScore,observations,asOf,options){
 const evidence=examineR4RealityAnchors(observations,asOf,options);
 if(evidence.status!=='CONSTRAINT_ONLY')return {status:'UNASSESSABLE',reason:evidence.status,evidence};
 if(!Number.isFinite(proposedScore)||proposedScore<0||proposedScore>100)return {status:'INVALID_SCORE',evidence};
 if(proposedScore>evidence.maximumCompatibleScore)
  return {status:'CONTRADICTED_BY_CURRENT_COMBAT',proposedScore,evidence};
 return {status:'NOT_CONTRADICTED_BUT_UNCALIBRATED',proposedScore,evidence};
}
