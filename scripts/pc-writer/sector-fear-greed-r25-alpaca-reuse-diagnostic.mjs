import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const ALPACA_DIR="asset-r10-alpaca";
const OUTPUT_JSON="local-sector-fear-greed-r25-alpaca-reuse-diagnostic.json";
const OUTPUT_TXT="local-sector-fear-greed-r25-alpaca-reuse-diagnostic.txt";
const BENCHMARKS=["SPY",...Object.values(SECTOR_FEAR_GREED_R1_ETFS)];
const TARGETS=Object.freeze({trendRelativeRaw:881,volatilityRaw:818,speculativeR24Raw:834,demandRaw:775,breadthConservativeRaw:1007});
const ABOVE_ONE_PERCENT_THRESHOLD=0.01;
const FLOAT_EPSILON=1e-12;
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(`${v}T00:00:00Z`));
const percentile=(values,p)=>{if(!values.length)return null;const a=[...values].sort((x,y)=>x-y),i=Math.min(a.length-1,Math.max(0,Math.floor((a.length-1)*p)));return a[i];};
const round=v=>finite(v)?Math.round(v*1000000)/1000000:null;
const safeArray=file=>{try{const value=JSON.parse(fs.readFileSync(file,"utf8"));return Array.isArray(value)?value:[];}catch{return [];}};

export function maxFiniteR25(values=[]){let max=null;for(const value of values)if(finite(value)&&(max===null||value>max))max=value;return max;}
export function isStrictlyAboveOnePercentR25(value){return finite(value)&&value>ABOVE_ONE_PERCENT_THRESHOLD+FLOAT_EPSILON;}

export function mergeAlpacaRows(rowSets=[]){
  const byKey=new Map(),conflicts=[];
  for(const rows of rowSets)for(const row of Array.isArray(rows)?rows:[]){
    const ticker=String(row?.ticker??"").trim(),date=String(row?.tradeDate??row?.trade_date??row?.date??"").slice(0,10),close=Number(row?.currentClose??row?.current_close??row?.close),volume=Number(row?.currentVolume??row?.current_volume??row?.volume);
    if(!ticker||!validDate(date)||!finite(close)||close<=0)continue;
    const normalized={ticker,date,close,volume:finite(volume)&&volume>=0?volume:null},key=`${ticker}|${date}`,old=byKey.get(key);
    if(old&&(old.close!==normalized.close||old.volume!==normalized.volume))conflicts.push({ticker,date});
    if(!old)byKey.set(key,normalized);
  }
  return {rows:[...byKey.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.ticker.localeCompare(b.ticker)),conflicts};
}

export function summarizeTickerCoverage(rows=[]){
  const byTicker=new Map();
  for(const row of rows){const item=byTicker.get(row.ticker)??{dates:new Set(),volumeDates:new Set()};item.dates.add(row.date);if(finite(row.volume))item.volumeDates.add(row.date);byTicker.set(row.ticker,item);}
  const out={};
  for(const [ticker,item] of byTicker){const dates=[...item.dates].sort(),volumeDates=[...item.volumeDates].sort();out[ticker]={sessions:dates.length,volumeSessions:volumeDates.length,firstDate:dates[0]??null,lastDate:dates.at(-1)??null,firstVolumeDate:volumeDates[0]??null,lastVolumeDate:volumeDates.at(-1)??null};}
  return out;
}

export function compareOverlap(alpacaRows=[],referenceRows=[]){
  const ref=new Map();
  for(const row of referenceRows){const ticker=String(row?.ticker??"").trim(),date=String(row?.tradeDate??row?.trade_date??row?.date??"").slice(0,10),close=Number(row?.currentClose??row?.current_close??row?.close);if(ticker&&validDate(date)&&finite(close)&&close>0)ref.set(`${ticker}|${date}`,close);}
  const diffs=[];let aboveOnePercent=0,maxRelativeDifference=null;
  for(const row of alpacaRows){const value=ref.get(`${row.ticker}|${row.date}`);if(!finite(value)||value<=0)continue;const diff=Math.abs(row.close/value-1);diffs.push(diff);if(isStrictlyAboveOnePercentR25(diff))aboveOnePercent++;if(maxRelativeDifference===null||diff>maxRelativeDifference)maxRelativeDifference=diff;}
  return {pairs:diffs.length,medianRelativeDifference:round(percentile(diffs,0.50)),p95RelativeDifference:round(percentile(diffs,0.95)),maxRelativeDifference:round(maxRelativeDifference),aboveOnePercent};
}

function listStoredFiles(dir){
  const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).map(n=>path.join(dir,n)):[];
  const incrementalDir=path.join(dir,"incremental"),incremental=fs.existsSync(incrementalDir)?fs.readdirSync(incrementalDir).filter(n=>!/^\./.test(n)).map(n=>path.join(incrementalDir,n)).filter(f=>fs.statSync(f).isFile()):[];
  return {base,incremental,all:[...base,...incremental]};
}

function readReferenceRows(base){
  const rows=[];
  for(const name of ["local-breadth-r7-pit-price-history.json","local-breadth-r6-shadow-history.json"]){const file=path.join(base,name);if(!fs.existsSync(file))continue;try{const payload=JSON.parse(fs.readFileSync(file,"utf8"));for(const row of payload?.rows??[])rows.push(row);}catch{}}
  return rows;
}

export function runSectorFearGreedR25AlpacaReuseDiagnostic(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const dir=path.join(base,ALPACA_DIR);if(!fs.existsSync(dir))throw new Error("R25_ALPACA_LOCAL_STORE_MISSING");
  const files=listStoredFiles(dir);if(!files.base.length)throw new Error("R25_ALPACA_BASE_GROUPS_MISSING");
  const merged=mergeAlpacaRows(files.all.map(safeArray)),coverage=summarizeTickerCoverage(merged.rows),dates=[...new Set(merged.rows.map(r=>r.date))].sort(),tickers=Object.keys(coverage).sort(),benchmarks={};
  for(const ticker of BENCHMARKS){const c=coverage[ticker]??{sessions:0,volumeSessions:0,firstDate:null,lastDate:null,firstVolumeDate:null,lastVolumeDate:null};benchmarks[ticker]={...c,targets:{trendRelative:c.sessions>=TARGETS.trendRelativeRaw,volatility:c.sessions>=TARGETS.volatilityRaw,speculativeR24:c.sessions>=TARGETS.speculativeR24Raw,demand:c.volumeSessions>=TARGETS.demandRaw,breadthConservative:c.sessions>=TARGETS.breadthConservativeRaw}};}
  const reference=readReferenceRows(base),overlap=compareOverlap(merged.rows,reference),closeCounts=tickers.map(t=>coverage[t].sessions),volumeCounts=tickers.map(t=>coverage[t].volumeSessions),summary={baseGroupFiles:files.base.length,incrementalFiles:files.incremental.length,rows:merged.rows.length,uniqueTickers:tickers.length,uniqueDates:dates.length,firstDate:dates[0]??null,lastDate:dates.at(-1)??null,conflicts:merged.conflicts.length,benchmarkPresent:BENCHMARKS.filter(t=>coverage[t]?.sessions>0).length,benchmarkTotal:BENCHMARKS.length,benchmarkR24Ready:BENCHMARKS.filter(t=>coverage[t]?.sessions>=TARGETS.speculativeR24Raw).length,benchmarkTRReady:BENCHMARKS.filter(t=>coverage[t]?.sessions>=TARGETS.trendRelativeRaw).length,tickersClose1007:closeCounts.filter(n=>n>=TARGETS.breadthConservativeRaw).length,tickersVolume775:volumeCounts.filter(n=>n>=TARGETS.demandRaw).length};
  const report={version:"R2.5-ALPACA-LOCAL-REUSE",generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),status:"SHADOW_R25_LOCAL_REUSE_COMPLETE",mode:"LOCAL_STORED_DATA_DIAGNOSTIC_ONLY",providerCalls:0,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,targets:{...TARGETS},summary,overlap,benchmarks};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.5 ALPACA LOCAL-REUSE DIAGNOSTIC",`generatedAt=${report.generatedAt}`,`status=${report.status}`,"providerCalls=0",`files base=${summary.baseGroupFiles} incremental=${summary.incrementalFiles}`,`rows=${summary.rows} uniqueTickers=${summary.uniqueTickers} uniqueDates=${summary.uniqueDates} dates=${summary.firstDate}..${summary.lastDate} conflicts=${summary.conflicts}`,`benchmarkPresent=${summary.benchmarkPresent}/${summary.benchmarkTotal} benchmarkR24Ready=${summary.benchmarkR24Ready}/${summary.benchmarkTotal} benchmarkTRReady=${summary.benchmarkTRReady}/${summary.benchmarkTotal}`,`tickersClose1007=${summary.tickersClose1007} tickersVolume775=${summary.tickersVolume775}`,`overlap pairs=${overlap.pairs} medianRel=${overlap.medianRelativeDifference??"NA"} p95Rel=${overlap.p95RelativeDifference??"NA"} maxRel=${overlap.maxRelativeDifference??"NA"} above1pct=${overlap.aboveOnePercent}`,"","TICKER | SESSIONS | VOLUME_SESSIONS | FIRST | LAST | T/R881 | V818 | R24_834 | D775 | B1007"];
  for(const ticker of BENCHMARKS){const b=benchmarks[ticker];lines.push(`${ticker} | ${b.sessions} | ${b.volumeSessions} | ${b.firstDate??"NA"} | ${b.lastDate??"NA"} | ${b.targets.trendRelative?"YES":"NO"} | ${b.targets.volatility?"YES":"NO"} | ${b.targets.speculativeR24?"YES":"NO"} | ${b.targets.demand?"YES":"NO"} | ${b.targets.breadthConservative?"YES":"NO"}`);}
  lines.push("","note=REUSE_EXISTING_LOCAL_ALPACA_ONLY_NO_PROVIDER_CALL_NO_PRODUCTION_CHANGE");
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,lines.join("\n")+"\n");return {status:report.status,jsonFile,txtFile,providerCalls:0,summary,overlap};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(runSectorFearGreedR25AlpacaReuseDiagnostic(),null,2));}catch(error){const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"R25_ALPACA_REUSE_DIAGNOSTIC_FAILED";console.log(JSON.stringify({status:"FAILED",code,errorName:String(error?.name??"Error"),providerCalls:0,publicMutation:false,productionFormulaChanged:false}));process.exitCode=1;}}
