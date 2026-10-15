import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const OUTPUT_JSON="local-sector-fear-greed-r27-dolthub-diagnostic.json";
const OUTPUT_TXT="local-sector-fear-greed-r27-dolthub-diagnostic.txt";
export const DOLTHUB_SQL_URL="https://www.dolthub.com/api/v2/databases/post-no-preference/stocks/sql";
export const DOLTHUB_REF="master";
export const BENCHMARKS=Object.freeze(["SPY","XLC","XLY","XLP","XLE","XLF","XLV","XLI","XLB","XLRE","XLK","XLU"]);
export const TARGETS=Object.freeze({trendRelativeRaw:881,volatilityRaw:818,speculativeR24Raw:834,demandRaw:775,breadthConservativeRaw:1007});
export const MAX_PROVIDER_CALLS=4;

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const round=value=>finite(value)?Math.round(value*1_000_000)/1_000_000:null;
const numberOrNull=value=>{if(value===null||value===undefined||value==="")return null;const n=Number(value);return finite(n)?n:null;};
const normalizeTicker=value=>String(value??"").trim().toUpperCase();
const quoteSql=value=>`'${String(value).replace(/'/g,"''")}'`;
const median=values=>{const a=values.filter(finite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;};
const percentile=(values,p)=>{const a=values.filter(finite).sort((x,y)=>x-y);if(!a.length)return null;const pos=(a.length-1)*p,lo=Math.floor(pos),hi=Math.ceil(pos);return lo===hi?a[lo]:a[lo]+(a[hi]-a[lo])*(pos-lo);};

function safeDocSignal(text){
  const value=String(text??"");
  const lower=value.toLowerCase();
  return {
    length:value.length,
    ccBySa4:/cc\s*by[- ]sa\s*4(?:\.0)?|attribution-sharealike\s*4(?:\.0)?/i.test(value),
    cc0:/cc0|creative commons zero|public domain dedication/i.test(value),
    mentionsYahoo:lower.includes("yahoo"),
    mentionsIex:lower.includes("iex"),
    mentionsAlpaca:lower.includes("alpaca"),
    mentionsPolygon:lower.includes("polygon"),
    mentionsNasdaq:lower.includes("nasdaq"),
    mentionsSource:/source|provenance|data provider|obtained from|fetched from/i.test(value),
  };
}

function rowsFromResponse(body){
  if(!body||typeof body!=="object")throw new Error("R27_DOLTHUB_INVALID_RESPONSE");
  if(body.status&&body.status!=="success")throw new Error(`R27_DOLTHUB_SQL_${String(body.status).toUpperCase()}`);
  if(Array.isArray(body.rows))return body.rows;
  if(Array.isArray(body.data?.rows))return body.data.rows;
  throw new Error("R27_DOLTHUB_ROWS_MISSING");
}

export async function queryDoltHubRead(sql,{fetchImpl=globalThis.fetch,timeoutMs=20_000}={}){
  if(typeof fetchImpl!=="function")throw new Error("R27_FETCH_UNAVAILABLE");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetchImpl(DOLTHUB_SQL_URL,{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify({ref:DOLTHUB_REF,q:sql,limit:1000,timeout_ms:30_000}),signal:controller.signal,redirect:"error"});
    if(!response?.ok)throw new Error(`R27_DOLTHUB_HTTP_${response?.status??"UNKNOWN"}`);
    let body;try{body=await response.json();}catch{throw new Error("R27_DOLTHUB_JSON_INVALID");}
    return rowsFromResponse(body);
  }finally{clearTimeout(timer);}
}

export function buildBenchmarkQuery(){
  return `SELECT act_symbol, COUNT(*) AS sessions, SUM(CASE WHEN close IS NOT NULL AND close > 0 THEN 1 ELSE 0 END) AS close_sessions, SUM(CASE WHEN volume IS NOT NULL AND volume >= 0 THEN 1 ELSE 0 END) AS volume_sessions, MIN(date) AS first_date, MAX(date) AS last_date FROM ohlcv WHERE act_symbol IN (${BENCHMARKS.map(quoteSql).join(",")}) GROUP BY act_symbol ORDER BY act_symbol`;
}

export function buildTickerCoverageQuery(tickers){
  const safe=[...new Set((tickers??[]).map(normalizeTicker).filter(Boolean))].sort();
  if(!safe.length)throw new Error("R27_NO_PIT_TICKERS");
  if(safe.length>1000)throw new Error("R27_PIT_TICKER_LIMIT");
  return `SELECT act_symbol, COUNT(*) AS sessions, SUM(CASE WHEN close IS NOT NULL AND close > 0 THEN 1 ELSE 0 END) AS close_sessions, SUM(CASE WHEN volume IS NOT NULL AND volume >= 0 THEN 1 ELSE 0 END) AS volume_sessions, MIN(date) AS first_date, MAX(date) AS last_date FROM ohlcv WHERE act_symbol IN (${safe.map(quoteSql).join(",")}) GROUP BY act_symbol ORDER BY act_symbol`;
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
  const file=path.join(base,PIT_FILE);if(!fs.existsSync(file))throw new Error("R27_PIT_FILE_MISSING");
  return {file,history:parsePitSectorHistoryCsv(fs.readFileSync(file,"utf8"))};
}

function render(report){
  const lines=["ZGMINI SECTOR FEAR & GREED R2.7 DOLTHUB SHADOW DIAGNOSTIC",`generatedAt=${report.generatedAt}`,`status=${report.status}`,`providerCalls=${report.providerCalls}/${MAX_PROVIDER_CALLS}`,`publicMutation=${report.publicMutation} dbSchemaChanged=${report.dbSchemaChanged} productionFormulaChanged=${report.productionFormulaChanged} schedulerChanged=${report.schedulerChanged}`,`directLicenseDetected=${report.license.directLicenseDetected}`,`commercialProductionEligible=${report.commercialProductionEligible}`,`upstreamProvenanceVerified=${report.upstreamProvenanceVerified}`,`readmeSignals=${JSON.stringify(report.license.readmeSignals)}`,`licenseSignals=${JSON.stringify(report.license.licenseSignals)}`,"","BENCHMARK | SESSIONS | CLOSE | VOLUME | FIRST | LAST"];
  for(const ticker of BENCHMARKS){const row=report.benchmarks[ticker]??{sessions:0,closeSessions:0,volumeSessions:0,firstDate:null,lastDate:null};lines.push(`${ticker} | ${row.sessions??0} | ${row.closeSessions??0} | ${row.volumeSessions??0} | ${row.firstDate??"NA"} | ${row.lastDate??"NA"}`);}
  lines.push("","SECTOR | PIT_TICKERS | FOUND | FOUND_RATIO | CLOSE_MEDIAN | CLOSE_P10 | VOL_MEDIAN | VOL_P10 | B1007 | D775 | S834 | TR881 | V818");
  for(const [sectorId,row] of Object.entries(report.pitCoverage).sort(([a],[b])=>a.localeCompare(b)))lines.push(`${sectorId} | ${row.historicalTickers} | ${row.foundTickers} | ${row.foundRatio??"NA"} | ${row.closeMedian??"NA"} | ${row.closeP10??"NA"} | ${row.volumeMedian??"NA"} | ${row.volumeP10??"NA"} | ${row.tickersMeetingBreadth1007} | ${row.tickersMeetingDemand775} | ${row.tickersMeetingSpeculative834} | ${row.tickersMeetingTrendRelative881} | ${row.tickersMeetingVolatility818}`);
  lines.push("","note=SCREENING_ONLY_SESSION_COUNTS_DO_NOT_PROVE_EXACT_PIT_DATE_COVERAGE","note=NO_PRODUCTION_D1_SCHEMA_SCHEDULER_OR_FORMULA_CHANGE","note=COMMERCIAL_PRODUCTION_REMAINS_FALSE_UNTIL_DIRECT_LICENSE_AND_UPSTREAM_PROVENANCE_RIGHTS_ARE_BOTH_VERIFIED");
  return lines.join("\n")+"\n";
}

export async function runSectorFearGreedR27DoltHubDiagnostic(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{fetchImpl=globalThis.fetch,now=new Date()}={}){
  const pit=loadPit(base),pitTickers=Object.keys(pit.history.byTicker??{});
  let providerCalls=0;
  const call=async sql=>{if(providerCalls>=MAX_PROVIDER_CALLS)throw new Error("R27_PROVIDER_CALL_LIMIT");providerCalls++;return queryDoltHubRead(sql,{fetchImpl});};
  const docsRows=await call("SELECT doc_name, doc_text FROM dolt_docs WHERE doc_name IN ('README.md','LICENSE.md') ORDER BY doc_name");
  const schemaRows=await call("SHOW CREATE TABLE ohlcv");
  const benchmarkRows=await call(buildBenchmarkQuery());
  const tickerRows=await call(buildTickerCoverageQuery(pitTickers));
  const docs=Object.fromEntries(docsRows.map(row=>[String(row.doc_name??row.DOC_NAME??""),String(row.doc_text??row.DOC_TEXT??"")]));
  const readmeSignals=safeDocSignal(docs["README.md"]),licenseSignals=safeDocSignal(docs["LICENSE.md"]),directLicenseDetected=licenseSignals.ccBySa4||licenseSignals.cc0;
  const benchmarkMap=normalizeCoverageRows(benchmarkRows),benchmarks={};for(const ticker of BENCHMARKS)benchmarks[ticker]=benchmarkMap.get(ticker)??{ticker,sessions:0,closeSessions:0,volumeSessions:0,firstDate:null,lastDate:null};
  const report={version:"R2.7-DOLTHUB-SHADOW-DIAGNOSTIC",generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),status:"SHADOW_R27_DOLTHUB_DIAGNOSTIC_COMPLETE",mode:"SHADOW_ONLY",source:"post-no-preference/stocks",sourcePage:"https://www.dolthub.com/repositories/post-no-preference/stocks",providerCalls,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,commercialProductionEligible:false,upstreamProvenanceVerified:false,pitFile:pit.file,targets:{...TARGETS},license:{directLicenseDetected,readmeSignals,licenseSignals,docsPresent:Object.keys(docs).sort()},schemaEvidenceRows:schemaRows.length,benchmarks,pitCoverage:summarizePitTickerCoverage(pit.history,tickerRows)};
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,render(report));return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runSectorFearGreedR27DoltHubDiagnostic().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{const code=/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):"R27_DOLTHUB_DIAGNOSTIC_FAILED";console.log(JSON.stringify({status:"FAILED",code,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false}));process.exitCode=1;});
}
