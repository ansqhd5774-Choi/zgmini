#!/usr/bin/env node
// Opt-in PC stage/publish. Never creates or mutates the existing PC SQLite DB.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {DatabaseSync} from "node:sqlite";
import {fileURLToPath,pathToFileURL} from "node:url";

import {createEmploymentR6ObservationReader,selectAsOfRevisions} from "../../lib/market-score/employment-r6-observation-reader.mjs";
import {buildEmploymentR6OneYearReadModel} from "../../lib/market-score/employment-r6-one-year-read-model.mjs";
import {
  EMPLOYMENT_R6_PUBLIC_DISPLAY_KEY,
  validEmploymentR6PublicDisplay,
} from "../../worker/employment-r6-public-display.mjs";
import {client,credential,hash,read} from "./d1.mjs";
import {auditEmploymentR6PitCoverage} from "./employment-r6-pit-coverage.mjs";
import {locateEmploymentR6Candidate} from "./employment-r6-candidate-locator.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const safeDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const nowIso=()=>new Date().toISOString();
const candidateBasename="EMPLOYMENT_R6_CANDIDATE.sqlite";

// An explicit candidate may live beside a prior isolated collection CMD. Its
// location is supplied by the operator, never found by scanning arbitrary
// drives. Validate identity before any read, including Core aliases/hardlinks.
function validateExternalCandidatePath(candidatePath,coreDbPath,expectedIdentity=null){
  if(typeof candidatePath!=="string"||!path.isAbsolute(candidatePath)
    ||path.basename(candidatePath)!==candidateBasename){
    throw Error("EXTERNAL_CANDIDATE_PATH_INVALID");
  }
  try{
    const candidateReal=fs.realpathSync.native(candidatePath);
    const coreReal=fs.realpathSync.native(coreDbPath);
    const candidateStat=fs.statSync(candidateReal,{bigint:true});
    const coreStat=fs.statSync(coreReal,{bigint:true});
    if(!candidateStat.isFile()||!coreStat.isFile()
      ||path.basename(candidateReal)!==candidateBasename){
      throw Error("EXTERNAL_CANDIDATE_FILE_INVALID");
    }
    if(candidateReal===coreReal
      ||(candidateStat.dev===coreStat.dev&&candidateStat.ino===coreStat.ino)){
      throw Error("CANDIDATE_CORE_FILE_ALIAS_FORBIDDEN");
    }
    const identity={realpath:candidateReal,dev:candidateStat.dev,ino:candidateStat.ino,
      size:candidateStat.size,mtimeNs:candidateStat.mtimeNs};
    if(expectedIdentity&&Object.keys(identity).some(key=>identity[key]!==expectedIdentity[key])){
      throw Error("EXTERNAL_CANDIDATE_FILE_CHANGED");
    }
    return identity;
  }catch(error){
    if(/^(EXTERNAL_CANDIDATE_FILE_INVALID|CANDIDATE_CORE_FILE_ALIAS_FORBIDDEN|EXTERNAL_CANDIDATE_FILE_CHANGED)$/.test(error?.message))throw error;
    // OS errors may embed the private PC path; never propagate their message.
    throw Error("EXTERNAL_CANDIDATE_FILE_UNAVAILABLE");
  }
}

export function optionsFrom(args){
  const result={publish:false,discoverApprovedCandidate:false};
  const seen=new Set();
  for(let i=0;i<args.length;i++){
    const token=args[i];
    if(seen.has(token))throw Error("DUPLICATE_ARGUMENT");
    seen.add(token);
    if(token==="--publish"){result.publish=true;continue;}
    if(token==="--discover-approved-candidate"){result.discoverApprovedCandidate=true;continue;}
    if(["--db","--output-dir","--as-of","--candidate-db","--candidate-db-external"].includes(token)&&args[i+1]){
      result[token==="--db"?"dbPath":token==="--output-dir"?"outputDir":token==="--candidate-db"?"candidateDbPath":token==="--candidate-db-external"?"candidateDbExternalPath":"asOfDate"]=args[++i];
      continue;
    }
    throw Error("INVALID_ARGUMENT");
  }
  // An isolated research candidate is never an approved PC publication source.
  // Reject the combination before opening either database or contacting D1.
  if(result.publish&&(result.candidateDbPath||result.candidateDbExternalPath||result.discoverApprovedCandidate))throw Error("CANDIDATE_PUBLICATION_NOT_APPROVED");
  if([result.candidateDbPath,result.candidateDbExternalPath,result.discoverApprovedCandidate].filter(Boolean).length>1){
    throw Error("CANDIDATE_DISCOVERY_ARGUMENT_CONFLICT");
  }
  if(typeof result.dbPath!=="string"||!path.isAbsolute(result.dbPath)
    ||typeof result.outputDir!=="string"||!path.isAbsolute(result.outputDir)
    ||!fs.existsSync(result.outputDir)||!fs.statSync(result.outputDir).isDirectory()){
    throw Error("EXISTING_ABSOLUTE_DB_AND_OUTPUT_DIR_REQUIRED");
  }
  if(!result.asOfDate)result.asOfDate=nowIso().slice(0,10);
  if(!safeDate(result.asOfDate)||!Number.isFinite(Date.parse(result.asOfDate))
    ||new Date(result.asOfDate+"T00:00:00Z").toISOString().slice(0,10)!==result.asOfDate){
    throw Error("INVALID_AS_OF_DATE");
  }
  if(result.asOfDate>nowIso().slice(0,10))throw Error("FUTURE_AS_OF_FORBIDDEN");
  if(result.candidateDbPath){
    const expected=path.join(result.outputDir,candidateBasename);
    if(!path.isAbsolute(result.candidateDbPath)
      ||path.normalize(result.candidateDbPath)!==path.normalize(expected)
      ||!fs.existsSync(expected)||!fs.statSync(expected).isFile()
      ||fs.realpathSync(expected)===fs.realpathSync(result.dbPath)){
      throw Error("ISOLATED_CANDIDATE_DB_REQUIRED");
    }
  }
  if(result.candidateDbExternalPath){
    result.candidateIdentity=validateExternalCandidatePath(result.candidateDbExternalPath,result.dbPath);
    result.candidateDbPath=result.candidateDbExternalPath;
    result.candidateDbExternal=true;
    delete result.candidateDbExternalPath;
  }
  return result;
}

function readAsOf(db,knownAsOf){
  return createEmploymentR6ObservationReader({
    prepare:sql=>({bind:(...params)=>({all:async()=>({results:db.prepare(sql).all(...params)})})}),
  }).loadAsOf(knownAsOf);
}

export async function stageEmploymentR6OneYear({dbPath,asOfDate,candidateDbPath=null,
  candidateDbExternal=false,candidateIdentity=null,beforeReadOnlyOpen=null,
  afterReadOnlyOpen=null,onSqliteOpened=null}){
  if(!fs.existsSync(dbPath)||!fs.statSync(dbPath).isFile())throw Error("PC_SOURCE_DB_NOT_FOUND");
  let db=null,candidate=null;
  try{
    beforeReadOnlyOpen?.(dbPath);
    db=new DatabaseSync(dbPath,{readOnly:true});
    onSqliteOpened?.(dbPath);
    afterReadOnlyOpen?.(dbPath);
    if(candidateDbPath){
      if(candidateDbExternal)validateExternalCandidatePath(candidateDbPath,dbPath,candidateIdentity);
      beforeReadOnlyOpen?.(candidateDbPath);
      candidate=new DatabaseSync(candidateDbPath,{readOnly:true});
      onSqliteOpened?.(candidateDbPath);
      afterReadOnlyOpen?.(candidateDbPath);
    }
    const asOfEnd=asOfDate+"T23:59:59.999Z";
    const current=nowIso();
    const knownAsOf=asOfEnd<current?asOfEnd:current;
    const coreRows=await readAsOf(db,knownAsOf);
    const additional=candidate?await readAsOf(candidate,knownAsOf):[];
    const observations=additional.length?selectAsOfRevisions([...coreRows,...additional],knownAsOf):coreRows;
    const retrieved=observations.map(x=>Date.parse(x.retrievedAt??"")).filter(Number.isFinite);
    if(!retrieved.length)throw Error("NO_VERIFIED_PIT_OBSERVATIONS");
    const sourceStoredAt=Math.max(...retrieved);
    const body=buildEmploymentR6OneYearReadModel(observations,{asOfDate,sourceStoredAt});
    if(!validEmploymentR6PublicDisplay(body))throw Error("PUBLIC_DISPLAY_VALIDATION_FAILED");
    return body;
  }finally{db?.close();candidate?.close();}
}

/** Keep PIT diagnostics even when no verified observation can build a chart. */
export async function stageEmploymentR6OneYearWithPitAudit(args){
  let pitCoverage=null,pitCoverageError=null,body=null,error=null;
  const guarded={...args,beforeReadOnlyOpen:dbPath=>{
    if(args.candidateDbExternal&&dbPath===args.candidateDbPath){
      validateExternalCandidatePath(dbPath,args.dbPath,args.candidateIdentity);
    }
    args.beforeReadOnlyOpen?.(dbPath);
  }};
  try{pitCoverage=auditEmploymentR6PitCoverage(guarded);}
  catch(failure){
    const code=String(failure?.message??"");
    pitCoverageError=/^[A-Z0-9_]+$/.test(code)?code:"PIT_AUDIT_READ_FAILED";
  }
  try{body=await stageEmploymentR6OneYear(guarded);}
  catch(failure){error=failure;}
  if(!error&&pitCoverageError)error=Error(pitCoverageError);
  return {body,pitCoverage,pitCoverageError,error};
}

// The existing PC publisher's D1 schema/key class is reused. Only the public
// display payload is sent; provider inputs, PIT history and credentials remain PC-local.
export async function publishEmploymentR6OneYear({body,remote,dbId,now=Date.now()}){
  if(!validEmploymentR6PublicDisplay(body))throw Error("INVALID_PUBLIC_DISPLAY");
  if(!Number.isSafeInteger(now)||now<body.sourceStoredAt)throw Error("INVALID_PUBLICATION_TIME");
  const current=(await remote.query(dbId,"SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?",[EMPLOYMENT_R6_PUBLIC_DISPLAY_KEY])).results?.[0];
  const prior=current?.body?JSON.parse(current.body):null;
  if(prior&&validEmploymentR6PublicDisplay(prior)&&prior.sourceStoredAt>body.sourceStoredAt){
    throw Error("REMOTE_SOURCE_NEWER");
  }
  if(prior&&hash(prior)===hash(body))return {status:"UNCHANGED",storedAt:current.stored_at};
  const sql="INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE COALESCE(json_extract(market_public_snapshots_v1.body,'$.sourceStoredAt'),-1)<=?";
  let issue=null;
  try{await remote.request(dbId,[{sql,params:[EMPLOYMENT_R6_PUBLIC_DISPLAY_KEY,JSON.stringify(body),now,body.sourceStoredAt]}]);}
  catch(error){issue=error;}
  // An HTTP timeout is not permission to retry an ambiguous D1 write.
  const check=(await remote.query(dbId,"SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?",[EMPLOYMENT_R6_PUBLIC_DISPLAY_KEY])).results?.[0];
  if(!check||Number(check.stored_at)!==now||hash(JSON.parse(check.body))!==hash(body)){
    throw Error(issue?"D1_PUBLICATION_OUTCOME_UNKNOWN":"D1_PUBLICATION_READBACK_MISMATCH");
  }
  return {status:"VERIFIED",storedAt:now};
}

function pcPublisher(dbPath){
  const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
  if(path.normalize(dbPath)!==path.normalize(path.join(base,"storage","core.sqlite"))){
    throw Error("UNAPPROVED_PC_SOURCE_DB");
  }
  const config=read(path.join(base,"config.json"));
  const source=execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8",windowsHide:true}).trim();
  if(!config||config.enabled!==true||config.collectionTarget!=="pc"||config.source!==source){
    throw Error("LOCAL_PUBLICATION_NOT_APPROVED");
  }
  // Never publish uncommitted code, changed formulas, or a mismatched PC config.
  execFileSync("git",["diff","--quiet","HEAD","--","lib","worker","scripts/pc-writer"],{cwd:root,stdio:"pipe",windowsHide:true});
  return {remote:client(config,credential(root)),dbId:config.core,source};
}

export function saveReport(dir,body,publication,error,{candidateDbUsed=false,pitCoverage=null,pitCoverageError=null,asOfDate=null,candidateDiscoveryStatus="NOT_REQUESTED",candidateDiscoveryStep="NOT_REQUESTED"}={}){
  const suffix=nowIso().replace(/[-:.]/g,"")+"_"+process.pid;
  const basename="EMPLOYMENT_R6_ONE_YEAR_"+suffix;
  const summary=body?.summary??null;
  const report={
    kind:"EMPLOYMENT_R6_ONE_YEAR_STAGE_REPORT_R1",generatedAt:nowIso(),
    stageStatus:error?"FAILED":"STAGED",publicationStatus:publication?.status??"NOT_REQUESTED",
    error:error?.message??null,asOfDate:body?.asOfDate??asOfDate,
    sourceMode:candidateDbUsed?"CORE_PLUS_ISOLATED_CANDIDATE_READONLY":"CORE_ONLY_READONLY",
    summary,sourceStoredAt:body?.sourceStoredAt??null,pitCoverage,pitCoverageError,
    candidateDiscoveryStatus,candidateDiscoveryStep,
    dbWritesByStage:0,providerCallsByStage:0,
    remoteWritten:publication?.status==="VERIFIED",
  };
  const txt=[
    "ZGMINI EMPLOYMENT R6 - ONE YEAR STORED DISPLAY",
    "STATUS: "+report.stageStatus,
    "PUBLICATION: "+report.publicationStatus,
    "AS_OF: "+(report.asOfDate??"NO_EVIDENCE"),
    "SOURCE_MODE: "+report.sourceMode,
    "CANDIDATE_DISCOVERY: "+report.candidateDiscoveryStatus,
    "CANDIDATE_DISCOVERY_STEP: "+report.candidateDiscoveryStep,
    "RAW_FEATURES: "+(summary?.sourceFeatures??0)+" / 29",
    "RECENT_QUARTER: "+(summary?.recentlyObservedFeatures??0)+" / 29",
    "ONE_YEAR_CHART_READY: "+(summary?.chartReadyFeatures??0)+" / 29",
    "ONE_YEAR_CHART_PARTIAL: "+(summary?.chartPartialFeatures??0)+" / 29",
    "FORMULA_SCORE_READY: "+(summary?.scoredFeatures??0)+" / 29",
    "RECENT_FORMULA_SCORE_READY: "+(summary?.recentlyScoredFeatures??0)+" / 29",
    "CORE_CURRENT_WITHOUT_PIT_HISTORY: "+(pitCoverage?.coreCurrentKeysMissingHistory??"NO_EVIDENCE"),
    "CANDIDATE_MATCHING_MISSING_KEYS: "+(pitCoverage?.missingKeysWithMatchingCandidateValueAndHash??"NO_EVIDENCE"),
    "CANDIDATE_RECONCILIATION: "+(pitCoverage?.candidateReconciliationPreviewStatus??"NO_EVIDENCE"),
    "CANDIDATE_NEW_KEYS_CONSISTENT: "+(pitCoverage?.candidateNewKeysWithConsistentPITMetadata??"NO_EVIDENCE"),
    "CANDIDATE_OVERLAP_CONFLICTS: "+(pitCoverage?.candidateOverlapConflictingKeys??"NO_EVIDENCE"),
    "CANDIDATE_OVERLAP_UNVERIFIED: "+(pitCoverage?.candidateOverlapUnverifiedKeys??"NO_EVIDENCE"),
    "CORE_HISTORY_UNMATCHED_CANDIDATE: "+(pitCoverage?.coreMissingHistoryKeysWithoutConsistentCandidateMetadata??"NO_EVIDENCE"),
    "PIT_AUDIT_ERROR: "+(pitCoverageError??"NONE"),
    "ERROR: "+(report.error??"NONE"),
    "PC_SOURCE_DB_WRITES: 0",
    "PROVIDER_REQUESTS: 0",
    "",
  ].join("\r\n");
  const txtPath=path.join(dir,basename+".txt"),jsonPath=path.join(dir,basename+".json");
  fs.writeFileSync(txtPath,txt,{encoding:"utf8",flag:"wx"});
  fs.writeFileSync(jsonPath,JSON.stringify({report,body},null,2)+"\n",{encoding:"utf8",flag:"wx"});
  return {txtPath,jsonPath,report};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  let args,body=null,publication=null,problem=null,pitCoverage=null,pitCoverageError=null;
  let candidateDiscoveryStatus="NOT_REQUESTED",candidateDiscoveryStep="NOT_REQUESTED";
  try{
    args=optionsFrom(process.argv.slice(2));
    if(!args.publish){
      if(args.candidateDbExternal){
        candidateDiscoveryStatus="EXPLICIT_CANDIDATE_READONLY";
        candidateDiscoveryStep="EXTERNAL_CANDIDATE_FILE_VALIDATED";
      }
      if(args.discoverApprovedCandidate){
        const discovery=locateEmploymentR6Candidate({
          outputDir:args.outputDir,coreDbPath:args.dbPath,
          pcHome:process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer"),
          includeDiagnosticStep:true,
        });
        candidateDiscoveryStatus=discovery.status;
        candidateDiscoveryStep=discovery.diagnosticStep;
        if(discovery.candidateDbPath)args.candidateDbPath=discovery.candidateDbPath;
      }
      const diagnostic=await stageEmploymentR6OneYearWithPitAudit(args);
      ({body,pitCoverage,pitCoverageError}=diagnostic);
      if(diagnostic.error)throw diagnostic.error;
    }else{
      body=await stageEmploymentR6OneYear(args);
      const {remote,dbId}=pcPublisher(args.dbPath);
      publication=await publishEmploymentR6OneYear({body,remote,dbId});
    }
  }catch(error){
    // SQLite or filesystem exceptions can contain absolute source paths.
    // External candidate errors must be a stable, path-free diagnostic code.
    const message=String(error?.message??"");
    problem=args?.candidateDbExternal&&!/^[A-Z0-9_]+$/.test(message)
      ?Error("EXTERNAL_CANDIDATE_READ_FAILED"):error;
    process.exitCode=2;
  }
  if(args?.outputDir){
    try{
      const paths=saveReport(args.outputDir,body,publication,problem,{
        candidateDbUsed:Boolean(args.candidateDbPath),pitCoverage,pitCoverageError,asOfDate:args.asOfDate,
        candidateDiscoveryStatus,candidateDiscoveryStep,
      });
      process.stdout.write("RESULT_TXT: "+paths.txtPath+"\nRESULT_JSON: "+paths.jsonPath+"\n");
    }catch(error){process.stderr.write("REPORT_SAVE_FAILED: "+error.message+"\n");process.exitCode=2;}
  }
  process.stdout.write("STATUS: "+(problem?"FAILED":publication?.status??"STAGED")+(problem?" ERROR: "+problem.message:"")+"\n");
}
