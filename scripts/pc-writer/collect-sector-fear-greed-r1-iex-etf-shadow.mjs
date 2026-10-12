import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {fetchTickerHistory} from "../../lib/market-score/breadth-b1-r3-provider.mjs";
import {IEX_ATTRIBUTION} from "../../lib/market-score/breadth-b1-r3-contract.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";

export const SECTOR_FEAR_GREED_R1_IEX_PRICE_METHOD="SECTOR-FEAR-GREED-R1-IEX-ETF-SHADOW-V1";
const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PRICE_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const RUN_JSON="local-sector-fear-greed-r1-iex-etf-last-run.json";
const RUN_TXT="local-sector-fear-greed-r1-iex-etf-last-run.txt";
const TARGETS=Object.freeze(["SPY",...Object.values(SECTOR_FEAR_GREED_R1_ETFS)]);
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));
function safeCode(error,fallback="SECTOR_IEX_ETF_COLLECTION_FAILED"){const message=String(error?.message??"");return /^[A-Z0-9_:-]+$/.test(message)?message:String(error?.code??fallback).replace(/[^A-Z0-9_:-]/gi,"_").slice(0,80)||fallback;}
function normalizeBars(bars=[]){const map=new Map();for(const row of Array.isArray(bars)?bars:[]){const date=String(row?.date??""),close=Number(row?.close),volume=Number(row?.volume);if(validDate(date)&&finite(close)&&close>0&&finite(volume)&&volume>=0)map.set(date,{date,close,volume});}return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,text){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,text);fs.renameSync(tmp,file);}
export function summarizeIexSectorPriceBundle(series){const counts=TARGETS.map(ticker=>series?.[ticker]?.length??0);return {targets:TARGETS.length,minRows:Math.min(...counts),maxRows:Math.max(...counts),first:TARGETS.map(ticker=>series?.[ticker]?.[0]?.date).filter(Boolean).sort()[0]??null,last:TARGETS.map(ticker=>series?.[ticker]?.at(-1)?.date).filter(Boolean).sort().at(-1)??null};}
export async function collectSectorFearGreedR1IexEtfShadow(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{fetchHistory=fetchTickerHistory,now=new Date()}={}){
  const series={},failures=[];let providerRequests=0;
  for(const ticker of TARGETS){
    providerRequests++;
    try{const result=await fetchHistory({ticker});const rows=normalizeBars(result?.bars);if(!rows.length)throw new Error("BARS_HISTORY_EMPTY");series[ticker]=rows;}
    catch(error){failures.push({ticker,code:safeCode(error)});}
  }
  if(failures.length)throw new Error("SECTOR_IEX_ETF_TARGETS_INCOMPLETE");
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),summary=summarizeIexSectorPriceBundle(series),priceFile=path.join(base,PRICE_FILE),jsonFile=path.join(base,RUN_JSON),txtFile=path.join(base,RUN_TXT);
  const payload={version:1,methodologyVersion:SECTOR_FEAR_GREED_R1_IEX_PRICE_METHOD,mode:"SHADOW_ONLY",source:"IEX HIST via Sophostechne",feed:"TOPS1.6",attribution:IEX_ATTRIBUTION,licenseUse:"LOCAL_RAW_DERIVED_PUBLIC_OUTPUT_ONLY",generatedAt,targets:[...TARGETS],counts:Object.fromEntries(TARGETS.map(ticker=>[ticker,series[ticker].length])),series};
  saveJson(priceFile,payload);
  const run={version:1,generatedAt,status:"READY_IEX_WINDOW",mode:"SHADOW_ONLY",providerRequests,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,rawHistoryStoredLocally:true,priceFile,...summary,next:"RUN_PIT_READINESS_WITH_IEX_PRICE_FILE"};
  saveJson(jsonFile,run);
  saveText(txtFile,["ZGMINI SECTOR FEAR & GREED R1 IEX ETF SHADOW BACKFILL",`generatedAt=${generatedAt}`,`status=${run.status}`,`providerRequests=${providerRequests}`,`targets=${summary.targets}`,`minRows=${summary.minRows} maxRows=${summary.maxRows}`,`window=${summary.first}..${summary.last}`,`priceFile=${priceFile}`,"publicMutation=false dbSchemaChanged=false productionFormulaChanged=false","next=RUN_PIT_READINESS_WITH_IEX_PRICE_FILE"].join("\n")+"\n");
  return {...run,jsonFile,txtFile};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  collectSectorFearGreedR1IexEtfShadow().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.log(JSON.stringify({status:"FAILED",code:safeCode(error),publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false}));process.exitCode=1;});
}
