import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {parquetReadObjects} from "hyparquet";
import {loadLocalProviders} from "./local-env.mjs";
import {parseSectorUniverseCsv} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {B1_R3_UNIVERSE_URL} from "../../lib/market-score/breadth-b1-r3-contract.mjs";

export const SECTOR_FEAR_GREED_R1_COLLECTION_VERSION="SECTOR-FEAR-GREED-R1-FREE-WINDOW-COLLECTOR-V1";
export const SECTOR_FEAR_GREED_R1_ETF_FEED="etf_daily";
export const SECTOR_FEAR_GREED_R1_MARKETPARQUET_API="https://marketparquet.com/api/v1";
const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const UNIVERSE_FILE="local-sector-fear-greed-r1-universe.csv";
const PRICE_FILE="local-sector-fear-greed-r1-price-history.json";
const RUN_JSON="local-sector-fear-greed-r1-collection-last-run.json";
const RUN_TXT="local-sector-fear-greed-r1-collection-last-run.txt";
const TARGETS=Object.freeze(["SPY",...Object.values(SECTOR_FEAR_GREED_R1_ETFS)]);
const TARGET_SET=new Set(TARGETS);
const MAX_MANIFEST_FILES=270;
const MAX_PARQUET_BYTES=8_000_000;
const MAX_UNIVERSE_BYTES=1_000_000;
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&DATE_RE.test(value)&&Number.isFinite(Date.parse(value));

function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"))}catch{return null}}
function atomicWrite(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+`.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,data);fs.renameSync(tmp,file);}
function safeCode(error,fallback="SECTOR_COLLECTION_FAILED"){const message=String(error?.message??"");return /^[A-Z0-9_:-]+$/.test(message)?message:String(error?.code??fallback).replace(/[^A-Z0-9_:-]/gi,"_").slice(0,80)||fallback;}
function isoDate(date){return new Date(date).toISOString().slice(0,10)}
function startDate(now,days=370){return isoDate(new Date((now instanceof Date?now:new Date(now)).getTime()-days*86400000));}
function responseSizeOk(response,max){const hinted=Number(response?.headers?.get?.("content-length")??0);return !Number.isFinite(hinted)||hinted<=0||hinted<=max;}

export function resolveMarketParquetKey(env={}){const value=String(env?.MARKETPARQUET_API_KEY??env?.MARKET_PARQUET_API_KEY??"").trim();return value||null;}

export function parseMarketParquetManifest(payload){
  const files=Array.isArray(payload?.files)?payload.files:[];
  if(!files.length)throw new Error("MARKETPARQUET_MANIFEST_EMPTY");
  if(files.length>MAX_MANIFEST_FILES)throw new Error("MARKETPARQUET_MANIFEST_TOO_LARGE");
  const byDate=new Map();
  for(const item of files){
    const filename=String(item?.filename??""),downloadUrl=String(item?.download_url??"");
    const date=String(item?.date??filename.match(/(\d{4}-\d{2}-\d{2})\.parquet$/)?.[1]??"");
    if(!validDate(date))throw new Error("MARKETPARQUET_MANIFEST_DATE_INVALID");
    let parsed;try{parsed=new URL(downloadUrl);}catch{throw new Error("MARKETPARQUET_DOWNLOAD_URL_INVALID")}
    if(parsed.protocol!=="https:")throw new Error("MARKETPARQUET_DOWNLOAD_URL_INVALID");
    if(byDate.has(date)&&byDate.get(date).downloadUrl!==downloadUrl)throw new Error("MARKETPARQUET_MANIFEST_DUPLICATE_CONFLICT");
    byDate.set(date,{date,filename:filename||`${date}.parquet`,downloadUrl});
  }
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

export function extractTargetEtfRows(rows,date){
  if(!validDate(date)||!Array.isArray(rows))throw new TypeError("SECTOR_ETF_ROWS_INVALID");
  const selected=new Map();
  for(const row of rows){
    const rowDate=String(row?.date??row?.timestamp instanceof Date?row.timestamp.toISOString().slice(0,10):row?.date??row?.timestamp??"").slice(0,10);
    if(rowDate!==date)continue;
    const symbol=String(row?.symbol??"").trim();if(!TARGET_SET.has(symbol))continue;
    const asset=String(row?.asset_type??"").toLowerCase();if(asset&&asset!=="etf")continue;
    const close=Number(row?.close),volume=Number(row?.volume);
    if(!finite(close)||close<=0||!finite(volume)||volume<0)continue;
    const existing=selected.get(symbol);
    if(existing&&(existing.close!==close||existing.volume!==volume))throw new Error("SECTOR_ETF_DUPLICATE_CONFLICT");
    selected.set(symbol,{date,close,volume});
  }
  const missing=TARGETS.filter(symbol=>!selected.has(symbol));
  if(missing.length)throw new Error("SECTOR_ETF_TARGETS_MISSING");
  return Object.fromEntries(TARGETS.map(symbol=>[symbol,selected.get(symbol)]));
}

export function mergeSectorPriceHistory(existing,byTicker){
  const series={};
  for(const ticker of TARGETS){
    const map=new Map();
    for(const row of existing?.series?.[ticker]??[]){
      const date=String(row?.date??""),close=Number(row?.close),volume=Number(row?.volume);
      if(validDate(date)&&finite(close)&&close>0&&finite(volume)&&volume>=0)map.set(date,{date,close,volume});
    }
    for(const row of byTicker?.[ticker]??[]){
      const date=String(row?.date??""),close=Number(row?.close),volume=Number(row?.volume);
      if(!validDate(date)||!finite(close)||close<=0||!finite(volume)||volume<0)throw new Error("SECTOR_ETF_HISTORY_ROW_INVALID");
      const prior=map.get(date);if(prior&&(prior.close!==close||prior.volume!==volume))throw new Error("SECTOR_ETF_HISTORY_CONFLICT");
      map.set(date,{date,close,volume});
    }
    series[ticker]=[...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
  }
  return series;
}

async function readParquetRows(file){
  try{
    try{return await parquetReadObjects({file,columns:["date","symbol","asset_type","close","volume"]});}
    catch(error){if(!/parquet column not found: date/.test(String(error?.message??error)))throw error;return await parquetReadObjects({file,columns:["timestamp","symbol","asset_type","close","volume"]});}
  }catch{throw new Error("MARKETPARQUET_PARSE_FAILED")}
}

async function fetchText(url,{fetchImpl=globalThis.fetch,maxBytes=MAX_UNIVERSE_BYTES,headers={}}={}){
  const response=await fetchImpl(url,{redirect:"follow",headers});
  if(!response||response.status!==200)throw new Error("UNIVERSE_HTTP_"+String(response?.status??0));
  if(!responseSizeOk(response,maxBytes))throw new Error("UNIVERSE_BODY_LIMIT");
  const text=await response.text();if(Buffer.byteLength(text,"utf8")>maxBytes)throw new Error("UNIVERSE_BODY_LIMIT");return text;
}

async function fetchManifest({apiKey,start,end,fetchImpl=globalThis.fetch}){
  const url=`${SECTOR_FEAR_GREED_R1_MARKETPARQUET_API}/manifest/${SECTOR_FEAR_GREED_R1_ETF_FEED}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
  const response=await fetchImpl(url,{redirect:"manual",headers:{Authorization:`Bearer ${apiKey}`,Accept:"application/json"}});
  if(!response||response.status!==200)throw new Error("MARKETPARQUET_HTTP_"+String(response?.status??0));
  let payload;try{payload=await response.json()}catch{throw new Error("MARKETPARQUET_MANIFEST_JSON_INVALID")}
  return parseMarketParquetManifest(payload);
}

async function fetchParquetFile(url,{fetchImpl=globalThis.fetch,parquetReader=readParquetRows}={}){
  const response=await fetchImpl(url,{redirect:"follow",headers:{Accept:"application/vnd.apache.parquet,application/octet-stream"}});
  if(!response||response.status!==200)throw new Error("MARKETPARQUET_FILE_HTTP_"+String(response?.status??0));
  if(!responseSizeOk(response,MAX_PARQUET_BYTES))throw new Error("MARKETPARQUET_FILE_BODY_LIMIT");
  const file=await response.arrayBuffer();if(file.byteLength<8||file.byteLength>MAX_PARQUET_BYTES)throw new Error("MARKETPARQUET_FILE_BODY_INVALID");
  return parquetReader(file);
}

function buildPricePayload(series,{generatedAt,start,end,filesCollected,filesAvailable}={}){
  const counts=Object.fromEntries(TARGETS.map(ticker=>[ticker,series[ticker]?.length??0]));
  return {version:1,methodologyVersion:SECTOR_FEAR_GREED_R1_COLLECTION_VERSION,mode:"SHADOW_ONLY",source:"MarketParquet",feed:SECTOR_FEAR_GREED_R1_ETF_FEED,licenseUse:"DERIVED_RESULTS_ONLY_NO_RAW_REDISTRIBUTION",generatedAt,start,end,filesCollected,filesAvailable,targets:[...TARGETS],counts,series};
}

function renderRunText(run){return ["ZGMINI SECTOR FEAR & GREED R1 FREE-WINDOW COLLECTION",`generatedAt=${run.generatedAt}`,`status=${run.status}`,`universe=${run.universe.status} members=${run.universe.members??0}`,`marketParquetKeyPresent=${run.marketParquet.keyPresent}`,`marketParquet=${run.marketParquet.status}`,`window=${run.marketParquet.start??"-"}..${run.marketParquet.end??"-"}`,`manifestFiles=${run.marketParquet.manifestFiles??0} downloadedFiles=${run.marketParquet.downloadedFiles??0} skippedExisting=${run.marketParquet.skippedExisting??0}`,`priceRowsMin=${run.marketParquet.minTickerRows??0} priceRowsMax=${run.marketParquet.maxTickerRows??0}`,`providerRequests=${run.providerRequests}`,`publicMutation=${run.publicMutation} dbSchemaChanged=${run.dbSchemaChanged}`,`next=${run.next??"NONE"}`].join("\n")+"\n";}

function saveRun(base,run){const jsonFile=path.join(base,RUN_JSON),txtFile=path.join(base,RUN_TXT);atomicWrite(jsonFile,JSON.stringify(run,null,2)+"\n");atomicWrite(txtFile,renderRunText(run));return {jsonFile,txtFile};}

export async function collectSectorFearGreedR1Shadow(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date(),fetchImpl=globalThis.fetch,parquetReader=readParquetRows}={}){
  if(typeof fetchImpl!=="function")throw new TypeError("FETCH_REQUIRED");fs.mkdirSync(base,{recursive:true});
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),universeFile=path.join(base,UNIVERSE_FILE),priceFile=path.join(base,PRICE_FILE);
  let providerRequests=0,universeStatus="MISSING",members=0;
  try{
    const csv=await fetchText(B1_R3_UNIVERSE_URL,{fetchImpl});providerRequests++;
    const parsed=parseSectorUniverseCsv(csv);members=parsed.memberCount;atomicWrite(universeFile,csv);universeStatus="READY_CURRENT_ONLY";
  }catch(error){
    const retained=fs.existsSync(universeFile)?(()=>{try{return parseSectorUniverseCsv(fs.readFileSync(universeFile,"utf8"))}catch{return null}})():null;
    if(retained){members=retained.memberCount;universeStatus="RETAINED_LAST_GOOD";}else throw new Error(safeCode(error,"SECTOR_UNIVERSE_COLLECTION_FAILED"));
  }

  let env={};try{env=loadLocalProviders(base)}catch(error){if(String(error?.message)!=="LOCAL_PROVIDER_FILE_MISSING")throw error;}
  const apiKey=resolveMarketParquetKey(env),end=isoDate(now),start=startDate(now),existing=safeJson(priceFile);
  if(!apiKey){
    const counts=TARGETS.map(ticker=>Number(existing?.series?.[ticker]?.length??0)),run={version:1,generatedAt,status:"PARTIAL_API_KEY_MISSING",mode:"SHADOW_ONLY",universe:{status:universeStatus,members,file:universeFile,currentOnly:true},marketParquet:{status:"API_KEY_MISSING",keyPresent:false,start,end,manifestFiles:0,downloadedFiles:0,skippedExisting:0,minTickerRows:counts.length?Math.min(...counts):0,maxTickerRows:counts.length?Math.max(...counts):0,priceFile:fs.existsSync(priceFile)?priceFile:null},providerRequests,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,next:"ADD_MARKETPARQUET_API_KEY_TO_LOCAL_PROVIDERS_ENV_AND_RERUN"};
    return {...run,...saveRun(base,run)};
  }

  const manifest=await fetchManifest({apiKey,start,end,fetchImpl});providerRequests++;
  const existingDates=new Set();for(const ticker of TARGETS)for(const row of existing?.series?.[ticker]??[])if(validDate(row?.date))existingDates.add(row.date);
  const collected=Object.fromEntries(TARGETS.map(ticker=>[ticker,[]]));let downloadedFiles=0,skippedExisting=0,chunk=0;
  for(const item of manifest){
    if(existingDates.has(item.date)&&TARGETS.every(ticker=>(existing?.series?.[ticker]??[]).some(row=>row?.date===item.date))){skippedExisting++;continue;}
    const rows=await fetchParquetFile(item.downloadUrl,{fetchImpl,parquetReader});providerRequests++;
    const selected=extractTargetEtfRows(rows,item.date);for(const ticker of TARGETS)collected[ticker].push(selected[ticker]);downloadedFiles++;chunk++;
    if(chunk>=10){const series=mergeSectorPriceHistory(existing,collected);const payload=buildPricePayload(series,{generatedAt,start,end,filesCollected:downloadedFiles,filesAvailable:manifest.length});atomicWrite(priceFile,JSON.stringify(payload,null,2)+"\n");existing=payload;for(const ticker of TARGETS)collected[ticker]=[];chunk=0;}
  }
  const series=mergeSectorPriceHistory(existing,collected),payload=buildPricePayload(series,{generatedAt,start,end,filesCollected:downloadedFiles,filesAvailable:manifest.length});atomicWrite(priceFile,JSON.stringify(payload,null,2)+"\n");
  const counts=TARGETS.map(ticker=>series[ticker].length),minTickerRows=Math.min(...counts),maxTickerRows=Math.max(...counts);
  const run={version:1,generatedAt,status:"COMPLETE_FREE_WINDOW",mode:"SHADOW_ONLY",universe:{status:universeStatus,members,file:universeFile,currentOnly:true},marketParquet:{status:"READY_FREE_WINDOW",keyPresent:true,start,end,manifestFiles:manifest.length,downloadedFiles,skippedExisting,minTickerRows,maxTickerRows,priceFile},providerRequests,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,next:"RUN_SHADOW_READINESS"};
  return {...run,...saveRun(base,run)};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  collectSectorFearGreedR1Shadow().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.log(JSON.stringify({status:"FAILED",code:safeCode(error),providerRequests:null,publicMutation:false,dbSchemaChanged:false}));process.exitCode=1;});
}
