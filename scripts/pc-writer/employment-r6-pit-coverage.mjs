// Read-only CURRENT/HISTORY lineage gate for an existing approved PC Core and
// an optional isolated candidate. Counts are diagnostics, not approval to copy
// data, backdate availability, modify schemas, or publish a candidate to D1.
import fs from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {EMPLOYMENT_R6_TABLES} from "../../lib/market-score/employment-r6-contract.mjs";
import {EMPLOYMENT_R6_REQUIRED_LOGICAL_SERIES} from "../../lib/market-score/employment-r6-formula.mjs";
import {EMPLOYMENT_R4_PIT_CLASSES,EMPLOYMENT_R4_CORE_STATES} from "../../lib/market-score/employment-r4-shadow-contract.mjs";
import {classifyEmploymentR6Pit04KeyEvidence,classifyStoredEta539MissingHistory} from "../../lib/market-score/employment-r6-pit04-key-evidence.mjs";

const T=EMPLOYMENT_R6_TABLES;
const CLAIM_STATES=new Set(EMPLOYMENT_R4_CORE_STATES);
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
    .map(name=>fields.has(name)?name:`NULL AS ${name}`);
  // Read optional time columns only when present. Absence in legacy fixture
  // must remain distinguishable from a real NULL in the operational schema.
  const timeExtras=["first_seen_at","recorded_at"].filter(name=>fields.has(name));
  const list=ids.map(()=>"?").join(",");
  return db.prepare(`SELECT logical_series_id,geography_type,geography_code,
    observation_date,source_hash,value,retrieved_at,${available},${[...extras,...timeExtras].join(",")}
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
// Do not coerce SQLite NULL/empty TEXT to zero when previewing PIT lineage.
const numericObservation=value=>value!==null&&value!==undefined
  &&!(typeof value==="string"&&!value.trim())&&Number.isFinite(Number(value));
const sameObservation=(a,b)=>Boolean(a&&b&&a.source_hash===b.source_hash
  &&numericObservation(a.value)&&numericObservation(b.value)
  &&Number(a.value)===Number(b.value)
  &&a.provider===b.provider&&a.provider_series_id===b.provider_series_id);
const validSourceMetadata=row=>{
  if(!row||!numericObservation(row.value)||!(/^[a-f\d]{64}$/i.test(String(row.source_hash??"")))
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
// A hash is an identity, NOT evidence of which same-time revision came later.
// The PIT reader must hold ambiguous equal-time revisions instead of selecting
// whichever hash happens to sort later lexically.
const revisionOrder=(a,b)=>Date.parse(b.retrieved_at??"")-Date.parse(a.retrieved_at??"")
  ||knownAt(b)-knownAt(a);
// Compare equal-time row identity without treating a single invalid value
// as a conflict with itself. Numeric validity remains a separate PIT gate.
const sameRevisionPayload=(a,b)=>a.source_hash===b.source_hash
  &&Object.is(a.value,b.value)
  &&a.provider===b.provider&&a.provider_series_id===b.provider_series_id
  &&a.quality_status===b.quality_status&&a.pit_class===b.pit_class
  &&a.provenance_json===b.provenance_json;
const revisionAtSameInstant=(a,b)=>Date.parse(a.retrieved_at??"")===Date.parse(b.retrieved_at??"")
  &&knownAt(a)===knownAt(b);
const latestRevision=rows=>{
  if(!rows?.length)return null;
  const ordered=[...rows].sort(revisionOrder),best=ordered[0];
  // A single row has no competing revision, even when its value is invalid.
  // Invalid rows are rejected downstream by validSourceMetadata/sameObservation.
  return ordered.slice(1).some(row=>revisionAtSameInstant(row,best)
    &&!sameRevisionPayload(row,best))?null:best;
};
const revisionEvidence=index=>{
  let priorRevisionKeys=0,priorRevisionRows=0,ambiguousLatestKeys=0,sameInstantAdditionalRows=0;
  for(const rows of index.values()){
    const best=[...rows].sort(revisionOrder)[0];
    const latestRows=rows.filter(row=>revisionAtSameInstant(row,best)).length;
    const prior=rows.length-latestRows;
    if(prior>0){priorRevisionKeys++;priorRevisionRows+=prior;}
    sameInstantAdditionalRows+=Math.max(0,latestRows-1);
    if(latestRevision(rows)===null)ambiguousLatestKeys++;
  }
  return {priorRevisionKeys,priorRevisionRows,ambiguousLatestKeys,sameInstantAdditionalRows};
};
// PIT-04-03: compare only the as-of latest Core HISTORY revision to CURRENT.
// Missing, conflicting, and unverified keys are disjoint; these aggregates
// never authorize historical PIT backdating or candidate promotion.
const comparableCoreObservation=row=>Boolean(row&&numericObservation(row.value)
  &&/^[a-f\d]{64}$/i.test(String(row.source_hash??""))
  &&String(row.provider??"").trim()&&String(row.provider_series_id??"").trim());
const classifyCoreCurrentHistory=(currentKeys,historyKeys)=>{
  let matching=0,conflicting=0,unverified=0,missing=0;
  for(const [key,current] of currentKeys){
    if(!historyKeys.has(key)){missing++;continue;}
    const latest=latestRevision(historyKeys.get(key));
    // A same-time ambiguous latest revision or invalid source must remain HOLD.
    if(!comparableCoreObservation(current)||!comparableCoreObservation(latest)){
      unverified++;continue;
    }
    if(sameObservation(current,latest))matching++;
    else conflicting++;
  }
  return {
    coreCurrentHistoryMatchingKeys:matching,
    coreCurrentHistoryConflictingKeys:conflicting,
    coreCurrentHistoryUnverifiedKeys:unverified,
    coreCurrentHistoryMissingKeys:missing,
  };
};
const endReadSnapshot=(db,active)=>{
  if(!db)return;
  try{if(active)db.exec("ROLLBACK");}finally{db.close();}
};

export function auditEmploymentR6PitCoverage({dbPath,candidateDbPath=null,asOfDate,
  keyReviewOffset=null,beforeReadOnlyOpen=null,afterReadOnlyOpen=null,onSqliteOpened=null}={}){
  if(!validAsOf(asOfDate))throw Error("PIT_AUDIT_AS_OF_INVALID");
  if(keyReviewOffset!==null&&(!Number.isSafeInteger(keyReviewOffset)
    ||keyReviewOffset<0||keyReviewOffset>50000))throw Error("PIT_AUDIT_KEY_OFFSET_INVALID");
  if(typeof dbPath!=="string"||!fs.existsSync(dbPath))throw Error("PIT_AUDIT_CORE_NOT_FOUND");
  if(candidateDbPath&&(typeof candidateDbPath!=="string"||!fs.existsSync(candidateDbPath)))
    throw Error("PIT_AUDIT_CANDIDATE_NOT_FOUND");
  if(candidateDbPath&&fs.realpathSync(candidateDbPath)===fs.realpathSync(dbPath))
    throw Error("PIT_AUDIT_CANDIDATE_IS_CORE");
  let core=null,candidate=null,coreSnapshot=false,candidateSnapshot=false;
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
    // CURRENT and HISTORY must describe one committed snapshot per database,
    // even while the PC's existing WAL writer continues collecting data.
    core.exec("BEGIN");coreSnapshot=true;
    core.prepare("SELECT COUNT(*) AS total FROM sqlite_master").get();
    if(candidate){
      candidate.exec("BEGIN");candidateSnapshot=true;
      candidate.prepare("SELECT COUNT(*) AS total FROM sqlite_master").get();
    }
    const current=sourceRows(core,T.observationCurrent,asOfDate);
    const history=sourceRows(core,T.observationHistory,asOfDate);
    const candidates=candidate?sourceRows(candidate,T.observationHistory,asOfDate):null;
    const candidateCurrent=candidate?sourceRows(candidate,T.observationCurrent,asOfDate):null;
    // Release read locks before comparing lineage, which may be CPU-heavy.
    core.exec("ROLLBACK");coreSnapshot=false;
    if(candidate){candidate.exec("ROLLBACK");candidateSnapshot=false;}
    const currentKeys=new Map((current??[]).filter(row=>isKnownAsOf(row,asOfDate))
      .map(row=>[identity(row),row]));
    const historyKeys=historyIndex(history,asOfDate);
    const candidateKeys=historyIndex(candidates,asOfDate);
    const coreRevisionEvidence=history===null?null:revisionEvidence(historyKeys);
    const candidateRevisionEvidence=candidates===null?null:revisionEvidence(candidateKeys);
    const coreHistoryComparison=current!==null&&history!==null
      ?classifyCoreCurrentHistory(currentKeys,historyKeys):null;
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
    // PIT-04-08 is strictly opt-in. Existing PIT count-only jobs are unchanged.
    // The Reader already loaded both SQLite snapshots and released their
    // locks. Only the bounded, safe 8-key projection leaves this function.
    if(keyReviewOffset!==null&&!planHasEvidence)
      throw Error("PIT_AUDIT_KEY_REVIEW_INPUT_MISSING");
    const pit04KeyReview=keyReviewOffset===null?null:classifyEmploymentR6Pit04KeyEvidence({
      coreCurrentRows:current,coreHistoryRows:history,
      candidateCurrentRows:candidateCurrent,candidateHistoryRows:candidates,
      asOfIso:asOfDate+"T23:59:59.999Z",offset:keyReviewOffset,maxEvidenceRows:8,
    });
    // Reconcile the key-level audit against the *same* read-only Core
    // CURRENT as-of snapshot. Optional time columns or invalid Saturday
    // metadata may affect attribution, but can never silently drop a key.
    if(pit04KeyReview!==null){
      const expectedClaims=[...currentKeys.values()].filter(row=>
        row.logical_series_id==="STATE_INITIAL_CLAIMS"
        &&row.geography_type==="STATE"&&CLAIM_STATES.has(row.geography_code)).length;
      if(pit04KeyReview.counts.coreKeys!==expectedClaims)
        throw Error("PIT_AUDIT_KEY_COVERAGE_MISMATCH");
    }
    const previewStatus=!planHasEvidence?"NO_RUNTIME_EVIDENCE"
      :coreRevisionEvidence?.ambiguousLatestKeys>0||candidateRevisionEvidence?.ambiguousLatestKeys>0
        ?"HOLD_AMBIGUOUS_LATEST_REVISIONS"
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
      coreHistoryPriorRevisionKeys:coreRevisionEvidence?.priorRevisionKeys??null,
      coreHistoryPriorRevisionRows:coreRevisionEvidence?.priorRevisionRows??null,
      coreHistoryAmbiguousLatestKeys:coreRevisionEvidence?.ambiguousLatestKeys??null,
      coreHistorySameInstantAdditionalRows:coreRevisionEvidence?.sameInstantAdditionalRows??null,
      coreCurrentKeys:current===null?null:currentKeys.size,
      coreCurrentKeysMissingHistory:current===null||history===null?null:missing,
      coreCurrentHistoryMatchingKeys:coreHistoryComparison?.coreCurrentHistoryMatchingKeys??null,
      coreCurrentHistoryConflictingKeys:coreHistoryComparison?.coreCurrentHistoryConflictingKeys??null,
      coreCurrentHistoryUnverifiedKeys:coreHistoryComparison?.coreCurrentHistoryUnverifiedKeys??null,
      coreCurrentHistoryMissingKeys:coreHistoryComparison?.coreCurrentHistoryMissingKeys??null,
      missingKeysWithCandidateHistory:candidate&&current!==null&&history!==null&&candidates!==null?candidateCovered:null,
      missingKeysWithMatchingCandidateValueAndHash:candidate&&current!==null&&history!==null&&candidates!==null?candidateSameValueAndHash:null,
      missingKeysWithDifferentCandidateRevision:candidate&&current!==null&&history!==null&&candidates!==null?candidateDifferent:null,
      candidateHistoryAsOfUniqueKeys:candidate&&candidates!==null?candidateKeys.size:null,
      candidateHistoryPriorRevisionKeys:candidateRevisionEvidence?.priorRevisionKeys??null,
      candidateHistoryPriorRevisionRows:candidateRevisionEvidence?.priorRevisionRows??null,
      candidateHistoryAmbiguousLatestKeys:candidateRevisionEvidence?.ambiguousLatestKeys??null,
      candidateHistorySameInstantAdditionalRows:candidateRevisionEvidence?.sameInstantAdditionalRows??null,
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
      ...(pit04KeyReview===null?{}:{pit04KeyReview}),
      missingBySeries:current!==null&&history!==null?[...missingBySeries.values()].sort((a,b)=>a.id.localeCompare(b.id)):null,
      promotionApproved:false,coreWrites:0,providerCalls:0,
    };
  }finally{
    try{endReadSnapshot(candidate,candidateSnapshot);}
    finally{endReadSnapshot(core,coreSnapshot);}
  }
}


// PIT-06-05: existing Reader's opt-in raw/candidate attestation.
// Fixed authorized Core/candidate paths are supplied by the existing PC Runner,
// never by a GitHub Issue. Capture one SQLite read snapshot and release its WAL
// read locks BEFORE parsing stored CSV or persisting PC-private evidence.
export async function auditEmploymentR6Pit0605StoredRaw({
 dbPath,candidateDbPath,asOfDate,writePrivateEvidence,
 beforeReadOnlyOpen=null,afterReadOnlyOpen=null,onSqliteOpened=null,
}={}){
 if(!validAsOf(asOfDate)||typeof dbPath!=="string"||typeof candidateDbPath!=="string"
   ||!fs.existsSync(dbPath)||!fs.existsSync(candidateDbPath)
   ||fs.realpathSync(dbPath)===fs.realpathSync(candidateDbPath)
   ||typeof writePrivateEvidence!=="function")
  throw Error("PIT0605_INPUT_INVALID");
 // A current-day as-of cutoff must not admit future collection receipts.
 const checkedAt=new Date(Math.min(Date.now(),Date.parse(asOfDate+"T23:59:59.999Z"))).toISOString();
 let core=null,candidate=null,coreActive=false,candidateActive=false;
 const snapshots=[],runs=[];
 let missingRows=[],candidateRows=[],malformedSnapshots=0;
 try{
  beforeReadOnlyOpen?.(dbPath);
  core=new DatabaseSync(dbPath,{readOnly:true});
  core.exec("PRAGMA query_only=ON");
  onSqliteOpened?.(dbPath);
  afterReadOnlyOpen?.(dbPath);
  beforeReadOnlyOpen?.(candidateDbPath);
  candidate=new DatabaseSync(candidateDbPath,{readOnly:true});
  candidate.exec("PRAGMA query_only=ON");
  onSqliteOpened?.(candidateDbPath);
  afterReadOnlyOpen?.(candidateDbPath);
  core.exec("BEGIN");coreActive=true;
  candidate.exec("BEGIN");candidateActive=true;
  const current=sourceRows(core,T.observationCurrent,asOfDate);
  const history=sourceRows(core,T.observationHistory,asOfDate);
  candidateRows=sourceRows(candidate,T.observationHistory,asOfDate)??[];
  if(!current||!history||!sourceRows(candidate,T.observationCurrent,asOfDate))
   throw Error("PIT0605_SOURCE_SCHEMA_UNAVAILABLE");
  const historyKeys=historyIndex(history,asOfDate);
  const currentKeys=new Map();
  for(const row of current)if(isKnownAsOf(row,asOfDate))
   currentKeys.set(identity(row),row);
  missingRows=[...currentKeys].filter(([id,row])=>!historyKeys.has(id)
    &&row.logical_series_id==="STATE_INITIAL_CLAIMS"
    &&row.provider==="DOL_ETA").map(([,row])=>row);
  // Exact pre-existing R6 raw schema. No broad disk scan or new data source.
  const raw="market_score_employment_r6_raw_snapshot_v1";
  const runsTable="market_score_employment_r4_shadow_runs_v1";
  const hasCols=(table,cols)=>{
   if(!core.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))
    return false;
   const existing=new Set(core.prepare("PRAGMA table_info("+table+")").all().map(x=>x.name));
   return cols.every(x=>existing.has(x));
  };
  if(!hasCols(raw,["snapshot_id","chunk_index","chunk_count","release_group","provider",
    "request_key","retrieved_at","body_sha256","detail_json","body_chunk"])
    ||!hasCols(runsTable,["provider","status","completed_at","detail_json"]))
   throw Error("PIT0605_RAW_RUN_SCHEMA_UNAVAILABLE");
  let group=null,bytes=0;
  const finish=()=>{
   if(!group)return;
   if(group.valid&&group.index===group.chunkCount)
    snapshots.push({provider:"DOL_ETA",releaseGroup:"DOL_UI_WEEKLY_CLAIMS",
     requestKey:group.requestKey,retrievedAt:group.retrievedAt,
     snapshotId:group.id,bodySha256:group.bodySha256,
     detailJson:group.detailJson,body:group.parts.join("")});
   else malformedSnapshots++;
   group=null;
  };
  const sql="SELECT snapshot_id,chunk_index,chunk_count,release_group,provider,"+
   "request_key,retrieved_at,body_sha256,detail_json,body_chunk FROM "+raw+
   " WHERE provider=? AND release_group=? AND retrieved_at<=?"+
   " ORDER BY snapshot_id,chunk_index";
  for(const row of core.prepare(sql).iterate("DOL_ETA","DOL_UI_WEEKLY_CLAIMS",checkedAt)){
   if(!group||group.id!==row.snapshot_id){
    finish();
    if(snapshots.length+malformedSnapshots>=256)throw Error("PIT0605_SNAPSHOT_CAP");
    group={id:row.snapshot_id,index:0,valid:true,
     chunkCount:row.chunk_count,requestKey:row.request_key,
     retrievedAt:row.retrieved_at,bodySha256:row.body_sha256,
     detailJson:row.detail_json,parts:[]};
   }
   if(!Number.isSafeInteger(row.chunk_index)||row.chunk_index!==group.index
      ||row.chunk_count!==group.chunkCount||row.request_key!==group.requestKey
      ||row.retrieved_at!==group.retrievedAt||row.body_sha256!==group.bodySha256
      ||row.detail_json!==group.detailJson||typeof row.body_chunk!=="string")
    group.valid=false;
   group.index++;
   if(typeof row.body_chunk==="string"){
    bytes+=Buffer.byteLength(row.body_chunk,"utf8");
    if(bytes>256*1024*1024)throw Error("PIT0605_TOTAL_RAW_BYTE_CAP");
    if(group.valid)group.parts.push(row.body_chunk);
   }
  }
  finish();
  const sqlRuns="SELECT provider,status,completed_at,detail_json FROM "+runsTable+
   " WHERE completed_at<=? AND provider=?";
  for(const row of core.prepare(sqlRuns).iterate(checkedAt,
      "EMPLOYMENT_R6_DOL_UI_WEEKLY_CLAIMS")){
   if(runs.length>=20000)throw Error("PIT0605_RUN_CAP");
   runs.push({provider:row.provider,status:row.status,
     completedAt:row.completed_at,detailJson:row.detail_json});
  }
  core.exec("ROLLBACK");coreActive=false;
  candidate.exec("ROLLBACK");candidateActive=false;
 }finally{
  try{if(candidate){if(candidateActive)candidate.exec("ROLLBACK");candidate.close();}}
  finally{if(core){if(coreActive)core.exec("ROLLBACK");core.close();}}
 }
 const report=await classifyStoredEta539MissingHistory({
  missingCurrentRows:missingRows,candidateHistoryRows:candidateRows,
  rawSnapshots:snapshots,collectorRuns:runs,checkedAt,writePrivateEvidence,
 });
 return {...report,malformedRawSnapshotGroups:malformedSnapshots,
  inputSnapshotIdentity:"CORE_AND_CANDIDATE_READONLY_TRANSACTIONS",
  historicalVersionAttested:false,repairAuthorized:false};
}
