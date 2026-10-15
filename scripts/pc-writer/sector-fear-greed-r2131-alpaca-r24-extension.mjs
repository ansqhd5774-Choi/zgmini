import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {buildSectorSpeculativeCandidateR24} from "../../lib/market-score/sector-fear-greed-r24-speculative-shadow.mjs";
import {alignSeries,correlation} from "../../lib/market-score/sector-fear-greed-r28-reference-window.mjs";
import {mergeAlpacaRows} from "./sector-fear-greed-r25-alpaca-reuse-diagnostic.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const ALPACA_DIR="asset-r10-alpaca";
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const PRICE_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const R6_HISTORY_NAME="local-breadth-r6-shadow-history.json";
const R7_HISTORY_NAME="local-breadth-r7-pit-price-history.json";
const OUTPUT_JSON="local-sector-fear-greed-r2131-alpaca-r24-extension.json";
const OUTPUT_TXT="local-sector-fear-greed-r2131-alpaca-r24-extension.txt";

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const round=value=>finite(value)?Math.round(value*10000)/10000:null;
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function safeArray(file){const value=safeJson(file);return Array.isArray(value)?value:[];}
function listStoredFiles(dir){
  const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(name=>/^group-\d+\.json$/.test(name)).map(name=>path.join(dir,name)):[];
  const incrementalDir=path.join(dir,"incremental");
  const incremental=fs.existsSync(incrementalDir)?fs.readdirSync(incrementalDir).filter(name=>!/^\./.test(name)).map(name=>path.join(incrementalDir,name)).filter(file=>fs.statSync(file).isFile()):[];
  return {base,incremental,all:[...base,...incremental]};
}
function readStoredReferenceRows(base){
  const rows=[];
  for(const name of [R7_HISTORY_NAME,R6_HISTORY_NAME]){const payload=safeJson(path.join(base,name));for(const row of payload?.rows??[])rows.push(row);}
  return rows;
}
function normalizePriceRows(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){const date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10),close=Number(row?.close??row?.currentClose??row?.current_close);if(validDate(date)&&finite(close)&&close>0)map.set(date,{date,close});}
  return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function summarizeR2131Overlap(reference=[],candidate=[]){
  const pairs=alignSeries(reference,candidate);if(!pairs.length)return {n:0,mae:null,meanDelta:null,maxAbsDelta:null,pearson:null,spearman:null,firstDate:null,lastDate:null};
  const deltas=pairs.map(row=>row.right-row.left),abs=deltas.map(Math.abs);
  return {n:pairs.length,mae:round(mean(abs)),meanDelta:round(mean(deltas)),maxAbsDelta:round(Math.max(...abs)),pearson:round(correlation(reference,candidate,{method:"pearson"})),spearman:round(correlation(reference,candidate,{method:"spearman"})),firstDate:pairs[0].date,lastDate:pairs.at(-1).date};
}
function tickerCoverage(rows=[]){
  const map=new Map();for(const row of rows){const ticker=String(row?.ticker??"").trim(),date=String(row?.date??row?.tradeDate??"").slice(0,10);if(!ticker||!validDate(date))continue;const item=map.get(ticker)??{dates:new Set()};item.dates.add(date);map.set(ticker,item);}
  const out={};for(const [ticker,item] of map){const dates=[...item.dates].sort();out[ticker]={sessions:dates.length,firstDate:dates[0]??null,lastDate:dates.at(-1)??null};}return out;
}

export function runSectorFearGreedR2131AlpacaR24Extension(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const dir=path.join(base,ALPACA_DIR),pitPath=path.join(base,PIT_FILE),pricePath=path.join(base,PRICE_FILE);
  if(!fs.existsSync(dir))throw new Error("R2131_ALPACA_LOCAL_STORE_MISSING");
  if(!fs.existsSync(pitPath))throw new Error("R2131_PIT_HISTORY_MISSING");
  if(!fs.existsSync(pricePath))throw new Error("R2131_IEX_PRICE_HISTORY_MISSING");
  const files=listStoredFiles(dir);if(!files.base.length)throw new Error("R2131_ALPACA_BASE_GROUPS_MISSING");
  const merged=mergeAlpacaRows(files.all.map(safeArray)),alpacaRows=merged.rows,pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8")),pricePayload=safeJson(pricePath),series=pricePayload?.series??{},spyRows=normalizePriceRows(series.SPY??[]),referenceRows=readStoredReferenceRows(base),coverage=tickerCoverage(alpacaRows),sectors={};
  const benchmarkLast=spyRows.at(-1)?.date??null;
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const etfRows=normalizePriceRows(series[ticker]??[]),original=buildSectorSpeculativeCandidateR24({rows:referenceRows,spyRows,etfRows,pitHistory:pit,sectorId}),alpaca=buildSectorSpeculativeCandidateR24({rows:alpacaRows,spyRows,etfRows,pitHistory:pit,sectorId}),overlap=summarizeR2131Overlap(original.history,alpaca.history),alpacaLast=alpaca.history.at(-1)?.date??null,etfLast=etfRows.at(-1)?.date??null;
    sectors[sectorId]={ticker,original:{status:original.status,n:original.history.length,firstDate:original.history[0]?.date??null,lastDate:original.history.at(-1)?.date??null,current:round(original.score)},alpaca:{status:alpaca.status,n:alpaca.history.length,firstDate:alpaca.history[0]?.date??null,lastDate:alpacaLast,current:round(alpaca.score)},overlap,benchmarkLast,etfLast,currentAligned:Boolean(alpacaLast&&benchmarkLast&&etfLast&&alpacaLast===benchmarkLast&&alpacaLast===etfLast)};
  }
  const list=Object.values(sectors),overlapMaes=list.map(item=>item.overlap.mae).filter(finite),overlapSpearmans=list.map(item=>item.overlap.spearman).filter(finite),generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.13.1-ALPACA-R24-EXTENSION",generatedAt,status:"SHADOW_R2131_ALPACA_R24_EXTENSION_COMPLETE",mode:"EXISTING_LOCAL_ALPACA_REUSE_ONLY",providerCalls:0,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,r24ApprovedForProduction:false,alpacaApprovedForProduction:false,candidateSelected:false,benchmarkLast,alpacaStore:{baseFiles:files.base.length,incrementalFiles:files.incremental.length,rows:alpacaRows.length,tickers:Object.keys(coverage).length,conflicts:merged.conflicts.length,firstDate:alpacaRows[0]?.date??null,lastDate:alpacaRows.at(-1)?.date??null},summary:{sectors:list.length,alpacaReady:list.filter(item=>item.alpaca.status==="READY_CROSS_SECTION").length,currentAligned:list.filter(item=>item.currentAligned).length,minOverlapN:Math.min(...list.map(item=>item.overlap.n)),maxOverlapMae:round(overlapMaes.length?Math.max(...overlapMaes):null),minOverlapSpearman:round(overlapSpearmans.length?Math.min(...overlapSpearmans):null)},sectors};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.1 ALPACA R2.4 EXTENSION",`generatedAt=${generatedAt}`,`status=${report.status}`,"mode=EXISTING_LOCAL_ALPACA_REUSE_ONLY","providerCalls=0","r24ApprovedForProduction=false alpacaApprovedForProduction=false candidateSelected=false","approvedR1ReferenceRequirement=756 (UNCHANGED)",`alpaca rows=${report.alpacaStore.rows} tickers=${report.alpacaStore.tickers} dates=${report.alpacaStore.firstDate}..${report.alpacaStore.lastDate} conflicts=${report.alpacaStore.conflicts}`,`benchmarkLast=${benchmarkLast??"NA"}`,`summary sectors=${report.summary.sectors} alpacaReady=${report.summary.alpacaReady} currentAligned=${report.summary.currentAligned} minOverlapN=${report.summary.minOverlapN} maxOverlapMae=${report.summary.maxOverlapMae??"NA"} minOverlapSpearman=${report.summary.minOverlapSpearman??"NA"}`,"","SECTOR | ETF | ORIGINAL_N | ORIGINAL_DATES | ALPACA_N | ALPACA_DATES | ORIGINAL_CURRENT | ALPACA_CURRENT | OVERLAP_N | MAE | MAX_ABS | PEARSON | SPEARMAN | CURRENT_ALIGNED"];
  for(const [sectorId,item] of Object.entries(sectors))lines.push(`${sectorId} | ${item.ticker} | ${item.original.n} | ${item.original.firstDate??"NA"}..${item.original.lastDate??"NA"} | ${item.alpaca.n} | ${item.alpaca.firstDate??"NA"}..${item.alpaca.lastDate??"NA"} | ${item.original.current??"NA"} | ${item.alpaca.current??"NA"} | ${item.overlap.n} | ${item.overlap.mae??"NA"} | ${item.overlap.maxAbsDelta??"NA"} | ${item.overlap.pearson??"NA"} | ${item.overlap.spearman??"NA"} | ${item.currentAligned?"YES":"NO"}`);
  lines.push("","note=THIS_DIAGNOSTIC_ONLY_TESTS_LOCAL_ALPACA_AS_A_FRESH_R24_INPUT_SOURCE","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_OR_REFERENCE_CHANGE","note=PRODUCTION_USE_REQUIRES_SEPARATE_SOURCE_RIGHTS_AND_METHODOLOGY_APPROVAL");
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,lines.join("\n")+"\n");return {status:report.status,jsonFile,txtFile,providerCalls:0,publicMutation:false,productionFormulaChanged:false,summary:report.summary};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(runSectorFearGreedR2131AlpacaR24Extension(),null,2));}catch(error){const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"R2131_ALPACA_R24_EXTENSION_FAILED";console.log(JSON.stringify({status:"FAILED",code,providerCalls:0,publicMutation:false,productionFormulaChanged:false}));process.exitCode=1;}}
