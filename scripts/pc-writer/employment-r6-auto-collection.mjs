// Explicitly approved R6 Core collection side lane. The full approved R6
// release planner decides which of its six source groups is actually due.
import {runEmploymentR6CollectionStep} from "../../lib/market-score/employment-r6-collector.mjs";
import {createEmploymentR6Provider} from "../../lib/market-score/employment-r6-provider.mjs";
import {createEmploymentR6ScheduledDolProvider} from "../../lib/market-score/employment-r6-dol-eta538-provider.mjs";

// Keep the validated scheduled ETA538 PDF source and independent ETA539 feed.
export function createEmploymentR6ScheduledProviderFactory({fetchImpl,now}={}){
  const regular=createEmploymentR6Provider({fetchImpl,now});
  const dol=createEmploymentR6ScheduledDolProvider({fetchImpl,now});
  return {fetchGroup:(groupName,args)=>groupName==="DOL_UI_WEEKLY_CLAIMS"
    ?dol.fetchGroup(groupName,args):regular.fetchGroup(groupName,args)};
}

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
  const result=await collect({env:{DB:db},db,fetchImpl,now,mode:"RELEASE",
    providerFactory:createEmploymentR6ScheduledProviderFactory});
  // Preserve only safe diagnostic codes/counts; never forward error messages,
  // provider response bodies, source URLs, credentials, or raw snapshots.
  const safeCode=value=>typeof value==="string"&&/^[A-Z][A-Z0-9_]{0,99}$/.test(value)?value:null;
  const safeRequests=value=>Number.isSafeInteger(value)&&value>=0&&value<=100000?value:null;
  // Store only bounded collector row-change counts; a missing value is not 0.
  // Never expose run identifiers, provider responses, source hashes or URLs.
  const safeCount=value=>Number.isSafeInteger(value)&&value>=0&&value<=1_000_000?value:null;
  const countFields=["collectedRows","inserted","revised","noop","rejected",
    "historyRowsAdded","rawSnapshots","rawSnapshotNoops"];
  const safeCounters=item=>Object.fromEntries(countFields
    .filter(key=>safeCount(item?.[key])!==null).map(key=>[key,item[key]]));
  // Release/circuit dates are already computed by the approved scheduler.
  // Preserve only canonical UTC timestamps: no provider body, URL or secret.
  const safeTime=value=>typeof value==="string"
    &&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    &&Number.isFinite(Date.parse(value))
    &&new Date(value).toISOString()===value?value:null;
  return {
    status:result.status,
    providerRequests:result.providerRequests??0,
    groups:(result.groupResults??[]).map(item=>({
      groupName:item.groupName,status:item.status,
      ...safeCounters(item),
      ...(safeCode(item.failureCode)?{failureCode:safeCode(item.failureCode)}:{}),
      ...(safeRequests(item.providerRequests)!==null?{providerRequests:item.providerRequests}:{}),
    })),
    plannedGroups:(result.plannedGroups??[]).map(item=>({
      groupName:item.groupName,status:item.status,due:item.due,
      ...(safeCode(item.failureCode)?{failureCode:safeCode(item.failureCode)}:{}),
      ...Object.fromEntries(['retryAt','releaseAt','collectAt']
        .filter(key=>safeTime(item[key])!==null)
        .map(key=>[key,item[key]])),
    })),
  };
}
