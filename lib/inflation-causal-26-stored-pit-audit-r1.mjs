// Research-only, read-only audit of the existing 19 public research summary
// and the existing five private JSON documents covering seven more candidates.
// Do not claim historical provider release times from a later stored snapshot.
// No provider requests, filesystem I/O, SQL, D1 updates, scores or publication.
import {INFLATION_CAUSAL_19} from './inflation-causal-public-catalog.mjs';
import {INFLATION_CANDIDATES_7} from './inflation-causal-candidates-public-7-catalog.mjs';
import {evaluateInflation30PitEvidence}
 from './inflation-causal-30-pit-evidence-r1.mjs';
import {evaluateInflation7StoredPitAdapter}
 from './inflation-causal-7-stored-pit-adapter-r1.mjs';
import {validateInflationCausalPublic}
 from '../worker/inflation-causal-public-r1.mjs';

const fail=code=>{throw Object.assign(new Error(code),{code});};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const existingIds=new Set(INFLATION_CAUSAL_19.map(x=>x.id));
const newIds=new Set(INFLATION_CANDIDATES_7.map(x=>x.id));
function day(s){return s.length===7?s+'-01':s;}
function sourceRow(x,date,value,availableAt,sourceVersion){
 return {observationDate:day(date),value,
  availableAt,sourceStoredAt:x.sourceStoredAt,sourceVersion};
}
// The public 19 row's bounded history is a retrospective snapshot. Each
// point gets the row's original storage timestamp (not a fabricated release
// timestamp); a later edit cannot pass an earlier cutoff.
function nineteenObservations(row,sourceVersion){
 if(row.status!=='READY')return [];
 const archive=new Map();
 for(const p of row.history){
  const normalized=sourceRow(row,p.date,p.value,null,sourceVersion);
  archive.set(normalized.observationDate,normalized);
 }
 // Latest row is not necessarily the monthly history point (daily source).
 // A month-begin duplicate with an identical value may carry a verified
 // published release timestamp, but a conflicting value fails closed.
 const latest=sourceRow(row,row.observationDate,row.value,
  row.availableAt??null,sourceVersion);
 const prev=archive.get(latest.observationDate);
 if(prev&&prev.value!==latest.value)
  fail('W01_PIT_19_PUBLIC_HISTORY_CONFLICT');
 archive.set(latest.observationDate,latest);
 return [...archive.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
}

export function evaluateInflation26StoredPitAudit({
 cutoffs,nineteenPublicPayload,sevenDocumentsByFile={},now=Date.now()
}={}){
 if(!Number.isSafeInteger(now)||now<=0)
  fail('W01_PIT_26_AUDIT_TIME_STOP');
 if(nineteenPublicPayload!==null&&nineteenPublicPayload!==undefined)
  validateInflationCausalPublic(nineteenPublicPayload,{now});
 if(!object(sevenDocumentsByFile))
  fail('W01_PIT_26_SEVEN_CONTRACT_STOP');
 const nineteenById={};
 if(nineteenPublicPayload){
  for(const x of nineteenPublicPayload.indicators)
   if(x.status==='READY')
    nineteenById[x.id]=nineteenObservations(x,nineteenPublicPayload.sourceVersion);
 }
 const nineteen=evaluateInflation30PitEvidence({
  cutoffs,observationsById:nineteenById,
 });
 const seven=evaluateInflation7StoredPitAdapter({
  cutoffs,documentsByFile:sevenDocumentsByFile,now,
 });
 // Compose validated, already bounded evidence summaries. Never export
 // per-point private values or reconstruct a raw provider archive.
 const map19=new Map(nineteen.candidates.map(x=>[x.id,x]));
 const map7=new Map(seven.evaluation.candidates.map(x=>[x.id,x]));
 const candidates=nineteen.candidates.map(row=>{
  const picked=newIds.has(row.id)?map7.get(row.id):map19.get(row.id);
  if(!picked)fail('W01_PIT_26_COMPOSITION_MISSING');
  return picked;
 });
 const counted19=candidates.filter(x=>existingIds.has(x.id)&&x.availableCutoffs>0).length;
 const counted7=candidates.filter(x=>newIds.has(x.id)&&x.availableCutoffs>0).length;
 return Object.freeze({
  schema:'W01_INFLATION26_STORED_PIT_AUDIT_R1',
  evidenceLevel:'CALLER_SUPPLIED_STORED_SNAPSHOTS_NOT_LIVE_PC_ORIGINAL_PIT',
  sourceCandidates:26,originalResearchCandidates:30,
  old19WithStoredCutoffEvidence:counted19,
  new7WithStoredCutoffEvidence:counted7,
  sourcesWithStoredCutoffEvidence:counted19+counted7,
  fullCutoffCoverage:candidates.filter(x=>
   (existingIds.has(x.id)||newIds.has(x.id))&&
   x.availableCutoffs===cutoffs.length).length,
  releaseTimesNotInvented:true,
  sourceErrors:seven.sourceErrors,
  selectedIndicators:0,approvedWeights:0,
  approvedCompositeFormula:false,
  providerCalls:0,dbWrites:0,d1Writes:0,rawEgress:0,
  candidates:Object.freeze(candidates),
 });
}
