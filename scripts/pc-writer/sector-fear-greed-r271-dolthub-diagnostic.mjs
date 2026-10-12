import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const OUTPUT_JSON="local-sector-fear-greed-r271-dolthub-diagnostic.json";
const OUTPUT_TXT="local-sector-fear-greed-r271-dolthub-diagnostic.txt";
export const DOLTHUB_SQL_URL="https://www.dolthub.com/api/v2/databases/post-no-preference/stocks/sql";
export const DOLTHUB_REF="master";
export const BENCHMARKS=Object.freeze(["SPY","XLC","XLY","XLP","XLE","XLF","XLV","XLI","XLB","XLRE","XLK","XLU"]);
export const TARGETS=Object.freeze({trendRelativeRaw:881,volatilityRaw:818,speculativeR24Raw:834,demandRaw:775,breadthConservativeRaw:1007});
export const MAX_PROVIDER_CALLS=4;
export const LOOKBACK_CALENDAR_DAYS=1700;

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const round=value=>finite(value)?Math.round(value*1_000_000)/1_000_000:null;
const numberOrNull=value=>{if(value===null||value===undefined||value==="")return null;const n=Number(value);return finite(n)?n:null;};
const normalizeTicker=value=>String(value??"").trim().toUpperCase();
const quoteSql=value=>`'${String(value).replace(/'/g,"''")}'`;
const median=values=>{const a=values.filter(finite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
const percentile=(values,p)=>{const a=values.filter(finite).sort((x,y)=>x-y);if(!a.length)return null;const pos=(a.length-1)*p,lo=Math.floor(pos),hi=Math.ceil(pos);return lo===hi?a[lo]:a[lo]+(a[hi]-a[lo])*(pos-lo);};
const safeIdentifier=value=>/^[A-Za-z0-9_]+$/.test(String(value??""))?String(value):null;
const safeCode=value=>String(value??"").toUpperCase().replace(/[^A-Z0-9_]+/g,"_").replace(/^_+|_+$/g,"").slice(0,80)||"UNKNOWN";

export function lookbackStartDate(now=new Date()){
  const date=now instanceof Date?new Date(now):new Date(now);
  if(!Number.isFinite(date.getTime()))throw new Error("R271_INVALID_NOW");
  date.setUTCDate(date.getUTCDate()-LOOKBACK_CALENDAR_DAYS);
  return date.toISOString().slice(0,10);
}

function normalizeV2Rows(body){
  if(!body||typeof body!=="object")throw new Error("R271_DOLTHUB_INVALID_RESPONSE");
  const data=body.data??body;
  const status=String(data.status??body.status??"").toLowerCase();
  if(status&&status!=="success")throw new Error(`R271_DOLTHUB_SQL_${safeCode(status)}_${safeCode(data.message??body.message)}`);
  const rows=data.rows;
  if(!Array.isArray(rows))throw new Error("R271_DOLTHUB_ROWS_MISSING");
  if(!rows.length)return [];
  if(rows.every(row=>row&&typeof row==="object"&&!Array.isArray(row)))return rows;
  const columns=Array.isArray(data.columns)?data.columns.map(column=>String(column?.name??"")).filter(Boolean):[];
  if(!columns.length)throw new Error("R271_DOLTHUB_COLUMNS_MISSING");
  return rows.map(cells=>{
    if(!Array.isArray(cells))throw new Error("R271_DOLTHUB_ROW_SHAPE_INVALID");
    const row={};
    for(let index=0;index<columns.length;index++)row[columns[index]]=cells[index]??null;
    return row;
  });
}

export async function queryDoltHubRead(sql,{fetchImpl=globalThis.fetch,clientTimeoutMs=65_000,serverTimeoutMs=60_000}={}){
  if(typeof fetchImpl!=="function")throw new Error("R271_FETCH_UNAVAILABLE");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),clientTimeoutMs);
  try{
    let response;
    try{
      response=await fetchImpl(DOLTHUB_SQL_URL,{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify({ref:DOLTHUB_REF,q:sql,limit:1000,timeout_ms:serverTimeoutMs}),signal:controller.signal,redirect:"error"});
    }catch(error){
      if(error?.name==="AbortError")throw new Error("R271_DOLTHUB_CLIENT_TIMEOUT");
      throw error;
    }
    if(!response?.ok)throw new Error(`R271_DOLTHUB_HTTP_${response?.status??"UNKNOWN"}`);
    let body;try{body=await response.json();}catch{throw new Error("R271_DOLTHUB_JSON_INVALID");}
    return normalizeV2Rows(body);
  }finally{clearTimeout(timer);}
}

export function findActSymbolIndex(rows){
  for(const row of rows??[]){
    const column=String(row.Column_name??row.column_name??row.COLUMN_NAME??"");
    const key=safeIdentifier(row.Key_name??row.key_name??row.KEY_NAME);
    if(column.toLowerCase()==="act_symbol"&&key&&key.toUpperCase()!=="PRIMARY")return key;
  }
  return null;
}

function indexHint(indexName){const safe=safeIdentifier(indexName);return safe?` FORCE INDEX (${safe})`:"";}
function dateFilter(startDate){if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate))throw new Error("R271_INVALID_START_DATE");return `date >= ${quoteSql(startDate)}`;}

export function buildBenchmarkQuery(startDate,indexName=null){
  return `SELECT act_symbol, COUNT(*) AS sessions, SUM(CASE WHEN close IS NOT NULL AND close > 0 THEN 1 ELSE 0 END) AS close_sessions, SUM(CASE WHEN volume IS NOT NULL AND volume >= 0 THEN 1 ELSE 0 END) AS volume_sessions, MIN(date) AS first_date, MAX(date) AS last_date FROM ohlcv${indexHint(indexName)} WHERE ${dateFilter(startDate)} AND act_symbol IN (${BENCHMARKS.map(quoteSql).join(",")}) GROUP BY act_symbol ORDER BY act_symbol`;
}

export function buildTickerCoverageQuery(tickers,startDate,indexName=null){
  const safe=[...new Set((tickers??[]).map(normalizeTicker).filter(Boolean))].sort();
  if(!safe.length)throw new Error("R271_NO_PIT_TICKERS");
  if(safe.length>1000)throw new Error("R271_PIT_TICKER_LIMIT");
  return `SELECT act_symbol, COUNT(*) AS sessions, SUM(CASE WHEN close IS NOT NULL AND close > 0 THEN 1 ELSE 0 END) AS close_sessions, SUM(CASE WHEN volume IS NOT NULL AND volume >= 0 THEN 1 ELSE 0 END) AS volume_sessions, MIN(date) AS first_date, MAX(date) AS last_date FROM ohlcv${indexHint(indexName)} WHERE ${dateFilter(startDate)} AND act_symbol IN (${safe.map(quoteSql).join(",")}) GROUP BY act_symbol ORDER BY act_symbol`;
}

function normalizeCoverageRows(rows){
  const map=new Map();
  for(const row of rows??[]){
    const ticker=normalizeTicker(row.act_symbol??row.ACT_SYMBOL);if(!ticker)continue;
    map.set(ticker,{ticker,sessions:numberOrNull(row.sessions),closeSessions:numberOrNull(row.close_sessions),volumeSessions:numberOrNull(row.volume_sessions),firstDate:String(row.first_date??""),lastDate:String(row.last_date??"")});
  }
  return map;
}

export function summarizePitTickerCoverage(pitHistory,coverageRows){
  const coverage=normalizeCoverageRows(coverageRows),sectors={};
  const byTicker=pitHistory?.byTicker??{};
  for(const [ticker,entries] of Object.entries(byTicker)){
    const row=coverage.get(normalizeTicker(ticker))??null;
    const sectorIds=[...new Set((entries??[]).map(item=>item.sectorId).filter(Boolean))];
    for(const sectorId of sectorIds){
      const bucket=sectors[sectorId]??{tickers:new Set(),found:new Set(),sessions:[],volumeSessions:[],breadthReady:0,demandReady:0,speculativeReady:0,trendRelativeReady:0,volatilityReady:0};
      bucket.tickers.add(ticker);
      if(row){
        bucket.found.add(ticker);
        if(finite(row.closeSessions))bucket.sessions.push(row.closeSessions);
        if(finite(row.volumeSessions))bucket.volumeSessions.push(row.volumeSessions);
        if((row.closeSessions??0)>=TARGETS.breadthConservativeRaw)bucket.breadthReady++;
        if((row.volumeSessions??0)>=TARGETS.demandRaw)bucket.demandReady++;
        if((row.closeSessions??0)>=TARGETS.speculativeR24Raw)bucket.speculativeReady++;
        if((row.closeSessions??0)>=TARGETS.trendRelativeRaw)bucket.trendRelativeReady++;
        if((row.closeSessions??0)>=TARGETS.volatilityRaw)bucket.volatilityReady++;
      }
      sectors[sectorId]=bucket;
    }
  }
  const output={};
  for(const [sectorId,bucket] of Object.entries(sectors)){
    const total=bucket.tickers.size,found=bucket.found.size;
    output[sectorId]={historicalTickers:total,foundTickers:found,foundRatio:total?round(found/total):null,closeMedian:round(median(bucket.sessions)),closeP10:round(percentile(bucket.sessions,.1)),volumeMedian:round(median(bucket.volumeSessions)),volumeP10:round(percentile(bucket.volumeSessions,.1)),tickersMeetingBreadth1007:bucket.breadthReady,tickersMeetingDemand775:bucket.demandReady,tickersMeetingSpeculative834:bucket.speculativeReady,tickersMeetingTrendRelative881:bucket.trendRelativeReady,tickersMeetingVolatility818:bucket.volatilityReady};
  }
  return output;
}

function loadPit(base){
  const file=path.join(base,PIT_FILE);if(!fs.existsSync(file))throw new Error("R271_PIT_FILE_MISSING");
  return {file,history:parsePitSectorHistoryCsv(fs.readFileSync(file,"utf8"))};
}

function render(report){
  const lines=["ZGMINI SECTOR FEAR & GREED R2.7.1 DOLTHUB SHADOW DIAGNOSTIC",`generatedAt=${report.generatedAt}`,`status=${report.status}`,`providerCalls=${report.providerCalls}/${MAX_PROVIDER_CALLS}`,`lookbackStart=${report.lookbackStart}`,`actSymbolIndex=${report.actSymbolIndex??"NONE"}`,`publicMutation=${report.publicMutation} dbSchemaChanged=${report.dbSchemaChanged} productionFormulaChanged=${report.productionFormulaChanged} schedulerChanged=${report.schedulerChanged}`,`commercialProductionEligible=${report.commercialProductionEligible}`,`upstreamProvenanceVerified=${report.upstreamProvenanceVerified}`,"","BENCHMARK | SESSIONS | CLOSE | VOLUME | FIRST | LAST"];
  for(const ticker of BENCHMARKS){const row=report.benchmarks[ticker]??{sessions:0,closeSessions:0,volumeSessions:0,firstDate:null,lastDate:null};lines.push(`${ticker} | ${row.sessions??0} | ${row.closeSessions??0} | ${row.volumeSessions??0} | ${row.firstDate??"NA"} | ${row.lastDate??"NA"}`);}
  lines.push("","SECTOR | PIT_TICKERS | FOUND | FOUND_RATIO | CLOSE_MEDIAN | CLOSE_P10 | VOL_MEDIAN | VOL_P10 | B1007 | D775 | S834 | TR881 | V818");
  for(const [sectorId,row] of Object.entries(report.pitCoverage).sort(([a],[b])=>a.localeCompare(b)))lines.push(`${sectorId} | ${row.historicalTickers} | ${row.foundTickers} | ${row.foundRatio??"NA"} | ${row.closeMedian??"NA"} | ${row.closeP10??"NA"} | ${row.volumeMedian??"NA"} | ${row.volumeP10??"NA"} | ${row.tickersMeetingBreadth1007} | ${row.tickersMeetingDemand775} | ${row.tickersMeetingSpeculative834} | ${row.tickersMeetingTrendRelative881} | ${row.tickersMeetingVolatility818}`);
  lines.push("","note=SCREENING_ONLY_SESSION_COUNTS_DO_NOT_PROVE_EXACT_PIT_DATE_COVERAGE","note=LOOKBACK_IS_BOUNDED_TO_REQUIRED_REFERENCE_HORIZON_PLUS_BUFFER","note=NO_PRODUCTION_D1_SCHEMA_SCHEDULER_OR_FORMULA_CHANGE","note=COMMERCIAL_PRODUCTION_REMAINS_FALSE_UNTIL_DIRECT_LICENSE_AND_UPSTREAM_PROVENANCE_RIGHTS_ARE_BOTH_VERIFIED");
  return lines.join("\n")+"\n";
}

export async function runSectorFearGreedR271DoltHubDiagnostic(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{fetchImpl=globalThis.fetch,now=new Date()}={}){
  const pit=loadPit(base),pitTickers=Object.keys(pit.history.byTicker??{}),lookbackStart=lookbackStartDate(now);
  let providerCalls=0,currentStep="INIT";
  const call=async(step,sql)=>{
    if(providerCalls>=MAX_PROVIDER_CALLS)throw new Error("R271_PROVIDER_CALL_LIMIT");
    currentStep=step;providerCalls++;
    try{return await queryDoltHubRead(sql,{fetchImpl});}
    catch(error){throw new Error(`R271_STEP_${safeCode(step)}_${safeCode(error?.message??error?.name)}`);}
  };
  try{
    const indexRows=await call("INDEX","SHOW INDEX FROM ohlcv");
    const actSymbolIndex=findActSymbolIndex(indexRows);
    const benchmarkRows=await call("BENCHMARK",buildBenchmarkQuery(lookbackStart,actSymbolIndex));
    const tickerRows=await call("PIT_COVERAGE",buildTickerCoverageQuery(pitTickers,lookbackStart,actSymbolIndex));
    const benchmarkMap=normalizeCoverageRows(benchmarkRows),benchmarks={};for(const ticker of BENCHMARKS)benchmarks[ticker]=benchmarkMap.get(ticker)??{ticker,sessions:0,closeSessions:0,volumeSessions:0,firstDate:null,lastDate:null};
    const report={version:"R2.7.1-DOLTHUB-SHADOW-DIAGNOSTIC",generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),status:"SHADOW_R271_DOLTHUB_DIAGNOSTIC_COMPLETE",mode:"SHADOW_ONLY",source:"post-no-preference/stocks",sourcePage:"https://www.dolthub.com/repositories/post-no-preference/stocks",providerCalls,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,commercialProductionEligible:false,upstreamProvenanceVerified:false,pitFile:pit.file,targets:{...TARGETS},lookbackStart,actSymbolIndex,benchmarks,pitCoverage:summarizePitTickerCoverage(pit.history,tickerRows)};
    fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,render(report));return {...report,jsonFile,txtFile};
  }catch(error){
    const failure={version:"R2.7.1-DOLTHUB-SHADOW-DIAGNOSTIC",generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),status:"FAILED",code:safeCode(error?.message),step:currentStep,providerCalls,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,commercialProductionEligible:false,upstreamProvenanceVerified:false};
    fs.mkdirSync(base,{recursive:true});fs.writeFileSync(path.join(base,OUTPUT_JSON),JSON.stringify(failure,null,2)+"\n");fs.writeFileSync(path.join(base,OUTPUT_TXT),Object.entries(failure).map(([key,value])=>`${key}=${value}`).join("\n")+"\n");throw Object.assign(new Error(failure.code),{r271Failure:failure});
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runSectorFearGreedR271DoltHubDiagnostic().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{const failure=error?.r271Failure??{status:"FAILED",code:safeCode(error?.message),publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false};console.log(JSON.stringify(failure));process.exitCode=1;});
}
