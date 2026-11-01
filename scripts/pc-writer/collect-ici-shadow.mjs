import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {loadLocalProviders,installLocalRuntime} from "./local-env.mjs";
import {createQuotaFetch} from "./quota-fetch.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {fetchIciCombinedFlows} from "../../lib/market-score/ici-combined-flow-provider-r1.mjs";
import {save} from "./d1.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const BATCH_KEY="shadowIciFundFlows";
const REPORT_NAME="local-ici-shadow-collection-last-run.json";

export async function collectIciShadow(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  const env={...loadLocalProviders(base),DB:core,ZGMINI_COMPUTE_TARGET:"pc"};
  const hooks=installLocalRuntime(env);
  const originalFetch=globalThis.fetch;
  const quota=createQuotaFetch({base,originalFetch,mode:"enforce"});
  globalThis.fetch=quota.fetch;
  const report={at:new Date().toISOString(),status:"RUNNING",providerCalls:0,stored:false,noPublish:true,batchKey:BATCH_KEY};
  try{
    const result=await fetchIciCombinedFlows({fetchImpl:globalThis.fetch});
    report.providerCalls=Number(result?.providerRequests??0);
    report.sourceStatus=result?.status??"PARTIAL";
    report.rows=Array.isArray(result?.rows)?result.rows.length:0;
    report.first=result?.rows?.[0]?.observationDate??null;
    report.last=result?.rows?.at?.(-1)?.observationDate??null;
    report.quota=quota.summary();
    if(result?.status!=="READY_CURRENT_RELEASE"||!Array.isArray(result?.rows)||!result.rows.length){
      report.status="PARTIAL";
      report.reason=result?.reason??"ICI_NOT_READY";
      return report;
    }
    const store=marketOperationalStore(core);
    const prior=await store.readInput(BATCH_KEY);
    const merged=new Map();
    for(const row of prior?.body?.external?.iciCombinedFlowRows??[]){
      if(typeof row?.observationDate==="string")merged.set(row.observationDate,row);
    }
    for(const row of result.rows){
      if(typeof row?.observationDate==="string")merged.set(row.observationDate,row);
    }
    const accumulated=[...merged.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate)).slice(-104);
    await store.writeInput(BATCH_KEY,{
      external:{iciCombinedFlowRows:accumulated},
      providerSummary:{ici:{status:result.status,source:result.source,sourcePage:result.sourcePage,sourceUrl:result.sourceUrl??null}},
      storedForShadowOnly:true,
    },Date.now());
    report.stored=true;
    report.accumulatedRows=accumulated.length;
    report.accumulatedFirst=accumulated[0]?.observationDate??null;
    report.accumulatedLast=accumulated.at(-1)?.observationDate??null;
    report.status="STORED";
    return report;
  }catch(error){
    report.status="FAILED";
    report.error=/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"ICI_SHADOW_COLLECTION_FAILED");
    throw error;
  }finally{
    globalThis.fetch=originalFetch;
    hooks.deregister();
    core.close();
    save(path.join(base,REPORT_NAME),report);
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  collectIciShadow().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"ICI_SHADOW_COLLECTION_FAILED")}));
    process.exitCode=1;
  });
}
