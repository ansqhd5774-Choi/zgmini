import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  SECTOR_FEAR_GREED_R3_BENCHMARKS,
  SECTOR_FEAR_GREED_R3_ETFS,
  buildSectorFearGreedR3RollingSource,
  mergeSectorFearGreedR3PriceRows,
  mergeSectorFearGreedR3StockRows,
} from '../../lib/market-score/sector-fear-greed-r3-rolling.mjs';

const DEFAULT_BASE=path.join(os.homedir(),'.zgmini','pc-writer');
export const SECTOR_FEAR_GREED_R3_ROLLING_FILE='local-sector-fear-greed-r3-rolling-252.json';
const FIXED_FILE='local-sector-fear-greed-r21332-full-252-historical-validation.json';
const IEX_FILE='local-sector-fear-greed-r1-iex-price-history.json';
const ETF_BACKFILL_FILE='local-sector-fear-greed-r21331-alpaca-sector-etf-backfill.json';
const SPY_GAP_FILE='local-sector-fear-greed-r21322-spy-gap-backfill.json';
const BENCHMARK_INVENTORY_FILE='local-sector-fear-greed-r2133-local-benchmark-inventory.json';
const PIT_FILE='local-sector-fear-greed-r1-pit-gics.csv';
const ALPACA_DIR='asset-r10-alpaca';
const ETF_INCREMENTAL_FILE='local-sector-fear-greed-r3-etf-incremental.json';

const safeJson=file=>{if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};
const safeArray=file=>{const x=safeJson(file);return Array.isArray(x)?x:[];};
const saveJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');fs.renameSync(tmp,file);};

function listAlpacaStockFiles(dir){
  const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(n=>/^group-\d+\.json$/.test(n)).sort().map(n=>path.join(dir,n)):[];
  const inc=path.join(dir,'incremental');
  const incremental=fs.existsSync(inc)?fs.readdirSync(inc).filter(n=>!n.startsWith('.')).sort().map(n=>path.join(inc,n)).filter(f=>fs.statSync(f).isFile()):[];
  return [...base,...incremental];
}
function requireJson(base,name){
  const file=path.join(base,name),value=safeJson(file);
  if(!value)throw Error(`SECTOR_FEAR_GREED_R3_ROLLING_INPUT_MISSING:${name}`);
  return value;
}
function requireText(base,name){
  const file=path.join(base,name);
  if(!fs.existsSync(file))throw Error(`SECTOR_FEAR_GREED_R3_ROLLING_INPUT_MISSING:${name}`);
  return fs.readFileSync(file,'utf8');
}
export function loadSectorFearGreedR3RollingInputs(base=DEFAULT_BASE,{cutoffDate=null}={}){
  const files=listAlpacaStockFiles(path.join(base,ALPACA_DIR));
  if(!files.length)throw Error('SECTOR_FEAR_GREED_R3_ROLLING_STOCK_STORE_MISSING');
  // Incremental filenames are ordered by request start/end; later overlapping
  // official batches supersede earlier bars. The raw batches remain untouched.
  const stockRows=mergeSectorFearGreedR3StockRows(files.map(safeArray),{cutoffDate,allowProviderRevisions:true});
  if(!stockRows.length)throw Error('SECTOR_FEAR_GREED_R3_ROLLING_STOCK_ROWS_MISSING');
  const pitCsv=requireText(base,PIT_FILE);
  const iex=requireJson(base,IEX_FILE),backfill=requireJson(base,ETF_BACKFILL_FILE),spyGap=requireJson(base,SPY_GAP_FILE),inventory=requireJson(base,BENCHMARK_INVENTORY_FILE);
  const incremental=safeJson(path.join(base,ETF_INCREMENTAL_FILE));
  const selected=inventory?.selection?.selected??{};
  const repairedRows={};
  for(const ticker of SECTOR_FEAR_GREED_R3_BENCHMARKS){
    const hit=selected[ticker],date=String(hit?.date??''),close=Number(hit?.close);
    if(date!=='2026-08-27'||!Number.isFinite(close)||close<=0||hit?.marketParquetEvidence!==true)throw Error(`SECTOR_FEAR_GREED_R3_BENCHMARK_REPAIR_INVALID:${ticker}`);
    repairedRows[ticker]=[{date,close,volume:0}];
  }
  const series={};
  for(const ticker of SECTOR_FEAR_GREED_R3_BENCHMARKS){
    const pieces=[];
    if(ticker==='SPY')pieces.push(spyGap.rows??spyGap.series?.SPY??[]);
    else pieces.push(backfill.series?.[ticker]??[]);
    pieces.push(iex.series?.[ticker]??[]);
    pieces.push(repairedRows[ticker]);
    pieces.push(incremental?.series?.[ticker]??[]);
    series[ticker]=mergeSectorFearGreedR3PriceRows(...pieces).filter(row=>!cutoffDate||row.date<=cutoffDate);
  }
  return {stockRows,pitCsv,series,diagnostics:{
    stockRows:stockRows.length,
    stockLastDate:stockRows.at(-1)?.tradeDate??null,
    benchmarkLastDates:Object.fromEntries(SECTOR_FEAR_GREED_R3_BENCHMARKS.map(t=>[t,series[t].at(-1)?.date??null])),
    incrementalPresent:Boolean(incremental),
  }};
}
export function buildSectorFearGreedR3RollingLocalSource(base=DEFAULT_BASE,{now=new Date(),cutoffDate=null,write=true}={}){
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const inputs=loadSectorFearGreedR3RollingInputs(base,{cutoffDate});
  const source=buildSectorFearGreedR3RollingSource({...inputs,generatedAt,cutoffDate});
  const out={...source,inputDiagnostics:inputs.diagnostics};
  if(write)saveJson(path.join(base,SECTOR_FEAR_GREED_R3_ROLLING_FILE),out);
  return out;
}
export function compareSectorFearGreedR3RollingToFixed(base=DEFAULT_BASE,{now=new Date()}={}){
  const fixed=requireJson(base,FIXED_FILE);
  const sectorIds=Object.keys(SECTOR_FEAR_GREED_R3_ETFS);
  const cutoff=String(fixed?.sectors?.[sectorIds[0]]?.fiveRaw?.at(-1)?.date??'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(cutoff))throw Error('SECTOR_FEAR_GREED_R3_FIXED_CUTOFF_MISSING');
  const rolling=buildSectorFearGreedR3RollingLocalSource(base,{now,cutoffDate:cutoff,write:false});
  let pairs=0,mismatches=0,maxAbsDelta=0,dateMismatches=0;
  for(const sectorId of sectorIds){
    const expected=fixed?.sectors?.[sectorId]?.fiveRaw??[],actual=rolling?.sectors?.[sectorId]?.fiveRaw??[];
    if(expected.length!==252||actual.length!==252)throw Error(`SECTOR_FEAR_GREED_R3_PARITY_COUNT:${sectorId}`);
    for(let i=0;i<252;i++){
      pairs++;
      if(expected[i]?.date!==actual[i]?.date){dateMismatches++;continue;}
      const delta=Math.abs(Number(expected[i]?.score)-Number(actual[i]?.score));
      if(!Number.isFinite(delta)){mismatches++;continue;}
      maxAbsDelta=Math.max(maxAbsDelta,delta);
      if(delta>1e-10)mismatches++;
    }
  }
  return {status:dateMismatches===0&&mismatches===0?'PASS':'FAIL',cutoff,pairs,dateMismatches,mismatches,maxAbsDelta,rollingObservationDate:rolling.sectors[sectorIds[0]].lastAlignedDate};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE;
    const parity=process.argv.includes('--parity');
    console.log(JSON.stringify(parity?compareSectorFearGreedR3RollingToFixed(base):buildSectorFearGreedR3RollingLocalSource(base),null,2));
  }catch(error){
    console.log(JSON.stringify({status:'FAILED',code:/^[A-Z0-9_:.-]+$/.test(error?.message??'')?error.message:'SECTOR_FEAR_GREED_R3_ROLLING_LOCAL_FAILED',providerCalls:0,networkCalls:0,publicMutation:false,d1Mutation:false}));
    process.exitCode=1;
  }
}
