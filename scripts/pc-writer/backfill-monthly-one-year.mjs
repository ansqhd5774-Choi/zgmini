import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {loadLocalProviders,installLocalRuntime} from "./local-env.mjs";
import {createQuotaFetch} from "./quota-fetch.mjs";
import {save} from "./d1.mjs";

const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const reportFile=path.join(base,"local-monthly-one-year-backfill-last-run.json");
const asOf=new Date().toISOString().slice(0,10);
const core=localDatabase(path.join(base,"storage","core.sqlite"));
const history=localDatabase(path.join(base,"storage","history.sqlite"));
const env={...loadLocalProviders(base),DB:core,DB_CORE:core,DB_HISTORY:history,ZGMINI_COMPUTE_TARGET:"pc"};
const hooks=installLocalRuntime(env);
const originalFetch=globalThis.fetch;
const quota=createQuotaFetch({base,originalFetch,mode:"enforce"});
globalThis.fetch=quota.fetch;

const report={at:new Date().toISOString(),asOf,status:"RUNNING",providerCalls:0,chart:null,quota:null};
try{
  const {collectGrowthR2StoreOnlyR1}=await import("../../lib/market-score/growth-r2-worker-domain-r1.mjs");
  const result=await collectGrowthR2StoreOnlyR1({env,asOf,fetchImpl:globalThis.fetch,now:()=>new Date()});
  report.chart=result?.chart??null;
  report.providerCalls=Number(result?.forward?.providerRequestCount??0)+Number(result?.chart?.providerRequestCount??0);
  report.quota=quota.summary();
  report.status=result?.status==="STORED"?"STORED":"PARTIAL";
}catch(error){
  report.status="FAILED";
  report.error=/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"MONTHLY_ONE_YEAR_BACKFILL_FAILED");
  report.quota=quota.summary();
  process.exitCode=1;
}finally{
  globalThis.fetch=originalFetch;
  hooks.deregister();
  core.close();
  history.close();
  save(reportFile,report);
  console.log(JSON.stringify(report));
}
