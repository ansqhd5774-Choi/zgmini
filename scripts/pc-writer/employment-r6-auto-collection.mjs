// Explicitly approved R6 Core collection side lane. The full approved R6
// release planner decides which of its six source groups is actually due.
import {runEmploymentR6CollectionStep} from "../../lib/market-score/employment-r6-collector.mjs";
import {createEmploymentR6Provider} from "../../lib/market-score/employment-r6-provider.mjs";
import {createEmploymentR6ScheduledDolProvider} from "../../lib/market-score/employment-r6-dol-eta538-provider.mjs";

// Use the existing release planner and every unchanged BLS group. Only the
// scheduled DOL National source switches from stale XML to official dated PDF;
// the independent ETA539 state fetch and two-call cap are preserved.
export function createEmploymentR6ScheduledProviderFactory({fetchImpl,now}={}){
  const regular=createEmploymentR6Provider({fetchImpl,now});
  const dol=createEmploymentR6ScheduledDolProvider({fetchImpl,now});
  return {
    fetchGroup:(groupName,args)=>groupName==="DOL_UI_WEEKLY_CLAIMS"
      ?dol.fetchGroup(groupName,args):regular.fetchGroup(groupName,args),
  };
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
  return {
    status:result.status,
    providerRequests:result.providerRequests??0,
    groups:(result.groupResults??[]).map(item=>({groupName:item.groupName,status:item.status})),
    plannedGroups:(result.plannedGroups??[]).map(item=>({groupName:item.groupName,status:item.status,due:item.due})),
  };
}
