import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {buildSectorSpeculativeRawHistory,SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS} from "../../lib/market-score/sector-fear-greed-r2-speculative-shadow.mjs";
import {mergeAlpacaRows} from "./sector-fear-greed-r25-alpaca-reuse-diagnostic.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";
import {mergeCanonicalRowsR2135} from "./sector-fear-greed-r2135-r24-source-sensitivity.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const IEX_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INV_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const R6_FILE="local-breadth-r6-shadow-history.json";
const R7_FILE="local-breadth-r7-pit-price-history.json";
const ALPACA_DIR="asset-r10-alpaca";
const OUT="local-sector-fear-greed-r21316-tail-balance-reference-readiness";
const finite=x=>typeof x==="number"&&Number.isFinite(x);
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
function json(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function arr(file){const x=json(file);return Array.isArray(x)?x:[];}
function tableExists(db,name){return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").get(name));}
function listStoredFiles(dir){const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).map(n=>path.join(dir,n)):[];const inc=path.join(dir,"incremental");const incremental=fs.existsSync(inc)?fs.readdirSync(inc).filter(n=>!n.startsWith(".")).map(n=>path.join(inc,n)).filter(f=>fs.statSync(f).isFile()):[];return {base,all:[...base,...incremental]};}
function canonical(base){const sets=[];for(const [name,source] of [[R7_FILE,"BREADTH_R7_LOCAL"],[R6_FILE,"BREADTH_R6_LOCAL"]])sets.push({source,rows:json(path.join(base,name))?.rows??[]});const dbRows=[],file=path.join(base,"storage","core.sqlite");if(fs.existsSync(file)){const db=new DatabaseSync(file,{readOnly:true});db.exec("PRAGMA query_only=ON");try{if(tableExists(db,"market_score_breadth_b1_r3_current_v1"))for(const r of db.prepare("SELECT trade_date,ticker,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 ORDER BY trade_date,ticker").all())dbRows.push(r);}finally{db.close();}}return mergeCanonicalRowsR2135(sets,dbRows);}
function rowDate(r){return String(r?.tradeDate??r?.trade_date??r?.date??"").slice(0,10);}
export function summarizeR21316ReferenceReadiness(history=[],required=SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS){
  const rows=(Array.isArray(history)?history:[]).filter(r=>validDate(String(r?.date??"").slice(0,10))&&finite(Number(r?.tailBalance))).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  const observations=rows.length,missing=Math.max(0,required-observations);
  return {observations,required,missing,ready:observations>=required,firstDate:rows[0]?.date??null,lastDate:rows.at(-1)?.date??null};
}
export function summarizeR21316InputRange(rows=[]){
  const dates=(Array.isArray(rows)?rows:[]).map(rowDate).filter(validDate).sort();
  return {rows:Array.isArray(rows)?rows.length:0,firstDate:dates[0]??null,lastDate:dates.at(-1)??null};
}
function aggregate(sectors={}){const list=Object.values(sectors),obs=list.map(x=>x.observations),missing=list.map(x=>x.missing);return {sectors:list.length,readySectors:list.filter(x=>x.ready).length,minObservations:obs.length?Math.min(...obs):0,medianObservations:obs.length?round([...obs].sort((a,b)=>a-b)[Math.floor(obs.length/2)]):null,maxObservations:obs.length?Math.max(...obs):0,maxMissingTo756:missing.length?Math.max(...missing):null,minMissingTo756:missing.length?Math.min(...missing):null,allReady:list.length===11&&list.every(x=>x.ready)};}

export function runSectorFearGreedR21316TailBalanceReferenceReadiness(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  for(const name of [PIT_FILE,IEX_FILE,INV_FILE])if(!fs.existsSync(path.join(base,name)))throw new Error(`R21316_INPUT_MISSING:${name}`);
  const alpacaDir=path.join(base,ALPACA_DIR),files=listStoredFiles(alpacaDir);if(!files.base.length)throw new Error("R21316_ALPACA_LOCAL_STORE_MISSING");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(path.join(base,PIT_FILE),"utf8")),iex=json(path.join(base,IEX_FILE)),inv=json(path.join(base,INV_FILE)),repair=buildR2134RepairedBenchmarks(iex?.series??{},inv),store=canonical(base),merged=mergeAlpacaRows(files.all.map(arr)),alpaca=merged.rows,canonicalSectors={},alpacaSectors={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const spy=repair.series.SPY??[],etf=repair.series[ticker]??[];
    const c=buildSectorSpeculativeRawHistory({rows:store.rows,spyRows:spy,etfRows:etf,pitHistory:pit,sectorId});
    const a=buildSectorSpeculativeRawHistory({rows:alpaca,spyRows:spy,etfRows:etf,pitHistory:pit,sectorId});
    canonicalSectors[sectorId]={ticker,...summarizeR21316ReferenceReadiness(c)};
    alpacaSectors[sectorId]={ticker,...summarizeR21316ReferenceReadiness(a)};
  }
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const report={version:"R2.13.16-TAIL-BALANCE-REFERENCE-READINESS",generatedAt,status:"SHADOW_R21316_TAIL_BALANCE_REFERENCE_READINESS_COMPLETE",mode:"LOCAL_READ_ONLY_REFERENCE_GAP_DIAGNOSTIC",providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,fillForwardFill:false,sourceFilesMutated:false,candidateSelected:false,selectionThresholdIntroduced:false,optionsEquivalenceClaimed:false,newFormulaIntroduced:false,normalizationChanged:false,referenceWindowChanged:false,diagnosticOnly:true,repair:{targetDate:repair.targetDate,complete:repair.complete,injected:repair.injected.length},sources:{canonical:{input:summarizeR21316InputRange(store.rows),summary:aggregate(canonicalSectors),sectors:canonicalSectors},alpaca:{input:summarizeR21316InputRange(alpaca),conflicts:merged.conflicts.length,summary:aggregate(alpacaSectors),sectors:alpacaSectors}}};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.16 TAIL BALANCE REFERENCE READINESS",`generatedAt=${generatedAt}`,`status=${report.status}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false","productionFormulaChanged=false dbSchemaChanged=false schedulerChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)","fillForwardFill=false sourceFilesMutated=false candidateSelected=false selectionThresholdIntroduced=false","optionsEquivalenceClaimed=false newFormulaIntroduced=false normalizationChanged=false referenceWindowChanged=false diagnosticOnly=true",`repair targetDate=${repair.targetDate} complete=${repair.complete} injected=${repair.injected.length}`,`canonical inputRows=${report.sources.canonical.input.rows} dates=${report.sources.canonical.input.firstDate}..${report.sources.canonical.input.lastDate}`,`alpaca inputRows=${report.sources.alpaca.input.rows} dates=${report.sources.alpaca.input.firstDate}..${report.sources.alpaca.input.lastDate} conflicts=${report.sources.alpaca.conflicts}`,"", "SOURCE | READY | MIN_OBS | MED_OBS | MAX_OBS | MIN_MISSING | MAX_MISSING | ALL_READY",`CANONICAL | ${report.sources.canonical.summary.readySectors}/11 | ${report.sources.canonical.summary.minObservations} | ${report.sources.canonical.summary.medianObservations} | ${report.sources.canonical.summary.maxObservations} | ${report.sources.canonical.summary.minMissingTo756} | ${report.sources.canonical.summary.maxMissingTo756} | ${report.sources.canonical.summary.allReady}`,`ALPACA | ${report.sources.alpaca.summary.readySectors}/11 | ${report.sources.alpaca.summary.minObservations} | ${report.sources.alpaca.summary.medianObservations} | ${report.sources.alpaca.summary.maxObservations} | ${report.sources.alpaca.summary.minMissingTo756} | ${report.sources.alpaca.summary.maxMissingTo756} | ${report.sources.alpaca.summary.allReady}`,"","SECTOR DETAIL","SECTOR | ETF | CANON_OBS | CANON_FIRST | CANON_LAST | CANON_MISSING | CANON_READY | ALPACA_OBS | ALPACA_FIRST | ALPACA_LAST | ALPACA_MISSING | ALPACA_READY"];
  for(const sectorId of Object.keys(SECTOR_FEAR_GREED_R1_ETFS)){const c=canonicalSectors[sectorId],a=alpacaSectors[sectorId];lines.push(`${sectorId} | ${c.ticker} | ${c.observations} | ${c.firstDate??"NA"} | ${c.lastDate??"NA"} | ${c.missing} | ${c.ready} | ${a.observations} | ${a.firstDate??"NA"} | ${a.lastDate??"NA"} | ${a.missing} | ${a.ready}`);}
  lines.push("","note=THIS_DIAGNOSTIC_ONLY_CHECKS_WHETHER_THE_EXISTING_APPROVED_756_REFERENCE_CAN_SCORE_TAIL_BALANCE","note=IT_DOES_NOT_LOWER_756_OR_DEFINE_A_NEW_NORMALIZATION","note=IF_LOCAL_HISTORY_IS_SHORT_THE_NEXT_DECISION_IS_BACKFILL_VS_SEPARATELY_APPROVED_NEW_NORMALIZATION","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_OR_SCHEMA_CHANGE");
  fs.writeFileSync(path.join(base,`${OUT}.json`),JSON.stringify(report,null,2)+"\n");
  fs.writeFileSync(path.join(base,`${OUT}.txt`),lines.join("\n")+"\n");
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const r=runSectorFearGreedR21316TailBalanceReferenceReadiness();console.log(JSON.stringify({status:r.status,jsonFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,`${OUT}.json`),txtFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,`${OUT}.txt`),providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,referenceRequirementChanged:r.referenceRequirementChanged,canonical:r.sources.canonical.summary,alpaca:r.sources.alpaca.summary},null,2));}
  catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}
}
