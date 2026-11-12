import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parquetReadObjects} from "hyparquet";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const TARGET_DATE="2026-08-27";
const TARGET_TICKERS=Object.freeze(["SPY",...Object.values(SECTOR_FEAR_GREED_R1_ETFS)]);
const OUTPUT_JSON="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const OUTPUT_TXT="local-sector-fear-greed-r2133-local-benchmark-inventory.txt";
const MAX_DEPTH=4;
const MAX_TEXT_BYTES=128*1024*1024;
const MAX_PARQUET_BYTES=32*1024*1024;
const KEYWORD_RE=/(marketparquet|market-parquet|sector-fear|breadth|price|history|parquet)/i;
const EXCLUDED_DIRS=new Set(["storage","asset-r10-alpaca","node_modules",".git","profile","chrome","runner"]);
const EXCLUDED_FILE_RE=/(providers\.env|(^|[._-])\.env$|secret|token|credential|cookie|config\.json)/i;
const finite=value=>typeof value==="number"&&Number.isFinite(value);

export function shouldScanR2133Path(relative,size=0){
  const normalized=String(relative??"").replaceAll("\\","/");
  const parts=normalized.split("/").filter(Boolean);
  if(parts.some(part=>EXCLUDED_DIRS.has(part.toLowerCase())))return false;
  if(EXCLUDED_FILE_RE.test(path.basename(normalized)))return false;
  if(!KEYWORD_RE.test(normalized))return false;
  const ext=path.extname(normalized).toLowerCase();
  if(ext===".parquet")return size<=MAX_PARQUET_BYTES;
  return [".json",".jsonl",".csv",".txt"].includes(ext)&&size<=MAX_TEXT_BYTES;
}

function rowDate(row){return String(row?.date??row?.tradeDate??row?.trade_date??row?.currentDate??row?.current_date??row?.timestamp??"").slice(0,10);}
function rowTicker(row,hintTicker){return String(row?.ticker??row?.symbol??row?.etf??hintTicker??"").trim().toUpperCase();}
function rowClose(row){return Number(row?.close??row?.currentClose??row?.current_close??row?.adjClose??row?.adj_close);}
function rowVolume(row){const value=Number(row?.volume??row?.currentVolume??row?.current_volume);return finite(value)&&value>=0?value:null;}
function sourceText(row,sourceHint=""){return [sourceHint,row?.source,row?.provider,row?.feed,row?.methodologyVersion,row?.provenance?.provider,row?.provenance?.sourceContractRevision].filter(Boolean).join(" ");}
function isMarketParquetEvidence(file,source){return /marketparquet|market parquet/i.test(`${file} ${source}`);}

export function extractTargetRowsR2133(value,{file="memory.json",targetDate=TARGET_DATE,targetTickers=TARGET_TICKERS}={}){
  const wanted=new Set(targetTickers.map(x=>String(x).toUpperCase())),hits=[];
  const seen=new Set();
  const visit=(node,hintTicker=null,sourceHint="",depth=0)=>{
    if(depth>10||node===null||node===undefined)return;
    if(Array.isArray(node)){for(const item of node)visit(item,hintTicker,sourceHint,depth+1);return;}
    if(typeof node!=="object")return;
    const ownSource=sourceText(node,sourceHint);
    const ticker=rowTicker(node,hintTicker),date=rowDate(node),close=rowClose(node);
    if(date===targetDate&&wanted.has(ticker)&&finite(close)&&close>0){
      const key=`${ticker}|${close}|${rowVolume(node)}|${file}`;
      if(!seen.has(key)){seen.add(key);hits.push({ticker,date,close,volume:rowVolume(node),file,source:ownSource,marketParquetEvidence:isMarketParquetEvidence(file,ownSource)});}
    }
    for(const [key,child] of Object.entries(node)){
      const upper=String(key).toUpperCase(),nextHint=wanted.has(upper)?upper:hintTicker;
      visit(child,nextHint,ownSource,depth+1);
    }
  };
  visit(value);
  return hits;
}

function walkCandidates(base){
  const out=[];
  const walk=(dir,depth)=>{
    if(depth>MAX_DEPTH||!fs.existsSync(dir))return;
    let entries=[];try{entries=fs.readdirSync(dir,{withFileTypes:true});}catch{return;}
    for(const entry of entries){
      const full=path.join(dir,entry.name),relative=path.relative(base,full);
      if(entry.isDirectory()){
        if(EXCLUDED_DIRS.has(entry.name.toLowerCase()))continue;
        walk(full,depth+1);continue;
      }
      if(!entry.isFile())continue;
      let size=0;try{size=fs.statSync(full).size;}catch{continue;}
      if(shouldScanR2133Path(relative,size))out.push({full,relative,size});
    }
  };
  walk(base,0);
  return out.sort((a,b)=>a.relative.localeCompare(b.relative));
}

async function parquetHits(file,relative){
  const buffer=fs.readFileSync(file),ab=buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);
  let rows=[];
  try{rows=await parquetReadObjects({file:ab,columns:["date","symbol","asset_type","close","volume"]});}
  catch{
    try{rows=await parquetReadObjects({file:ab,columns:["timestamp","symbol","asset_type","close","volume"]});}
    catch{return [];}
  }
  return extractTargetRowsR2133(rows,{file:relative});
}

function textHits(file,relative){
  let text="";try{text=fs.readFileSync(file,"utf8");}catch{return {hits:[],textEvidence:[]};}
  const ext=path.extname(file).toLowerCase();
  if(ext===".json"){
    try{return {hits:extractTargetRowsR2133(JSON.parse(text),{file:relative}),textEvidence:[]};}catch{}
  }
  const evidence=[];
  for(const ticker of TARGET_TICKERS){if(text.includes(TARGET_DATE)&&new RegExp(`\\b${ticker}\\b`).test(text))evidence.push(ticker);}
  return {hits:[],textEvidence:evidence};
}

export function selectR2133MarketParquetRows(hits=[],tickers=TARGET_TICKERS){
  const selected={},conflicts=[];
  for(const ticker of tickers){
    const candidates=hits.filter(hit=>hit.ticker===ticker&&hit.marketParquetEvidence&&finite(hit.close)&&hit.close>0);
    const closes=[...new Set(candidates.map(hit=>hit.close))];
    if(closes.length>1){conflicts.push({ticker,closes,files:[...new Set(candidates.map(hit=>hit.file))]});continue;}
    if(candidates.length)selected[ticker]=candidates[0];
  }
  return {selected,conflicts,complete:Object.keys(selected).length===tickers.length&&conflicts.length===0};
}

export async function runSectorFearGreedR2133LocalBenchmarkInventory(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const candidates=walkCandidates(base),hits=[],textEvidence=[];
  for(const item of candidates){
    const ext=path.extname(item.full).toLowerCase();
    if(ext===".parquet")hits.push(...await parquetHits(item.full,item.relative));
    else{const result=textHits(item.full,item.relative);hits.push(...result.hits);if(result.textEvidence.length)textEvidence.push({file:item.relative,tickers:result.textEvidence});}
  }
  const selection=selectR2133MarketParquetRows(hits),generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const report={version:"R2.13.3-LOCAL-BENCHMARK-INVENTORY",generatedAt,status:"SHADOW_R2133_LOCAL_BENCHMARK_INVENTORY_COMPLETE",providerCalls:0,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,targetDate:TARGET_DATE,targetTickers:[...TARGET_TICKERS],scannedFiles:candidates.map(item=>({file:item.relative,size:item.size})),hits,selection,textEvidence,summary:{scannedFiles:candidates.length,totalHits:hits.length,marketParquetTickers:Object.keys(selection.selected).length,targetTickers:TARGET_TICKERS.length,conflicts:selection.conflicts.length,complete:selection.complete}};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.3 LOCAL BENCHMARK INVENTORY",`generatedAt=${generatedAt}`,`status=${report.status}`,"providerCalls=0","publicMutation=false productionFormulaChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)",`targetDate=${TARGET_DATE}`,`summary scannedFiles=${report.summary.scannedFiles} totalHits=${report.summary.totalHits} marketParquetTickers=${report.summary.marketParquetTickers}/${report.summary.targetTickers} conflicts=${report.summary.conflicts} complete=${report.summary.complete}`,"","TICKER | FOUND | CLOSE | VOLUME | FILE | SOURCE"];
  for(const ticker of TARGET_TICKERS){const hit=selection.selected[ticker];lines.push(`${ticker} | ${hit?"YES":"NO"} | ${hit?.close??"NA"} | ${hit?.volume??"NA"} | ${hit?.file??"NA"} | ${hit?.source||"NA"}`);}
  if(selection.conflicts.length){lines.push("","CONFLICTS");for(const item of selection.conflicts)lines.push(`${item.ticker} | closes=${item.closes.join(",")} | files=${item.files.join(",")}`);}
  if(textEvidence.length){lines.push("","TEXT_EVIDENCE_ONLY");for(const item of textEvidence.slice(0,50))lines.push(`${item.file} | ${item.tickers.join(",")}`);}
  lines.push("","note=READ_ONLY_LOCAL_INVENTORY_NO_PROVIDER_CALL_NO_FILL_NO_FORWARD_FILL","note=ONLY_MARKETPARQUET-EVIDENCED_ROWS_ARE_ELIGIBLE_FOR_NEXT_SHADOW_REPAIR_TEST","note=PRODUCTION_SOURCE_CONTRACT_REMAINS_UNCHANGED");
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,lines.join("\n")+"\n");return {status:report.status,jsonFile,txtFile,providerCalls:0,publicMutation:false,productionFormulaChanged:false,summary:report.summary};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runSectorFearGreedR2133LocalBenchmarkInventory().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"R2133_LOCAL_BENCHMARK_INVENTORY_FAILED";console.log(JSON.stringify({status:"FAILED",code,providerCalls:0,publicMutation:false,productionFormulaChanged:false}));process.exitCode=1;});
}
