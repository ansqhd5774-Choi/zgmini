import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv,buildPointInTimeSectorInputs} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {scoreRawAxis,correlation} from "../../lib/market-score/sector-fear-greed-r28-reference-window.mjs";
import {deriveR28RawAxes} from "./sector-fear-greed-r28-reference-window-diagnostic.mjs";
import {mergeCanonicalRowsR2135} from "./sector-fear-greed-r2135-r24-source-sensitivity.mjs";
import {mergeAlpacaRows} from "./sector-fear-greed-r25-alpaca-reuse-diagnostic.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const OUT="local-sector-fear-greed-r21330-alpaca-stock-contract-recheck";
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const R6_FILE="local-breadth-r6-shadow-history.json";
const R7_FILE="local-breadth-r7-pit-price-history.json";
const R21329_FILE="local-sector-fear-greed-r21329-five-axis-extension-feasibility.json";
const ALPACA_DIR="asset-r10-alpaca";
const WINDOW=252;
const BREADTH_SPEC=Object.freeze({metrics:[{key:"b50",weight:.35},{key:"b200",weight:.35},{key:"highLowNet",weight:.30}]});
const DEMAND_SPEC=Object.freeze({metrics:[{key:"vb5",weight:.60},{key:"vb20",weight:.40}]});
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
const safeJson=file=>{if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}};
const arr=file=>{const x=safeJson(file);return Array.isArray(x)?x:[];};
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function tableExists(db,name){return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").get(name));}
function listAlpacaFiles(dir){const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).sort().map(n=>path.join(dir,n)):[];const inc=path.join(dir,"incremental");const incremental=fs.existsSync(inc)?fs.readdirSync(inc).filter(n=>!n.startsWith(".")).sort().map(n=>path.join(inc,n)).filter(f=>fs.statSync(f).isFile()):[];return [...base,...incremental];}
function readCanonical(base){const rowSets=[];for(const [name,source] of [[R7_FILE,"BREADTH_R7_LOCAL"],[R6_FILE,"BREADTH_R6_LOCAL"]])rowSets.push({source,rows:safeJson(path.join(base,name))?.rows??[]});const dbRows=[],dbFile=path.join(base,"storage","core.sqlite");if(fs.existsSync(dbFile)){const db=new DatabaseSync(dbFile,{readOnly:true});db.exec("PRAGMA query_only=ON");try{if(tableExists(db,"market_score_breadth_b1_r3_current_v1"))for(const row of db.prepare("SELECT trade_date,ticker,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 ORDER BY trade_date,ticker").all())dbRows.push(row);}finally{db.close();}}return mergeCanonicalRowsR2135(rowSets,dbRows);}

export function adaptMergedAlpacaRowsForStoredInput(rows=[]){
  const out=[];
  for(const row of Array.isArray(rows)?rows:[]){
    const ticker=String(row?.ticker??"").trim(),tradeDate=String(row?.tradeDate??row?.trade_date??row?.date??"").slice(0,10),currentClose=Number(row?.currentClose??row?.current_close??row?.close),currentVolume=Number(row?.currentVolume??row?.current_volume??row?.volume);
    if(!ticker||!validDate(tradeDate)||!finite(currentClose)||currentClose<=0||!finite(currentVolume)||currentVolume<0)continue;
    out.push({tradeDate,ticker,currentClose,currentVolume});
  }
  return out.sort((a,b)=>a.tradeDate.localeCompare(b.tradeDate)||a.ticker.localeCompare(b.ticker));
}

function scoreBreadthDemand(rows,pit,sectorId){const derived=buildPointInTimeSectorInputs({rows,pitHistory:pit}),pitRows=derived.sectors[sectorId]??[],breadthRows=pitRows.filter(row=>[row?.b50,row?.b200,row?.highLowNet].every(finite)),demandRows=pitRows.filter(row=>finite(row?.volumeBreadth)),raw=deriveR28RawAxes({breadthRows,demandRows}),breadth=scoreRawAxis(raw.breadth,BREADTH_SPEC,WINDOW),demand=scoreRawAxis(raw.demand,DEMAND_SPEC,WINDOW);return {pitRows,breadthRaw:raw.breadth,breadth,demandRaw:raw.demand,demand};}
function compareSeries(a=[],b=[]){const bm=new Map(b.map(r=>[r.date,r.score])),pairs=a.filter(r=>bm.has(r.date)).map(r=>({date:r.date,a:r.score,b:bm.get(r.date)})),deltas=pairs.map(x=>Math.abs(x.a-x.b));return {n:pairs.length,first:pairs[0]?.date??null,last:pairs.at(-1)?.date??null,pearson:round(correlation(pairs.map(x=>({date:x.date,score:x.a})),pairs.map(x=>({date:x.date,score:x.b})),{method:"pearson"})),spearman:round(correlation(pairs.map(x=>({date:x.date,score:x.a})),pairs.map(x=>({date:x.date,score:x.b})),{method:"spearman"})),mae:round(deltas.length?deltas.reduce((s,x)=>s+x,0)/deltas.length:null),maxAbsDelta:round(deltas.length?Math.max(...deltas):null)};}
function coverageSummary(rows=[]){const v=rows.map(r=>Number(r?.coverage?.highLow52wRatio)).filter(finite);return {n:v.length,min:round(v.length?Math.min(...v):null),median:round(v.length?[...v].sort((a,b)=>a-b)[Math.floor((v.length-1)/2)]:null),current:round(v.at(-1))};}

export function runR21330(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const pitPath=path.join(base,PIT_FILE);if(!fs.existsSync(pitPath))throw new Error("R21330_PIT_MISSING");
  const prior=safeJson(path.join(base,R21329_FILE));if(prior?.status!=="SHADOW_R21329_FIVE_AXIS_EXTENSION_FEASIBILITY_COMPLETE")throw new Error("R21330_R21329_MISSING");
  const alpacaFiles=listAlpacaFiles(path.join(base,ALPACA_DIR));if(!alpacaFiles.length)throw new Error("R21330_ALPACA_LOCAL_STORE_MISSING");
  const merged=mergeAlpacaRows(alpacaFiles.map(arr));if(merged.conflicts.length)throw new Error("R21330_ALPACA_CONFLICT");
  const adapted=adaptMergedAlpacaRowsForStoredInput(merged.rows);if(adapted.length!==merged.rows.length)throw new Error("R21330_ALPACA_ADAPTER_ROW_LOSS");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8")),canonical=readCanonical(base),sectors={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const c=scoreBreadthDemand(canonical.rows,pit,sectorId),a=scoreBreadthDemand(adapted,pit,sectorId);
    sectors[sectorId]={ticker,canonical:{breadthScored:c.breadth.length,demandScored:c.demand.length},alpaca:{breadthRaw:a.breadthRaw.length,breadthScored:a.breadth.length,breadthFirst:a.breadth[0]?.date??null,breadthLast:a.breadth.at(-1)?.date??null,demandRaw:a.demandRaw.length,demandScored:a.demand.length,demandFirst:a.demand[0]?.date??null,demandLast:a.demand.at(-1)?.date??null,highLowCoverage:coverageSummary(a.pitRows.filter(row=>[row?.b50,row?.b200,row?.highLowNet].every(finite)))},overlap:{breadth:compareSeries(c.breadth,a.breadth),demand:compareSeries(c.demand,a.demand)},localBreadthReady252:a.breadth.length>=252,localDemandReady252:a.demand.length>=252};
  }
  const list=Object.values(sectors),breadthSpearman=list.map(x=>x.overlap.breadth.spearman).filter(finite),breadthMae=list.map(x=>x.overlap.breadth.mae).filter(finite),summary={sectors:list.length,adaptedRows:adapted.length,localBreadthReady252:list.filter(x=>x.localBreadthReady252).length,localDemandReady252:list.filter(x=>x.localDemandReady252).length,minAlpacaBreadthScored:Math.min(...list.map(x=>x.alpaca.breadthScored)),minAlpacaDemandScored:Math.min(...list.map(x=>x.alpaca.demandScored)),minBreadthOverlapSpearman:breadthSpearman.length?round(Math.min(...breadthSpearman)):null,maxBreadthOverlapMae:breadthMae.length?round(Math.max(...breadthMae)):null,benchmarkAdditionalSessionsRequired:Number(prior?.summary?.benchmarkAdditionalSessionsRequired??0),benchmarkTargetStart:prior?.summary?.benchmarkTargetStart??null,benchmarkTargetEnd:prior?.summary?.benchmarkTargetEnd??null,benchmarkTargetSessions:Number(prior?.summary?.benchmarkTargetSessions??0),estimatedBenchmarkProviderRequests:Number(prior?.summary?.estimatedBenchmarkProviderRequests??0),projectedAfterBenchmark:prior?.summary?.projectedAfterBenchmark??null};
  summary.projectedComposite252Possible=summary.localBreadthReady252===11&&summary.localDemandReady252===11&&summary.benchmarkTargetSessions===89&&summary.estimatedBenchmarkProviderRequests===1;
  const next=summary.projectedComposite252Possible?"REQUEST_APPROVAL_FOR_ONE_11_SECTOR_ETF_ALPACA_BACKFILL":"INVESTIGATE_STOCK_COVERAGE_AFTER_CONTRACT_FIX";
  const report={version:"R2.13.30-ALPACA-STOCK-CONTRACT-RECHECK",generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),status:"SHADOW_R21330_ALPACA_STOCK_CONTRACT_RECHECK_COMPLETE",rootCause:"R21329_PASSED_MERGED_ALPACA_DATE_CLOSE_VOLUME_ROWS_INTO_A_STORED_INPUT_CONTRACT_THAT_REQUIRES_TRADEDATE_CURRENTCLOSE_CURRENTVOLUME",providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,productionBenchmarkSourceChanged:false,candidateSelected:false,alpacaRows:merged.rows.length,alpacaConflicts:merged.conflicts.length,summary,sectors,next};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.30 ALPACA STOCK CONTRACT RECHECK",`generatedAt=${report.generatedAt}`,`status=${report.status}`,`rootCause=${report.rootCause}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false dbSchemaChanged=false productionFormulaChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)",`alpacaRows=${report.alpacaRows} adaptedRows=${summary.adaptedRows} conflicts=${report.alpacaConflicts}`,`summary localBreadthReady252=${summary.localBreadthReady252}/11 localDemandReady252=${summary.localDemandReady252}/11 minBreadth=${summary.minAlpacaBreadthScored} minDemand=${summary.minAlpacaDemandScored}`,`breadthOverlap minSpearman=${summary.minBreadthOverlapSpearman??"NA"} maxMAE=${summary.maxBreadthOverlapMae??"NA"}`,`benchmarkNeed sessions=${summary.benchmarkTargetSessions} dates=${summary.benchmarkTargetStart}..${summary.benchmarkTargetEnd} requests=${summary.estimatedBenchmarkProviderRequests}`,`projectedComposite252Possible=${summary.projectedComposite252Possible}`,`next=${next}`,"","SECTOR | ETF | CAN_BREADTH | ALPACA_BREADTH | ALPACA_DEMAND | BREADTH_OVERLAP_N | BREADTH_SPEARMAN | BREADTH_MAE | HL_COVERAGE_MIN | HL_COVERAGE_CURRENT | READY_B/D"];
  for(const [id,s] of Object.entries(sectors))lines.push(`${id} | ${s.ticker} | ${s.canonical.breadthScored} | ${s.alpaca.breadthScored} | ${s.alpaca.demandScored} | ${s.overlap.breadth.n} | ${s.overlap.breadth.spearman??"NA"} | ${s.overlap.breadth.mae??"NA"} | ${s.alpaca.highLowCoverage.min??"NA"} | ${s.alpaca.highLowCoverage.current??"NA"} | ${s.localBreadthReady252}/${s.localDemandReady252}`);
  lines.push("","note=R21330_ONLY_ADAPTS_THE_LOCAL_RESEARCH_ROW_CONTRACT_BEFORE_REUSING_THE_EXISTING_PIT_BREADTH_CALCULATION","note=NO_PROVIDER_CALL_NO_PRODUCTION_CHANGE_NO_FORMULA_CHANGE");
  const jf=path.join(base,`${OUT}.json`),tf=path.join(base,`${OUT}.txt`);saveJson(jf,report);saveText(tf,lines.join("\n")+"\n");return {...report,jsonFile:jf,txtFile:tf};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21330();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,rootCause:r.rootCause,summary:r.summary,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
