import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const OUTPUT_JSON="local-sector-fear-greed-r272-dolthub-slice-probe.json";
const OUTPUT_TXT="local-sector-fear-greed-r272-dolthub-slice-probe.txt";
export const DOLTHUB_SQL_URL="https://www.dolthub.com/api/v2/databases/post-no-preference/stocks/sql";
export const DOLTHUB_REF="master";
export const BENCHMARKS=Object.freeze(["SPY","XLC","XLY","XLP","XLE","XLF","XLV","XLI","XLB","XLRE","XLK","XLU"]);
export const MAX_PROVIDER_CALLS=4;
export const SLICE_DAYS=31;
export const HISTORICAL_OFFSET_DAYS=1460;

const finite=v=>typeof v==="number"&&Number.isFinite(v);
const safeCode=v=>String(v??"").toUpperCase().replace(/[^A-Z0-9_]+/g,"_").replace(/^_+|_+$/g,"").slice(0,120)||"UNKNOWN";
const quoteSql=v=>`'${String(v).replace(/'/g,"''")}'`;
const normalizeTicker=v=>String(v??"").trim().toUpperCase();
const validIso=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v??""));
const addDays=(iso,days)=>{const d=new Date(`${iso}T00:00:00Z`);if(!Number.isFinite(d.getTime()))throw new Error("R272_INVALID_DATE");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};

function normalizeRows(body){
  if(!body||typeof body!=="object")throw new Error("R272_DOLTHUB_INVALID_RESPONSE");
  const data=body.data??body,status=String(data.status??body.status??"").toLowerCase();
  if(status&&status!=="success")throw new Error(`R272_DOLTHUB_SQL_${safeCode(status)}_${safeCode(data.message??body.message)}`);
  const rows=data.rows;if(!Array.isArray(rows))throw new Error("R272_DOLTHUB_ROWS_MISSING");
  if(!rows.length)return [];
  if(rows.every(r=>r&&typeof r==="object"&&!Array.isArray(r)))return rows;
  const columns=(data.columns??[]).map(c=>String(c?.name??""));if(!columns.filter(Boolean).length)throw new Error("R272_DOLTHUB_COLUMNS_MISSING");
  return rows.map(cells=>Object.fromEntries(columns.map((name,i)=>[name,cells?.[i]??null])));
}

export async function queryRead(sql,{fetchImpl=globalThis.fetch,clientTimeoutMs=65_000,serverTimeoutMs=60_000}={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),clientTimeoutMs);const started=Date.now();
  try{
    let response;try{response=await fetchImpl(DOLTHUB_SQL_URL,{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify({ref:DOLTHUB_REF,q:sql,limit:1000,timeout_ms:serverTimeoutMs}),signal:controller.signal,redirect:"error"});}catch(error){if(error?.name==="AbortError")throw new Error("R272_DOLTHUB_CLIENT_TIMEOUT");throw error;}
    if(!response?.ok)throw new Error(`R272_DOLTHUB_HTTP_${response?.status??"UNKNOWN"}`);
    let body;try{body=await response.json();}catch{throw new Error("R272_DOLTHUB_JSON_INVALID");}
    return {rows:normalizeRows(body),durationMs:Date.now()-started};
  }finally{clearTimeout(timer);}
}

export function buildSliceQuery(startDate,endDate,tickers){
  if(!validIso(startDate)||!validIso(endDate))throw new Error("R272_INVALID_SLICE_DATE");
  const safe=[...new Set((tickers??[]).map(normalizeTicker).filter(Boolean))].sort();
  if(!safe.length||safe.length>1000)throw new Error("R272_INVALID_TICKER_COUNT");
  return `SELECT act_symbol, COUNT(*) AS sessions, SUM(CASE WHEN close IS NOT NULL AND close > 0 THEN 1 ELSE 0 END) AS close_sessions, SUM(CASE WHEN volume IS NOT NULL AND volume >= 0 THEN 1 ELSE 0 END) AS volume_sessions, MIN(date) AS first_date, MAX(date) AS last_date FROM ohlcv WHERE date >= ${quoteSql(startDate)} AND date <= ${quoteSql(endDate)} AND act_symbol IN (${safe.map(quoteSql).join(",")}) GROUP BY act_symbol ORDER BY act_symbol`;
}

function loadPit(base){const file=path.join(base,PIT_FILE);if(!fs.existsSync(file))throw new Error("R272_PIT_FILE_MISSING");return {file,history:parsePitSectorHistoryCsv(fs.readFileSync(file,"utf8"))};}
function rowTicker(row){return normalizeTicker(row.act_symbol??row.ACT_SYMBOL);}
function summarize(rows,targetTickers){const found=new Set((rows??[]).map(rowTicker).filter(Boolean));const benchmarks=BENCHMARKS.filter(t=>found.has(t));return {rowCount:rows.length,targetTickers:targetTickers.length,foundTickers:found.size,foundRatio:targetTickers.length?Math.round(found.size/targetTickers.length*1e6)/1e6:null,benchmarkPresent:benchmarks.length,benchmarkTotal:BENCHMARKS.length,benchmarks};}
function render(r){return ["ZGMINI SECTOR FEAR & GREED R2.7.2 DOLTHUB DATE-SLICE PROBE",`generatedAt=${r.generatedAt}`,`status=${r.status}`,`providerCalls=${r.providerCalls}/${MAX_PROVIDER_CALLS}`,`publicMutation=${r.publicMutation} dbSchemaChanged=${r.dbSchemaChanged} productionFormulaChanged=${r.productionFormulaChanged} schedulerChanged=${r.schedulerChanged}`,`commercialProductionEligible=${r.commercialProductionEligible}`,`latestDate=${r.latestDate}`,`targetTickers=${r.targetTickers}`,`recent=${r.recent.start}..${r.recent.end} durationMs=${r.recent.durationMs} rows=${r.recent.summary.rowCount} found=${r.recent.summary.foundTickers}/${r.recent.summary.targetTickers} benchmarks=${r.recent.summary.benchmarkPresent}/${r.recent.summary.benchmarkTotal}`,`historical=${r.historical.start}..${r.historical.end} durationMs=${r.historical.durationMs} rows=${r.historical.summary.rowCount} found=${r.historical.summary.foundTickers}/${r.historical.summary.targetTickers} benchmarks=${r.historical.summary.benchmarkPresent}/${r.historical.summary.benchmarkTotal}`,"note=PROBE_ONLY_DATE_RANGE_USES_PRIMARY_KEY_LEADING_COLUMN_TO_AVOID_MULTIYEAR_FULL_SCAN","note=NO_PRODUCTION_D1_SCHEMA_SCHEDULER_OR_FORMULA_CHANGE","note=COMMERCIAL_PRODUCTION_REMAINS_FALSE_UNTIL_LICENSE_AND_UPSTREAM_PROVENANCE_ARE_VERIFIED"].join("\n")+"\n";}

export async function runR272(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{fetchImpl=globalThis.fetch,now=new Date()}={}){
  const pit=loadPit(base),pitTickers=Object.keys(pit.history.byTicker??{}).map(normalizeTicker).filter(Boolean),targetTickers=[...new Set([...pitTickers,...BENCHMARKS])].sort();
  if(targetTickers.length>1000)throw new Error("R272_TARGET_TICKERS_OVER_1000");
  let providerCalls=0,currentStep="INIT";const call=async(step,sql)=>{if(providerCalls>=MAX_PROVIDER_CALLS)throw new Error("R272_PROVIDER_CALL_LIMIT");providerCalls++;currentStep=step;try{return await queryRead(sql,{fetchImpl});}catch(error){throw new Error(`R272_STEP_${safeCode(step)}_${safeCode(error?.message??error?.name)}`);}};
  try{
    const latest=await call("LATEST_DATE","SELECT date FROM ohlcv ORDER BY date DESC LIMIT 1");
    const latestDate=String(latest.rows?.[0]?.date??"");if(!validIso(latestDate))throw new Error("R272_LATEST_DATE_MISSING");
    const recentEnd=latestDate,recentStart=addDays(recentEnd,-(SLICE_DAYS-1));
    const historicalEnd=addDays(latestDate,-HISTORICAL_OFFSET_DAYS),historicalStart=addDays(historicalEnd,-(SLICE_DAYS-1));
    const recent=await call("RECENT_SLICE",buildSliceQuery(recentStart,recentEnd,targetTickers));
    const historical=await call("HISTORICAL_SLICE",buildSliceQuery(historicalStart,historicalEnd,targetTickers));
    const report={version:"R2.7.2-DOLTHUB-DATE-SLICE-PROBE",generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),status:"SHADOW_R272_DOLTHUB_SLICE_PROBE_COMPLETE",mode:"SHADOW_ONLY",providerCalls,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,commercialProductionEligible:false,upstreamProvenanceVerified:false,pitFile:pit.file,targetTickers:targetTickers.length,latestDate,recent:{start:recentStart,end:recentEnd,durationMs:recent.durationMs,summary:summarize(recent.rows,targetTickers)},historical:{start:historicalStart,end:historicalEnd,durationMs:historical.durationMs,summary:summarize(historical.rows,targetTickers)}};
    fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,render(report));return {...report,jsonFile,txtFile};
  }catch(error){const failure={version:"R2.7.2-DOLTHUB-DATE-SLICE-PROBE",generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),status:"FAILED",code:safeCode(error?.message),step:currentStep,providerCalls,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,commercialProductionEligible:false,upstreamProvenanceVerified:false};fs.mkdirSync(base,{recursive:true});fs.writeFileSync(path.join(base,OUTPUT_JSON),JSON.stringify(failure,null,2)+"\n");fs.writeFileSync(path.join(base,OUTPUT_TXT),Object.entries(failure).map(([k,v])=>`${k}=${v}`).join("\n")+"\n");throw Object.assign(new Error(failure.code),{r272Failure:failure});}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){runR272().then(r=>console.log(JSON.stringify(r,null,2))).catch(error=>{const f=error?.r272Failure??{status:"FAILED",code:safeCode(error?.message),publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false};console.log(JSON.stringify(f));process.exitCode=1;});}
