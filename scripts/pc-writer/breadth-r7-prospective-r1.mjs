import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {buildBreadthR7PitUniverse} from "./build-breadth-r7-pit-universe.mjs";
import {buildBreadthR6Components} from "../../lib/market-score/breadth-r6-shadow.mjs";
import {universeForDate} from "../../lib/market-score/breadth-r7-pit-shadow.mjs";
import {save} from "./d1.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_NAME="local-breadth-r7-pit-universe.json";
const R7_PRICE_NAME="local-breadth-r7-pit-price-history.json";
const R6_PRICE_NAME="local-breadth-r6-shadow-history.json";
const LEDGER_NAME="local-breadth-r7-prospective-ledger-r1.json";
const REPORT_NAME="local-breadth-r7-prospective-last-run.json";
const METHOD="BREADTH_R7_PROSPECTIVE_R1";
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const key=(date,ticker)=>date+"|"+ticker;

function readJson(file){
  return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):null;
}
function addDays(date,n){
  return new Date(Date.parse(date+"T00:00:00Z")+n*86400000).toISOString().slice(0,10);
}
function days(a,b){
  return Math.floor((Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/86400000);
}
function normalizeBenchmark(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const observationDate=String(row?.observationDate??row?.date??"").slice(0,10);
    const value=Number(row?.value);
    if(validDate(observationDate)&&finite(value)&&value>0)map.set(observationDate,{observationDate,value});
  }
  return [...map.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
}
function latestAtOrBefore(rows,date){
  let found=null;
  for(const row of rows){if(row.observationDate<=date)found=row;else break}
  return found;
}
function firstAtOrAfter(rows,date,maxGapDays=10){
  const found=rows.find(row=>row.observationDate>=date)??null;
  if(!found||days(date,found.observationDate)>maxGapDays)return null;
  return found;
}
function mean(values){
  const clean=values.filter(finite);
  return clean.length?clean.reduce((a,b)=>a+b,0)/clean.length:null;
}
function pearson(xs,ys){
  const pairs=xs.map((x,i)=>[x,ys[i]]).filter(([x,y])=>finite(x)&&finite(y));
  if(pairs.length<3)return null;
  const mx=mean(pairs.map(([x])=>x)),my=mean(pairs.map(([,y])=>y));
  const num=pairs.reduce((s,[x,y])=>s+(x-mx)*(y-my),0);
  const dx=Math.sqrt(pairs.reduce((s,[x])=>s+(x-mx)**2,0));
  const dy=Math.sqrt(pairs.reduce((s,[,y])=>s+(y-my)**2,0));
  return dx>0&&dy>0?num/(dx*dy):null;
}
function addPriceRow(map,row,source){
  const tradeDate=String(row?.tradeDate??row?.trade_date??row?.date??"");
  const ticker=String(row?.ticker??"").trim();
  const currentClose=Number(row?.currentClose??row?.current_close??row?.close);
  const currentVolume=Number(row?.currentVolume??row?.current_volume??row?.volume??0);
  const previousRaw=row?.previousClose??row?.previous_close;
  const previousClose=previousRaw==null?null:Number(previousRaw);
  if(!validDate(tradeDate)||!ticker||!finite(currentClose)||currentClose<=0||!finite(currentVolume)||currentVolume<0)return;
  map.set(key(tradeDate,ticker),{
    trade_date:tradeDate,ticker,
    previous_close:finite(previousClose)&&previousClose>0?previousClose:null,
    current_close:currentClose,current_volume:currentVolume,
    source,
  });
}
async function latestStoredBreadthUniverseDate(base){
  const db=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const row=await db.prepare("SELECT trade_date FROM market_score_breadth_b1_r3_universe_v1 ORDER BY trade_date DESC LIMIT 1").first();
    return validDate(row?.trade_date)?String(row.trade_date):null;
  }finally{db.close()}
}
async function ensurePitUniverseCurrent(base,latestUniverseDate){
  let pit=readJson(path.join(base,PIT_NAME));
  if(pit?.status==="READY"&&pit?.currentDate===latestUniverseDate)return {status:"READY",pit,refreshed:false,providerCalls:0};
  try{
    const refreshed=await buildBreadthR7PitUniverse(base);
    pit=readJson(path.join(base,PIT_NAME));
    if(refreshed?.status!=="READY"||pit?.status!=="READY"||pit?.currentDate!==latestUniverseDate){
      return {status:"WAITING",reason:"BREADTH_R7_PROSPECTIVE_PIT_REFRESH_INCOMPLETE",refreshed:true,providerCalls:Number(refreshed?.providerCalls??0)};
    }
    return {status:"READY",pit,refreshed:true,providerCalls:Number(refreshed?.providerCalls??0)};
  }catch(error){
    return {status:"WAITING",reason:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):"BREADTH_R7_PROSPECTIVE_PIT_REFRESH_FAILED",refreshed:true,providerCalls:0};
  }
}
async function loadCurrentPriceRows(base,db,pit){
  const map=new Map();
  for(const row of readJson(path.join(base,R7_PRICE_NAME))?.rows??[])addPriceRow(map,row,row?.source??"R7_PIT_PRICE_HISTORY");
  for(const row of readJson(path.join(base,R6_PRICE_NAME))?.rows??[])addPriceRow(map,row,row?.source??"R6_SHADOW_HISTORY");
  const stored=(await db.prepare(
    "SELECT trade_date,ticker,previous_close,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date IN (SELECT trade_date FROM (SELECT DISTINCT trade_date FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date<=? ORDER BY trade_date DESC LIMIT 270)) ORDER BY trade_date,ticker"
  ).bind(pit.currentDate).all()).results??[];
  for(const row of stored)addPriceRow(map,row,"B1_R3_STORED");
  return [...map.values()].sort((a,b)=>a.trade_date.localeCompare(b.trade_date)||a.ticker.localeCompare(b.ticker));
}

export function buildCurrentBreadthR7Signal({pit,rows}={}){
  if(pit?.status!=="READY"||!pit?.membershipLookAheadSafe||!pit?.currentUniverseSurvivorshipBiasRemoved||!validDate(pit?.currentDate)){
    return {status:"PARTIAL",reason:"BREADTH_R7_PROSPECTIVE_PIT_NOT_READY"};
  }
  const universe=universeForDate(pit.universes,pit.currentDate);
  if(!universe)return {status:"PARTIAL",reason:"BREADTH_R7_PROSPECTIVE_UNIVERSE_MISSING"};
  const result=buildBreadthR6Components({rows,members:universe.members,asOfDate:pit.currentDate});
  if(result.status!=="READY"||!finite(result.score)){
    return {status:"PARTIAL",reason:result.reason??"BREADTH_R7_PROSPECTIVE_SCORE_NOT_READY",coverage:result.coverage??null,readiness:result.readiness??null};
  }
  return {
    status:"READY",
    signalDate:pit.currentDate,
    score:result.score,
    methodologyVersion:result.methodologyVersion,
    membershipMethodologyVersion:pit.methodologyVersion,
    membershipEventDigest:pit.eventDigest,
    memberCount:universe.members.length,
    coverage:result.coverage,
    components:result.components,
    currentAnchorReconciled:pit.currentAnchorReconciled??false,
    currentAnchorRepairCount:Number(pit.currentAnchorRepairCount??0),
  };
}

export function evaluateBreadthProspectiveLedger(signals=[],benchmarkRows=[]){
  const benchmark=normalizeBenchmark(benchmarkRows);
  const matured=(Array.isArray(signals)?signals:[]).map(signal=>{
    const base=benchmark.find(row=>row.observationDate===signal.benchmarkDate)??latestAtOrBefore(benchmark,signal.signalDate);
    if(!base)return {...signal,return1m:null,return3m:null,maxDrawdown3m:null};
    const p30=firstAtOrAfter(benchmark,addDays(signal.signalDate,30));
    const p90=firstAtOrAfter(benchmark,addDays(signal.signalDate,90));
    const end90=p90?.observationDate??addDays(signal.signalDate,90);
    const forward=benchmark.filter(row=>row.observationDate>base.observationDate&&row.observationDate<=end90);
    const minForward=forward.length?Math.min(...forward.map(row=>row.value)):null;
    return {
      ...signal,
      return1m:p30?100*(p30.value/base.value-1):null,
      return3m:p90?100*(p90.value/base.value-1):null,
      maxDrawdown3m:finite(minForward)?100*(minForward/base.value-1):null,
    };
  });
  const fields=["score","shortTerm","twentyDay","ma50","ma200","highLow52w"];
  const metrics={};
  for(const field of fields){
    const values=matured.map(row=>field==="score"?row.score:row.components?.[field]);
    const r1=matured.map(row=>row.return1m),r3=matured.map(row=>row.return3m);
    metrics[field]={
      observations:values.filter(finite).length,
      eligible1m:matured.filter((row,i)=>finite(values[i])&&finite(row.return1m)).length,
      eligible3m:matured.filter((row,i)=>finite(values[i])&&finite(row.return3m)).length,
      correlation1m:pearson(values,r1),
      correlation3m:pearson(values,r3),
    };
  }
  return {
    signals:matured,
    maturity:{
      total:matured.length,
      eligible1m:matured.filter(row=>finite(row.return1m)).length,
      eligible3m:matured.filter(row=>finite(row.return3m)).length,
    },
    metrics,
  };
}

export async function runBreadthR7Prospective(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=Date.now()}={}){
  const nowIso=new Date(now).toISOString();
  const ledgerFile=path.join(base,LEDGER_NAME),reportFile=path.join(base,REPORT_NAME);
  const report={
    version:1,status:"RUNNING",mode:"PROSPECTIVE_BREADTH_R7_PIT_SCORE_ONLY",methodology:METHOD,at:nowIso,
    providerCalls:0,publicMutation:false,productionFormulaChanged:false,weightSelected:false,
    historicalBackfillAllowed:false,scoreFormulaChanged:false,
  };
  const latestUniverseDate=await latestStoredBreadthUniverseDate(base);
  if(!latestUniverseDate){
    report.status="WAITING_SOURCE";report.reason="BREADTH_R7_PROSPECTIVE_CURRENT_UNIVERSE_MISSING";save(reportFile,report);return {ledger:ledgerFile,report:reportFile,...report};
  }
  const ensured=await ensurePitUniverseCurrent(base,latestUniverseDate);
  report.providerCalls=ensured.providerCalls;
  report.pitRefreshed=ensured.refreshed;
  if(ensured.status!=="READY"){
    report.status="WAITING_PIT_UNIVERSE";report.reason=ensured.reason;save(reportFile,report);return {ledger:ledgerFile,report:reportFile,...report};
  }

  const db=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const store=marketOperationalStore(db);
    const benchmarkBatch=await store.readInput("shadowSp500Benchmark");
    const benchmark=normalizeBenchmark(benchmarkBatch?.body?.series?.SP500??[]);
    if(benchmark.length<250)throw new Error("SP500_SHADOW_BENCHMARK_MISSING");
    const priceRows=await loadCurrentPriceRows(base,db,ensured.pit);
    const current=buildCurrentBreadthR7Signal({pit:ensured.pit,rows:priceRows});
    if(current.status!=="READY"){
      report.status="WAITING_SCORE";report.reason=current.reason;report.coverage=current.coverage??null;report.readiness=current.readiness??null;save(reportFile,report);return {ledger:ledgerFile,report:reportFile,...report};
    }

    let ledger=null;
    if(fs.existsSync(ledgerFile)){
      try{
        const prior=readJson(ledgerFile);
        if(prior?.version===1&&prior?.methodology===METHOD&&Array.isArray(prior?.signals)&&validDate(prior?.lastSeenSignalDate))ledger=prior;
        else throw new Error("BREADTH_R7_PROSPECTIVE_LEDGER_CONTRACT_MISMATCH");
      }catch(error){
        if(error?.message==="BREADTH_R7_PROSPECTIVE_LEDGER_CONTRACT_MISMATCH")throw error;
        throw new Error("BREADTH_R7_PROSPECTIVE_LEDGER_CORRUPT");
      }
    }

    if(!ledger){
      ledger={
        version:1,methodology:METHOD,createdAt:nowIso,startedAt:nowIso,lastSeenSignalDate:current.signalDate,
        baselineSignal:{...current,observedAt:nowIso},signals:[],
      };
      save(ledgerFile,ledger);
      report.status="PASS";report.initialized=true;report.recorded=false;report.signalDate=current.signalDate;
      report.totalSignals=0;report.eligible1m=0;report.eligible3m=0;
      report.metrics=evaluateBreadthProspectiveLedger([],benchmark).metrics;
      report.conclusion="Prospective Breadth R7 ledger initialized from the already-known current PIT score; that score is not counted as a forward signal. Waiting for a newly observed market session.";
      save(reportFile,report);return {ledger:ledgerFile,report:reportFile,...report};
    }

    if(current.signalDate<ledger.lastSeenSignalDate)throw new Error("BREADTH_R7_PROSPECTIVE_SIGNAL_REGRESSION");
    report.initialized=false;report.recorded=false;

    if(current.signalDate>ledger.lastSeenSignalDate){
      const basePrice=latestAtOrBefore(benchmark,current.signalDate);
      if(!basePrice||days(basePrice.observationDate,current.signalDate)>10)throw new Error("BREADTH_R7_PROSPECTIVE_BENCHMARK_BASE_MISSING");
      if(ledger.signals.some(row=>row.signalDate===current.signalDate))throw new Error("BREADTH_R7_PROSPECTIVE_DUPLICATE_SIGNAL");
      ledger.signals.push({
        ...current,
        observedAt:nowIso,
        benchmarkStoredAt:benchmarkBatch?.storedAt??null,
        benchmarkDate:basePrice.observationDate,
        benchmarkPrice:basePrice.value,
      });
      ledger.signals.sort((a,b)=>a.signalDate.localeCompare(b.signalDate));
      ledger.lastSeenSignalDate=current.signalDate;ledger.updatedAt=nowIso;
      save(ledgerFile,ledger);report.recorded=true;
    }

    const evaluated=evaluateBreadthProspectiveLedger(ledger.signals,benchmark);
    report.status="PASS";report.signalDate=current.signalDate;
    report.totalSignals=evaluated.maturity.total;report.eligible1m=evaluated.maturity.eligible1m;report.eligible3m=evaluated.maturity.eligible3m;
    report.metrics=evaluated.metrics;
    report.conclusion=evaluated.maturity.eligible3m>0
      ?"Prospective PIT Breadth R7 observations are maturing; forward correlations are research evidence only and do not authorize production promotion."
      :"Waiting for prospective PIT Breadth R7 observations to mature; no production promotion is permitted.";
    save(reportFile,report);return {ledger:ledgerFile,report:reportFile,...report};
  }catch(error){
    report.status="FAILED";report.error=/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"BREADTH_R7_PROSPECTIVE_FAILED");
    save(reportFile,report);throw error;
  }finally{db.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runBreadthR7Prospective().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"BREADTH_R7_PROSPECTIVE_FAILED")}));
    process.exitCode=1;
  });
}
