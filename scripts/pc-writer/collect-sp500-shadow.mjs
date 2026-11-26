import path from "node:path";
import fs from "node:fs";
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
export const SP500_FETCH_TIMEOUT_MS=20_000;
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
  if(rows.some((row,i)=>i>0&&row.observationDate===rows[i-1].observationDate))throw new Error("SP500_FRED_DUPLICATE_DATE");
  if(rows.length<250)throw new Error("SP500_FRED_HISTORY_SHORT");
  return rows;
}

// FRED's ten-year request window moves with the calendar. An earlier verified
// observation must not disappear from local storage solely because it fell
// outside a later request window. Within the returned window FRED is authoritative
// about current-vintage revisions, including removed or corrected observations.
export function mergeSp500ShadowHistory(previousRows,incomingRows){
  if(!Array.isArray(previousRows)||!previousRows.length)return incomingRows;
  const previousLast=previousRows.at(-1)?.observationDate;
  const incomingLast=incomingRows.at(-1)?.observationDate;
  // Never erase already verified recent prices when the provider responds with
  // an older or incomplete window. Keep the prior checkpoint for investigation.
  if(validDate(previousLast)&&validDate(incomingLast)&&incomingLast<previousLast)
    throw new Error('SP500_FRED_OBSERVATION_REGRESSION');
  const first=incomingRows[0]?.observationDate;
  return [...previousRows.filter(row=>validDate(row?.observationDate)&&row.observationDate<first),...incomingRows];
}

export async function collectSp500Shadow(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{
  asOf=new Date().toISOString().slice(0,10),
  fetchTimeoutMs=SP500_FETCH_TIMEOUT_MS,
}={}){
  if(!validDate(asOf))throw new Error("SP500_ASOF_INVALID");
  // A missing approved PC root or database is an installation fault. No
  // implicit database/root creation or network attempt is allowed.
  try{
    if(!fs.statSync(base).isDirectory()||!fs.statSync(path.join(base,"storage","core.sqlite")).isFile())
      throw new Error("SP500_LOCAL_STORAGE_MISSING");
  }catch{throw new Error("SP500_LOCAL_STORAGE_MISSING");}
  const timeoutMs=Number.isSafeInteger(fetchTimeoutMs)&&fetchTimeoutMs>0
    ?Math.min(fetchTimeoutMs,SP500_FETCH_TIMEOUT_MS)
    :SP500_FETCH_TIMEOUT_MS;
  const env=loadLocalProviders(base);
  const key=String(env?.FRED_API_KEY??"").trim();
  if(!key)throw new Error("FRED_API_KEY_MISSING");
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  const originalFetch=globalThis.fetch;
  const quota=createQuotaFetch({base,originalFetch,mode:"enforce"});
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
    const response=await quota.fetch(url,{
      headers:{accept:"application/json"},
      signal:AbortSignal.timeout(timeoutMs),
    });
    report.providerCalls=1;
    if(!response.ok)throw new Error(response.status===429?"SP500_FRED_QUOTA":"SP500_FRED_HTTP");
    const fetched=parseSp500FredPayload(await response.json(),{asOf});
    const store=marketOperationalStore(core);
    const previous=await store.readInput(BATCH_KEY);
    const previousRows=previous?.body?.series?.SP500;
    const rows=mergeSp500ShadowHistory(previousRows,fetched);
    const changed=!Array.isArray(previousRows)||JSON.stringify(previousRows)!==JSON.stringify(rows);
    const storedAt=changed?Date.now():previous.storedAt;
    if(changed)await store.writeInput(BATCH_KEY,{
      series:{SP500:rows},
      source:"FRED SP500",
      historyMode:"CURRENT_VINTAGE_MARKET_PRICE",
      storedForShadowOnly:true,
    },storedAt);
    report.status=changed?"STORED":"UNCHANGED";
    report.dataChanged=changed;
    report.sourceStoredAt=storedAt;
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
