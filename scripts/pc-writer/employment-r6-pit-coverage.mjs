// Read-only CURRENT/HISTORY lineage gate for an existing approved PC Core and
// an optional isolated candidate. Counts are diagnostics, not approval to copy
// data, backdate availability, modify schemas, or publish a candidate to D1.
import fs from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {EMPLOYMENT_R6_TABLES} from "../../lib/market-score/employment-r6-contract.mjs";
import {EMPLOYMENT_R6_REQUIRED_LOGICAL_SERIES} from "../../lib/market-score/employment-r6-formula.mjs";
import {EMPLOYMENT_R4_PIT_CLASSES} from "../../lib/market-score/employment-r4-shadow-contract.mjs";

const T=EMPLOYMENT_R6_TABLES;
const ids=[...EMPLOYMENT_R6_REQUIRED_LOGICAL_SERIES];
const identity=row=>[row.logical_series_id,row.geography_type,row.geography_code,row.observation_date].join("\u001f");
const validAsOf=date=>typeof date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(date)
  &&Number.isFinite(Date.parse(date+"T00:00:00Z"))
  &&new Date(date+"T00:00:00Z").toISOString().slice(0,10)===date;
const sourceRows=(db,table,asOfDate)=>{
  const exists=db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
  if(!exists)return null;
  const fields=new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(col=>col.name));
  const available=fields.has("available_at")?"available_at":"NULL AS available_at";
  const extras=["provider","provider_series_id","quality_status","pit_class","provenance_json"]
    .map(name=>fields.has(name)?name:`NULL AS ${name}`).join(",");
  const list=ids.map(()=>"?").join(",");
  return db.prepare(`SELECT logical_series_id,geography_type,geography_code,
    observation_date,source_hash,value,retrieved_at,${available},${extras}
    FROM ${table} WHERE logical_series_id IN (${list}) AND observation_date<=?`)
    .all(...ids,asOfDate);
};
const knownAt=row=>Date.parse(row.available_at??row.retrieved_at??"");
const isKnownAsOf=(row,asOfDate)=>{
  const end=Date.parse(asOfDate+"T23:59:59.999Z");
  const retrieved=Date.parse(row.retrieved_at??"");
  return Number.isFinite(knownAt(row))&&knownAt(row)<=end
    &&Number.isFinite(retrieved)&&retrieved<=end;
};
const sameObservation=(a,b)=>Boolean(a&&b&&a.source_hash===b.source_hash&&Number.isFinite(Number(a.value))
  &&Number(a.value)===Number(b.value)
  &&a.provider===b.provider&&a.provider_series_id===b.provider_series_id);
const validSourceMetadata=row=>{
  if(!row||!(/^[a-f\d]{64}$/i.test(String(row.source_hash??"")))
    ||!Number.isFinite(Date.parse(row.retrieved_at??""))
    ||!String(row.provider??"").trim()||!String(row.provider_series_id??"").trim()
    ||!String(row.quality_status??"").trim()
    ||!Object.values(EMPLOYMENT_R4_PIT_CLASSES).includes(row.pit_class))return false;
  try{
    const provenance=JSON.parse(row.provenance_json);
    return Boolean(provenance&&typeof provenance==="object"&&!Array.isArray(provenance));
  }
  catch{return false;}
};
const historyIndex=(rows,asOfDate)=>{
  const out=new Map(),end=Date.parse(asOfDate+"T23:59:59.999Z");
  for(const row of rows??[]){
    const known=Date.parse(row.available_at??row.retrieved_at??"");
    const retrieved=Date.parse(row.retrieved_at??"");
    // The stored provider release time must not make a later download appear
    // available to an earlier PIT snapshot during candidate promotion.
    if(!Number.isFinite(known)||known>end||!Number.isFinite(retrieved)||retrieved>end)continue;
    const key=identity(row),set=out.get(key)??[];
    set.push(row);out.set(key,set);
  }
  return out;
};
const latestRevision=rows=>(rows??[]).reduce((best,row)=>{
  if(!best)return row;
  const ar=Date.parse(best.retrieved_at??""),br=Date.parse(row.retrieved_at??"");
  if(br>ar)return row;
  if(br<ar)return best;
  const a=knownAt(best),b=knownAt(row);
  if(b>a)return row;
  if(b<a)return best;
  return String(row.source_hash??"")>String(best.source_hash??"")?row:best;
},null);

export function auditEmploymentR6PitCoverage({dbPath,candidateDbPath=null,asOfDate,
  beforeReadOnlyOpen=null,afterReadOnlyOpen=null,onSqliteOpened=null}={}){
  if(!validAsOf(asOfDate))throw Error("PIT_AUDIT_AS_OF_INVALID");
  if(typeof dbPath!=="string"||!fs.existsSync(dbPath))throw Error("PIT_AUDIT_CORE_NOT_FOUND");
  if(candidateDbPath&&(typeof candidateDbPath!=="string"||!fs.existsSync(candidateDbPath)))
    throw Error("PIT_AUDIT_CANDIDATE_NOT_FOUND");
  if(candidateDbPath&&fs.realpathSync(candidateDbPath)===fs.realpathSync(dbPath))
    throw Error("PIT_AUDIT_CANDIDATE_IS_CORE");
  let core=null,candidate=null;
  try{
    beforeReadOnlyOpen?.(dbPath);
    core=new DatabaseSync(dbPath,{readOnly:true});
    onSqliteOpened?.(dbPath);
    afterReadOnlyOpen?.(dbPath);
    // If the isolated candidate cannot be opened, still close the already
    // opened Core reader before the caller handles the diagnostic failure.
    if(candidateDbPath){
      beforeReadOnlyOpen?.(candidateDbPath);
      candidate=new DatabaseSync(candidateDbPath,{readOnly:true});
      onSqliteOpened?.(candidateDbPath);
      afterReadOnlyOpen?.(candidateDbPath);
    }
    const current=sourceRows(core,T.observationCurrent,asOfDate);
    const history=sourceRows(core,T.observationHistory,asOfDate);
    const candidates=candidate?sourceRows(candidate,T.observationHistory,asOfDate):null;
    const candidateCurrent=candidate?sourceRows(candidate,T.observationCurrent,asOfDate):null;
    const currentKeys=new Map((current??[]).map(row=>[identity(row),row]));
    const historyKeys=historyIndex(history,asOfDate);
    const candidateKeys=historyIndex(candidates,asOfDate);
    const candidateCurrentKeys=new Map((candidateCurrent??[]).filter(row=>isKnownAsOf(row,asOfDate))
      .map(row=>[identity(row),row]));
    const missingBySeries=new Map();
    let missing=0,candidateCovered=0,candidateSameValueAndHash=0,candidateDifferent=0;
    for(const [key,row] of currentKeys){
      if(historyKeys.has(key))continue;
      missing++;
      const s=missingBySeries.get(row.logical_series_id)??{id:row.logical_series_id,missing:0,candidateCovered:0,matchingCandidate:0};
      s.missing++;
      const compatible=candidateKeys.get(key)??[];
      if(compatible.length){
        candidateCovered++;s.candidateCovered++;
        if(sameObservation(row,latestRevision(compatible))){
          candidateSameValueAndHash++;s.matchingCandidate++;
        }else candidateDifferent++;
      }
      missingBySeries.set(row.logical_series_id,s);
    }
    const planHasEvidence=current!==null&&history!==null&&candidateCurrent!==null&&candidates!==null;
    let candidateNewKeys=0,candidateOverlapMatching=0,candidateOverlapConflicts=0;
    let newKeysWithVerifiedLineage=0,missingHistoryWithVerifiedLineage=0,candidateUnverifiedKeys=0;
    let candidateOverlapUnverified=0;
    if(planHasEvidence){
      for(const [key,row] of candidateCurrentKeys){
        const existing=currentKeys.get(key),revisions=candidateKeys.get(key)??[];
        const latest=latestRevision(revisions);
        const internallyVerified=validSourceMetadata(row)
          &&sameObservation(row,latest)&&validSourceMetadata(latest);
        if(existing){
          if(sameObservation(existing,row)){
            candidateOverlapMatching++;
            if(!internallyVerified)candidateOverlapUnverified++;
            if(!historyKeys.has(key)&&internallyVerified&&validSourceMetadata(existing)){
              missingHistoryWithVerifiedLineage++;
            }
          }else candidateOverlapConflicts++;
        }else{
          candidateNewKeys++;
          if(internallyVerified)newKeysWithVerifiedLineage++;
          else candidateUnverifiedKeys++;
        }
      }
    }
    const previewStatus=!planHasEvidence?"NO_RUNTIME_EVIDENCE"
      :candidateOverlapConflicts>0?"HOLD_CONFLICTING_REVISIONS"
      :candidateUnverifiedKeys>0||candidateOverlapUnverified>0?"HOLD_UNVERIFIED_SOURCE_LINEAGE"
      :missing>missingHistoryWithVerifiedLineage?"HOLD_CORE_HISTORY_GAPS_WITHOUT_MATCHING_CANDIDATE"
      :"READ_ONLY_PREVIEW_NO_PUBLICATION_APPROVAL";
    return {
      kind:"EMPLOYMENT_R6_PIT_READONLY_COVERAGE_R1",asOfDate,
      coreCurrentTableExists:current!==null,coreHistoryTableExists:history!==null,
      candidateHistoryTableExists:candidate?candidates!==null:null,
      coreCurrentRows:current?.length??null,coreHistoryRevisions:history?.length??null,
      coreHistoryAsOfUniqueKeys:history===null?null:historyKeys.size,
      coreCurrentKeys:current===null?null:currentKeys.size,
      coreCurrentKeysMissingHistory:current===null||history===null?null:missing,
      missingKeysWithCandidateHistory:candidate&&current!==null&&history!==null&&candidates!==null?candidateCovered:null,
      missingKeysWithMatchingCandidateValueAndHash:candidate&&current!==null&&history!==null&&candidates!==null?candidateSameValueAndHash:null,
      missingKeysWithDifferentCandidateRevision:candidate&&current!==null&&history!==null&&candidates!==null?candidateDifferent:null,
      candidateHistoryAsOfUniqueKeys:candidate&&candidates!==null?candidateKeys.size:null,
      candidateCurrentTableExists:candidate?candidateCurrent!==null:null,
      candidateCurrentKeys:planHasEvidence?candidateCurrentKeys.size:null,
      candidateNewKeys:planHasEvidence?candidateNewKeys:null,
      candidateOverlapMatchingKeys:planHasEvidence?candidateOverlapMatching:null,
      candidateOverlapUnverifiedKeys:planHasEvidence?candidateOverlapUnverified:null,
      candidateOverlapConflictingKeys:planHasEvidence?candidateOverlapConflicts:null,
      candidateNewKeysWithConsistentPITMetadata:planHasEvidence?newKeysWithVerifiedLineage:null,
      candidateNewKeysWithIncompletePITMetadata:planHasEvidence?candidateUnverifiedKeys:null,
      coreMissingHistoryKeysWithConsistentCandidateMetadata:planHasEvidence?missingHistoryWithVerifiedLineage:null,
      coreMissingHistoryKeysWithoutConsistentCandidateMetadata:planHasEvidence?missing-missingHistoryWithVerifiedLineage:null,
      candidateReconciliationPreviewStatus:previewStatus,
      missingBySeries:current!==null&&history!==null?[...missingBySeries.values()].sort((a,b)=>a.id.localeCompare(b.id)):null,
      promotionApproved:false,coreWrites:0,providerCalls:0,
    };
  }finally{core?.close();candidate?.close();}
}
