import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
export const KAGGLE_DATASET="andrewmvd/sp-500-stocks";
export const KAGGLE_DATASET_PAGE="https://www.kaggle.com/datasets/andrewmvd/sp-500-stocks";
export const BENCHMARKS=Object.freeze(["SPY","XLC","XLY","XLP","XLE","XLF","XLV","XLI","XLB","XLRE","XLK","XLU"]);
export const TARGETS=Object.freeze({trendRelativeRaw:881,volatilityRaw:818,speculativeR24Raw:834,demandRaw:775,breadthConservativeRaw:1007});
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const OUTPUT_JSON="local-sector-fear-greed-r26-kaggle-diagnostic.json";
const OUTPUT_TXT="local-sector-fear-greed-r26-kaggle-diagnostic.txt";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));
const numberOrNull=value=>{const text=String(value??"").trim();if(!text)return null;const number=Number(text);return finite(number)?number:null;};
const round=value=>finite(value)?Math.round(value*1_000_000)/1_000_000:null;

export function parseR26CsvRow(line){
  const output=[];let current="",quoted=false;
  for(let index=0;index<line.length;index++){
    const char=line[index];
    if(char==='"'){
      if(quoted&&line[index+1]==='"'){current+='"';index++;}
      else quoted=!quoted;
    }else if(char===","&&!quoted){output.push(current);current="";}
    else current+=char;
  }
  if(quoted)throw new Error("R26_KAGGLE_CSV_UNCLOSED_QUOTE");
  output.push(current);return output;
}

export function candidateDotDashAlias(ticker){
  const value=String(ticker??"").trim();
  if(value.includes("-"))return value.replace(/-/g,".");
  if(value.includes("."))return value.replace(/\./g,"-");
  return value;
}

export function resolveR26PitTicker(ticker,pitByTicker){
  if(pitByTicker?.[ticker])return {ticker,mode:"EXACT"};
  const alias=candidateDotDashAlias(ticker);
  if(alias!==ticker&&pitByTicker?.[alias])return {ticker:alias,mode:"DOT_DASH_ALIAS"};
  return null;
}

function activePitEntry(entries,date){
  const matches=(entries??[]).filter(item=>item.dateAdded<=date&&(!item.dateRemoved||date<item.dateRemoved));
  return matches.length===1?matches[0]:null;
}

function quantile(values,p){
  const sorted=values.filter(finite).sort((a,b)=>a-b);if(!sorted.length)return null;
  const position=(sorted.length-1)*p,low=Math.floor(position),high=Math.ceil(position);
  return low===high?sorted[low]:sorted[low]+(sorted[high]-sorted[low])*(position-low);
}

function loadPitHistory(base){
  const file=path.join(base,PIT_FILE);if(!fs.existsSync(file))return {file:null,history:null};
  return {file,history:parsePitSectorHistoryCsv(fs.readFileSync(file,"utf8"))};
}

export async function inspectR26KaggleCsv(csvFile,{pitHistory=null}={}){
  if(!csvFile||!fs.existsSync(csvFile))throw new Error("R26_KAGGLE_CSV_MISSING");
  const stream=fs.createReadStream(csvFile,{encoding:"utf8"}),reader=readline.createInterface({input:stream,crlfDelay:Infinity});
  let header=null,indexes=null,rows=0,validRows=0,firstDate=null,lastDate=null,aliasHits=0;
  const dates=new Set(),byTicker=new Map(),observed=new Map(),pitByTicker=pitHistory?.byTicker??null;
  for await(const line of reader){
    if(!line.trim())continue;
    if(!header){
      header=parseR26CsvRow(line.replace(/^\uFEFF/,""));const at=name=>header.indexOf(name);
      indexes={date:at("Date"),symbol:at("Symbol"),adjClose:at("Adj Close"),close:at("Close"),volume:at("Volume")};
      if(indexes.date<0||indexes.symbol<0||indexes.close<0||indexes.volume<0)throw new Error("R26_KAGGLE_COLUMNS_MISSING");
      continue;
    }
    rows++;
    const cells=parseR26CsvRow(line),date=String(cells[indexes.date]??"").trim(),ticker=String(cells[indexes.symbol]??"").trim();
    if(!validDate(date)||!ticker)continue;
    const adjusted=indexes.adjClose>=0?numberOrNull(cells[indexes.adjClose]):null,close=numberOrNull(cells[indexes.close]),volume=numberOrNull(cells[indexes.volume]);
    const price=finite(adjusted)&&adjusted>0?adjusted:finite(close)&&close>0?close:null;
    if(!finite(price)||price<=0)continue;
    validRows++;dates.add(date);if(firstDate===null||date<firstDate)firstDate=date;if(lastDate===null||date>lastDate)lastDate=date;
    const stats=byTicker.get(ticker)??{ticker,sessions:0,adjustedSessions:0,closeSessions:0,volumeSessions:0,firstDate:null,lastDate:null};
    stats.sessions++;if(finite(adjusted)&&adjusted>0)stats.adjustedSessions++;if(finite(close)&&close>0)stats.closeSessions++;if(finite(volume)&&volume>=0)stats.volumeSessions++;
    if(stats.firstDate===null||date<stats.firstDate)stats.firstDate=date;if(stats.lastDate===null||date>stats.lastDate)stats.lastDate=date;byTicker.set(ticker,stats);
    if(pitByTicker){
      const resolved=resolveR26PitTicker(ticker,pitByTicker);if(!resolved)continue;if(resolved.mode!=="EXACT")aliasHits++;
      const active=activePitEntry(pitByTicker[resolved.ticker],date);if(!active)continue;
      const key=`${date}|${active.sectorId}`,current=observed.get(key)??{price:0,volume:0};current.price++;if(finite(volume)&&volume>=0)current.volume++;observed.set(key,current);
    }
  }
  const benchmarks={};for(const ticker of BENCHMARKS)benchmarks[ticker]=byTicker.get(ticker)??{ticker,sessions:0,adjustedSessions:0,closeSessions:0,volumeSessions:0,firstDate:null,lastDate:null};
  const summary={rows,validRows,uniqueTickers:byTicker.size,uniqueDates:dates.size,firstDate,lastDate,benchmarkPresent:BENCHMARKS.filter(ticker=>benchmarks[ticker].sessions>0).length,benchmarkTotal:BENCHMARKS.length,aliasHits,benchmarks,pit:null};
  if(pitByTicker){
    const ratiosBySector={};
    for(const date of dates){
      const memberCounts={};
      for(const entries of Object.values(pitByTicker)){const active=activePitEntry(entries,date);if(active)memberCounts[active.sectorId]=(memberCounts[active.sectorId]??0)+1;}
      for(const [sectorId,memberCount] of Object.entries(memberCounts)){
        const current=observed.get(`${date}|${sectorId}`)??{price:0,volume:0},bucket=ratiosBySector[sectorId]??{price:[],volume:[]};
        bucket.price.push(memberCount?current.price/memberCount:null);bucket.volume.push(memberCount?current.volume/memberCount:null);ratiosBySector[sectorId]=bucket;
      }
    }
    const sectors={};
    for(const [sectorId,bucket] of Object.entries(ratiosBySector))sectors[sectorId]={dates:bucket.price.length,priceMedian:round(quantile(bucket.price,.5)),priceP10:round(quantile(bucket.price,.1)),volumeMedian:round(quantile(bucket.volume,.5)),volumeP10:round(quantile(bucket.volume,.1)),priceAtLeast98:bucket.price.filter(value=>value>=.98).length,volumeAtLeast98:bucket.volume.filter(value=>value>=.98).length,priceAtLeast95:bucket.price.filter(value=>value>=.95).length,volumeAtLeast95:bucket.volume.filter(value=>value>=.95).length,rawBreadth1007Potential:bucket.price.filter(value=>value>=.98).length>=TARGETS.breadthConservativeRaw,rawDemand775Potential:bucket.volume.filter(value=>value>=.98).length>=TARGETS.demandRaw};
    summary.pit={researchCoverageThresholdsOnly:true,thresholds:[.98,.95],sectors};
  }
  return summary;
}

function renderR26(report){
  const summary=report.summary,lines=["ZGMINI SECTOR FEAR & GREED R2.6 KAGGLE SHADOW DIAGNOSTIC",`generatedAt=${report.generatedAt}`,`status=${report.status}`,`dataset=${report.dataset}`,`datasetLicenseEvidence=${report.datasetLicenseEvidence}`,`upstreamProvenanceVerified=${report.upstreamProvenanceVerified}`,`commercialProductionEligible=${report.commercialProductionEligible}`,`providerCalls=${report.providerCalls}`,`publicMutation=${report.publicMutation} dbSchemaChanged=${report.dbSchemaChanged} productionFormulaChanged=${report.productionFormulaChanged} schedulerChanged=${report.schedulerChanged}`,`rows=${summary.rows} validRows=${summary.validRows} uniqueTickers=${summary.uniqueTickers} uniqueDates=${summary.uniqueDates} dates=${summary.firstDate??"NA"}..${summary.lastDate??"NA"}`,`benchmarkPresent=${summary.benchmarkPresent}/${summary.benchmarkTotal} aliasHits=${summary.aliasHits}`,"","BENCHMARK | SESSIONS | VOLUME | FIRST | LAST"];
  for(const ticker of BENCHMARKS){const value=summary.benchmarks[ticker];lines.push(`${ticker} | ${value.sessions} | ${value.volumeSessions} | ${value.firstDate??"NA"} | ${value.lastDate??"NA"}`);}
  if(summary.pit?.sectors){lines.push("","SECTOR | DATES | PRICE_MEDIAN | PRICE_P10 | VOL_MEDIAN | VOL_P10 | PRICE>=98% | VOL>=98% | B1007_POTENTIAL | D775_POTENTIAL");for(const [sectorId,value] of Object.entries(summary.pit.sectors).sort(([a],[b])=>a.localeCompare(b)))lines.push(`${sectorId} | ${value.dates} | ${value.priceMedian??"NA"} | ${value.priceP10??"NA"} | ${value.volumeMedian??"NA"} | ${value.volumeP10??"NA"} | ${value.priceAtLeast98} | ${value.volumeAtLeast98} | ${value.rawBreadth1007Potential?"YES":"NO"} | ${value.rawDemand775Potential?"YES":"NO"}`);}
  lines.push("","note=SHADOW_DIAGNOSTIC_ONLY_98_PERCENT_IS_RESEARCH_COVERAGE_SUMMARY_NOT_AN_APPROVED_FORMULA_GATE","note=KAGGLE_DATASET_LICENSE_IS_REPORTED_CC0_BUT_UPSTREAM_MARKET_DATA_PROVENANCE_RIGHTS_REMAIN_UNVERIFIED","note=NO_PRODUCTION_D1_SCHEMA_SCHEDULER_OR_FORMULA_CHANGE");return lines.join("\n")+"\n";
}

export async function runSectorFearGreedR26KaggleDiagnostic(csvFile,base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date(),pitHistory=null}={}){
  const loaded=pitHistory?{file:"INJECTED",history:pitHistory}:loadPitHistory(base),summary=await inspectR26KaggleCsv(csvFile,{pitHistory:loaded.history});
  const report={version:"R2.6-KAGGLE-SHADOW-DIAGNOSTIC",generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),status:"SHADOW_R26_KAGGLE_DIAGNOSTIC_COMPLETE",mode:"SHADOW_ONLY",dataset:KAGGLE_DATASET,datasetPage:KAGGLE_DATASET_PAGE,datasetLicenseEvidence:"CC0_PUBLIC_DOMAIN_REPORTED_BY_INDEXED_KAGGLE_METADATA",upstreamProvenanceVerified:false,commercialProductionEligible:false,pitFile:loaded.file,providerCalls:0,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,targets:{...TARGETS},summary};
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,renderR26(report));return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runSectorFearGreedR26KaggleDiagnostic(process.argv[2]).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"R26_KAGGLE_DIAGNOSTIC_FAILED";console.log(JSON.stringify({status:"FAILED",code,providerCalls:0,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false}));process.exitCode=1;});
}
