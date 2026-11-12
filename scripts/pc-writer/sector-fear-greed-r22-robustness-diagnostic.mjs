import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {gunzipSync} from "node:zlib";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv,buildPointInTimeSectorInputs} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {buildSectorSpeculativeCandidateR22} from "../../lib/market-score/sector-fear-greed-r22-speculative-shadow.mjs";
import {R22_ROBUSTNESS_WARNING_THRESHOLD,alignedCorrelation,maxAbsCorrelation,splitChronologicalHistory,summarizeMemberCoverage} from "../../lib/market-score/sector-fear-greed-r22-robustness.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const PRICE_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const R6_HISTORY_NAME="local-breadth-r6-shadow-history.json";
const R7_HISTORY_NAME="local-breadth-r7-pit-price-history.json";
const OUTPUT_JSON="local-sector-fear-greed-r22-robustness-diagnostic.json";
const OUTPUT_TXT="local-sector-fear-greed-r22-robustness-diagnostic.txt";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));
const round=value=>finite(value)?Math.round(value*10000)/10000:null;
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function decodeBody(value){const text=String(value??"");try{return JSON.parse(text.startsWith("gzip:")?gunzipSync(Buffer.from(text.slice(5),"base64")).toString():text);}catch{return null;}}
function putRow(map,row,source,diagnostics){const tradeDate=String(row?.tradeDate??row?.trade_date??row?.date??""),ticker=String(row?.ticker??"").trim(),currentClose=Number(row?.currentClose??row?.current_close??row?.close),currentVolume=Number(row?.currentVolume??row?.current_volume??row?.volume);if(!validDate(tradeDate)||!ticker||!finite(currentClose)||currentClose<=0||!finite(currentVolume)||currentVolume<0)return;const key=`${tradeDate}|${ticker}`,old=map.get(key);if(old&&(old.currentClose!==currentClose||old.currentVolume!==currentVolume)){diagnostics.conflicts++;const transition=`${old.source}->${source}`;diagnostics.overrides[transition]=(diagnostics.overrides[transition]??0)+1;}map.set(key,{tradeDate,ticker,currentClose,currentVolume,source});}
function tableExists(db,name){return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").get(name));}
function readStorage(base){const map=new Map(),diagnostics={conflicts:0,overrides:{}};for(const [name,source] of [[R7_HISTORY_NAME,"BREADTH_R7_LOCAL"],[R6_HISTORY_NAME,"BREADTH_R6_LOCAL"]]){const payload=safeJson(path.join(base,name));for(const row of payload?.rows??[])putRow(map,row,source,diagnostics);}const dbFile=path.join(base,"storage","core.sqlite");if(fs.existsSync(dbFile)){const db=new DatabaseSync(dbFile,{readOnly:true});db.exec("PRAGMA query_only=ON");try{if(tableExists(db,"market_score_breadth_b1_r3_current_v1")){for(const row of db.prepare("SELECT trade_date,ticker,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 ORDER BY trade_date,ticker").all())putRow(map,row,"B1_R3_STORED",diagnostics);}}finally{db.close();}}return {rows:[...map.values()],diagnostics};}
function normalizePriceRows(rows=[]){const map=new Map();for(const row of Array.isArray(rows)?rows:[]){const date=String(row?.date??row?.tradeDate??"").slice(0,10),close=Number(row?.close??row?.currentClose);if(validDate(date)&&finite(close)&&close>0)map.set(date,{date,close});}return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));}
function etfReturn20(rows=[]){const series=normalizePriceRows(rows),out=[];for(let i=20;i<series.length;i++)out.push({date:series[i].date,return20:series[i].close/series[i-20].close-1});return out;}
function compact(item){return {observations:item.observations,correlation:round(item.correlation)};}
function correlationsForSegment(rows,pitRows,etfR20){
  const p={
    lotteryVsEtfReturn20:alignedCorrelation(rows,"lotteryDemand",etfR20,"return20",{method:"pearson"}),
    lotteryVsBreadth50:alignedCorrelation(rows,"lotteryDemand",pitRows,"b50",{method:"pearson"}),
    lotteryVsDemand:alignedCorrelation(rows,"lotteryDemand",pitRows,"volumeBreadth",{method:"pearson"}),
    volumeVsDemand:alignedCorrelation(rows,"speculativeVolume",pitRows,"volumeBreadth",{method:"pearson"}),
  };
  const s={
    lotteryVsEtfReturn20:alignedCorrelation(rows,"lotteryDemand",etfR20,"return20",{method:"spearman"}),
    lotteryVsBreadth50:alignedCorrelation(rows,"lotteryDemand",pitRows,"b50",{method:"spearman"}),
    lotteryVsDemand:alignedCorrelation(rows,"lotteryDemand",pitRows,"volumeBreadth",{method:"spearman"}),
    volumeVsDemand:alignedCorrelation(rows,"speculativeVolume",pitRows,"volumeBreadth",{method:"spearman"}),
  };
  const internalP=alignedCorrelation(rows,"lotteryDemand",rows,"speculativeVolume",{method:"pearson"});
  const internalS=alignedCorrelation(rows,"lotteryDemand",rows,"speculativeVolume",{method:"spearman"});
  return {
    observations:rows.length,
    dateStart:rows[0]?.date??null,
    dateEnd:rows.at(-1)?.date??null,
    memberCoverage:summarizeMemberCoverage(rows),
    existingPearson:Object.fromEntries(Object.entries(p).map(([k,v])=>[k,compact(v)])),
    existingSpearman:Object.fromEntries(Object.entries(s).map(([k,v])=>[k,compact(v)])),
    internalPearson:compact(internalP),
    internalSpearman:compact(internalS),
    maxExistingPearson:round(maxAbsCorrelation(Object.values(p))),
    maxExistingSpearman:round(maxAbsCorrelation(Object.values(s))),
    absInternalPearson:round(Math.abs(internalP.correlation??0)),
    absInternalSpearman:round(Math.abs(internalS.correlation??0)),
  };
}
function maxFinite(values){const clean=values.filter(finite);return clean.length?Math.max(...clean):null;}

export function runSectorFearGreedR22RobustnessDiagnostic(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const pitPath=path.join(base,PIT_FILE),pricePath=path.join(base,PRICE_FILE);if(!fs.existsSync(pitPath))throw new Error("R22_ROBUSTNESS_PIT_HISTORY_MISSING");if(!fs.existsSync(pricePath))throw new Error("R22_ROBUSTNESS_IEX_PRICE_HISTORY_MISSING");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8")),storage=readStorage(base),derived=buildPointInTimeSectorInputs({rows:storage.rows,pitHistory:pit}),pricePayload=safeJson(pricePath),series=pricePayload?.series??{},spyRows=normalizePriceRows(series.SPY??[]),sectors={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const etfRows=normalizePriceRows(series[ticker]??[]),candidate=buildSectorSpeculativeCandidateR22({rows:storage.rows,spyRows,etfRows,pitHistory:pit,sectorId}),split=splitChronologicalHistory(candidate.history),pitRows=derived.sectors[sectorId]??[],etfR20=etfReturn20(etfRows);
    const first=correlationsForSegment(split.first,pitRows,etfR20),second=correlationsForSegment(split.second,pitRows,etfR20);
    const maxSubperiod=maxFinite([first.maxExistingPearson,first.maxExistingSpearman,first.absInternalPearson,first.absInternalSpearman,second.maxExistingPearson,second.maxExistingSpearman,second.absInternalPearson,second.absInternalSpearman]);
    sectors[sectorId]={ticker,historyObservations:split.all.length,status:candidate.status,first,second,maxSubperiodCorrelation:round(maxSubperiod),researchWarning:finite(maxSubperiod)&&maxSubperiod>=R22_ROBUSTNESS_WARNING_THRESHOLD};
  }
  const list=Object.values(sectors),generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.2-ROBUSTNESS",generatedAt,status:"SHADOW_ROBUSTNESS_COMPLETE",mode:"R2_2_SUBPERIOD_ROBUSTNESS_RESEARCH_ONLY",candidateWeights:{lotteryDemand:0.50,speculativeVolume:0.50},referenceRequirement:756,warningThreshold:R22_ROBUSTNESS_WARNING_THRESHOLD,warningIsProductionGate:false,providerCalls:0,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,constituentRows:storage.rows.length,spyRows:spyRows.length,storedMergeDiagnostics:storage.diagnostics,sectors,summary:{sectors:list.length,warnings:list.filter(item=>item.researchWarning).length,maxSubperiodCorrelation:round(maxFinite(list.map(item=>item.maxSubperiodCorrelation)))}};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.2 SUBPERIOD ROBUSTNESS DIAGNOSTIC",`generatedAt=${generatedAt}`,`status=${report.status}`,"candidate=50% RESIDUAL_LOTTERY_DEMAND + 50% SPECULATIVE_VOLUME","referenceRequirement=756 (UNCHANGED)",`researchWarningThreshold=${R22_ROBUSTNESS_WARNING_THRESHOLD} (NOT_PRODUCTION_GATE)`,`constituentRows=${report.constituentRows} spyRows=${report.spyRows} storedConflicts=${storage.diagnostics.conflicts}`,"","SECTOR | ETF | N | FIRST_DATES | FIRST_MAX_P | FIRST_MAX_S | FIRST_INTERNAL_P | FIRST_INTERNAL_S | SECOND_DATES | SECOND_MAX_P | SECOND_MAX_S | SECOND_INTERNAL_P | SECOND_INTERNAL_S | MEMBER_MEDIAN_1 | MEMBER_MEDIAN_2 | WARN"];
  for(const [sectorId,item] of Object.entries(sectors)){
    const a=item.first,b=item.second;
    lines.push(`${sectorId} | ${item.ticker} | ${item.historyObservations} | ${a.dateStart}..${a.dateEnd} | ${a.maxExistingPearson??"NA"} | ${a.maxExistingSpearman??"NA"} | ${a.absInternalPearson??"NA"} | ${a.absInternalSpearman??"NA"} | ${b.dateStart}..${b.dateEnd} | ${b.maxExistingPearson??"NA"} | ${b.maxExistingSpearman??"NA"} | ${b.absInternalPearson??"NA"} | ${b.absInternalSpearman??"NA"} | ${a.memberCoverage.memberMedian??"NA"} | ${b.memberCoverage.memberMedian??"NA"} | ${item.researchWarning?"YES":"NO"}`);
  }
  lines.push("",`summary sectors=${report.summary.sectors} warnings=${report.summary.warnings} maxSubperiodCorrelation=${report.summary.maxSubperiodCorrelation??"NA"}`,"providerCalls=0 rawRowsStored=false publicMutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false","note=ROBUSTNESS_ONLY_NO_FORMULA_APPROVAL_NO_PRODUCTION_CHANGE");
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,lines.join("\n")+"\n");return {status:report.status,jsonFile,txtFile,providerCalls:0,publicMutation:false,productionFormulaChanged:false,summary:report.summary};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(runSectorFearGreedR22RobustnessDiagnostic(),null,2));}catch(error){const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"R22_ROBUSTNESS_DIAGNOSTIC_FAILED";console.log(JSON.stringify({status:"FAILED",code,providerCalls:0,publicMutation:false,productionFormulaChanged:false}));process.exitCode=1;}}
