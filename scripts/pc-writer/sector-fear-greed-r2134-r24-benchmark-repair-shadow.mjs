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
const IEX_PRICE_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INVENTORY_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const R6_HISTORY_NAME="local-breadth-r6-shadow-history.json";
const R7_HISTORY_NAME="local-breadth-r7-pit-price-history.json";
const OUTPUT_JSON="local-sector-fear-greed-r2134-r24-benchmark-repair-shadow.json";
const OUTPUT_TXT="local-sector-fear-greed-r2134-r24-benchmark-repair-shadow.txt";
const TARGET_DATE="2026-08-27";
const CUTOFF="2026-08-26";
const TARGET_TICKERS=Object.freeze(["SPY",...Object.values(SECTOR_FEAR_GREED_R1_ETFS)]);

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const round=value=>finite(value)?Math.round(value*10000)/10000:null;
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function safeArray(file){const value=safeJson(file);return Array.isArray(value)?value:[];}
function listStoredFiles(dir){const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(name=>/^group-\d+\.json$/.test(name)).map(name=>path.join(dir,name)):[];const incrementalDir=path.join(dir,"incremental");const incremental=fs.existsSync(incrementalDir)?fs.readdirSync(incrementalDir).filter(name=>!/^\./.test(name)).map(name=>path.join(incrementalDir,name)).filter(file=>fs.statSync(file).isFile()):[];return {base,incremental,all:[...base,...incremental]};}
function readStoredReferenceRows(base){const rows=[];for(const name of [R7_HISTORY_NAME,R6_HISTORY_NAME]){const payload=safeJson(path.join(base,name));for(const row of payload?.rows??[])rows.push(row);}return rows;}
function normalizePriceRows(rows=[]){const map=new Map();for(const row of Array.isArray(rows)?rows:[]){const date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10),close=Number(row?.close??row?.currentClose??row?.current_close);if(validDate(date)&&finite(close)&&close>0)map.set(date,{date,close});}return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));}

export function summarizeR2134Overlap(left=[],right=[]){const pairs=alignSeries(left,right);if(!pairs.length)return {n:0,mae:null,meanDelta:null,maxAbsDelta:null,pearson:null,spearman:null,firstDate:null,lastDate:null};const deltas=pairs.map(row=>row.right-row.left),abs=deltas.map(Math.abs);return {n:pairs.length,mae:round(mean(abs)),meanDelta:round(mean(deltas)),maxAbsDelta:round(Math.max(...abs)),pearson:round(correlation(left,right,{method:"pearson"})),spearman:round(correlation(left,right,{method:"spearman"})),firstDate:pairs[0].date,lastDate:pairs.at(-1).date};}

function validateInventory(inventory){
  if(!inventory||inventory.status!=="SHADOW_R2133_LOCAL_BENCHMARK_INVENTORY_COMPLETE")throw new Error("R2134_R2133_INVENTORY_MISSING_OR_INVALID");
  if(inventory.targetDate!==TARGET_DATE)throw new Error("R2134_R2133_TARGET_DATE_MISMATCH");
  if(inventory.summary?.complete!==true||Number(inventory.summary?.conflicts??-1)!==0)throw new Error("R2134_R2133_INVENTORY_INCOMPLETE_OR_CONFLICTED");
  const selected=inventory.selection?.selected??{};
  for(const ticker of TARGET_TICKERS){const hit=selected[ticker];if(!hit||hit.ticker!==ticker||hit.date!==TARGET_DATE||hit.marketParquetEvidence!==true||!finite(Number(hit.close))||Number(hit.close)<=0)throw new Error(`R2134_R2133_ROW_INVALID:${ticker}`);}
  return selected;
}

export function buildR2134RepairedBenchmarks(series={},inventory={}){
  const selected=validateInventory(inventory),repaired={},injected=[],alreadyPresent=[];
  for(const ticker of TARGET_TICKERS){
    const rows=normalizePriceRows(series?.[ticker]??[]),hit=selected[ticker],existing=rows.find(row=>row.date===TARGET_DATE),close=Number(hit.close);
    if(existing&&Math.abs(existing.close-close)>1e-9)throw new Error(`R2134_EXISTING_BENCHMARK_CONFLICT:${ticker}`);
    if(existing)alreadyPresent.push(ticker);else{rows.push({date:TARGET_DATE,close});rows.sort((a,b)=>a.date.localeCompare(b.date));injected.push(ticker);}
    repaired[ticker]=rows;
  }
  return {series:repaired,injected,alreadyPresent,targetDate:TARGET_DATE,complete:TARGET_TICKERS.every(ticker=>Array.isArray(repaired[ticker])&&repaired[ticker].some(row=>row.date===TARGET_DATE))};
}

export function runSectorFearGreedR2134R24BenchmarkRepair(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const alpacaDir=path.join(base,ALPACA_DIR),pitPath=path.join(base,PIT_FILE),iexPath=path.join(base,IEX_PRICE_FILE),inventoryPath=path.join(base,INVENTORY_FILE);
  if(!fs.existsSync(alpacaDir))throw new Error("R2134_ALPACA_LOCAL_STORE_MISSING");
  if(!fs.existsSync(pitPath))throw new Error("R2134_PIT_HISTORY_MISSING");
  if(!fs.existsSync(iexPath))throw new Error("R2134_IEX_PRICE_HISTORY_MISSING");
  if(!fs.existsSync(inventoryPath))throw new Error("R2134_R2133_INVENTORY_MISSING");
  const files=listStoredFiles(alpacaDir);if(!files.base.length)throw new Error("R2134_ALPACA_BASE_GROUPS_MISSING");
  const merged=mergeAlpacaRows(files.all.map(safeArray)),alpacaRows=merged.rows,pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8")),iex=safeJson(iexPath),originalSeries=iex?.series??{},inventory=safeJson(inventoryPath),repair=buildR2134RepairedBenchmarks(originalSeries,inventory),referenceRows=readStoredReferenceRows(base),sectors={};
  const repairedSpy=repair.series.SPY,benchmarkLast=repairedSpy.at(-1)?.date??null;
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const originalSpy=normalizePriceRows(originalSeries.SPY??[]),originalEtf=normalizePriceRows(originalSeries[ticker]??[]),repairedEtf=repair.series[ticker];
    const legacy=buildSectorSpeculativeCandidateR24({rows:referenceRows,spyRows:originalSpy,etfRows:originalEtf,pitHistory:pit,sectorId});
    const before=buildSectorSpeculativeCandidateR24({rows:alpacaRows,spyRows:originalSpy,etfRows:originalEtf,pitHistory:pit,sectorId});
    const after=buildSectorSpeculativeCandidateR24({rows:alpacaRows,spyRows:repairedSpy,etfRows:repairedEtf,pitHistory:pit,sectorId});
    const beforeAfterOverlap=summarizeR2134Overlap(before.history,after.history),legacyOverlap=summarizeR2134Overlap(legacy.history,after.history),afterLast=after.history.at(-1)?.date??null,etfLast=repairedEtf.at(-1)?.date??null;
    sectors[sectorId]={ticker,legacy:{status:legacy.status,n:legacy.history.length,firstDate:legacy.history[0]?.date??null,lastDate:legacy.history.at(-1)?.date??null,current:round(legacy.score)},beforeRepair:{status:before.status,n:before.history.length,firstDate:before.history[0]?.date??null,lastDate:before.history.at(-1)?.date??null,current:round(before.score)},afterRepair:{status:after.status,n:after.history.length,firstDate:after.history[0]?.date??null,lastDate:afterLast,current:round(after.score),postGapN:after.history.filter(row=>row.date>CUTOFF).length},beforeAfterOverlap,legacyOverlap,benchmarkLast,etfLast,currentAligned:Boolean(afterLast&&benchmarkLast&&etfLast&&afterLast===benchmarkLast&&afterLast===etfLast)};
  }
  const list=Object.values(sectors),repairMaes=list.map(x=>x.beforeAfterOverlap.mae).filter(finite),repairSpearmans=list.map(x=>x.beforeAfterOverlap.spearman).filter(finite),legacySpearmans=list.map(x=>x.legacyOverlap.spearman).filter(finite),generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const report={version:"R2.13.4-R24-BENCHMARK-REPAIR-SHADOW",generatedAt,status:"SHADOW_R2134_R24_BENCHMARK_REPAIR_COMPLETE",mode:"IN_MEMORY_MARKETPARQUET_VERIFIED_SINGLE_DATE_REPAIR",providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,fillForwardFill:false,sourceFilesMutated:false,r24ApprovedForProduction:false,candidateSelected:false,targetDate:TARGET_DATE,cutoff:CUTOFF,alpacaStore:{baseFiles:files.base.length,incrementalFiles:files.incremental.length,rows:alpacaRows.length,conflicts:merged.conflicts.length,firstDate:alpacaRows[0]?.date??null,lastDate:alpacaRows.at(-1)?.date??null},repair:{inventoryStatus:inventory?.status??null,inventoryComplete:inventory?.summary?.complete===true,inventoryConflicts:Number(inventory?.summary?.conflicts??-1),injected:repair.injected,alreadyPresent:repair.alreadyPresent,complete:repair.complete},summary:{sectors:list.length,repairedReady:list.filter(x=>x.afterRepair.status==="READY_CROSS_SECTION").length,currentAligned:list.filter(x=>x.currentAligned).length,sectorsWithPostGapHistory:list.filter(x=>x.afterRepair.postGapN>0).length,minPostGapN:Math.min(...list.map(x=>x.afterRepair.postGapN)),maxRepairOverlapMae:round(repairMaes.length?Math.max(...repairMaes):null),minRepairOverlapSpearman:round(repairSpearmans.length?Math.min(...repairSpearmans):null),minLegacyOverlapSpearman:round(legacySpearmans.length?Math.min(...legacySpearmans):null),calendarGapResolved:list.every(x=>x.currentAligned&&x.afterRepair.postGapN>0)},sectors};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.4 R2.4 BENCHMARK REPAIR SHADOW",`generatedAt=${generatedAt}`,`status=${report.status}`,"mode=IN_MEMORY_MARKETPARQUET_VERIFIED_SINGLE_DATE_REPAIR","providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false","productionFormulaChanged=false dbSchemaChanged=false schedulerChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)","fillForwardFill=false sourceFilesMutated=false candidateSelected=false r24ApprovedForProduction=false",`targetDate=${TARGET_DATE} cutoff=${CUTOFF}`,`repair complete=${report.repair.complete} injected=${report.repair.injected.length} alreadyPresent=${report.repair.alreadyPresent.length} inventoryConflicts=${report.repair.inventoryConflicts}`,`alpaca rows=${report.alpacaStore.rows} dates=${report.alpacaStore.firstDate}..${report.alpacaStore.lastDate} conflicts=${report.alpacaStore.conflicts}`,`summary sectors=${report.summary.sectors} repairedReady=${report.summary.repairedReady} currentAligned=${report.summary.currentAligned} sectorsWithPostGapHistory=${report.summary.sectorsWithPostGapHistory} minPostGapN=${report.summary.minPostGapN} maxRepairOverlapMae=${report.summary.maxRepairOverlapMae??"NA"} minRepairOverlapSpearman=${report.summary.minRepairOverlapSpearman??"NA"} minLegacyOverlapSpearman=${report.summary.minLegacyOverlapSpearman??"NA"} calendarGapResolved=${report.summary.calendarGapResolved}`,"","SECTOR | ETF | BEFORE_N | BEFORE_LAST | AFTER_N | AFTER_LAST | POST_GAP_N | BEFORE_CURRENT | AFTER_CURRENT | REPAIR_OVERLAP_N | REPAIR_MAE | REPAIR_SPEARMAN | LEGACY_OVERLAP_N | LEGACY_SPEARMAN | CURRENT_ALIGNED"];
  for(const [sectorId,item] of Object.entries(sectors))lines.push(`${sectorId} | ${item.ticker} | ${item.beforeRepair.n} | ${item.beforeRepair.lastDate??"NA"} | ${item.afterRepair.n} | ${item.afterRepair.lastDate??"NA"} | ${item.afterRepair.postGapN} | ${item.beforeRepair.current??"NA"} | ${item.afterRepair.current??"NA"} | ${item.beforeAfterOverlap.n} | ${item.beforeAfterOverlap.mae??"NA"} | ${item.beforeAfterOverlap.spearman??"NA"} | ${item.legacyOverlap.n} | ${item.legacyOverlap.spearman??"NA"} | ${item.currentAligned?"YES":"NO"}`);
  lines.push("","note=THE_2026_08_27_ROW_IS_INJECTED_IN_MEMORY_ONLY_FROM_R2133_MARKETPARQUET_VERIFIED_EVIDENCE","note=NO_SOURCE_FILE_IS_EDITED_AND_NO_FILL_OR_FORWARD_FILL_IS_USED","note=CALENDAR_REPAIR_DOES_NOT_APPROVE_R24; LEGACY_VS_ALPACA_QUALITY_REMAINS_A_SEPARATE_DECISION");
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,lines.join("\n")+"\n");return {status:report.status,jsonFile,txtFile,providerCalls:0,publicMutation:false,productionFormulaChanged:false,summary:report.summary};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(runSectorFearGreedR2134R24BenchmarkRepair(),null,2));}catch(error){const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"R2134_R24_BENCHMARK_REPAIR_FAILED";console.log(JSON.stringify({status:"FAILED",code,providerCalls:0,publicMutation:false,productionFormulaChanged:false}));process.exitCode=1;}}
