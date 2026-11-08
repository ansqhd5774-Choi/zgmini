// Optional R6 side lane for the already-approved PC Core Writer.
// A disabled or mismatched source never opens SQLite or contacts D1.
import fs from "node:fs";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {hash,renameWithRetrySync} from "./d1.mjs";
import {validEmploymentR6PublicDisplay} from "../../worker/employment-r6-public-display.mjs";
import {
  stageEmploymentR6OneYear,
  publishEmploymentR6OneYear,
} from "./employment-r6-one-year-stage.mjs";

// Immutable, public-safe snapshots preserve every previously verified result.
const RESULT_DIRECTORY="employment-r6-public-results";
export function persistEmploymentR6PublicResult({pcHome,body}){
  if(!validEmploymentR6PublicDisplay(body))throw Error("R6_LOCAL_RESULT_INVALID");
  try{
    if(!fs.statSync(pcHome).isDirectory())throw Error("R6_PC_HOME_UNAVAILABLE");
  }catch{throw Error("R6_PC_HOME_UNAVAILABLE");}
  const directory=path.join(pcHome,RESULT_DIRECTORY);
  try{
    if(!fs.existsSync(directory))fs.mkdirSync(directory);
    const stat=fs.lstatSync(directory);
    if(!stat.isDirectory()||stat.isSymbolicLink())throw Error("R6_LOCAL_RESULT_DIRECTORY_UNSAFE");
  }catch{throw Error("R6_LOCAL_RESULT_DIRECTORY_UNSAFE");}
  const digest=hash(body),file=path.join(directory,digest+".json");
  let stored=false;
  if(!fs.existsSync(file)){
    const temporary=path.join(directory,digest+"."+randomUUID()+".tmp");
    try{
      fs.writeFileSync(temporary,JSON.stringify(body),{flag:"wx"});
      renameWithRetrySync(temporary,file);
      stored=true;
    }catch{
      try{fs.unlinkSync(temporary);}catch{}
      throw Error("R6_LOCAL_RESULT_WRITE_FAILED");
    }
  }
  let reread;
  try{
    const stat=fs.lstatSync(file);
    if(!stat.isFile()||stat.isSymbolicLink())throw Error("UNSAFE");
    reread=JSON.parse(fs.readFileSync(file,"utf8"));
  }catch{throw Error("R6_LOCAL_RESULT_READBACK_FAILED");}
  if(!validEmploymentR6PublicDisplay(reread)||hash(reread)!==digest
    ||reread.asOfDate!==body.asOfDate
    ||reread.sourceStoredAt!==body.sourceStoredAt){
    throw Error("R6_LOCAL_RESULT_READBACK_MISMATCH");
  }
  return {body:reread,hash:digest,stored};
}

export async function runEmploymentR6AutoPublication({
  enabled=false,
  pcHome,
  approvedSource,
  runningSource,
  remote,
  dbId,
  now=Date.now(),
  stage=stageEmploymentR6OneYear,
  persist=persistEmploymentR6PublicResult,
  publish=publishEmploymentR6OneYear,
}={}){
  if(enabled!==true)return {status:"DISABLED"};
  // The ordinary PC Writer can accept publication-compatible source drift;
  // this new R6 output additionally requires exact approval of its code SHA.
  if(!approvedSource||approvedSource!==runningSource){
    throw Error("EMPLOYMENT_R6_SOURCE_NOT_APPROVED");
  }
  if(typeof pcHome!=="string"||!path.isAbsolute(pcHome)
    ||typeof dbId!=="string"||!dbId||!remote
    ||!Number.isSafeInteger(now)||now<=0){
    throw Error("EMPLOYMENT_R6_PUBLICATION_INPUT_INVALID");
  }
  const asOfDate=new Date(now).toISOString().slice(0,10);
  // No candidate DB, provider fetch, schema modification or second scheduler.
  const body=await stage({dbPath:path.join(pcHome,"storage","core.sqlite"),asOfDate});
  if(body?.asOfDate!==asOfDate)throw Error("EMPLOYMENT_R6_STAGE_DATE_MISMATCH");
  // Only the hash-verified local readback may reach D1.
  const local=await persist({pcHome,body});
  if(!validEmploymentR6PublicDisplay(local?.body)||hash(local.body)!==hash(body)){
    throw Error("R6_LOCAL_RESULT_NOT_VERIFIED");
  }
  const result=await publish({body:local.body,remote,dbId,now});
  return {
    status:result.status,
    asOfDate,
    sourceStoredAt:body.sourceStoredAt,
    localResultHash:local.hash,
    localResultStored:local.stored,
    sourceFeatures:body.summary.sourceFeatures,
    chartReadyFeatures:body.summary.chartReadyFeatures,
    recentlyObservedFeatures:body.summary.recentlyObservedFeatures,
  };
}
