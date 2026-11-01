import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {loadLocalProviders} from "./local-env.mjs";
import {createQuotaFetch} from "./quota-fetch.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {save} from "./d1.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const REPORT_NAME="local-sp500-shadow-collection-last-run.json";
const BATCH_KEY="shadowSp500Benchmark";
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const finite=value=>typeof value==="number"&&Number.isFinite(value);

function minusYears(asOf,years){
  const [y,m,d]=asOf.split("-").map(Number);
  const x=new Date(Date.UTC(y-years,m-1,d));
  return x.toISOString().slice(0,10);
}

export function parseSp500FredPayload(payload,{asOf}={}){
  if(!payload||payload.error_code||!Array.isArray(payload.observations))throw new Error("SP500_FRED_INVALID_RESPONSE");
  const rows=[];
  for(const row of payload.observations){
    if(!validDate(row?.date)||row.date>asOf||row.value==="."||row.value==="")continue;
    const value=Number(row.value);
    if(!finite(value)||value<=0)continue;
    rows.push({observationDate:row.date,value});
  }
  rows.sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
  if(rows.length<250)throw new Error("SP500_FRED_HISTORY_SHORT");
  return rows;
}

export async function collectSp500Shadow(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{asOf=new Date().toISOString().slice(0,10)}={}){
  if(!validDate(asOf))throw new Error("SP500_ASOF_INVALID");
  const env=loadLocalProviders(base);
  const key=String(env?.FRED_API_KEY??"").trim();
  if(!key)throw new Error("FRED_API_KEY_MISSING");
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  const originalFetch=globalThis.fetch;
  const quota=createQuotaFetch({base,originalFetch,mode:"enforce"});
  globalThis.fetch=quota.fetch;
  const report={version:1,status:"RUNNING",at:new Date().toISOString(),asOf,noPublish:true,dbSchemaChanged:false,providerCalls:0,rows:0};
  try{
    const url=new URL("https://api.stlouisfed.org/fred/series/observations");
    url.search=new URLSearchParams({
      series_id:"SP500",
      api_key:key,
      file_type:"json",
      sort_order:"asc",
      units:"lin",
      observation_start:minusYears(asOf,10),
      observation_end:asOf,
      limit:"100000",
    });
    const response=await globalThis.fetch(url,{headers:{accept:"application/json"}});
    report.providerCalls=1;
    if(!response.ok)throw new Error(response.status===429?"SP500_FRED_QUOTA":"SP500_FRED_HTTP");
    const rows=parseSp500FredPayload(await response.json(),{asOf});
    await marketOperationalStore(core).writeInput(BATCH_KEY,{
      series:{SP500:rows},
      source:"FRED SP500",
      historyMode:"CURRENT_VINTAGE_MARKET_PRICE",
      storedForShadowOnly:true,
    },Date.now());
    report.status="STORED";
    report.rows=rows.length;
    report.first=rows[0].observationDate;
    report.last=rows.at(-1).observationDate;
    report.quota=quota.summary();
    return report;
  }catch(error){
    report.status="FAILED";
    report.error=/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"SP500_SHADOW_COLLECTION_FAILED");
    report.quota=quota.summary();
    throw error;
  }finally{
    globalThis.fetch=originalFetch;
    core.close();
    save(path.join(base,REPORT_NAME),report);
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  collectSp500Shadow().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"SP500_SHADOW_COLLECTION_FAILED")}));
    process.exitCode=1;
  });
}
