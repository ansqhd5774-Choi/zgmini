import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {loadLocalProviders} from "./local-env.mjs";
import {createQuotaFetch} from "./quota-fetch.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {save} from "./d1.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const REPORT_NAME="local-dollar-r21-pit-collection-last-run.json";
const BATCH_KEY="shadowDollarFxPit";
const SERIES_ID="DTWEXBGS";
const PAGE_LIMIT=100000;
const MAX_PAGES=4;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const domain=(market,id)=>market?.domains?.find(item=>item?.id===id)??null;

function minusYears(date,years){
  const [y,m,d]=date.split("-").map(Number);
  return new Date(Date.UTC(y-years,m-1,d)).toISOString().slice(0,10);
}
function minusDays(date,days){
  return new Date(Date.parse(date+"T00:00:00Z")-days*86400000).toISOString().slice(0,10);
}
function normalizedSignalDates(market,asOf){
  const dates=[...new Set((domain(market,"dollarFx")?.trend??[])
    .map(row=>String(row?.label??row?.date??"").slice(0,10))
    .filter(date=>validDate(date)&&date<=asOf))]
    .sort();
  if(dates.length<250)throw new Error("DOLLAR_R21_PIT_SIGNAL_HISTORY_SHORT");
  return dates;
}
export function dollarPitFredUrl({key,vintageDates,observationStart,observationEnd,offset=0}={}){
  if(typeof key!=="string"||!key.trim())throw new Error("FRED_API_KEY_MISSING");
  if(!Array.isArray(vintageDates)||!vintageDates.length||vintageDates.some(date=>!validDate(date)))throw new Error("DOLLAR_R21_PIT_VINTAGE_DATES_INVALID");
  if(!validDate(observationStart)||!validDate(observationEnd)||observationStart>observationEnd)throw new Error("DOLLAR_R21_PIT_OBSERVATION_RANGE_INVALID");
  if(!Number.isInteger(offset)||offset<0||offset%PAGE_LIMIT!==0)throw new Error("DOLLAR_R21_PIT_OFFSET_INVALID");
  const url=new URL("https://api.stlouisfed.org/fred/series/observations");
  url.search=new URLSearchParams({
    series_id:SERIES_ID,
    api_key:key.trim(),
    file_type:"json",
    sort_order:"asc",
    units:"lin",
    output_type:"1",
    vintage_dates:vintageDates.join(","),
    observation_start:observationStart,
    observation_end:observationEnd,
    limit:String(PAGE_LIMIT),
    offset:String(offset),
  });
  return url;
}
export function parseDollarPitFredPage(payload,{expectedOffset=0,observationStart,observationEnd}={}){
  if(!payload||payload.error_code||!Array.isArray(payload.observations))throw new Error("DOLLAR_R21_PIT_FRED_INVALID_RESPONSE");
  if(Number(payload.output_type??1)!==1)throw new Error("DOLLAR_R21_PIT_OUTPUT_TYPE_MISMATCH");
  const offset=Number(payload.offset??expectedOffset),count=Number(payload.count??payload.observations.length);
  if(!Number.isInteger(offset)||offset!==expectedOffset||!Number.isInteger(count)||count<0)throw new Error("DOLLAR_R21_PIT_PAGE_METADATA_INVALID");
  const rows=[];
  for(const row of payload.observations){
    const date=String(row?.date??"");
    const realtimeStart=String(row?.realtime_start??"");
    const realtimeEnd=String(row?.realtime_end??"");
    if(!validDate(date)||date<observationStart||date>observationEnd)throw new Error("DOLLAR_R21_PIT_OBSERVATION_DATE_INVALID");
    if(!validDate(realtimeStart)||!validDate(realtimeEnd)||realtimeStart>realtimeEnd)throw new Error("DOLLAR_R21_PIT_REALTIME_RANGE_INVALID");
    if(row?.value==="."||row?.value==="")continue;
    const value=Number(row?.value);
    if(!finite(value)||value<=0)throw new Error("DOLLAR_R21_PIT_VALUE_INVALID");
    rows.push({observationDate:date,value,realtimeStart,realtimeEnd,vintageMethod:"ALFRED_REALTIME_PERIOD"});
  }
  return {offset,count,received:payload.observations.length,rows};
}
export function pointInTimeDollarRows(revisions,vintageDate){
  if(!validDate(vintageDate))throw new Error("DOLLAR_R21_PIT_VINTAGE_DATE_INVALID");
  const byDate=new Map();
  for(const row of Array.isArray(revisions)?revisions:[]){
    if(!validDate(row?.observationDate)||row.observationDate>vintageDate)continue;
    if(!validDate(row?.realtimeStart)||!validDate(row?.realtimeEnd))continue;
    if(row.realtimeStart>vintageDate||row.realtimeEnd<vintageDate)continue;
    const value=Number(row?.value);
    if(!finite(value)||value<=0)continue;
    const prior=byDate.get(row.observationDate);
    if(!prior||row.realtimeStart>prior.realtimeStart)byDate.set(row.observationDate,row);
  }
  return [...byDate.values()]
    .sort((a,b)=>a.observationDate.localeCompare(b.observationDate))
    .map(row=>({
      observationDate:row.observationDate,
      value:row.value,
      realtimeStart:row.realtimeStart,
      realtimeEnd:row.realtimeEnd,
      vintageMethod:"ALFRED_PIT_AS_OF_"+vintageDate,
    }));
}

export async function collectDollarR21PitShadow(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{asOf=new Date().toISOString().slice(0,10)}={}){
  if(!validDate(asOf))throw new Error("DOLLAR_R21_PIT_ASOF_INVALID");
  const marketFile=path.join(base,"local-market-result.json");
  if(!fs.existsSync(marketFile))throw new Error("LOCAL_MARKET_RESULT_MISSING");
  const market=JSON.parse(fs.readFileSync(marketFile,"utf8"));
  const signalDates=normalizedSignalDates(market,asOf);
  const signalVintagePairs=signalDates.map(signalDate=>({signalDate,vintageDate:minusDays(signalDate,1)}));
  const vintageDates=[...new Set(signalVintagePairs.map(item=>item.vintageDate))].sort();
  const firstSignal=signalDates[0],lastSignal=signalDates.at(-1);
  const observationStart=minusYears(firstSignal,3),observationEnd=lastSignal;

  const env=loadLocalProviders(base);
  const key=String(env?.FRED_API_KEY??"").trim();
  if(!key)throw new Error("FRED_API_KEY_MISSING");
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  const store=marketOperationalStore(core);
  const originalFetch=globalThis.fetch;
  const quota=createQuotaFetch({base,originalFetch,mode:"enforce"});
  globalThis.fetch=quota.fetch;
  const report={version:1,status:"RUNNING",at:new Date().toISOString(),asOf,noPublish:true,dbSchemaChanged:false,providerCalls:0,signalDates:signalDates.length,vintageDates:vintageDates.length,informationCutoffPolicy:"PRIOR_CALENDAR_DAY",observationStart,observationEnd};
  try{
    const revisions=new Map();
    let totalCount=null;
    for(let page=0;page<MAX_PAGES;page++){
      const offset=page*PAGE_LIMIT;
      const response=await globalThis.fetch(dollarPitFredUrl({key,vintageDates,observationStart,observationEnd,offset}),{headers:{accept:"application/json"}});
      report.providerCalls++;
      if(!response.ok)throw new Error(response.status===429?"DOLLAR_R21_PIT_FRED_QUOTA":"DOLLAR_R21_PIT_FRED_HTTP");
      const parsed=parseDollarPitFredPage(await response.json(),{expectedOffset:offset,observationStart,observationEnd});
      if(totalCount===null)totalCount=parsed.count;
      if(parsed.count!==totalCount)throw new Error("DOLLAR_R21_PIT_COUNT_CHANGED");
      for(const row of parsed.rows){
        const k=[row.observationDate,row.realtimeStart,row.realtimeEnd].join("|");
        const prior=revisions.get(k);
        if(prior&&prior.value!==row.value)throw new Error("DOLLAR_R21_PIT_DUPLICATE_CONFLICT");
        revisions.set(k,row);
      }
      if(offset+parsed.received>=totalCount)break;
      if(page===MAX_PAGES-1)throw new Error("DOLLAR_R21_PIT_PAGE_CAP_EXCEEDED");
    }
    const rows=[...revisions.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate)||a.realtimeStart.localeCompare(b.realtimeStart));
    if(rows.length<252)throw new Error("DOLLAR_R21_PIT_HISTORY_SHORT");
    const firstPit=pointInTimeDollarRows(rows,signalVintagePairs[0].vintageDate);
    const lastPit=pointInTimeDollarRows(rows,signalVintagePairs.at(-1).vintageDate);
    if(firstPit.length<252||lastPit.length<252)throw new Error("DOLLAR_R21_PIT_VINTAGE_COVERAGE_SHORT");

    await store.writeInput(BATCH_KEY,{
      series:{DTWEXBGS_PIT_REVISIONS:rows},
      signalDates,
      signalVintagePairs,
      source:"FRED/ALFRED DTWEXBGS",
      historyMode:"ALFRED_PRIOR_DAY_PIT_OUTPUT_TYPE_1",
      informationCutoffPolicy:"PRIOR_CALENDAR_DAY",
      lookAheadSafe:true,
      storedForShadowOnly:true,
      observationStart,
      observationEnd,
    },Date.now());

    report.status="STORED";
    report.revisionRows=rows.length;
    report.firstSignal=firstSignal;
    report.lastSignal=lastSignal;
    report.firstVintage=signalVintagePairs[0].vintageDate;
    report.lastVintage=signalVintagePairs.at(-1).vintageDate;
    report.firstVintageRows=firstPit.length;
    report.lastVintageRows=lastPit.length;
    report.quota=quota.summary();
    return report;
  }catch(error){
    report.status="FAILED";
    report.error=/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"DOLLAR_R21_PIT_COLLECTION_FAILED");
    report.quota=quota.summary();
    throw error;
  }finally{
    globalThis.fetch=originalFetch;
    core.close();
    save(path.join(base,REPORT_NAME),report);
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  collectDollarR21PitShadow().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"DOLLAR_R21_PIT_COLLECTION_FAILED")}));
    process.exitCode=1;
  });
}
