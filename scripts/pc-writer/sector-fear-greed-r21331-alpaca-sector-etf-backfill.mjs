import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {loadLocalProviders} from "./local-env.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS,SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";

export const METHOD="SECTOR-FEAR-GREED-R2.13.31-ALPACA-SECTOR-ETF-BACKFILL";
export const START="2024-04-09";
export const END="2024-08-14";
export const EXPECTED_SESSIONS=89;
export const MAX_PROVIDER_REQUESTS=1;
export const TARGETS=Object.freeze(Object.values(SECTOR_FEAR_GREED_R1_ETFS));
const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PRIOR_FILE="local-sector-fear-greed-r21330-alpaca-stock-contract-recheck.json";
const OUT_JSON="local-sector-fear-greed-r21331-alpaca-sector-etf-backfill.json";
const OUT_TXT="local-sector-fear-greed-r21331-alpaca-sector-etf-backfill.txt";
const ENDPOINT="https://data.alpaca.markets/v2/stocks/bars";
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function safeCode(error,fallback="R21331_ALPACA_SECTOR_ETF_BACKFILL_FAILED"){const m=String(error?.message??"");return /^[A-Z0-9_:-]+$/.test(m)?m:fallback;}

export function normalizeR21331Bars(payload,{start=START,end=END,expectedSessions=EXPECTED_SESSIONS}={}){
  if(payload?.next_page_token)throw new Error("R21331_UNEXPECTED_PAGINATION");
  if(!payload?.bars||typeof payload.bars!=="object")throw new Error("R21331_BARS_MISSING");
  const series={};let signature=null;
  for(const ticker of TARGETS){
    const raw=payload.bars[ticker];if(!Array.isArray(raw))throw new Error("R21331_TARGET_MISSING");
    const map=new Map();
    for(const row of raw){const date=String(row?.t??"").slice(0,10),close=Number(row?.c),volume=Number(row?.v);if(!validDate(date)||date<start||date>end||!finite(close)||close<=0||!finite(volume)||volume<0)throw new Error("R21331_INVALID_BAR");const old=map.get(date);if(old&&(old.close!==close||old.volume!==volume))throw new Error("R21331_BAR_CONFLICT");map.set(date,{date,close,volume});}
    const rows=[...map.values()].sort((a,b)=>a.date.localeCompare(b.date));if(rows.length!==expectedSessions)throw new Error("R21331_SESSION_COUNT_MISMATCH");const sig=rows.map(r=>r.date).join(",");if(signature!==null&&sig!==signature)throw new Error("R21331_SESSION_SET_MISMATCH");signature=sig;series[ticker]=rows;
  }
  const first=series[TARGETS[0]]?.[0]?.date??null,last=series[TARGETS[0]]?.at(-1)?.date??null;return {series,sessions:expectedSessions,totalRows:TARGETS.length*expectedSessions,first,last};
}

export function validateR21331Stored(payload){
  if(payload?.methodologyVersion!==METHOD||payload?.source!=="ALPACA_IEX_SHADOW"||payload?.feed!=="iex"||payload?.adjustment!=="split"||payload?.start!==START||payload?.end!==END)return null;
  try{return normalizeR21331Bars({bars:Object.fromEntries(TARGETS.map(t=>[t,(payload.series?.[t]??[]).map(r=>({t:`${r.date}T00:00:00Z`,c:r.close,v:r.volume}))])),next_page_token:null});}catch{return null;}
}

export function buildR21331RequestUrl(){const url=new URL(ENDPOINT);url.searchParams.set("symbols",TARGETS.join(","));url.searchParams.set("timeframe","1Day");url.searchParams.set("start",`${START}T00:00:00Z`);url.searchParams.set("end",`${END}T23:59:59Z`);url.searchParams.set("feed","iex");url.searchParams.set("adjustment","split");url.searchParams.set("limit","10000");return url;}

export async function collectR21331(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{fetchImpl=globalThis.fetch,now=new Date()}={}){
  const prior=safeJson(path.join(base,PRIOR_FILE));if(prior?.status!=="SHADOW_R21330_ALPACA_STOCK_CONTRACT_RECHECK_COMPLETE"||prior?.summary?.projectedComposite252Possible!==true)throw new Error("R21331_PRIOR_NOT_READY");
  if(Number(prior?.summary?.benchmarkTargetSessions)!==EXPECTED_SESSIONS||prior?.summary?.benchmarkTargetStart!==START||prior?.summary?.benchmarkTargetEnd!==END||Number(prior?.summary?.estimatedBenchmarkProviderRequests)!==1)throw new Error("R21331_PRIOR_SCOPE_MISMATCH");
  const jsonFile=path.join(base,OUT_JSON),txtFile=path.join(base,OUT_TXT),existing=safeJson(jsonFile),verifiedExisting=existing?validateR21331Stored(existing):null;if(existing&&!verifiedExisting)throw new Error("R21331_PRIOR_FILE_INVALID");
  let normalized=verifiedExisting,providerRequests=0,mode="REUSED_VERIFIED_LOCAL";
  if(!normalized){
    const env=loadLocalProviders(base),key=env.APCA_API_KEY_ID,secret=env.APCA_API_SECRET_KEY;if(!key||!secret)throw new Error("R21331_ALPACA_CREDENTIALS_MISSING");if(typeof fetchImpl!=="function")throw new Error("R21331_FETCH_UNAVAILABLE");
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{providerRequests++;if(providerRequests>MAX_PROVIDER_REQUESTS)throw new Error("R21331_PROVIDER_REQUEST_LIMIT");const response=await fetchImpl(buildR21331RequestUrl(),{headers:{"APCA-API-KEY-ID":key,"APCA-API-SECRET-KEY":secret,accept:"application/json"},signal:controller.signal});if(!response.ok)throw new Error(`R21331_ALPACA_HTTP_${response.status}`);normalized=normalizeR21331Bars(await response.json());mode="FETCHED_AND_STORED";}catch(error){if(error?.name==="AbortError")throw new Error("R21331_ALPACA_TIMEOUT");throw error;}finally{clearTimeout(timer);}
    const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),payload={version:1,methodologyVersion:METHOD,status:"SHADOW_R21331_ALPACA_SECTOR_ETF_BACKFILL_STORED",mode:"SHADOW_ONLY",source:"ALPACA_IEX_SHADOW",feed:"iex",adjustment:"split",start:START,end:END,generatedAt,targets:[...TARGETS],sessions:normalized.sessions,totalRows:normalized.totalRows,series:normalized.series,safety:{providerRequests,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS,normalizationChanged:false,weightsChanged:false,productionBenchmarkSourceChanged:false}};saveJson(jsonFile,payload);const checked=validateR21331Stored(safeJson(jsonFile));if(!checked||checked.totalRows!==normalized.totalRows)throw new Error("R21331_READBACK_FAILED");
  }
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),result={version:1,generatedAt,status:"SHADOW_R21331_ALPACA_SECTOR_ETF_BACKFILL_COMPLETE",mode,providerRequests,maxProviderRequests:MAX_PROVIDER_REQUESTS,targets:TARGETS.length,sessions:normalized.sessions,totalRows:normalized.totalRows,first:normalized.first,last:normalized.last,storageVerified:true,jsonFile,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS,normalizationChanged:false,weightsChanged:false,productionBenchmarkSourceChanged:false,next:"LOCAL_RECOMPUTE_FIVE_AXIS_252_WITH_R21331_ETF_EXTENSION"};
  saveText(txtFile,["ZGMINI SECTOR FEAR & GREED R2.13.31 ALPACA SECTOR ETF BACKFILL",`generatedAt=${generatedAt}`,`status=${result.status}`,`mode=${mode}`,`providerRequests=${providerRequests}/${MAX_PROVIDER_REQUESTS}`,`targets=${result.targets}`,`sessions=${result.sessions}`,`rows=${result.totalRows}`,`window=${result.first}..${result.last}`,`storageVerified=${result.storageVerified}`,`jsonFile=${jsonFile}`,"publicMutation=false d1Mutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false referenceRequirementChanged=false normalizationChanged=false weightsChanged=false productionBenchmarkSourceChanged=false",`approvedR1ReferenceRequirement=${SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS}`,`next=${result.next}`].join("\n")+"\n");return {...result,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))collectR21331().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.log(JSON.stringify({status:"FAILED",code:safeCode(e),providerRequests:null,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,referenceRequirementChanged:false,productionBenchmarkSourceChanged:false}));process.exitCode=1;});
