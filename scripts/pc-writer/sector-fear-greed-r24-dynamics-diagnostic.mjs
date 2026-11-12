import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {gunzipSync} from "node:zlib";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {buildSectorSpeculativeCandidateR24} from "../../lib/market-score/sector-fear-greed-r24-speculative-shadow.mjs";
import {summarizeR24Dynamics} from "../../lib/market-score/sector-fear-greed-r24-dynamics.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const PRICE_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const R6_HISTORY_NAME="local-breadth-r6-shadow-history.json";
const R7_HISTORY_NAME="local-breadth-r7-pit-price-history.json";
const OUTPUT_JSON="local-sector-fear-greed-r24-dynamics-diagnostic.json";
const OUTPUT_TXT="local-sector-fear-greed-r24-dynamics-diagnostic.txt";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));
const round=value=>finite(value)?Math.round(value*10000)/10000:null;
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function decodeBody(value){const text=String(value??"");try{return JSON.parse(text.startsWith("gzip:")?gunzipSync(Buffer.from(text.slice(5),"base64")).toString():text);}catch{return null;}}
function putRow(map,row,source,diagnostics){const tradeDate=String(row?.tradeDate??row?.trade_date??row?.date??""),ticker=String(row?.ticker??"").trim(),currentClose=Number(row?.currentClose??row?.current_close??row?.close),currentVolume=Number(row?.currentVolume??row?.current_volume??row?.volume);if(!validDate(tradeDate)||!ticker||!finite(currentClose)||currentClose<=0||!finite(currentVolume)||currentVolume<0)return;const key=`${tradeDate}|${ticker}`,old=map.get(key);if(old&&(old.currentClose!==currentClose||old.currentVolume!==currentVolume)){diagnostics.conflicts++;const transition=`${old.source}->${source}`;diagnostics.overrides[transition]=(diagnostics.overrides[transition]??0)+1;}map.set(key,{tradeDate,ticker,currentClose,currentVolume,source});}
function tableExists(db,name){return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").get(name));}
function readStorage(base){const map=new Map(),diagnostics={conflicts:0,overrides:{}};for(const [name,source] of [[R7_HISTORY_NAME,"BREADTH_R7_LOCAL"],[R6_HISTORY_NAME,"BREADTH_R6_LOCAL"]]){const payload=safeJson(path.join(base,name));for(const row of payload?.rows??[])putRow(map,row,source,diagnostics);}const dbFile=path.join(base,"storage","core.sqlite");if(fs.existsSync(dbFile)){const db=new DatabaseSync(dbFile,{readOnly:true});db.exec("PRAGMA query_only=ON");try{if(tableExists(db,"market_score_breadth_b1_r3_current_v1")){for(const row of db.prepare("SELECT trade_date,ticker,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 ORDER BY trade_date,ticker").all())putRow(map,row,"B1_R3_STORED",diagnostics);}}finally{db.close();}}return {rows:[...map.values()],diagnostics};}
function normalizePriceRows(rows=[]){const map=new Map();for(const row of Array.isArray(rows)?rows:[]){const date=String(row?.date??row?.tradeDate??"").slice(0,10),close=Number(row?.close??row?.currentClose);if(validDate(date)&&finite(close)&&close>0)map.set(date,{date,close});}return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));}
function roundedSummary(summary){return Object.fromEntries(Object.entries(summary).map(([key,value])=>[key,finite(value)?round(value):value]));}
function minFinite(values){const clean=values.filter(finite);return clean.length?Math.min(...clean):null;}
function maxFinite(values){const clean=values.filter(finite);return clean.length?Math.max(...clean):null;}

export function runSectorFearGreedR24DynamicsDiagnostic(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const pitPath=path.join(base,PIT_FILE),pricePath=path.join(base,PRICE_FILE);if(!fs.existsSync(pitPath))throw new Error("R24_DYNAMICS_PIT_HISTORY_MISSING");if(!fs.existsSync(pricePath))throw new Error("R24_DYNAMICS_IEX_PRICE_HISTORY_MISSING");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8")),storage=readStorage(base),pricePayload=safeJson(pricePath),series=pricePayload?.series??{},spyRows=normalizePriceRows(series.SPY??[]),sectors={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const etfRows=normalizePriceRows(series[ticker]??[]),candidate=buildSectorSpeculativeCandidateR24({rows:storage.rows,spyRows,etfRows,pitHistory:pit,sectorId}),dynamics=roundedSummary(summarizeR24Dynamics(candidate.history));
    sectors[sectorId]={ticker,status:candidate.status,currentScore:round(candidate.score),dynamics};
  }
  const list=Object.values(sectors),generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.4-DYNAMICS",generatedAt,status:"SHADOW_R24_DYNAMICS_COMPLETE",mode:"R2_4_DISTRIBUTION_DYNAMICS_RESEARCH_ONLY",providerCalls:0,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,constituentRows:storage.rows.length,spyRows:spyRows.length,storedMergeDiagnostics:storage.diagnostics,sectors,summary:{sectors:list.length,currentReady:list.filter(item=>item.status==="READY_CROSS_SECTION").length,minHistory:round(minFinite(list.map(item=>item.dynamics.n))),minP95P05Span:round(minFinite(list.map(item=>item.dynamics.p95p05Span))),maxNeutralShare:round(maxFinite(list.map(item=>item.dynamics.neutralShare))),minUniqueScoreCount:round(minFinite(list.map(item=>item.dynamics.uniqueScoreCount))),maxAbsLag1:round(maxFinite(list.map(item=>finite(item.dynamics.lag1Correlation)?Math.abs(item.dynamics.lag1Correlation):null))),minMembers:round(minFinite(list.map(item=>item.dynamics.minMembers))),minQuartileSize:round(minFinite(list.map(item=>item.dynamics.minQuartileSize)))}};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.4 DYNAMICS DIAGNOSTIC",`generatedAt=${generatedAt}`,`status=${report.status}`,"candidate=50% NORMALIZED_LOTTERY_SUPERIORITY + 50% NORMALIZED_VOLUME_SUPERIORITY","purpose=DESCRIPTIVE_RANGE_BAND_OCCUPANCY_STICKINESS_ONLY","noProductionGate=true",`constituentRows=${report.constituentRows} spyRows=${report.spyRows} storedConflicts=${storage.diagnostics.conflicts}`,"","SECTOR | ETF | N | CURRENT | MIN | P05 | P25 | MEDIAN | P75 | P95 | MAX | STD | P95_P05 | XF_SHARE | F_SHARE | N_SHARE | G_SHARE | XG_SHARE | UNIQUE | LAG1 | MEAN_ABS_D1 | P95_ABS_D1 | MIN_MEMBERS | MEDIAN_MEMBERS | MIN_Q | MEDIAN_Q"];
  for(const [sectorId,item] of Object.entries(sectors)){const d=item.dynamics;lines.push(`${sectorId} | ${item.ticker} | ${d.n} | ${item.currentScore??"NA"} | ${d.min??"NA"} | ${d.p05??"NA"} | ${d.p25??"NA"} | ${d.median??"NA"} | ${d.p75??"NA"} | ${d.p95??"NA"} | ${d.max??"NA"} | ${d.std??"NA"} | ${d.p95p05Span??"NA"} | ${d.extremeFearShare??"NA"} | ${d.fearShare??"NA"} | ${d.neutralShare??"NA"} | ${d.greedShare??"NA"} | ${d.extremeGreedShare??"NA"} | ${d.uniqueScoreCount??"NA"} | ${d.lag1Correlation??"NA"} | ${d.meanAbsSequentialChange??"NA"} | ${d.p95AbsSequentialChange??"NA"} | ${d.minMembers??"NA"} | ${d.medianMembers??"NA"} | ${d.minQuartileSize??"NA"} | ${d.medianQuartileSize??"NA"}`);}
  lines.push("",`summary sectors=${report.summary.sectors} currentReady=${report.summary.currentReady} minHistory=${report.summary.minHistory??"NA"} minP95P05Span=${report.summary.minP95P05Span??"NA"} maxNeutralShare=${report.summary.maxNeutralShare??"NA"} minUniqueScoreCount=${report.summary.minUniqueScoreCount??"NA"} maxAbsLag1=${report.summary.maxAbsLag1??"NA"} minMembers=${report.summary.minMembers??"NA"} minQuartileSize=${report.summary.minQuartileSize??"NA"}`,"providerCalls=0 rawRowsStored=false publicMutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false","note=DYNAMICS_ONLY_NO_FORMULA_APPROVAL_NO_PRODUCTION_CHANGE");
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,lines.join("\n")+"\n");return {status:report.status,jsonFile,txtFile,providerCalls:0,publicMutation:false,productionFormulaChanged:false,summary:report.summary};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(runSectorFearGreedR24DynamicsDiagnostic(),null,2));}catch(error){const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"R24_DYNAMICS_DIAGNOSTIC_FAILED";console.log(JSON.stringify({status:"FAILED",code,providerCalls:0,publicMutation:false,productionFormulaChanged:false}));process.exitCode=1;}}
