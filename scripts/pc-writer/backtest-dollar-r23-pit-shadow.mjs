import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {buildDollarFxR54} from "../../lib/diagnostic-layer/open-resolution-r53-components.mjs";
import {buildDollarFxR23Shadow} from "../../lib/market-score/dollar-fx-r23-shadow.mjs";
import {evaluateSeries} from "./backtest-market-shadow-r1.mjs";
import {pointInTimeDollarRows} from "./collect-dollar-r21-pit-shadow.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const OUTPUT_NAME="local-dollar-r23-pit-backtest.json";
const finite=value=>typeof value==="number"&&Number.isFinite(value);

function buildTrends(revisions,pairs){
  const baseline=[],shadow=[],diagnostics=[];
  for(const item of Array.isArray(pairs)?pairs:[]){
    const rows=pointInTimeDollarRows(revisions,item.vintageDate);
    const base=buildDollarFxR54(rows,{asOfDate:item.signalDate,minValid:252});
    const candidate=buildDollarFxR23Shadow(rows,{asOfDate:item.signalDate});
    diagnostics.push({signalDate:item.signalDate,vintageDate:item.vintageDate,baselineStatus:base.status,shadowStatus:candidate.status});
    if(base.status==="READY"&&finite(base.score))baseline.push({label:item.signalDate,value:base.score});
    if(candidate.status==="READY"&&finite(candidate.score))shadow.push({label:item.signalDate,value:candidate.score});
  }
  return {baseline,shadow,diagnostics};
}
function compare(baseline,shadow,benchmark){
  const baseEval=evaluateSeries(baseline,benchmark);
  const shadowEval=evaluateSeries(shadow,benchmark);
  return {
    baseline:baseEval,
    shadow:shadowEval,
    delta1m:finite(baseEval.correlation1m)&&finite(shadowEval.correlation1m)?shadowEval.correlation1m-baseEval.correlation1m:null,
    delta3m:finite(baseEval.correlation3m)&&finite(shadowEval.correlation3m)?shadowEval.correlation3m-baseEval.correlation3m:null,
  };
}
function gate(result){
  return {
    candidatePositive1m:finite(result?.shadow?.correlation1m)&&result.shadow.correlation1m>0,
    candidatePositive3m:finite(result?.shadow?.correlation3m)&&result.shadow.correlation3m>0,
    improves1m:finite(result?.delta1m)&&result.delta1m>0,
    improves3m:finite(result?.delta3m)&&result.delta3m>0,
    pass:finite(result?.shadow?.correlation1m)&&finite(result?.shadow?.correlation3m)&&finite(result?.delta1m)&&finite(result?.delta3m)&&result.shadow.correlation1m>0&&result.shadow.correlation3m>0&&result.delta1m>0&&result.delta3m>0,
  };
}

export async function backtestDollarR23PitShadow(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const store=marketOperationalStore(core);
    const [designBatch,externalBatch,benchmarkBatch]=await Promise.all([
      store.readInput("shadowDollarFxPit"),
      store.readInput("shadowDollarFxR23ExternalPit"),
      store.readInput("shadowSp500Benchmark"),
    ]);
    const benchmark=benchmarkBatch?.body?.series?.SP500??[];
    if(benchmark.length<1000)throw new Error("SP500_SHADOW_BENCHMARK_MISSING");
    for(const batch of [designBatch,externalBatch]){
      if(!batch?.body?.lookAheadSafe||batch?.body?.historyMode!=="ALFRED_PRIOR_DAY_PIT_OUTPUT_TYPE_1"||batch?.body?.informationCutoffPolicy!=="PRIOR_CALENDAR_DAY")throw new Error("DOLLAR_R23_PIT_BATCH_NOT_SAFE");
    }
    if(!externalBatch?.body?.independentOfDesignSample)throw new Error("DOLLAR_R23_EXTERNAL_NOT_INDEPENDENT");

    const design=buildTrends(designBatch.body.series?.DTWEXBGS_PIT_REVISIONS??[],designBatch.body.signalVintagePairs??[]);
    const external=buildTrends(externalBatch.body.series?.DTWEXBGS_PIT_REVISIONS??[],externalBatch.body.signalVintagePairs??[]);
    if(design.shadow.length<250||external.shadow.length<400)throw new Error("DOLLAR_R23_TREND_SHORT");

    const designResult=compare(design.baseline,design.shadow,benchmark);
    const externalResult=compare(external.baseline,external.shadow,benchmark);
    const designGate=gate(designResult),externalGate=gate(externalResult);

    const report={
      version:1,
      status:"PASS",
      mode:"DOLLAR_R23_PIT_RESEARCH_ONLY",
      methodology:"SHOCK_REVERSAL_MAGNITUDE_ONLY",
      lookAheadSafe:true,
      historyMode:"ALFRED_PRIOR_DAY_PIT_OUTPUT_TYPE_1",
      informationCutoffPolicy:"PRIOR_CALENDAR_DAY",
      providerCalls:0,
      publicMutation:false,
      productionFormulaChanged:false,
      designSampleUsedForFeatureSelection:true,
      externalValidationIndependent:true,
      weights:{absShortMomentum:.35,absAcceleration20:.40,volatility20:.25},
      design:{
        ...designResult,
        gate:designGate,
        signals:design.shadow.length,
        first:design.shadow[0]?.label??null,
        last:design.shadow.at(-1)?.label??null,
      },
      external:{
        ...externalResult,
        gate:externalGate,
        signals:external.shadow.length,
        first:external.shadow[0]?.label??null,
        last:external.shadow.at(-1)?.label??null,
      },
      promotionCandidate:designGate.pass&&externalGate.pass,
      conclusion:designGate.pass&&externalGate.pass
        ?"R2.3 passes the design sample and independent pre-design PIT validation."
        :"R2.3 does not satisfy the required absolute-positive and improvement gates in both samples.",
    };
    const output=path.join(base,OUTPUT_NAME);
    fs.writeFileSync(output,JSON.stringify(report,null,2));
    return {output,...report};
  }finally{core.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  backtestDollarR23PitShadow().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"DOLLAR_R23_PIT_BACKTEST_FAILED")}));
    process.exitCode=1;
  });
}
