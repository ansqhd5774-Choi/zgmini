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
  // The original release's row counts remain in Core after a later NOOP.
  // Fixed SELECT only; no provider calls, schema mutation or caller SQL.
  // A stored run is historical evidence, NOT this cycle's row changes.
  let lastStoredDolRelease=null;
  try{
    const row=await db.prepare(`SELECT status,completed_at,collected_rows,inserted_count,
        revised_count,noop_count,rejected_count,history_rows_added
      FROM market_score_employment_r4_shadow_runs_v1
      WHERE provider='EMPLOYMENT_R6_DOL_UI_WEEKLY_CLAIMS'
        AND json_extract(detail_json,'$.mode')='RELEASE'
      ORDER BY completed_at DESC LIMIT 1`).first();
    if(row&&["SUCCESS","PARTIAL","FAIL"].includes(row.status)&&safeTime(row.completed_at)){
      lastStoredDolRelease={status:row.status,completedAt:row.completed_at,
        ...safeCounters({collectedRows:row.collected_rows,inserted:row.inserted_count,
          revised:row.revised_count,noop:row.noop_count,rejected:row.rejected_count,
          historyRowsAdded:row.history_rows_added})};
    }
  }catch{
    // Missing or unreadable run evidence must not change collection success.
  }
  return {
    status:result.status,
    providerRequests:result.providerRequests??0,
    ...(lastStoredDolRelease?{lastStoredDolRelease}:{}),
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
