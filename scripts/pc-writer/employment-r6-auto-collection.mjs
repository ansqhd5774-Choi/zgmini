// Explicitly approved R6 Core collection side lane. The full approved R6
// release planner decides which of its six source groups is actually due.
import {runEmploymentR6CollectionStep} from "../../lib/market-score/employment-r6-collector.mjs";

export async function runEmploymentR6AutoCollection({
  enabled=false,
  approvedSource,
  runningSource,
  db,
  fetchImpl,
  now=()=>new Date(),
  collect=runEmploymentR6CollectionStep,
}={}){
  if(enabled!==true)return {status:"DISABLED",providerRequests:0};
  if(!approvedSource||approvedSource!==runningSource){
    throw Error("EMPLOYMENT_R6_SOURCE_NOT_APPROVED");
  }
  if(!db||typeof db.prepare!=="function"||typeof fetchImpl!=="function"){
    throw Error("EMPLOYMENT_R6_COLLECTION_INPUT_INVALID");
  }
  const result=await collect({env:{DB:db},db,fetchImpl,now,mode:"RELEASE"});
  // Preserve only safe diagnostic codes/counts; never forward error messages,
  // provider response bodies, source URLs, credentials, or raw snapshots.
  const safeCode=value=>typeof value==="string"&&/^[A-Z][A-Z0-9_]{0,99}$/.test(value)?value:null;
  const safeRequests=value=>Number.isSafeInteger(value)&&value>=0&&value<=100000?value:null;
  return {
    status:result.status,
    providerRequests:result.providerRequests??0,
    groups:(result.groupResults??[]).map(item=>({
      groupName:item.groupName,status:item.status,
      ...(safeCode(item.failureCode)?{failureCode:safeCode(item.failureCode)}:{}),
      ...(safeRequests(item.providerRequests)!==null?{providerRequests:item.providerRequests}:{}),
    })),
    plannedGroups:(result.plannedGroups??[]).map(item=>({
      groupName:item.groupName,status:item.status,due:item.due,
      ...(safeCode(item.failureCode)?{failureCode:safeCode(item.failureCode)}:{}),
    })),
  };
}
