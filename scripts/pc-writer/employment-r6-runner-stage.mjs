#!/usr/bin/env node
// One-shot, bounded summary for a separately approved PC Runner source bundle.
// The controller must supply paths from its sealed host manifest, NEVER from
// GitHub Issue text. This file does not install or authorize that controller.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {pathToFileURL} from "node:url";

import {EMPLOYMENT_R6_FEATURES} from "../../lib/market-score/employment-r6-formula.mjs";
import {EMPLOYMENT_R4_CORE_STATES} from "../../lib/market-score/employment-r4-shadow-contract.mjs";
import {validEmploymentR6PublicDisplay} from "../../worker/employment-r6-public-display.mjs";
import {optionsFrom,stageEmploymentR6OneYearWithPitAudit} from "./employment-r6-one-year-stage.mjs";
import {auditEmploymentR6Pit0605StoredRaw} from "./employment-r6-pit-coverage.mjs";

const FEATURE_IDS=new Set(EMPLOYMENT_R6_FEATURES.map(x=>x.id));
const RAW=new Set(["READY","STALE","UNAVAILABLE"]);
const CHART=new Set(["READY","PARTIAL","UNAVAILABLE"]);
const SCORE=new Set(["READY","PARTIAL_HISTORY","PARTIAL_MISSING"]);
const INPUT_FLAGS=new Set(["--db","--candidate-db-external","--output-dir","--as-of","--pit04-offset","--pit0605-raw","--pit0408-private"]);
const PIT_COUNTS=[
  "coreCurrentRows","coreHistoryRevisions","coreCurrentKeys",
  // Fixed non-sensitive counts also permitted by the existing Controller A.
  // Nothing here may return raw source hashes, rows or availability times.
  "coreHistoryAsOfUniqueKeys","coreHistoryPriorRevisionKeys",
  "coreHistoryPriorRevisionRows","coreHistoryAmbiguousLatestKeys",
  "coreHistorySameInstantAdditionalRows","candidateHistoryAsOfUniqueKeys",
  "candidateHistoryPriorRevisionKeys","candidateHistoryPriorRevisionRows",
  "candidateHistoryAmbiguousLatestKeys","candidateHistorySameInstantAdditionalRows",
  "coreCurrentHistoryMatchingKeys","coreCurrentHistoryConflictingKeys",
  "coreCurrentHistoryUnverifiedKeys","coreCurrentHistoryMissingKeys",
  "coreCurrentKeysMissingHistory","missingKeysWithCandidateHistory",
  "missingKeysWithMatchingCandidateValueAndHash","candidateCurrentKeys",
  "candidateNewKeys","candidateOverlapMatchingKeys",
  "candidateOverlapConflictingKeys","candidateOverlapUnverifiedKeys",
  "candidateNewKeysWithConsistentPITMetadata",
  "candidateNewKeysWithIncompletePITMetadata",
  "coreMissingHistoryKeysWithConsistentCandidateMetadata",
  "coreMissingHistoryKeysWithoutConsistentCandidateMetadata",
];
const PIT_STATUSES=new Set([
  "NO_RUNTIME_EVIDENCE","HOLD_CONFLICTING_REVISIONS",
  "HOLD_AMBIGUOUS_LATEST_REVISIONS",
  "HOLD_UNVERIFIED_SOURCE_LINEAGE","HOLD_CORE_HISTORY_GAPS_WITHOUT_MATCHING_CANDIDATE",
  "READ_ONLY_PREVIEW_NO_PUBLICATION_APPROVAL",
]);
const SAFE_ERRORS=new Set([
  "RUNNER_R6_ARGUMENT_NOT_ALLOWED","RUNNER_R6_REQUIRED_ARGUMENT_MISSING",
  "RUNNER_R6_ISOLATED_CANDIDATE_REQUIRED","RUNNER_R6_SQLITE_HEADER_INVALID",
  "RUNNER_R6_SQLITE_INSPECTION_FAILED","RUNNER_R6_PUBLIC_DISPLAY_INVALID",
  "RUNNER_R6_INDICATOR_COUNT_INVALID","RUNNER_R6_INDICATOR_STATUS_INVALID",
  "RUNNER_R6_REPORT_TOO_LARGE","WAL_SIDECAR_NOT_READY","WAL_SIDECAR_CHANGED",
  "EXTERNAL_CANDIDATE_PATH_INVALID","EXTERNAL_CANDIDATE_FILE_INVALID",
  "EXTERNAL_CANDIDATE_FILE_UNAVAILABLE","EXTERNAL_CANDIDATE_FILE_CHANGED",
  "CANDIDATE_CORE_FILE_ALIAS_FORBIDDEN",
  "CANDIDATE_PUBLICATION_NOT_APPROVED","CANDIDATE_DISCOVERY_ARGUMENT_CONFLICT",
  "EXISTING_ABSOLUTE_DB_AND_OUTPUT_DIR_REQUIRED","INVALID_AS_OF_DATE",
  "FUTURE_AS_OF_FORBIDDEN","PC_SOURCE_DB_NOT_FOUND",
  "NO_VERIFIED_PIT_OBSERVATIONS","PUBLIC_DISPLAY_VALIDATION_FAILED",
  "PIT_AUDIT_AS_OF_INVALID","PIT_AUDIT_CORE_NOT_FOUND",
  "PIT_AUDIT_CANDIDATE_NOT_FOUND","PIT_AUDIT_CANDIDATE_IS_CORE",
  "PIT_AUDIT_READ_FAILED",
]);
const safeCode=value=>SAFE_ERRORS.has(value)?value:"RUNNER_R6_READ_FAILED";
const safeCount=value=>Number.isSafeInteger(value)&&value>=0?value:null;
const WAL_FAILURE_CODES=new Set(["WAL_SIDECAR_NOT_READY","WAL_SIDECAR_CHANGED"]);
const SIDECAR_STATES=new Set(["PRESENT_FILE","ABSENT","NOT_FILE","ACCESS_DENIED","STAT_ERROR"]);

function sidecarState(dbPath,suffix){
  try{return fs.statSync(dbPath+suffix).isFile()?"PRESENT_FILE":"NOT_FILE";}
  catch(error){
    if(error?.code==="ENOENT")return "ABSENT";
    if(error?.code==="EACCES"||error?.code==="EPERM")return "ACCESS_DENIED";
    return "STAT_ERROR";
  }
}

export function runnerOptionsFrom(argv){
  if(!Array.isArray(argv)||argv.length%2!==0)throw Error("RUNNER_R6_ARGUMENT_NOT_ALLOWED");
  const seen=new Set();
  for(let i=0;i<argv.length;i+=2){
    const flag=argv[i],value=argv[i+1];
    if(!INPUT_FLAGS.has(flag)||seen.has(flag)||typeof value!=="string"||value.length===0
      ||value.startsWith("--"))throw Error("RUNNER_R6_ARGUMENT_NOT_ALLOWED");
    seen.add(flag);
  }
  if(!seen.has("--db")||!seen.has("--candidate-db-external")||!seen.has("--output-dir")){
    throw Error("RUNNER_R6_REQUIRED_ARGUMENT_MISSING");
  }
  const lower=[];
  let keyReviewOffset=null,pit0605Raw=false,pit0408Private=false;
  for(let i=0;i<argv.length;i+=2){
    if(argv[i]==="--pit0408-private"){
      if(argv[i+1]!=="1")throw Error("RUNNER_R6_ARGUMENT_NOT_ALLOWED");
      pit0408Private=true;
    }else if(argv[i]==="--pit0605-raw"){
      if(argv[i+1]!=="1")throw Error("RUNNER_R6_ARGUMENT_NOT_ALLOWED");
      pit0605Raw=true;
    }else if(argv[i]==="--pit04-offset"){
      const value=argv[i+1];
      if(!/^(0|[1-9][0-9]{0,4})$/.test(value)||Number(value)>50000)
        throw Error("RUNNER_R6_ARGUMENT_NOT_ALLOWED");
      keyReviewOffset=Number(value);
    }else lower.push(argv[i],argv[i+1]);
  }
  if((pit0605Raw&&keyReviewOffset!==null)
    ||(pit0408Private&&(pit0605Raw||keyReviewOffset!==0)))
    throw Error("RUNNER_R6_ARGUMENT_NOT_ALLOWED");
  const options=optionsFrom(lower);
  if(!options.candidateDbExternal||options.publish||options.discoverApprovedCandidate){
    throw Error("RUNNER_R6_ISOLATED_CANDIDATE_REQUIRED");
  }
  return {...options,keyReviewOffset,pit0605Raw,pit0408Private};
}

// SQLite can create -wal/-shm even for DatabaseSync(readOnly:true). Do not
// cause new sidecars in an operational directory when the DB header is WAL.
// Existing shared-memory locks may still change; this is not a zero-I/O proof.
export function inspectWalSidecars(dbPath){
  let file;
  try{
    file=fs.openSync(dbPath,"r");
    const header=Buffer.alloc(20);
    if(fs.readSync(file,header,0,20,0)!==20
      ||header.toString("ascii",0,15)!=="SQLite format 3"){
      throw Error("RUNNER_R6_SQLITE_HEADER_INVALID");
    }
    const wal=header[18]===2||header[19]===2;
    if(wal){
      const walState=sidecarState(dbPath,"-wal");
      const shmState=sidecarState(dbPath,"-shm");
      if(walState!=="PRESENT_FILE"||shmState!=="PRESENT_FILE"){
        const blocked=Error("WAL_SIDECAR_NOT_READY");
        blocked.walDetail={headerMode:"WAL",walState,shmState,
          observedAt:new Date().toISOString()};
        throw blocked;
      }
    }
    return {walMode:wal,walSidecarsPreexisting:wal};
  }catch(error){
    const code=safeCode(error?.message);
    const normalized=Error(code==="RUNNER_R6_READ_FAILED"?"RUNNER_R6_SQLITE_INSPECTION_FAILED":code);
    if(code==="WAL_SIDECAR_NOT_READY")normalized.walDetail=error.walDetail;
    throw normalized;
  }finally{if(file!==undefined)fs.closeSync(file);}
}

function fileIdentity(file){
  try{
    const stat=fs.statSync(file,{bigint:true});
    if(!stat.isFile())throw Error("WAL_SIDECAR_NOT_READY");
    return {dev:stat.dev,ino:stat.ino};
  }catch{throw Error("WAL_SIDECAR_NOT_READY");}
}

// Recheck both sidecar existence and file identity around *each* SQLite open.
// This detects replacement/rotation, but does not claim an atomic Windows
// sidecar lock: an OS-level writer can still race between checks.
export function captureWalSidecarSeal(dbPath){
  const preflight=inspectWalSidecars(dbPath);
  return {preflight,sqlite:fileIdentity(dbPath),
    wal:preflight.walMode?fileIdentity(dbPath+"-wal"):null,
    shm:preflight.walMode?fileIdentity(dbPath+"-shm"):null};
}

export function assertWalSidecarSeal(dbPath,expected){
  const actual=captureWalSidecarSeal(dbPath);
  const same=(a,b)=>a===null&&b===null
    ||Boolean(a&&b&&a.dev===b.dev&&a.ino===b.ino);
  if(actual.preflight.walMode!==expected.preflight.walMode
    ||!same(actual.sqlite,expected.sqlite)
    ||!same(actual.wal,expected.wal)||!same(actual.shm,expected.shm)){
    throw Error("WAL_SIDECAR_CHANGED");
  }
}

function projectPit(pitCoverage){
  const pit={};
  for(const field of PIT_COUNTS)pit[field]=safeCount(pitCoverage?.[field]);
  pit.candidateReconciliationPreviewStatus=PIT_STATUSES.has(pitCoverage?.candidateReconciliationPreviewStatus)
    ?pitCoverage.candidateReconciliationPreviewStatus:"NO_RUNTIME_EVIDENCE";
  return pit;
}


const PIT04_STATES=new Set(EMPLOYMENT_R4_CORE_STATES);
const PIT04_REASONS=new Set([
  "CANDIDATE_CURRENT_CONFLICT","CORE_HISTORY_AMBIGUOUS","CORE_HISTORY_CONFLICT",
  "CORE_CURRENT_DUPLICATE","MISSING_HISTORY_CANDIDATE_UNVERIFIED",
  "MISSING_HISTORY_NO_CANDIDATE","MISSING_HISTORY_CANDIDATE_INTERNAL_MATCH_ONLY",
]);
const PIT04_COUNT_FIELDS=[
  "coreKeys","coreHistoryMissing","coreHistoryConflict","coreHistoryAmbiguous",
  "candidateOverlapConflicts","missingCandidateInternalMatch",
  "missingCandidateIncomplete","missingWithoutCandidate","duplicateCurrentKeys",
];
function projectPit04KeyReview(input){
  if(input===undefined||input===null)return null;
  const count=n=>Number.isSafeInteger(n)&&n>=0?n:null;
  const offset=count(input.offset),pageSize=count(input.pageSize);
  const total=count(input.evidenceTotal),next=input.nextOffset===null?null:count(input.nextOffset);
  const counts=Object.fromEntries(PIT04_COUNT_FIELDS.map(key=>[key,count(input.counts?.[key])]));
  if(input.kind!=="EMPLOYMENT_R6_PIT0408_KEY_REVIEW_SOURCE_ONLY_V1"
    ||input.status!=="HOLD_KEY_CLASSIFICATION_NOT_RAW_PIT_ATTESTATION"
    ||input.rawPitAttested!==false||input.promotionApproved!==false||input.repairAuthorized!==false
    ||[offset,pageSize,total,...Object.values(counts)].some(x=>x===null)
    ||offset>50000||pageSize<1||pageSize>8||total>counts.coreKeys
    ||counts.coreHistoryMissing!==counts.missingCandidateInternalMatch
      +counts.missingCandidateIncomplete+counts.missingWithoutCandidate
    ||!Array.isArray(input.evidence)||input.evidence.length>pageSize
    ||input.evidence.length>Math.max(0,total-offset)
    ||input.evidenceTruncated!==(next!==null)
    ||(next!==null&&(next!==offset+pageSize||next>=total))
    ||(next===null&&offset+pageSize<total))throw Error("RUNNER_R6_PIT04_REVIEW_INVALID");
  const seen=new Set();
  const evidence=input.evidence.map(item=>{
    const d=item?.observationDate,geo=item?.geographyCode,reason=item?.reason;
    const key=geo+"|"+d;
    if(item?.logicalSeriesId!=="STATE_INITIAL_CLAIMS"
      ||!PIT04_STATES.has(geo)
      ||typeof d!=="string"||!/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(d)
      ||Number.isNaN(Date.parse(d+"T00:00:00Z"))
      ||new Date(d+"T00:00:00Z").toISOString().slice(0,10)!==d
      ||new Date(d+"T00:00:00Z").getUTCDay()!==6
      ||!PIT04_REASONS.has(reason)||seen.has(key)
      ||typeof item.coreHistoryMissing!=="boolean"
      ||typeof item.candidateCurrentConflict!=="boolean"
      ||item.rawPitAttested!==false||item.repairAuthorized!==false)
      throw Error("RUNNER_R6_PIT04_REVIEW_INVALID");
    seen.add(key);
    return {logicalSeriesId:"STATE_INITIAL_CLAIMS",geographyCode:geo,
      observationDate:d,reason,coreHistoryMissing:item.coreHistoryMissing,
      candidateCurrentConflict:item.candidateCurrentConflict,
      rawPitAttested:false,repairAuthorized:false};
  });
  return {kind:input.kind,status:input.status,counts,evidenceTotal:total,
    offset,pageSize,evidenceTruncated:next!==null,nextOffset:next,evidence,
    rawPitAttested:false,promotionApproved:false,repairAuthorized:false};
}


// Opt-in PIT-06-05 projection cannot disclose individual keys, source hashes,
// paths or precise timestamps. It remains distinct from the normal 29-series
// display contract; the Controller must explicitly approve this new result.
export function projectPit0605Aggregate(raw){
 const labels=["ORIGINAL_VERSION_AND_HISTORICAL_AVAILABILITY_PROVED",
  "RAW_OBSERVATION_MATCH_HISTORICAL_TIME_UNPROVEN",
  "RAW_OBSERVATION_OR_REVISION_CONFLICT","RAW_NOT_FOUND_IN_CHECKED_SCOPE"];
 const integer=v=>Number.isSafeInteger(v)&&v>=0?v:null;
 if(raw?.schema!=="ZGMINI_W04_PIT0605_SOURCE_ONLY_V1"
   ||raw.scope!=="CHECKED_STORED_RAW_SNAPSHOTS_NOT_HISTORICAL_PIT"
   ||raw.historicPitAttested!==false||raw.repairAuthorized!==false
   ||raw.providerCalls!==0||raw.sqliteWrites!==0||raw.d1Writes!==0
   ||typeof raw.evidenceDigest!=="string"||!/^[a-f0-9]{64}$/.test(raw.evidenceDigest)
   ||!Number.isFinite(Date.parse(raw.checkedAt??"")))
  throw Error("RUNNER_R6_PIT0605_REPORT_INVALID");
 const counts=Object.fromEntries(labels.map(label=>[label,integer(raw.counts?.[label])]));
 const checkedKeys=integer(raw.missingHistoryKeys);
 const snapshots=integer(raw.checkedRawSnapshots);
 const accepted=integer(raw.acceptedDOLSnapshots);
 const malformed=integer(raw.malformedRawSnapshotGroups);
 const rejected=Object.fromEntries(["bodyOrId","metadata","run","parser"]
  .map(label=>[label,integer(raw.rejectedRawSnapshots?.[label])]));
 if(checkedKeys===null||checkedKeys>50000||Object.values(counts).some(v=>v===null)
   ||Object.values(counts).reduce((a,b)=>a+b,0)!==checkedKeys
   ||counts.ORIGINAL_VERSION_AND_HISTORICAL_AVAILABILITY_PROVED!==0
   ||snapshots===null||accepted===null||malformed===null
   ||accepted>snapshots||Object.values(rejected).some(v=>v===null))
  throw Error("RUNNER_R6_PIT0605_REPORT_INVALID");
 return {kind:"ZGMINI_W04_PIT0605_AGGREGATE_ONLY_V1",
  status:"HOLD_HISTORICAL_PIT_UNATTESTED",checkedAt:raw.checkedAt,
  missingHistoryKeys:checkedKeys,counts,checkedRawSnapshots:snapshots,
  acceptedDOLSnapshots:accepted,rejectedRawSnapshots:rejected,
  malformedRawSnapshotGroups:malformed,evidenceDigest:raw.evidenceDigest,
  historicalVersionAttested:false,repairAuthorized:false,
  operationalWrites:0,providerCalls:0,d1Writes:0};
}

export function projectEmploymentR6RunnerResult({body=null,pitCoverage=null,pitCoverageError=null,
  error=null,wal=null,sqliteOpened=false,walFailure=null}={}){
  if(!error&&(!body||!validEmploymentR6PublicDisplay(body))){
    throw Error("RUNNER_R6_PUBLIC_DISPLAY_INVALID");
  }
  const failure=error?safeCode(error?.message):null;
  const result={
    kind:"EMPLOYMENT_R6_RUNNER_READONLY_REPORT_V1",
    status:failure?(["WAL_SIDECAR_NOT_READY","WAL_SIDECAR_CHANGED"].includes(failure)?"BLOCKED":"FAIL"):"PASS",
    code:failure??"EMPLOYMENT_R6_READONLY_STAGE_COMPLETED",
    asOfDate:/^\d{4}-\d{2}-\d{2}$/.test(body?.asOfDate??"")?body.asOfDate:null,
    dataStatus:body?.status==="READY"?"READY":body?.status==="PARTIAL"?"PARTIAL":"NO_RUNTIME_EVIDENCE",
    bodyDigest:body?crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex"):null,
    sourceMode:"CORE_PLUS_ISOLATED_CANDIDATE_READONLY",
    candidateDiscoveryStatus:"EXPLICIT_CANDIDATE_READONLY",
    summary:{},
    pit:projectPit(pitCoverage),
    ...(pitCoverage?.pit04KeyReview==null?{}:{pit04KeyReview:projectPit04KeyReview(pitCoverage.pit04KeyReview)}),
    ...(typeof pitCoverage?.pit04PrivateEvidenceDigest==="string"&&
      /^[a-f0-9]{64}$/.test(pitCoverage.pit04PrivateEvidenceDigest)&&
      pitCoverage.pit04PrivateEvidencePersisted===true
      ?{pit04PrivateEvidenceDigest:pitCoverage.pit04PrivateEvidenceDigest,
        pit04PrivateEvidencePersisted:true}:{}),
    pitAuditError:pitCoverageError?safeCode(pitCoverageError):null,
    indicators:[],
    promotionApproved:false,
    publicationStatus:"NOT_REQUESTED",
    sqliteOpened:sqliteOpened===true,
    providerCalls:0,
    d1Writes:0,
    // A read-only SQLite connection can still touch WAL sidecar files.
    operationalDirectoryWrites:"NOT_ASSERTED",
    walPreflight:{
      coreObserved:wal?.core!=null,
      candidateObserved:wal?.candidate!=null,
      coreWalMode:wal?.core?.walMode===true,
      candidateWalMode:wal?.candidate?.walMode===true,
      coreWalSidecarsPreexisting:wal?.core?.walSidecarsPreexisting===true,
      candidateWalSidecarsPreexisting:wal?.candidate?.walSidecarsPreexisting===true,
    },
    walFailure:failure&&WAL_FAILURE_CODES.has(failure)?{
      dbRole:["CORE","CANDIDATE"].includes(walFailure?.dbRole)?walFailure.dbRole:"UNKNOWN",
      phase:["INITIAL_SEAL","BEFORE_READ","AFTER_READ"].includes(walFailure?.phase)
        ?walFailure.phase:"UNKNOWN",
      headerMode:walFailure?.detail?.headerMode==="WAL"?"WAL":"UNKNOWN",
      walState:SIDECAR_STATES.has(walFailure?.detail?.walState)
        ?walFailure.detail.walState:"UNOBSERVED",
      shmState:SIDECAR_STATES.has(walFailure?.detail?.shmState)
        ?walFailure.detail.shmState:"UNOBSERVED",
      observedAt:typeof walFailure?.detail?.observedAt==="string"
        && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(walFailure.detail.observedAt)
        ?walFailure.detail.observedAt:null,
    }:null,
  };
  for(const name of ["sourceFeatures","recentlyObservedFeatures","chartReadyFeatures",
    "chartPartialFeatures","scoredFeatures","recentlyScoredFeatures"]){
    result.summary[name]=safeCount(body?.summary?.[name]);
  }
  if(body?.indicators){
    if(!Array.isArray(body.indicators)||body.indicators.length!==29)throw Error("RUNNER_R6_INDICATOR_COUNT_INVALID");
    const seen=new Set();
    result.indicators=body.indicators.map(item=>{
      if(!FEATURE_IDS.has(item?.id)||seen.has(item.id)||!RAW.has(item.rawStatus)
        ||!CHART.has(item.chartStatus)||!SCORE.has(item.scoreStatus)){
        throw Error("RUNNER_R6_INDICATOR_STATUS_INVALID");
      }
      // The approved stored-PIT reader already calculated this date.
      // Expose one bounded calendar date, never private rows or hashes.
      const missing=item.firstMissingReferenceDate;
      if(missing!==null&&missing!==undefined&&
        (item.scoreStatus!=="PARTIAL_HISTORY"||
         typeof missing!=="string"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(missing)||
         !Number.isFinite(Date.parse(missing+"T00:00:00Z"))||
         new Date(missing+"T00:00:00Z").toISOString().slice(0,10)!==missing||
         missing>body.asOfDate))throw Error("RUNNER_R6_INDICATOR_STATUS_INVALID");
      seen.add(item.id);
      return {id:item.id,rawStatus:item.rawStatus,chartStatus:item.chartStatus,
        scoreStatus:item.scoreStatus,
        ...(missing===null||missing===undefined?{}:{firstMissingReferenceDate:missing})};
    });
  }
  const size=Buffer.byteLength(JSON.stringify(result));
  if(size>12000)throw Error("RUNNER_R6_REPORT_TOO_LARGE");
  return result;
}

function writeRunnerReport(outputDir,report){
  const suffix=new Date().toISOString().replace(/[-:.]/g,"")+"_"+process.pid;
  const basename="EMPLOYMENT_R6_RUNNER_"+suffix;
  const json=JSON.stringify(report,null,2)+"\n";
  const txt=[
    "ZGMINI EMPLOYMENT R6 RUNNER READONLY",
    "STATUS: "+report.status,
    "CODE: "+report.code,
    "DATA_STATUS: "+(report.dataStatus??"PIT0605_NOT_PUBLICATION"),
    "RAW_FEATURES: "+(report.summary?.sourceFeatures??"NO_EVIDENCE"),
    "RECENT_QUARTER: "+(report.summary?.recentlyObservedFeatures??"NO_EVIDENCE"),
    "ONE_YEAR_CHART_READY: "+(report.summary?.chartReadyFeatures??"NO_EVIDENCE"),
    "CORE_PIT_HISTORY_MISSING: "+(report.pit?.coreCurrentKeysMissingHistory??report.pit0605Aggregate?.missingHistoryKeys??"NO_EVIDENCE"),
    "CANDIDATE_RECONCILIATION: "+(report.pit?.candidateReconciliationPreviewStatus??"NOT_REQUESTED"),
    "WAL_FAILURE_ROLE: "+(report.walFailure?.dbRole??"NONE"),
    "WAL_FAILURE_PHASE: "+(report.walFailure?.phase??"NONE"),
    "WAL_FAILURE_STATES: "+(report.walFailure
      ?report.walFailure.walState+"/"+report.walFailure.shmState:"NONE"),
    "PROVIDER_CALLS: 0","D1_WRITES: 0","PUBLICATION: NOT_REQUESTED",
    "WAL_DIRECTORY_WRITES: NOT_ASSERTED","",
  ].join("\r\n");
  if(Buffer.byteLength(json)+Buffer.byteLength(txt)>16384)throw Error("RUNNER_R6_REPORT_TOO_LARGE");
  fs.writeFileSync(path.join(outputDir,basename+".json"),json,{encoding:"utf8",flag:"wx"});
  fs.writeFileSync(path.join(outputDir,basename+".txt"),txt,{encoding:"utf8",flag:"wx"});
  return basename;
}

export async function runEmploymentR6Runner(argv){
  let options;
  try{options=runnerOptionsFrom(argv);}catch(error){
    return {status:"BLOCKED",code:safeCode(error?.message),reportFile:null};
  }
  let report,sqliteOpened=false,walFailure=null;
  const wal={core:null,candidate:null};
  const protect=(dbRole,phase,check)=>{
    try{return check();}
    catch(error){
      if(WAL_FAILURE_CODES.has(safeCode(error?.message))){
        walFailure={dbRole,phase,detail:error?.walDetail??null};
      }
      throw error;
    }
  };
  try{
    const coreSeal=protect("CORE","INITIAL_SEAL",()=>captureWalSidecarSeal(options.dbPath));
    wal.core=coreSeal.preflight;
    const candidateSeal=protect("CANDIDATE","INITIAL_SEAL",()=>captureWalSidecarSeal(options.candidateDbPath));
    wal.candidate=candidateSeal.preflight;
    const check=(dbPath,phase)=>{
      if(dbPath===options.dbPath)protect("CORE",phase,()=>assertWalSidecarSeal(dbPath,coreSeal));
      else if(dbPath===options.candidateDbPath){
        protect("CANDIDATE",phase,()=>assertWalSidecarSeal(dbPath,candidateSeal));
      }
      else throw Error("RUNNER_R6_ARGUMENT_NOT_ALLOWED");
    };
    if(options.pit0605Raw){
      // The existing Controller must supply this sealed output directory.
      // File is never returned in the public JSON/TXT summary; completion of
      // PIT-06-05 still requires durable private evidence retention/readback.
      const evidenceFile=path.join(options.outputDir,"PIT0605_PRIVATE_KEY_EVIDENCE.json");
      const saved=async(rows,digest)=>{
        if(!Array.isArray(rows)||rows.length>50000||!/^[a-f0-9]{64}$/.test(digest))
          throw Error("RUNNER_R6_PIT0605_REPORT_INVALID");
        const payload={kind:"PIT0605_PC_WORKSPACE_PRIVATE_V1",digest,rows};
        const bytes=Buffer.byteLength(JSON.stringify(payload));
        if(bytes>32*1024*1024)throw Error("RUNNER_R6_PIT0605_REPORT_INVALID");
        fs.writeFileSync(evidenceFile,JSON.stringify(payload)+"\n",
          {encoding:"utf8",flag:"wx",mode:0o600});
      };
      const result=await auditEmploymentR6Pit0605StoredRaw({
        dbPath:options.dbPath,candidateDbPath:options.candidateDbPath,
        asOfDate:options.asOfDate,writePrivateEvidence:saved,
        beforeReadOnlyOpen:dbPath=>check(dbPath,"BEFORE_READ"),
        afterReadOnlyOpen:dbPath=>check(dbPath,"AFTER_READ"),
        onSqliteOpened:()=>{sqliteOpened=true;},
      });
      const aggregate=projectPit0605Aggregate(result);
      // No individually identifiable key, source hash or private path escapes.
      // Separate shape; never fabricate a normal display PASS to satisfy
      // the existing Controller 29-indicator validation.
      report={kind:"EMPLOYMENT_R6_RUNNER_PIT0605_AGGREGATE_V1",
        status:"PASS",code:"PIT0605_SOURCE_EVIDENCE_CLASSIFIED_NOT_PIT",
        pit0605Aggregate:aggregate,providerCalls:0,d1Writes:0,
        publicationStatus:"NOT_REQUESTED",promotionApproved:false};
    }else{
    const privateKeyLedger=options.pit0408Private
      ?(ledger,digest)=>{
        if(ledger?.schema!=="W04_PIT0408_PRIVATE_KEYS_V1"
          ||!/^[a-f0-9]{64}$/.test(digest)
          ||crypto.createHash("sha256").update(JSON.stringify(ledger)).digest("hex")!==digest
          ||ledger.evidence?.length>50000
          ||ledger.allSeriesCandidateCurrentConflicts?.length>50000)
          throw Error("RUNNER_R6_PIT0408_PRIVATE_INVALID");
        const serialized=JSON.stringify({
          kind:"PIT0408_PC_WORKSPACE_PRIVATE_V1",digest,ledger})+"\n";
        if(Buffer.byteLength(serialized)>32*1024*1024)
          throw Error("RUNNER_R6_PIT0408_PRIVATE_INVALID");
        fs.writeFileSync(path.join(options.outputDir,"PIT0408_PRIVATE_KEY_EVIDENCE.json"),
          serialized,{encoding:"utf8",flag:"wx",mode:0o600});
      }:null;
    const diagnostic=await stageEmploymentR6OneYearWithPitAudit({...options,
      onPrivateKeyLedger:privateKeyLedger,
      beforeReadOnlyOpen:dbPath=>check(dbPath,"BEFORE_READ"),
      afterReadOnlyOpen:dbPath=>check(dbPath,"AFTER_READ"),
      onSqliteOpened:()=>{sqliteOpened=true;},
    });
    report=projectEmploymentR6RunnerResult({...diagnostic,wal,sqliteOpened});
    }
  }catch(error){
    report=projectEmploymentR6RunnerResult({error,wal,sqliteOpened,walFailure});
  }
  let reportFile=null;
  try{reportFile=writeRunnerReport(options.outputDir,report);}
  catch{return {status:"FAIL",code:"RUNNER_R6_REPORT_WRITE_FAILED",reportFile:null};}
  return {status:report.status,code:report.code,reportFile};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  runEmploymentR6Runner(process.argv.slice(2)).then(result=>{
    process.stdout.write("STATUS: "+result.status+" CODE: "+result.code+"\n");
    if(result.status!=="PASS")process.exitCode=2;
  }).catch(()=>{
    process.stdout.write("STATUS: FAIL CODE: RUNNER_R6_INTERNAL_ERROR\n");
    process.exitCode=2;
  });
}
