import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {evaluateSeries} from "./backtest-market-shadow-r1.mjs";
import {buildDollarPitFeatureSeries} from "./analyze-dollar-r23-features.mjs";
import {buildExternalFeatureSeries} from "./analyze-dollar-external-features.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const OUTPUT_NAME="local-dollar-r24-redundancy-diagnostic.json";
const FEATURES=Object.freeze(["absShortMomentum","absAcceleration20"]);
const finite=value=>typeof value==="number"&&Number.isFinite(value);

export function pairedFeatureCorrelation(aRows=[],bRows=[]){
  const bMap=new Map((Array.isArray(bRows)?bRows:[]).map(row=>[row?.label,row?.value]).filter(([,value])=>finite(value)));
  const pairs=(Array.isArray(aRows)?aRows:[]).flatMap(row=>{
    const x=row?.value,y=bMap.get(row?.label);
    return finite(x)&&finite(y)?[[x,y]]:[];
  });
  if(pairs.length<3)return null;
  const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
  const mx=mean(pairs.map(([x])=>x)),my=mean(pairs.map(([,y])=>y));
  const numerator=pairs.reduce((sum,[x,y])=>sum+(x-mx)*(y-my),0);
  const dx=Math.sqrt(pairs.reduce((sum,[x])=>sum+(x-mx)**2,0));
  const dy=Math.sqrt(pairs.reduce((sum,[,y])=>sum+(y-my)**2,0));
  return dx>0&&dy>0?numerator/(dx*dy):null;
}

function summarize(series,benchmark){
  const out={};
  for(const name of FEATURES){
    const evaluation=evaluateSeries(series?.[name]??[],benchmark);
    out[name]={
      n:evaluation.observations,
      eligible1m:evaluation.eligible1m,
      eligible3m:evaluation.eligible3m,
      c1:evaluation.correlation1m,
      c3:evaluation.correlation3m,
    };
  }
  return out;
}

export async function analyzeDollarR24Redundancy(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const store=marketOperationalStore(core);
    const [designBatch,externalBatch,benchmarkBatch]=await Promise.all([
      store.readInput("shadowDollarFxPit"),
      store.readInput("shadowDollarFxR23ExternalPit"),
      store.readInput("shadowSp500Benchmark"),
    ]);
    const benchmark=benchmarkBatch?.body?.series?.SP500??[];
    for(const batch of [designBatch,externalBatch]){
      if(!batch?.body?.lookAheadSafe||batch?.body?.historyMode!=="ALFRED_PRIOR_DAY_PIT_OUTPUT_TYPE_1"||batch?.body?.informationCutoffPolicy!=="PRIOR_CALENDAR_DAY")throw new Error("DOLLAR_R24_PIT_BATCH_NOT_SAFE");
    }
    if(!externalBatch?.body?.independentOfDesignSample||benchmark.length<1000)throw new Error("DOLLAR_R24_INPUT_INCOMPLETE");

    const design=buildDollarPitFeatureSeries({
      revisions:designBatch?.body?.series?.DTWEXBGS_PIT_REVISIONS??[],
      signalVintagePairs:designBatch?.body?.signalVintagePairs??[],
    });
    const external=buildExternalFeatureSeries({
      revisions:externalBatch?.body?.series?.DTWEXBGS_PIT_REVISIONS??[],
      signalVintagePairs:externalBatch?.body?.signalVintagePairs??[],
    });

    const designPair=pairedFeatureCorrelation(design.series.absShortMomentum,design.series.absAcceleration20);
    const externalPair=pairedFeatureCorrelation(external.series.absShortMomentum,external.series.absAcceleration20);
    const report={
      version:1,
      status:"PASS",
      mode:"DOLLAR_R24_REDUNDANCY_DIAGNOSTIC_ONLY",
      lookAheadSafe:true,
      providerCalls:0,
      publicMutation:false,
      productionFormulaChanged:false,
      formulaSelected:false,
      weightSelected:false,
      features:[...FEATURES],
      design:{
        signals:designBatch?.body?.signalVintagePairs?.length??0,
        metrics:summarize(design.series,benchmark),
        pairCorrelation:designPair,
      },
      external:{
        signals:externalBatch?.body?.signalVintagePairs?.length??0,
        metrics:summarize(external.series,benchmark),
        pairCorrelation:externalPair,
      },
      redundancy:{
        designAbsCorrelation:finite(designPair)?Math.abs(designPair):null,
        externalAbsCorrelation:finite(externalPair)?Math.abs(externalPair):null,
        highInBoth:finite(designPair)&&finite(externalPair)&&Math.abs(designPair)>=0.8&&Math.abs(externalPair)>=0.8,
      },
      conclusion:"Diagnostic only. Use this report to decide whether the two surviving features are sufficiently distinct before approving any R2.4 formula or weights.",
    };
    const output=path.join(base,OUTPUT_NAME);
    fs.writeFileSync(output,JSON.stringify(report,null,2));
    return {output,...report};
  }finally{core.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  analyzeDollarR24Redundancy().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"DOLLAR_R24_REDUNDANCY_DIAGNOSTIC_FAILED")}));
    process.exitCode=1;
  });
}
