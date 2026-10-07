import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {buildDollarFxR54} from "../../lib/diagnostic-layer/open-resolution-r53-components.mjs";
import {save} from "./d1.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const LEDGER_NAME="local-dollar-prospective-ledger-r1.json";
const REPORT_NAME="local-dollar-prospective-last-run.json";
const METHOD="DOLLAR_PROSPECTIVE_FORWARD_R1";
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
  const mx=mean(pairs.map(x=>x[0])),my=mean(pairs.map(x=>x[1]));
  const numerator=pairs.reduce((s,[x,y])=>s+(x-mx)*(y-my),0);
  const dx=Math.sqrt(pairs.reduce((s,[x])=>s+(x-mx)**2,0));
  const dy=Math.sqrt(pairs.reduce((s,[,y])=>s+(y-my)**2,0));
  return dx>0&&dy>0?numerator/(dx*dy):null;
}

export function extractDollarForwardFeatures(rows=[],asOfDate="9999-12-31"){
  const baseline=buildDollarFxR54(rows,{asOfDate,minValid:252});
  if(baseline.status!=="READY"||!Array.isArray(baseline.rows))return {status:"PARTIAL",reason:baseline.reason??"DOLLAR_R54_NOT_READY"};
  const valid=baseline.rows.filter(row=>row.observationDate<=asOfDate&&finite(row?.shortMomentum));
  const latest=valid.at(-1)??null;
  const prior20=valid.length>=21?valid.at(-21):null;
  const acceleration20=latest&&prior20&&finite(prior20.shortMomentum)?latest.shortMomentum-prior20.shortMomentum:null;
  if(!latest||!finite(acceleration20))return {status:"PARTIAL",reason:"DOLLAR_FORWARD_WARMUP"};
  return {
    status:"READY",
    signalDate:latest.observationDate,
    baselineScore:baseline.score,
    baselineMethodologyVersion:baseline.methodologyVersion??"DOLLAR_FX_R54_1",
    features:{
      level:latest.broadDollarIndex,
      levelScore:latest.levelScore,
      shortMomentum:latest.shortMomentum,
      mediumMomentum:latest.mediumMomentum,
      acceleration20,
      volatility20:latest.volatility20,
      absShortMomentum:Math.abs(latest.shortMomentum),
      absMediumMomentum:Math.abs(latest.mediumMomentum),
      absAcceleration20:Math.abs(acceleration20),
    },
  };
}

export function evaluateProspectiveLedger(signals=[],benchmarkRows=[]){
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
  const fields=["baselineScore","level","levelScore","shortMomentum","mediumMomentum","acceleration20","volatility20","absShortMomentum","absMediumMomentum","absAcceleration20"];
  const metrics={};
  for(const field of fields){
    const values=matured.map(row=>field==="baselineScore"?row.baselineScore:row.features?.[field]);
    const r1=matured.map(row=>row.return1m);
    const r3=matured.map(row=>row.return3m);
    metrics[field]={
      observations:matured.filter((row,i)=>finite(values[i])).length,
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

export async function runDollarProspectiveForwardR1(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=Date.now()}={}){
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  const ledgerFile=path.join(base,LEDGER_NAME),reportFile=path.join(base,REPORT_NAME);
  const report={
    version:1,status:"RUNNING",mode:"PROSPECTIVE_FORWARD_ONLY",methodology:METHOD,
    at:new Date(now).toISOString(),providerCalls:0,publicMutation:false,productionFormulaChanged:false,
    formulaSelected:false,weightSelected:false,historicalRetuningAllowed:false,
  };
  try{
    const store=marketOperationalStore(core);
    const [macroBatch,benchmarkBatch]=await Promise.all([
      store.readInput("macro"),
      store.readInput("shadowSp500Benchmark"),
    ]);
    const dollarRows=macroBatch?.body?.series?.DTWEXBGS??[];
    const benchmark=normalizeBenchmark(benchmarkBatch?.body?.series?.SP500??[]);
    if(dollarRows.length<252)throw new Error("DOLLAR_FORWARD_INPUT_SHORT");
    if(benchmark.length<250)throw new Error("SP500_SHADOW_BENCHMARK_MISSING");

    const current=extractDollarForwardFeatures(dollarRows,new Date(now).toISOString().slice(0,10));
    if(current.status!=="READY")throw new Error(current.reason??"DOLLAR_FORWARD_NOT_READY");
    const basePrice=latestAtOrBefore(benchmark,current.signalDate);
    if(!basePrice||days(basePrice.observationDate,current.signalDate)>10)throw new Error("DOLLAR_FORWARD_BENCHMARK_BASE_MISSING");

    let ledger={version:1,methodology:METHOD,createdAt:new Date(now).toISOString(),signals:[]};
    if(fs.existsSync(ledgerFile)){
      try{
        const prior=JSON.parse(fs.readFileSync(ledgerFile,"utf8"));
        if(prior?.version===1&&prior?.methodology===METHOD&&Array.isArray(prior?.signals))ledger=prior;
        else throw new Error("DOLLAR_FORWARD_LEDGER_CONTRACT_MISMATCH");
      }catch(error){
        if(error?.message==="DOLLAR_FORWARD_LEDGER_CONTRACT_MISMATCH")throw error;
        throw new Error("DOLLAR_FORWARD_LEDGER_CORRUPT");
      }
    }

    const existing=ledger.signals.find(row=>row.signalDate===current.signalDate);
    if(!existing){
      ledger.signals.push({
        signalDate:current.signalDate,
        recordedAt:new Date(now).toISOString(),
        sourceStoredAt:macroBatch?.storedAt??null,
        benchmarkStoredAt:benchmarkBatch?.storedAt??null,
        benchmarkDate:basePrice.observationDate,
        benchmarkPrice:basePrice.value,
        baselineScore:current.baselineScore,
        baselineMethodologyVersion:current.baselineMethodologyVersion,
        features:current.features,
      });
      ledger.signals.sort((a,b)=>a.signalDate.localeCompare(b.signalDate));
      ledger.updatedAt=new Date(now).toISOString();
      save(ledgerFile,ledger);
      report.recorded=true;
    }else report.recorded=false;

    const evaluated=evaluateProspectiveLedger(ledger.signals,benchmark);
    report.status="PASS";
    report.signalDate=current.signalDate;
    report.totalSignals=evaluated.maturity.total;
    report.eligible1m=evaluated.maturity.eligible1m;
    report.eligible3m=evaluated.maturity.eligible3m;
    report.metrics=evaluated.metrics;
    report.nextMilestones={
      first1mMaturesAt:addDays(current.signalDate,30),
      first3mMaturesAt:addDays(current.signalDate,90),
    };
    report.conclusion=evaluated.maturity.eligible3m>0
      ?"Prospective observations are maturing; interpret correlations only as forward evidence."
      :"No 3-month prospective observation has matured yet; no formula or weight decision is permitted.";
    save(reportFile,report);
    return {ledger:ledgerFile,report:reportFile,...report};
  }catch(error){
    report.status="FAILED";
    report.error=/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"DOLLAR_FORWARD_FAILED");
    save(reportFile,report);
    throw error;
  }finally{core.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runDollarProspectiveForwardR1().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"DOLLAR_FORWARD_FAILED")}));
    process.exitCode=1;
  });
}
