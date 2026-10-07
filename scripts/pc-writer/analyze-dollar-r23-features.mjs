import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {buildDollarFxR54} from "../../lib/diagnostic-layer/open-resolution-r53-components.mjs";
import {evaluateSeries} from "./backtest-market-shadow-r1.mjs";
import {pointInTimeDollarRows} from "./collect-dollar-r21-pit-shadow.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const OUTPUT_NAME="local-dollar-r23-feature-diagnostic.json";
const HOLDOUT_SIGNALS=120;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const finite=value=>typeof value==="number"&&Number.isFinite(value);

export function stableDirection(train,holdout){
  if(!finite(train)||!finite(holdout)||train===0||holdout===0)return "UNRESOLVED";
  if(train>0&&holdout>0)return "POSITIVE";
  if(train<0&&holdout<0)return "INVERSE";
  return "UNSTABLE";
}

function latestFeatureSnapshot(rows,signalDate){
  const baseline=buildDollarFxR54(rows,{asOfDate:signalDate,minValid:252});
  if(baseline.status!=="READY"||!Array.isArray(baseline.rows))return null;
  const latest=baseline.rows.filter(row=>row.observationDate<=signalDate&&finite(row?.shortMomentum)).at(-1)??null;
  if(!latest)return null;
  const valid=baseline.rows.filter(row=>row.observationDate<=latest.observationDate&&finite(row?.shortMomentum));
  const prior20=valid.length>=21?valid.at(-21):null;
  const acceleration20=prior20&&finite(prior20.shortMomentum)?latest.shortMomentum-prior20.shortMomentum:null;
  return {
    level:finite(latest.broadDollarIndex)?latest.broadDollarIndex:null,
    levelScore:finite(latest.levelScore)?latest.levelScore:null,
    shortMomentum:finite(latest.shortMomentum)?latest.shortMomentum:null,
    mediumMomentum:finite(latest.mediumMomentum)?latest.mediumMomentum:null,
    acceleration20:finite(acceleration20)?acceleration20:null,
    volatility20:finite(latest.volatility20)?latest.volatility20:null,
    absShortMomentum:finite(latest.shortMomentum)?Math.abs(latest.shortMomentum):null,
    absMediumMomentum:finite(latest.mediumMomentum)?Math.abs(latest.mediumMomentum):null,
    absAcceleration20:finite(acceleration20)?Math.abs(acceleration20):null,
  };
}

export function buildDollarPitFeatureSeries({revisions=[],signalVintagePairs=[]}={}){
  const names=["level","levelScore","shortMomentum","mediumMomentum","acceleration20","volatility20","absShortMomentum","absMediumMomentum","absAcceleration20"];
  const series=Object.fromEntries(names.map(name=>[name,[]]));
  const diagnostics=[];
  for(const item of Array.isArray(signalVintagePairs)?signalVintagePairs:[]){
    const signalDate=String(item?.signalDate??""),vintageDate=String(item?.vintageDate??"");
    if(!validDate(signalDate)||!validDate(vintageDate)||vintageDate>=signalDate)continue;
    const rows=pointInTimeDollarRows(revisions,vintageDate);
    const snapshot=latestFeatureSnapshot(rows,signalDate);
    diagnostics.push({signalDate,vintageDate,inputRows:rows.length,ready:Boolean(snapshot)});
    if(!snapshot)continue;
    for(const name of names)if(finite(snapshot[name]))series[name].push({label:signalDate,value:snapshot[name]});
  }
  return {series,diagnostics};
}

function evalWindow(rows,benchmark,start,end){
  return evaluateSeries(rows.filter(row=>row.label>=start&&row.label<=end),benchmark);
}
function summarizeFeature(rows,benchmark,{trainStart,trainEnd,holdoutStart,holdoutEnd}){
  const full=evaluateSeries(rows,benchmark);
  const train=evalWindow(rows,benchmark,trainStart,trainEnd);
  const holdout=evalWindow(rows,benchmark,holdoutStart,holdoutEnd);
  return {
    full:{n:full.observations,c1:full.correlation1m,c3:full.correlation3m},
    train:{n:train.observations,c1:train.correlation1m,c3:train.correlation3m},
    holdout:{n:holdout.observations,c1:holdout.correlation1m,c3:holdout.correlation3m},
    stability:{
      oneMonth:stableDirection(train.correlation1m,holdout.correlation1m),
      threeMonth:stableDirection(train.correlation3m,holdout.correlation3m),
    },
  };
}

export async function analyzeDollarR23Features(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const store=marketOperationalStore(core);
    const [pitBatch,benchmarkBatch]=await Promise.all([
      store.readInput("shadowDollarFxPit"),
      store.readInput("shadowSp500Benchmark"),
    ]);
    const revisions=pitBatch?.body?.series?.DTWEXBGS_PIT_REVISIONS??[];
    const pairs=pitBatch?.body?.signalVintagePairs??[];
    const benchmark=benchmarkBatch?.body?.series?.SP500??[];
    if(!pitBatch?.body?.lookAheadSafe||pitBatch?.body?.historyMode!=="ALFRED_PRIOR_DAY_PIT_OUTPUT_TYPE_1"||pitBatch?.body?.informationCutoffPolicy!=="PRIOR_CALENDAR_DAY")throw new Error("DOLLAR_R23_PIT_BATCH_NOT_SAFE");
    if(revisions.length<252||pairs.length<250||benchmark.length<250)throw new Error("DOLLAR_R23_INPUT_INCOMPLETE");

    const built=buildDollarPitFeatureSeries({revisions,signalVintagePairs:pairs});
    const reference=(built.series.shortMomentum??[]);
    if(reference.length<=HOLDOUT_SIGNALS)throw new Error("DOLLAR_R23_FEATURE_HISTORY_SHORT");
    const holdout=reference.slice(-HOLDOUT_SIGNALS),train=reference.slice(0,-HOLDOUT_SIGNALS);
    const ranges={
      train:{start:train[0].label,end:train.at(-1).label,signals:train.length},
      holdout:{start:holdout[0].label,end:holdout.at(-1).label,signals:holdout.length},
    };
    const features={};
    for(const [name,rows] of Object.entries(built.series)){
      features[name]=summarizeFeature(rows,benchmark,{
        trainStart:ranges.train.start,trainEnd:ranges.train.end,
        holdoutStart:ranges.holdout.start,holdoutEnd:ranges.holdout.end,
      });
    }

    const stable={
      positive:[],
      inverse:[],
      unstable:[],
    };
    for(const [name,item] of Object.entries(features)){
      const dirs=[item.stability.oneMonth,item.stability.threeMonth];
      if(dirs.every(x=>x==="POSITIVE"))stable.positive.push(name);
      else if(dirs.every(x=>x==="INVERSE"))stable.inverse.push(name);
      else stable.unstable.push(name);
    }

    const report={
      version:1,
      status:"PASS",
      mode:"DOLLAR_R23_FEATURE_DIAGNOSTIC_ONLY",
      lookAheadSafe:true,
      historyMode:"ALFRED_PRIOR_DAY_PIT_OUTPUT_TYPE_1",
      informationCutoffPolicy:"PRIOR_CALENDAR_DAY",
      providerCalls:0,
      publicMutation:false,
      productionFormulaChanged:false,
      formulaSelected:false,
      weightSelected:false,
      ranges,
      pitCoverage:{signalDates:pairs.length,readyDates:built.diagnostics.filter(x=>x.ready).length,failedDates:built.diagnostics.filter(x=>!x.ready).slice(0,20)},
      features,
      stable,
      conclusion:"Diagnostic only. No R2.3 formula or weights are selected by this report.",
    };
    const output=path.join(base,OUTPUT_NAME);
    fs.writeFileSync(output,JSON.stringify(report,null,2));
    return {output,...report};
  }finally{core.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  analyzeDollarR23Features().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"DOLLAR_R23_FEATURE_DIAGNOSTIC_FAILED")}));
    process.exitCode=1;
  });
}
