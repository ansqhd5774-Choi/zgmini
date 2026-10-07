import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {save} from "./d1.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const LEDGER_NAME="local-fund-flow-index-prospective-ledger-r1.json";
const REPORT_NAME="local-fund-flow-index-prospective-last-run.json";
const METHOD="FUND_FLOW_INDEX_PROSPECTIVE_R1";
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const finite=value=>typeof value==="number"&&Number.isFinite(value);

function addDays(date,n){
  return new Date(Date.parse(date+"T00:00:00Z")+n*86400000).toISOString().slice(0,10);
}
function days(a,b){
  return Math.floor((Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/86400000);
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
function normalizeBenchmark(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const observationDate=String(row?.observationDate??row?.date??"").slice(0,10);
    const value=Number(row?.value);
    if(validDate(observationDate)&&finite(value)&&value>0)map.set(observationDate,{observationDate,value});
  }
  return [...map.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
}
function mean(values){
  const x=values.filter(finite);
  return x.length?x.reduce((a,b)=>a+b,0)/x.length:null;
}
function pearson(xs,ys){
  const pairs=xs.map((x,i)=>[x,ys[i]]).filter(([x,y])=>finite(x)&&finite(y));
  if(pairs.length<3)return null;
  const mx=mean(pairs.map(([x])=>x)),my=mean(pairs.map(([,y])=>y));
  const numerator=pairs.reduce((sum,[x,y])=>sum+(x-mx)*(y-my),0);
  const dx=Math.sqrt(pairs.reduce((sum,[x])=>sum+(x-mx)**2,0));
  const dy=Math.sqrt(pairs.reduce((sum,[,y])=>sum+(y-my)**2,0));
  return dx>0&&dy>0?numerator/(dx*dy):null;
}

export function extractLatestFundFlowRelease(body){
  const releaseDate=String(body?.providerSummary?.secFundFlows?.sourceReleaseDate??"").slice(0,10);
  if(!validDate(releaseDate))return {status:"PARTIAL",reason:"FUND_FLOW_PROSPECTIVE_RELEASE_DATE_MISSING"};
  const rows=(Array.isArray(body?.external?.registeredFundFlowRows)?body.external.registeredFundFlowRows:[])
    .filter(row=>validDate(row?.observationDate)&&finite(row?.indexNetRatio))
    .sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
  const latest=rows.at(-1)??null;
  if(!latest)return {status:"PARTIAL",reason:"FUND_FLOW_PROSPECTIVE_INDEX_FLOW_MISSING"};
  return {
    status:"READY",
    sourceReleaseDate:releaseDate,
    sourceObservationDate:latest.observationDate,
    rawIndexFlow:latest.indexNetRatio,
    sourceRows:rows.length,
  };
}

export function evaluateFundFlowProspectiveLedger(signals=[],benchmarkRows=[]){
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
  const values=matured.map(row=>row.rawIndexFlow);
  const r1=matured.map(row=>row.return1m),r3=matured.map(row=>row.return3m);
  return {
    signals:matured,
    maturity:{
      total:matured.length,
      eligible1m:matured.filter(row=>finite(row.return1m)).length,
      eligible3m:matured.filter(row=>finite(row.return3m)).length,
    },
    metrics:{
      rawIndexFlow:{
        observations:matured.filter(row=>finite(row.rawIndexFlow)).length,
        eligible1m:matured.filter(row=>finite(row.rawIndexFlow)&&finite(row.return1m)).length,
        eligible3m:matured.filter(row=>finite(row.rawIndexFlow)&&finite(row.return3m)).length,
        correlation1m:pearson(values,r1),
        correlation3m:pearson(values,r3),
      },
    },
  };
}

export async function runFundFlowIndexProspectiveR1(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=Date.now()}={}){
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  const ledgerFile=path.join(base,LEDGER_NAME),reportFile=path.join(base,REPORT_NAME);
  const nowIso=new Date(now).toISOString(),observedDate=nowIso.slice(0,10);
  const report={
    version:1,status:"RUNNING",mode:"PROSPECTIVE_RAW_INDEX_FLOW_ONLY",methodology:METHOD,
    at:nowIso,providerCalls:0,publicMutation:false,productionFormulaChanged:false,
    formulaSelected:false,weightSelected:false,historicalBackfillAllowed:false,
  };
  try{
    const store=marketOperationalStore(core);
    const [fundBatch,benchmarkBatch]=await Promise.all([
      store.readInput("fundFlows"),
      store.readInput("shadowSp500Benchmark"),
    ]);
    const current=extractLatestFundFlowRelease(fundBatch?.body??null);
    const benchmark=normalizeBenchmark(benchmarkBatch?.body?.series?.SP500??[]);
    if(current.status!=="READY"){
      report.status="WAITING_SOURCE";
      report.reason=current.reason;
      save(reportFile,report);
      return {ledger:ledgerFile,report:reportFile,...report};
    }
    if(benchmark.length<250)throw new Error("SP500_SHADOW_BENCHMARK_MISSING");

    let ledger=null;
    if(fs.existsSync(ledgerFile)){
      try{
        const prior=JSON.parse(fs.readFileSync(ledgerFile,"utf8"));
        if(prior?.version===1&&prior?.methodology===METHOD&&Array.isArray(prior?.signals)&&validDate(prior?.lastSeenReleaseDate))ledger=prior;
        else throw new Error("FUND_FLOW_PROSPECTIVE_LEDGER_CONTRACT_MISMATCH");
      }catch(error){
        if(error?.message==="FUND_FLOW_PROSPECTIVE_LEDGER_CONTRACT_MISMATCH")throw error;
        throw new Error("FUND_FLOW_PROSPECTIVE_LEDGER_CORRUPT");
      }
    }

    if(!ledger){
      ledger={
        version:1,methodology:METHOD,createdAt:nowIso,startedAt:nowIso,
        lastSeenReleaseDate:current.sourceReleaseDate,
        baselineRelease:{
          sourceReleaseDate:current.sourceReleaseDate,
          sourceObservationDate:current.sourceObservationDate,
          rawIndexFlow:current.rawIndexFlow,
          sourceStoredAt:fundBatch?.storedAt??null,
        },
        signals:[],
      };
      save(ledgerFile,ledger);
      report.initialized=true;
      report.recorded=false;
      report.status="PASS";
      report.observedReleaseDate=current.sourceReleaseDate;
      report.totalSignals=0;
      report.eligible1m=0;
      report.eligible3m=0;
      report.metrics={rawIndexFlow:{observations:0,eligible1m:0,eligible3m:0,correlation1m:null,correlation3m:null}};
      report.conclusion="Prospective ledger initialized from the already-known current SEC release; that release is not counted as a forward signal. Waiting for a newly observed release.";
      save(reportFile,report);
      return {ledger:ledgerFile,report:reportFile,...report};
    }

    if(current.sourceReleaseDate<ledger.lastSeenReleaseDate)throw new Error("FUND_FLOW_PROSPECTIVE_RELEASE_REGRESSION");
    report.initialized=false;
    report.recorded=false;

    if(current.sourceReleaseDate>ledger.lastSeenReleaseDate){
      const basePrice=latestAtOrBefore(benchmark,observedDate);
      if(!basePrice||days(basePrice.observationDate,observedDate)>10)throw new Error("FUND_FLOW_PROSPECTIVE_BENCHMARK_BASE_MISSING");
      if(ledger.signals.some(row=>row.sourceReleaseDate===current.sourceReleaseDate))throw new Error("FUND_FLOW_PROSPECTIVE_DUPLICATE_RELEASE");
      ledger.signals.push({
        sourceReleaseDate:current.sourceReleaseDate,
        sourceObservationDate:current.sourceObservationDate,
        signalDate:observedDate,
        observedAt:nowIso,
        sourceStoredAt:fundBatch?.storedAt??null,
        benchmarkStoredAt:benchmarkBatch?.storedAt??null,
        benchmarkDate:basePrice.observationDate,
        benchmarkPrice:basePrice.value,
        rawIndexFlow:current.rawIndexFlow,
      });
      ledger.signals.sort((a,b)=>a.signalDate.localeCompare(b.signalDate)||a.sourceReleaseDate.localeCompare(b.sourceReleaseDate));
      ledger.lastSeenReleaseDate=current.sourceReleaseDate;
      ledger.updatedAt=nowIso;
      save(ledgerFile,ledger);
      report.recorded=true;
    }

    const evaluated=evaluateFundFlowProspectiveLedger(ledger.signals,benchmark);
    report.status="PASS";
    report.observedReleaseDate=current.sourceReleaseDate;
    report.totalSignals=evaluated.maturity.total;
    report.eligible1m=evaluated.maturity.eligible1m;
    report.eligible3m=evaluated.maturity.eligible3m;
    report.metrics=evaluated.metrics;
    report.conclusion=evaluated.maturity.eligible3m>0
      ?"Prospective raw Index Fund Flow observations are maturing; correlations are forward evidence only and do not authorize a score transformation."
      :"Waiting for prospective observations to mature; no score transformation or production decision is permitted.";
    save(reportFile,report);
    return {ledger:ledgerFile,report:reportFile,...report};
  }catch(error){
    report.status="FAILED";
    report.error=/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"FUND_FLOW_PROSPECTIVE_FAILED");
    save(reportFile,report);
    throw error;
  }finally{core.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runFundFlowIndexProspectiveR1().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"FUND_FLOW_PROSPECTIVE_FAILED")}));
    process.exitCode=1;
  });
}
