import { EMPLOYMENT_R4_SHADOW_COLLECTOR_REVISION } from "./employment-r4-shadow-contract.mjs";
import { createEmploymentR4ShadowProvider } from "./employment-r4-shadow-provider.mjs";
import { createEmploymentR4ShadowStore } from "./employment-r4-shadow-store.mjs";

export async function collectEmploymentR4Shadow({
  db,
  provider = createEmploymentR4ShadowProvider(),
  now = () => new Date(),
  claimsHistoryWeeks = 60,
  lockTtlMs = 180_000,
} = {}) {
  if(!db||typeof db.prepare!=="function")throw new TypeError("D1_DATABASE_REQUIRED");
  const store=createEmploymentR4ShadowStore(db,{now});
  const lease=await store.acquire("employment-r4-shadow-collector",{ttlMs:lockTtlMs});
  if(!lease.acquired)return {status:"SKIPPED_LOCKED",scoreComputed:false,providerRequests:0,collectedRows:0};

  const startedAt=now().toISOString();
  let runRecorded=false;
  try{
    const settled=await Promise.allSettled([
      provider.fetchStateClaims({historyWeeks:claimsHistoryWeeks}),
      provider.fetchGeographicDiffusion(),
    ]);
    const rows=[],providerDetail={},errors=[];
    let providerRequests=0;
    for(let i=0;i<settled.length;i++){
      const name=i===0?"DOL_ETA":"BLS_CES_SAE",result=settled[i];
      providerRequests++;
      if(result.status==="fulfilled"){
        providerRequests+=Math.max(0,Number(result.value?.requestCount??1)-1);
        rows.push(...(result.value?.rows??[]));
        providerDetail[name]={status:"READY",rows:result.value?.rows?.length??0,meta:result.value?.meta??null};
      }else{
        const message=String(result.reason?.message??result.reason);
        errors.push({provider:name,error:message});
        providerDetail[name]={status:"ERROR",error:message};
      }
    }

    const write=rows.length?await store.upsertRows({rows,retrievedAt:now().toISOString()}):{inserted:0,revised:0,noop:0,rejected:0,rejections:[],accepted:0,currentRows:(await store.countRows()).current,historyRowsAdded:0};
    const successfulProviders=settled.filter(x=>x.status==="fulfilled").length;
    const status=successfulProviders===2&&write.rejected===0?"SUCCESS":successfulProviders>0?"PARTIAL":"FAIL";
    const completedAt=now().toISOString();
    const runId=await store.recordRun({
      provider:"EMPLOYMENT_R4_SHADOW",
      collectorRevision:EMPLOYMENT_R4_SHADOW_COLLECTOR_REVISION,
      status,
      startedAt,
      completedAt,
      providerRequests,
      collectedRows:rows.length,
      insertedCount:write.inserted,
      revisedCount:write.revised,
      noopCount:write.noop,
      rejectedCount:write.rejected,
      partialCount:errors.length+(write.rejected>0?1:0),
      currentRows:write.currentRows,
      historyRowsAdded:write.historyRowsAdded,
      failureCode:errors.length?"UPSTREAM_PARTIAL":write.rejected?"ROW_REJECTED":null,
      detail:{providers:providerDetail,errors,rejections:write.rejections,bed:"DEFERRED_STRUCTURAL_CANDIDATE"},
    });
    runRecorded=true;
    return {
      status,runId,scoreComputed:false,providerRequests,collectedRows:rows.length,
      inserted:write.inserted,revised:write.revised,noop:write.noop,rejected:write.rejected,
      currentRows:write.currentRows,historyRowsAdded:write.historyRowsAdded,
      providers:providerDetail,errors,bed:"DEFERRED_STRUCTURAL_CANDIDATE",
    };
  }catch(error){
    if(!runRecorded){
      const completedAt=now().toISOString();
      await store.recordRun({provider:"EMPLOYMENT_R4_SHADOW",collectorRevision:EMPLOYMENT_R4_SHADOW_COLLECTOR_REVISION,status:"FAIL",startedAt,completedAt,providerRequests:0,collectedRows:0,failureCode:"COLLECTOR_EXCEPTION",detail:{error:String(error?.message??error)}}).catch(()=>null);
    }
    throw error;
  }finally{
    await store.release(lease).catch(()=>false);
  }
}

export const EMPLOYMENT_R4_SHADOW_COLLECTOR_CONTRACT = Object.freeze({
  revision:EMPLOYMENT_R4_SHADOW_COLLECTOR_REVISION,
  storeOnly:true,
  scoreComputed:false,
  publicScoreWiring:false,
  activeMethodologyChanged:false,
  bedCollection:"DEFERRED_STRUCTURAL_CANDIDATE",
});
