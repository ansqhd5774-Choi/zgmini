import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {mergeAlpacaRows} from "./sector-fear-greed-r25-alpaca-reuse-diagnostic.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const ALPACA_DIR="asset-r10-alpaca";
const PRICE_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const OUTPUT_JSON="local-sector-fear-greed-r2132-r24-calendar-gap-diagnostic.json";
const OUTPUT_TXT="local-sector-fear-greed-r2132-r24-calendar-gap-diagnostic.txt";
const CUTOFF="2026-08-26";

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function safeArray(file){const value=safeJson(file);return Array.isArray(value)?value:[];}
function listStoredFiles(dir){const base=fs.existsSync(dir)?fs.readdirSync(dir).filter(name=>/^group-\d+\.json$/.test(name)).map(name=>path.join(dir,name)):[];const incrementalDir=path.join(dir,"incremental");const incremental=fs.existsSync(incrementalDir)?fs.readdirSync(incrementalDir).filter(name=>!/^\./.test(name)).map(name=>path.join(incrementalDir,name)).filter(file=>fs.statSync(file).isFile()):[];return [...base,...incremental];}
function normalizeDates(rows=[]){const out=new Set();for(const row of Array.isArray(rows)?rows:[]){const date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10);if(validDate(date))out.add(date);}return [...out].sort();}
function normalizeStockRows(rows=[]){const byTicker=new Map();for(const row of Array.isArray(rows)?rows:[]){const ticker=String(row?.ticker??"").trim(),date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10),close=Number(row?.close??row?.currentClose??row?.current_close),volume=Number(row?.volume??row?.currentVolume??row?.current_volume);if(!ticker||!validDate(date)||!finite(close)||close<=0||!finite(volume)||volume<0)continue;const list=byTicker.get(ticker)??[];list.push({date});byTicker.set(ticker,list);}for(const list of byTicker.values())list.sort((a,b)=>a.date.localeCompare(b.date));return byTicker;}
function sortedUnique(values=[]){return [...new Set(values)].sort();}
function missingFrom(reference=[],candidate=[]){const set=new Set(candidate);return reference.filter(date=>!set.has(date));}

export function analyzeR24CalendarGap({alpacaRows=[],spyRows=[],etfRows=[],cutoff=CUTOFF}={}){
  const byTicker=normalizeStockRows(alpacaRows),alpacaDates=sortedUnique([...byTicker.values()].flatMap(list=>list.map(row=>row.date))),spyDates=normalizeDates(spyRows),etfDatesNormalized=normalizeDates(etfRows),spySet=new Set(spyDates),etfSet=new Set(etfDatesNormalized);
  const postDates=alpacaDates.filter(date=>date>cutoff),missingSpyPost=missingFrom(postDates,spyDates),missingEtfPost=missingFrom(postDates,etfDatesNormalized),benchmarkCommonPost=postDates.filter(date=>spySet.has(date)&&etfSet.has(date));
  let eligibleWindows=0,blockedBySpy=0,blockedByEtf=0,firstEligibleDate=null,lastEligibleDate=null;
  for(const series of byTicker.values()){
    for(let i=60;i<series.length;i++){
      const date=series[i].date;if(date<=cutoff)continue;const window=series.slice(i-60,i+1).map(row=>row.date),missSpy=window.some(d=>!spySet.has(d)),missEtf=window.some(d=>!etfSet.has(d));if(missSpy){blockedBySpy++;continue;}if(missEtf){blockedByEtf++;continue;}eligibleWindows++;if(!firstEligibleDate||date<firstEligibleDate)firstEligibleDate=date;if(!lastEligibleDate||date>lastEligibleDate)lastEligibleDate=date;
    }
  }
  return {cutoff,alpacaDates:{n:alpacaDates.length,first:alpacaDates[0]??null,last:alpacaDates.at(-1)??null,postN:postDates.length},spyDates:{n:spyDates.length,first:spyDates[0]??null,last:spyDates.at(-1)??null,missingPost:missingSpyPost},etfDates:{n:etfDatesNormalized.length,first:etfDatesNormalized[0]??null,last:etfDatesNormalized.at(-1)??null,missingPost:missingEtfPost},benchmarkCommonPost:{n:benchmarkCommonPost.length,first:benchmarkCommonPost[0]??null,last:benchmarkCommonPost.at(-1)??null},windowEligibility:{eligibleWindows,blockedBySpy,blockedByEtf,firstEligibleDate,lastEligibleDate}};
}

export function runSectorFearGreedR2132CalendarGap(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const dir=path.join(base,ALPACA_DIR),pricePath=path.join(base,PRICE_FILE);if(!fs.existsSync(dir))throw new Error("R2132_ALPACA_LOCAL_STORE_MISSING");if(!fs.existsSync(pricePath))throw new Error("R2132_IEX_PRICE_HISTORY_MISSING");const files=listStoredFiles(dir);if(!files.length)throw new Error("R2132_ALPACA_FILES_MISSING");const merged=mergeAlpacaRows(files.map(safeArray)),price=safeJson(pricePath),series=price?.series??{},sectors={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS))sectors[sectorId]={ticker,...analyzeR24CalendarGap({alpacaRows:merged.rows,spyRows:series.SPY??[],etfRows:series[ticker]??[]})};
  const list=Object.values(sectors),generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.13.2-R24-CALENDAR-GAP",generatedAt,status:"SHADOW_R2132_R24_CALENDAR_GAP_COMPLETE",providerCalls:0,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,r24ApprovedForProduction:false,candidateSelected:false,alpacaRows:merged.rows.length,conflicts:merged.conflicts.length,summary:{sectors:list.length,sectorsWithMissingSpyPost:list.filter(x=>x.spyDates.missingPost.length>0).length,sectorsWithMissingEtfPost:list.filter(x=>x.etfDates.missingPost.length>0).length,sectorsWithAnyEligiblePostWindow:list.filter(x=>x.windowEligibility.eligibleWindows>0).length},sectors};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.2 R2.4 CALENDAR GAP DIAGNOSTIC",`generatedAt=${generatedAt}`,`status=${report.status}`,"providerCalls=0","publicMutation=false productionFormulaChanged=false referenceRequirementChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED)",`alpacaRows=${report.alpacaRows} conflicts=${report.conflicts}`,`summary sectors=${report.summary.sectors} missingSpyPost=${report.summary.sectorsWithMissingSpyPost} missingEtfPost=${report.summary.sectorsWithMissingEtfPost} anyEligiblePostWindow=${report.summary.sectorsWithAnyEligiblePostWindow}`,"","SECTOR | ETF | ALPACA_POST_N | SPY_MISSING_POST | ETF_MISSING_POST | COMMON_POST_N | ELIGIBLE_WINDOWS | BLOCKED_SPY | BLOCKED_ETF | FIRST_ELIGIBLE | LAST_ELIGIBLE | FIRST_SPY_MISSING | FIRST_ETF_MISSING"];
  for(const [sectorId,item] of Object.entries(sectors))lines.push(`${sectorId} | ${item.ticker} | ${item.alpacaDates.postN} | ${item.spyDates.missingPost.length} | ${item.etfDates.missingPost.length} | ${item.benchmarkCommonPost.n} | ${item.windowEligibility.eligibleWindows} | ${item.windowEligibility.blockedBySpy} | ${item.windowEligibility.blockedByEtf} | ${item.windowEligibility.firstEligibleDate??"NA"} | ${item.windowEligibility.lastEligibleDate??"NA"} | ${item.spyDates.missingPost[0]??"NA"} | ${item.etfDates.missingPost[0]??"NA"}`);
  lines.push("","note=DIAGNOSTIC_ONLY_NO_METHOD_CHANGE","note=IF_SINGLE_BENCHMARK_GAP_CONTAMINATES_61_ROW_WINDOWS_DO_NOT_FILL_OR_FORWARD_FILL_WITHOUT_SEPARATE_APPROVAL");fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,lines.join("\n")+"\n");return {status:report.status,jsonFile,txtFile,providerCalls:0,publicMutation:false,productionFormulaChanged:false,summary:report.summary};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(runSectorFearGreedR2132CalendarGap(),null,2));}catch(error){const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"R2132_CALENDAR_GAP_FAILED";console.log(JSON.stringify({status:"FAILED",code,providerCalls:0,publicMutation:false,productionFormulaChanged:false}));process.exitCode=1;}}
