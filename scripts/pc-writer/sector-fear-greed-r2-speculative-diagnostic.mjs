import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {gunzipSync} from "node:zlib";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv,buildPointInTimeSectorInputs} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {buildSectorSpeculativeCandidate,buildSectorSpeculativeCandidateR21} from "../../lib/market-score/sector-fear-greed-r2-speculative-shadow.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const PRICE_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const R6_HISTORY_NAME="local-breadth-r6-shadow-history.json";
const R7_HISTORY_NAME="local-breadth-r7-pit-price-history.json";
const OUTPUT_JSON="local-sector-fear-greed-r2-speculative-diagnostic.json";
const OUTPUT_TXT="local-sector-fear-greed-r2-speculative-diagnostic.txt";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function decodeBody(value){const text=String(value??"");try{return JSON.parse(text.startsWith("gzip:")?gunzipSync(Buffer.from(text.slice(5),"base64")).toString():text);}catch{return null;}}
function putRow(map,row,source,diagnostics){const tradeDate=String(row?.tradeDate??row?.trade_date??row?.date??""),ticker=String(row?.ticker??"").trim(),currentClose=Number(row?.currentClose??row?.current_close??row?.close),currentVolume=Number(row?.currentVolume??row?.current_volume??row?.volume);if(!validDate(tradeDate)||!ticker||!finite(currentClose)||currentClose<=0||!finite(currentVolume)||currentVolume<0)return;const key=`${tradeDate}|${ticker}`,old=map.get(key);if(old&&(old.currentClose!==currentClose||old.currentVolume!==currentVolume)){diagnostics.conflicts++;const transition=`${old.source}->${source}`;diagnostics.overrides[transition]=(diagnostics.overrides[transition]??0)+1;}map.set(key,{tradeDate,ticker,currentClose,currentVolume,source});}
function tableExists(db,name){return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").get(name));}
function readStorage(base){const map=new Map(),diagnostics={conflicts:0,overrides:{}};for(const [name,source] of [[R7_HISTORY_NAME,"BREADTH_R7_LOCAL"],[R6_HISTORY_NAME,"BREADTH_R6_LOCAL"]]){const payload=safeJson(path.join(base,name));for(const row of payload?.rows??[])putRow(map,row,source,diagnostics);}const dbFile=path.join(base,"storage","core.sqlite");if(fs.existsSync(dbFile)){const db=new DatabaseSync(dbFile,{readOnly:true});db.exec("PRAGMA query_only=ON");try{if(tableExists(db,"market_score_breadth_b1_r3_current_v1")){for(const row of db.prepare("SELECT trade_date,ticker,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 ORDER BY trade_date,ticker").all())putRow(map,row,"B1_R3_STORED",diagnostics);}}finally{db.close();}}return {rows:[...map.values()],diagnostics};}
function normalizePriceRows(rows=[]){const map=new Map();for(const row of Array.isArray(rows)?rows:[]){const date=String(row?.date??row?.tradeDate??"").slice(0,10),close=Number(row?.close??row?.currentClose);if(validDate(date)&&finite(close)&&close>0)map.set(date,{date,close});}return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));}
function pearson(left,right){if(left.length!==right.length||left.length<20)return null;const ml=left.reduce((a,b)=>a+b,0)/left.length,mr=right.reduce((a,b)=>a+b,0)/right.length;let num=0,dl=0,dr=0;for(let i=0;i<left.length;i++){const x=left[i]-ml,y=right[i]-mr;num+=x*y;dl+=x*x;dr+=y*y;}return dl>0&&dr>0?num/Math.sqrt(dl*dr):null;}
function correlate(aRows,aKey,bRows,bKey){const bMap=new Map(bRows.filter(row=>finite(row?.[bKey])).map(row=>[row.date,row[bKey]])),x=[],y=[];for(const row of aRows){if(!finite(row?.[aKey])||!bMap.has(row.date))continue;x.push(row[aKey]);y.push(bMap.get(row.date));}return {observations:x.length,pearson:pearson(x,y)};}
function etfReturn20(rows=[]){const series=normalizePriceRows(rows),out=[];for(let i=20;i<series.length;i++)out.push({date:series[i].date,return20:series[i].close/series[i-20].close-1});return out;}
function round(value){return finite(value)?Math.round(value*10000)/10000:null;}
function compactCorr(map){return Object.fromEntries(Object.entries(map).map(([k,v])=>[k,{observations:v.observations,pearson:round(v.pearson)}]));}
function maxAbs(map){return Math.max(0,...Object.values(map).map(item=>Math.abs(item.pearson??0)));}

export function runSectorFearGreedR2SpeculativeDiagnostic(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const pitPath=path.join(base,PIT_FILE),pricePath=path.join(base,PRICE_FILE);if(!fs.existsSync(pitPath))throw new Error("SECTOR_SPEC_PIT_HISTORY_MISSING");if(!fs.existsSync(pricePath))throw new Error("SECTOR_SPEC_IEX_PRICE_HISTORY_MISSING");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8")),storage=readStorage(base),derived=buildPointInTimeSectorInputs({rows:storage.rows,pitHistory:pit}),pricePayload=safeJson(pricePath),series=pricePayload?.series??{},spyRows=normalizePriceRows(series.SPY??[]),sectors={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const etfRows=normalizePriceRows(series[ticker]??[]),r2=buildSectorSpeculativeCandidate({rows:storage.rows,spyRows,pitHistory:pit,sectorId}),r21=buildSectorSpeculativeCandidateR21({rows:storage.rows,spyRows,etfRows,pitHistory:pit,sectorId}),pitRows=derived.sectors[sectorId]??[],etfR20=etfReturn20(etfRows);
    const oldCorrelations={
      tailVsEtfReturn20:correlate(r2.history,"tailBalance",etfR20,"return20"),
      leadershipVsEtfReturn20:correlate(r2.history,"speculativeLeadership",etfR20,"return20"),
      volumeVsDemand:correlate(r2.history,"speculativeVolume",pitRows,"volumeBreadth"),
      tailVsBreadth50:correlate(r2.history,"tailBalance",pitRows,"b50"),
    };
    const r21ExistingCorrelations={
      lotteryVsEtfReturn20:correlate(r21.history,"lotteryDemand",etfR20,"return20"),
      lotteryVsBreadth50:correlate(r21.history,"lotteryDemand",pitRows,"b50"),
      lotteryVsDemand:correlate(r21.history,"lotteryDemand",pitRows,"volumeBreadth"),
      leadershipVsEtfReturn20:correlate(r21.history,"speculativeLeadership",etfR20,"return20"),
      volumeVsDemand:correlate(r21.history,"speculativeVolume",pitRows,"volumeBreadth"),
    };
    const r21InternalCorrelations={
      lotteryVsLeadership:correlate(r21.history,"lotteryDemand",r21.history,"speculativeLeadership"),
      lotteryVsVolume:correlate(r21.history,"lotteryDemand",r21.history,"speculativeVolume"),
      leadershipVsVolume:correlate(r21.history,"speculativeLeadership",r21.history,"speculativeVolume"),
    };
    const oldMax=maxAbs(oldCorrelations),r21Max=maxAbs(r21ExistingCorrelations),r21InternalMax=maxAbs(r21InternalCorrelations);
    sectors[sectorId]={
      ticker,
      historyObservations:r21.history.length,
      oldR2:{status:r2.status,score:r2.score,current:{tailBalance:r2.metrics.tailBalance.current,speculativeLeadership:r2.metrics.speculativeLeadership.current,speculativeVolume:r2.metrics.speculativeVolume.current},referenceObservations:{tailBalance:r2.metrics.tailBalance.referenceObservations,speculativeLeadership:r2.metrics.speculativeLeadership.referenceObservations,speculativeVolume:r2.metrics.speculativeVolume.referenceObservations},correlations:compactCorr(oldCorrelations),maxAbsExistingCorrelation:round(oldMax)},
      r21:{status:r21.status,score:r21.score,current:{lotteryDemand:r21.metrics.lotteryDemand.current,speculativeLeadership:r21.metrics.speculativeLeadership.current,speculativeVolume:r21.metrics.speculativeVolume.current},referenceObservations:{lotteryDemand:r21.metrics.lotteryDemand.referenceObservations,speculativeLeadership:r21.metrics.speculativeLeadership.referenceObservations,speculativeVolume:r21.metrics.speculativeVolume.referenceObservations},existingCorrelations:compactCorr(r21ExistingCorrelations),internalCorrelations:compactCorr(r21InternalCorrelations),maxAbsExistingCorrelation:round(r21Max),maxAbsInternalCorrelation:round(r21InternalMax),redundancyFlag:r21Max>=0.85?"HIGH":"NOT_HIGH"},
    };
  }
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:2,generatedAt,status:"SHADOW_DIAGNOSTIC_COMPLETE",mode:"R2_1_SPECULATIVE_APPETITE_RESEARCH_ONLY",providerCalls:0,rawRowsStored:false,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirement:756,oldCandidateWeights:{tailBalance:0.40,speculativeLeadership:0.40,speculativeVolume:0.20},r21CandidateWeights:{lotteryDemand:0.40,speculativeLeadership:0.40,speculativeVolume:0.20},economicIntent:"REPLACE_REDUNDANT_TAIL_BALANCE_WITH_SECTOR_ETF_RESIDUAL_LOTTERY_DEMAND",constituentRows:storage.rows.length,spyRows:spyRows.length,storedMergeDiagnostics:storage.diagnostics,sectors};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.1 SPECULATIVE APPETITE DIAGNOSTIC",`generatedAt=${generatedAt}`,`status=${report.status}`,`constituentRows=${report.constituentRows} spyRows=${report.spyRows}`,`storedConflicts=${report.storedMergeDiagnostics.conflicts}`,"oldCandidate=40% TAIL_BALANCE + 40% SPECULATIVE_LEADERSHIP + 20% SPECULATIVE_VOLUME","r21Candidate=40% RESIDUAL_LOTTERY_DEMAND + 40% SPECULATIVE_LEADERSHIP + 20% SPECULATIVE_VOLUME","referenceRequirement=756 (UNCHANGED)","","SECTOR | ETF | HISTORY | LOTTERY_REF | LEAD_REF | VOL_REF | OLD_MAX_EXISTING | R21_MAX_EXISTING | R21_MAX_INTERNAL | REDUNDANCY"];
  for(const [sectorId,item] of Object.entries(sectors)){
    const old=item.oldR2,r21=item.r21;
    lines.push(`${sectorId} | ${item.ticker} | ${item.historyObservations} | ${r21.referenceObservations.lotteryDemand} | ${r21.referenceObservations.speculativeLeadership} | ${r21.referenceObservations.speculativeVolume} | ${old.maxAbsExistingCorrelation??"NA"} | ${r21.maxAbsExistingCorrelation??"NA"} | ${r21.maxAbsInternalCorrelation??"NA"} | ${r21.redundancyFlag}`);
    lines.push(`  old corr tail~ETF20=${old.correlations.tailVsEtfReturn20.pearson??"NA"} tail~B50=${old.correlations.tailVsBreadth50.pearson??"NA"}`);
    lines.push(`  r21 corr lottery~ETF20=${r21.existingCorrelations.lotteryVsEtfReturn20.pearson??"NA"} lottery~B50=${r21.existingCorrelations.lotteryVsBreadth50.pearson??"NA"} lottery~D=${r21.existingCorrelations.lotteryVsDemand.pearson??"NA"} lead~ETF20=${r21.existingCorrelations.leadershipVsEtfReturn20.pearson??"NA"} vol~D=${r21.existingCorrelations.volumeVsDemand.pearson??"NA"}`);
    lines.push(`  r21 internal lottery~lead=${r21.internalCorrelations.lotteryVsLeadership.pearson??"NA"} lottery~vol=${r21.internalCorrelations.lotteryVsVolume.pearson??"NA"} lead~vol=${r21.internalCorrelations.leadershipVsVolume.pearson??"NA"}`);
  }
  lines.push("","providerCalls=0 rawRowsStored=false publicMutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false","note=CANDIDATE_ONLY_NOT_APPROVED_NOT_PRODUCTION");
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,lines.join("\n")+"\n");return {status:report.status,jsonFile,txtFile,providerCalls:0,publicMutation:false,productionFormulaChanged:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(runSectorFearGreedR2SpeculativeDiagnostic(),null,2));}catch(error){const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"SECTOR_SPEC_DIAGNOSTIC_FAILED";console.log(JSON.stringify({status:"FAILED",code,providerCalls:0,publicMutation:false,productionFormulaChanged:false}));process.exitCode=1;}}
