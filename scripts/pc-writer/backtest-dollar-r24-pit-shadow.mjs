import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {buildDollarFxR54} from "../../lib/diagnostic-layer/open-resolution-r53-components.mjs";
import {buildDollarFxR24Shadow} from "../../lib/market-score/dollar-fx-r24-shadow.mjs";
import {evaluateSeries} from "./backtest-market-shadow-r1.mjs";
import {pointInTimeDollarRows} from "./collect-dollar-r21-pit-shadow.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const OUTPUT_NAME="local-dollar-r24-pit-backtest.json";
const finite=value=>typeof value==="number"&&Number.isFinite(value);

function buildTrends(revisions,pairs){
  const baseline=[],shadow=[],diagnostics=[];
  for(const item of Array.isArray(pairs)?pairs:[]){
    const rows=pointInTimeDollarRows(revisions,item.vintageDate);
    const base=buildDollarFxR54(rows,{asOfDate:item.signalDate,minValid:252});
    const candidate=buildDollarFxR24Shadow(rows,{asOfDate:item.signalDate});
    diagnostics.push({signalDate:item.signalDate,vintageDate:item.vintageDate,baselineStatus:base.status,shadowStatus:candidate.status});
    if(base.status==="READY"&&finite(base.score))baseline.push({label:item.signalDate,value:base.score});
    if(candidate.status==="READY"&&finite(candidate.score))shadow.push({label:item.signalDate,value:candidate.score});
  }
  return {baseline,shadow,diagnostics};
}
function compare(baseline,shadow,benchmark){
  const baselineEval=evaluateSeries(baseline,benchmark);
  const shadowEval=evaluateSeries(shadow,benchmark);
  return {
    baseline:baselineEval,
    shadow:shadowEval,
    delta1m:finite(baselineEval.correlation1m)&&finite(shadowEval.correlation1m)?shadowEval.correlation1m-baselineEval.correlation1m:null,
    delta3m:finite(baselineEval.correlation3m)&&finite(shadowEval.correlation3m)?shadowEval.correlation3m-baselineEval.correlation3m:null,
  };
}
function gate(result){
  const c1=result?.shadow?.correlation1m,c3=result?.shadow?.correlation3m;
  const d1=result?.delta1m,d3=result?.delta3m;
  return {
    candidatePositive1m:finite(c1)&&c1>0,
    candidatePositive3m:finite(c3)&&c3>0,
    improves1m:finite(d1)&&d1>0,
    improves3m:finite(d3)&&d3>0,
    pass:finite(c1)&&finite(c3)&&finite(d1)&&finite(d3)&&c1>0&&c3>0&&d1>0&&d3>0,
  };
}

export async function backtestDollarR24PitShadow(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const store=marketOperationalStore(core);
    const [designBatch,externalBatch,finalBatch,benchmarkBatch]=await Promise.all([
      store.readInput("shadowDollarFxPit"),
      store.readInput("shadowDollarFxR23ExternalPit"),
      store.readInput("shadowDollarFxR24FinalPit"),
      store.readInput("shadowSp500Benchmark"),
    ]);
    const benchmark=benchmarkBatch?.body?.series?.SP500??[];
    for(const batch of [designBatch,externalBatch,finalBatch]){
      if(!batch?.body?.lookAheadSafe||batch?.body?.historyMode!=="ALFRED_PRIOR_DAY_PIT_OUTPUT_TYPE_1"||batch?.body?.informationCutoffPolicy!=="PRIOR_CALENDAR_DAY")throw new Error("DOLLAR_R24_PIT_BATCH_NOT_SAFE");
    }
    if(!finalBatch?.body?.independentOfDesignSample||!finalBatch?.body?.independentOfExternalSample||!finalBatch?.body?.finalHoldout)throw new Error("DOLLAR_R24_FINAL_NOT_INDEPENDENT");
    const finalLast=finalBatch?.body?.signalDates?.at?.(-1)??null;
    const externalFirst=externalBatch?.body?.signalDates?.[0]??null;
    if(!finalLast||!externalFirst||finalLast>=externalFirst)throw new Error("DOLLAR_R24_FINAL_OVERLAP");
    if(benchmark.length<1500)throw new Error("SP500_SHADOW_BENCHMARK_MISSING");

    const design=buildTrends(designBatch.body.series?.DTWEXBGS_PIT_REVISIONS??[],designBatch.body.signalVintagePairs??[]);
    const external=buildTrends(externalBatch.body.series?.DTWEXBGS_PIT_REVISIONS??[],externalBatch.body.signalVintagePairs??[]);
    const final=buildTrends(finalBatch.body.series?.DTWEXBGS_PIT_REVISIONS??[],finalBatch.body.signalVintagePairs??[]);
    if(design.shadow.length<250||external.shadow.length<400||final.shadow.length!==500)throw new Error("DOLLAR_R24_TREND_SHORT");

    const designResult=compare(design.baseline,design.shadow,benchmark);
    const externalResult=compare(external.baseline,external.shadow,benchmark);
    const finalResult=compare(final.baseline,final.shadow,benchmark);
    const designGate=gate(designResult),externalGate=gate(externalResult),finalGate=gate(finalResult);

    const report={
      version:1,
      status:"PASS",
      mode:"DOLLAR_R24_FINAL_HOLDOUT_BACKTEST_ONLY",
      methodology:"TWO_FACTOR_SHOCK_REVERSAL",
      lookAheadSafe:true,
      historyMode:"ALFRED_PRIOR_DAY_PIT_OUTPUT_TYPE_1",
      informationCutoffPolicy:"PRIOR_CALENDAR_DAY",
      providerCalls:0,
      publicMutation:false,
      productionFormulaChanged:false,
      weights:{absShortMomentum:.50,absAcceleration20:.50},
      sampleRoles:{
        design:"USED_FOR_FEATURE_DISCOVERY",
        external:"USED_FOR_FEATURE_CONFIRMATION_AND_R24_WEIGHT_DECISION",
        final:"UNUSED_FINAL_HOLDOUT",
      },
      design:{...designResult,gate:designGate,signals:design.shadow.length,first:design.shadow[0]?.label??null,last:design.shadow.at(-1)?.label??null},
      external:{...externalResult,gate:externalGate,signals:external.shadow.length,first:external.shadow[0]?.label??null,last:external.shadow.at(-1)?.label??null},
      final:{...finalResult,gate:finalGate,signals:final.shadow.length,first:final.shadow[0]?.label??null,last:final.shadow.at(-1)?.label??null},
      promotionCandidate:finalGate.pass,
      conclusion:finalGate.pass
        ?"R2.4 passes the completely unused 500-signal PIT final holdout gate."
        :"R2.4 fails at least one required condition in the completely unused 500-signal PIT final holdout.",
    };
    const output=path.join(base,OUTPUT_NAME);
    fs.writeFileSync(output,JSON.stringify(report,null,2));
    return {output,...report};
  }finally{core.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  backtestDollarR24PitShadow().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"DOLLAR_R24_PIT_BACKTEST_FAILED")}));
    process.exitCode=1;
  });
}
