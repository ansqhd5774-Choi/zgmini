#!/usr/bin/env node
// One-shot, bounded summary for a separately approved PC Runner source bundle.
// The controller must supply paths from its sealed host manifest, NEVER from
// GitHub Issue text. This file does not install or authorize that controller.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {pathToFileURL} from "node:url";

import {EMPLOYMENT_R6_FEATURES} from "../../lib/market-score/employment-r6-formula.mjs";
import {validEmploymentR6PublicDisplay} from "../../worker/employment-r6-public-display.mjs";
import {optionsFrom,stageEmploymentR6OneYearWithPitAudit} from "./employment-r6-one-year-stage.mjs";

const FEATURE_IDS=new Set(EMPLOYMENT_R6_FEATURES.map(x=>x.id));
const RAW=new Set(["READY","STALE","UNAVAILABLE"]);
const CHART=new Set(["READY","PARTIAL","UNAVAILABLE"]);
const SCORE=new Set(["READY","PARTIAL_HISTORY","PARTIAL_MISSING"]);
const INPUT_FLAGS=new Set(["--db","--candidate-db-external","--output-dir","--as-of"]);
const PIT_COUNTS=[
  "coreCurrentRows","coreHistoryRevisions","coreCurrentKeys",
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
  "HOLD_UNVERIFIED_SOURCE_LINEAGE","HOLD_CORE_HISTORY_GAPS_WITHOUT_MATCHING_CANDIDATE",
  "READ_ONLY_PREVIEW_NO_PUBLICATION_APPROVAL",
]);
const SAFE_ERRORS=new Set([
  "RUNNER_R6_ARGUMENT_NOT_ALLOWED","RUNNER_R6_REQUIRED_ARGUMENT_MISSING",
  "RUNNER_R6_ISOLATED_CANDIDATE_REQUIRED","RUNNER_R6_SQLITE_HEADER_INVALID",
  "RUNNER_R6_SQLITE_INSPECTION_FAILED","RUNNER_R6_PUBLIC_DISPLAY_INVALID",
  "RUNNER_R6_INDICATOR_COUNT_INVALID","RUNNER_R6_INDICATOR_STATUS_INVALID",
  "RUNNER_R6_REPORT_TOO_LARGE","WAL_SIDECAR_NOT_READY",
  "EXTERNAL_CANDIDATE_PATH_INVALID","EXTERNAL_CANDIDATE_FILE_INVALID",
  "EXTERNAL_CANDIDATE_FILE_UNAVAILABLE","CANDIDATE_CORE_FILE_ALIAS_FORBIDDEN",
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
  const options=optionsFrom(argv);
  if(!options.candidateDbExternal||options.publish||options.discoverApprovedCandidate){
    throw Error("RUNNER_R6_ISOLATED_CANDIDATE_REQUIRED");
  }
  return options;
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
    if(wal&&!["-wal","-shm"].every(suffix=>{
      try{return fs.statSync(dbPath+suffix).isFile();}catch{return false;}
    }))throw Error("WAL_SIDECAR_NOT_READY");
    return {walMode:wal,walSidecarsPreexisting:wal};
  }catch(error){
    const code=safeCode(error?.message);
    throw Error(code==="RUNNER_R6_READ_FAILED"?"RUNNER_R6_SQLITE_INSPECTION_FAILED":code);
  }finally{if(file!==undefined)fs.closeSync(file);}
}

function projectPit(pitCoverage){
  const pit={};
  for(const field of PIT_COUNTS)pit[field]=safeCount(pitCoverage?.[field]);
  pit.candidateReconciliationPreviewStatus=PIT_STATUSES.has(pitCoverage?.candidateReconciliationPreviewStatus)
    ?pitCoverage.candidateReconciliationPreviewStatus:"NO_RUNTIME_EVIDENCE";
  return pit;
}

export function projectEmploymentR6RunnerResult({body=null,pitCoverage=null,pitCoverageError=null,error=null,wal=null}={}){
  if(!error&&(!body||!validEmploymentR6PublicDisplay(body))){
    throw Error("RUNNER_R6_PUBLIC_DISPLAY_INVALID");
  }
  const failure=error?safeCode(error?.message):null;
  const result={
    kind:"EMPLOYMENT_R6_RUNNER_READONLY_REPORT_V1",
    status:failure?(failure==="WAL_SIDECAR_NOT_READY"?"BLOCKED":"FAIL"):"PASS",
    code:failure??"EMPLOYMENT_R6_READONLY_STAGE_COMPLETED",
    asOfDate:/^\d{4}-\d{2}-\d{2}$/.test(body?.asOfDate??"")?body.asOfDate:null,
    dataStatus:body?.status==="READY"?"READY":body?.status==="PARTIAL"?"PARTIAL":"NO_RUNTIME_EVIDENCE",
    bodyDigest:body?crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex"):null,
    sourceMode:"CORE_PLUS_ISOLATED_CANDIDATE_READONLY",
    candidateDiscoveryStatus:"EXPLICIT_CANDIDATE_READONLY",
    summary:{},
    pit:projectPit(pitCoverage),
    pitAuditError:pitCoverageError?safeCode(pitCoverageError):null,
    indicators:[],
    promotionApproved:false,
    publicationStatus:"NOT_REQUESTED",
    sqliteOpened:body!==null||pitCoverage!==null,
    providerCalls:0,
    d1Writes:0,
    // A read-only SQLite connection can still touch WAL sidecar files.
    operationalDirectoryWrites:"NOT_ASSERTED",
    walPreflight:{
      coreWalMode:wal?.core?.walMode===true,
      candidateWalMode:wal?.candidate?.walMode===true,
      coreWalSidecarsPreexisting:wal?.core?.walSidecarsPreexisting===true,
      candidateWalSidecarsPreexisting:wal?.candidate?.walSidecarsPreexisting===true,
    },
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
      seen.add(item.id);
      return {id:item.id,rawStatus:item.rawStatus,chartStatus:item.chartStatus,scoreStatus:item.scoreStatus};
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
    "DATA_STATUS: "+report.dataStatus,
    "RAW_FEATURES: "+(report.summary.sourceFeatures??"NO_EVIDENCE"),
    "RECENT_QUARTER: "+(report.summary.recentlyObservedFeatures??"NO_EVIDENCE"),
    "ONE_YEAR_CHART_READY: "+(report.summary.chartReadyFeatures??"NO_EVIDENCE"),
    "CORE_PIT_HISTORY_MISSING: "+(report.pit.coreCurrentKeysMissingHistory??"NO_EVIDENCE"),
    "CANDIDATE_RECONCILIATION: "+report.pit.candidateReconciliationPreviewStatus,
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
  let report;
  try{
    const wal={core:inspectWalSidecars(options.dbPath),candidate:inspectWalSidecars(options.candidateDbPath)};
    const diagnostic=await stageEmploymentR6OneYearWithPitAudit(options);
    report=projectEmploymentR6RunnerResult({...diagnostic,wal});
  }catch(error){
    report=projectEmploymentR6RunnerResult({error});
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
