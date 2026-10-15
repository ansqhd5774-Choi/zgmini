import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {loadLocalProviders} from "./local-env.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS,SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";

export const METHOD="SECTOR-FEAR-GREED-R2.13.20-ALPACA-BENCHMARK-BACKFILL";
export const START="2023-07-12";
export const END="2023-09-29";
export const MAX_PROVIDER_REQUESTS=1;
export const EXPECTED_SESSIONS=57;
export const TARGETS=Object.freeze(["SPY",...Object.values(SECTOR_FEAR_GREED_R1_ETFS)]);
const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const OUT_JSON="local-sector-fear-greed-r21320-alpaca-benchmark-backfill.json";
const OUT_TXT="local-sector-fear-greed-r21320-alpaca-benchmark-backfill.txt";
const ENDPOINT="https://data.alpaca.markets/v2/stocks/bars";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));
function safeCode(error,fallback="R21320_ALPACA_BENCHMARK_BACKFILL_FAILED"){const message=String(error?.message??"");return /^[A-Z0-9_:-]+$/.test(message)?message:String(error?.code??fallback).replace(/[^A-Z0-9_:-]/gi,"_").slice(0,80)||fallback;}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,text){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,text);fs.renameSync(tmp,file);}
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
export function normalizeAlpacaBenchmarkBars(payload,{start=START,end=END,expectedSessions=EXPECTED_SESSIONS}={}){
  if(payload?.next_page_token)throw new Error("R21320_UNEXPECTED_PAGINATION");
  if(!payload?.bars||typeof payload.bars!=="object")throw new Error("R21320_BARS_MISSING");
  const series={},dateSignature=[];
  for(const ticker of TARGETS){
    const raw=payload.bars[ticker];if(!Array.isArray(raw))throw new Error("R21320_TARGET_MISSING");
    const map=new Map();
    for(const row of raw){
      const date=String(row?.t??"").slice(0,10),close=Number(row?.c),volume=Number(row?.v);
      if(!validDate(date)||date<start||date>end||!finite(close)||close<=0||!finite(volume)||volume<0)throw new Error("R21320_INVALID_BAR");
      const prior=map.get(date);if(prior&&(prior.close!==close||prior.volume!==volume))throw new Error("R21320_BAR_CONFLICT");
      map.set(date,{date,close,volume});
    }
    const rows=[...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
    if(rows.length!==expectedSessions)throw new Error("R21320_SESSION_COUNT_MISMATCH");
    const signature=rows.map(row=>row.date).join(",");
    if(dateSignature.length&&signature!==dateSignature[0])throw new Error("R21320_SESSION_SET_MISMATCH");
    dateSignature.push(signature);series[ticker]=rows;
  }
  return {series,sessions:expectedSessions,first:series.SPY[0]?.date??null,last:series.SPY.at(-1)?.date??null,totalRows:TARGETS.reduce((sum,ticker)=>sum+series[ticker].length,0)};
}
export function validateStoredBenchmark(payload){
  if(payload?.methodologyVersion!==METHOD||payload?.source!=="ALPACA_IEX_SHADOW"||payload?.feed!=="iex"||payload?.adjustment!=="split"||payload?.start!==START||payload?.end!==END)return null;
  try{return normalizeAlpacaBenchmarkBars({bars:Object.fromEntries(TARGETS.map(ticker=>[ticker,(payload.series?.[ticker]??[]).map(row=>({t:`${row.date}T00:00:00Z`,c:row.close,v:row.volume}))])),next_page_token:null});}catch{return null;}
}
export function buildRequestUrl(){const url=new URL(ENDPOINT);url.searchParams.set("symbols",TARGETS.join(","));url.searchParams.set("timeframe","1Day");url.searchParams.set("start",`${START}T00:00:00Z`);url.searchParams.set("end",`${END}T23:59:59Z`);url.searchParams.set("feed","iex");url.searchParams.set("adjustment","split");url.searchParams.set("limit","10000");return url;}
export async function collectR21320(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{fetchImpl=globalThis.fetch,now=new Date()}={}){
  const jsonFile=path.join(base,OUT_JSON),txtFile=path.join(base,OUT_TXT),existing=safeJson(jsonFile),verifiedExisting=existing?validateStoredBenchmark(existing):null;
  if(existing&&!verifiedExisting)throw new Error("R21320_PRIOR_FILE_INVALID");
  let providerRequests=0,normalized=verifiedExisting,mode="REUSED_VERIFIED_LOCAL";
  if(!normalized){
    const env=loadLocalProviders(base),key=env.APCA_API_KEY_ID,secret=env.APCA_API_SECRET_KEY;
    if(!key||!secret)throw new Error("R21320_ALPACA_CREDENTIALS_MISSING");
    if(typeof fetchImpl!=="function")throw new Error("R21320_FETCH_UNAVAILABLE");
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      providerRequests++;
      if(providerRequests>MAX_PROVIDER_REQUESTS)throw new Error("R21320_PROVIDER_REQUEST_LIMIT");
      const response=await fetchImpl(buildRequestUrl(),{headers:{"APCA-API-KEY-ID":key,"APCA-API-SECRET-KEY":secret,accept:"application/json"},signal:controller.signal});
      if(!response.ok)throw new Error(`R21320_ALPACA_HTTP_${response.status}`);
      normalized=normalizeAlpacaBenchmarkBars(await response.json());mode="FETCHED_AND_STORED";
    }catch(error){if(error?.name==="AbortError")throw new Error("R21320_ALPACA_TIMEOUT");throw error;}finally{clearTimeout(timer);}
    const generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
    const payload={version:1,methodologyVersion:METHOD,mode:"SHADOW_ONLY",source:"ALPACA_IEX_SHADOW",feed:"iex",adjustment:"split",start:START,end:END,generatedAt,targets:[...TARGETS],counts:Object.fromEntries(TARGETS.map(ticker=>[ticker,normalized.series[ticker].length])),sessions:normalized.sessions,totalRows:normalized.totalRows,series:normalized.series,safety:{providerRequests,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS,productionBenchmarkSourceChanged:false}};
    saveJson(jsonFile,payload);
    const readback=safeJson(jsonFile),checked=validateStoredBenchmark(readback);if(!checked||checked.totalRows!==normalized.totalRows)throw new Error("R21320_READBACK_FAILED");
  }
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const result={version:1,generatedAt,status:"SHADOW_R21320_ALPACA_BENCHMARK_BACKFILL_COMPLETE",mode,providerRequests,maxProviderRequests:MAX_PROVIDER_REQUESTS,targets:TARGETS.length,sessions:normalized.sessions,totalRows:normalized.totalRows,first:normalized.first,last:normalized.last,storageVerified:true,jsonFile,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS,productionBenchmarkSourceChanged:false,next:"RECOMPUTE_TAIL_BALANCE_756_WITH_SHADOW_BENCHMARK"};
  saveText(txtFile,["ZGMINI SECTOR FEAR & GREED R2.13.20 ALPACA BENCHMARK BACKFILL",`generatedAt=${generatedAt}`,`status=${result.status}`,`mode=${mode}`,`providerRequests=${providerRequests}/${MAX_PROVIDER_REQUESTS}`,`targets=${result.targets}`,`sessions=${result.sessions}`,`rows=${result.totalRows}`,`window=${result.first}..${result.last}`,`storageVerified=${result.storageVerified}`,`jsonFile=${jsonFile}`,`publicMutation=false d1Mutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false referenceRequirementChanged=false productionBenchmarkSourceChanged=false`,`approvedR1ReferenceRequirement=${SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS}`,`next=${result.next}`].join("\n")+"\n");
  return {...result,txtFile};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))collectR21320().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.log(JSON.stringify({status:"FAILED",code:safeCode(error),publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,referenceRequirementChanged:false,productionBenchmarkSourceChanged:false}));process.exitCode=1;});
