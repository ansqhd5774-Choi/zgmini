import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {buildDollarFxR22Shadow} from "../../lib/market-score/dollar-fx-r22-shadow.mjs";
import {evaluationSummaryPair} from "./backtest-market-shadow-r1.mjs";
import {pointInTimeDollarRows} from "./collect-dollar-r21-pit-shadow.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const OUTPUT_NAME="local-dollar-r22-pit-backtest.json";
const HOLDOUT_SIGNALS=120;
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const domain=(market,id)=>market?.domains?.find(item=>item?.id===id)??null;
const label=row=>String(row?.label??row?.date??row?.observationDate??"").slice(0,10);

export function buildDollarR22PitTrend({revisions=[],signalVintagePairs=[]}={}){
  const trend=[],diagnostics=[];
  for(const item of Array.isArray(signalVintagePairs)?signalVintagePairs:[]){
    const signalDate=String(item?.signalDate??""),vintageDate=String(item?.vintageDate??"");
    if(!validDate(signalDate)||!validDate(vintageDate)||vintageDate>=signalDate)continue;
    const rows=pointInTimeDollarRows(revisions,vintageDate);
    const out=buildDollarFxR22Shadow(rows,{asOfDate:signalDate,minValid:252});
    diagnostics.push({signalDate,vintageDate,inputRows:rows.length,status:out.status,score:finite(out.score)?out.score:null,reason:out.reason??null});
    if(out.status==="READY"&&finite(out.score))trend.push({label:signalDate,value:out.score});
  }
  return {trend,diagnostics};
}

function ranged(rows,start,end){
  return (Array.isArray(rows)?rows:[]).filter(row=>{
    const d=label(row);
    return validDate(d)&&d>=start&&d<=end;
  });
}
function splitEvaluation(baseline,candidate,benchmark){
  if(candidate.length<=HOLDOUT_SIGNALS)throw new Error("DOLLAR_R22_HOLDOUT_TOO_SHORT");
  const holdout=candidate.slice(-HOLDOUT_SIGNALS);
  const train=candidate.slice(0,-HOLDOUT_SIGNALS);
  const trainStart=train[0].label,trainEnd=train.at(-1).label;
  const holdoutStart=holdout[0].label,holdoutEnd=holdout.at(-1).label;
  return {
    train:evaluationSummaryPair(ranged(baseline,trainStart,trainEnd),train,benchmark),
    holdout:evaluationSummaryPair(ranged(baseline,holdoutStart,holdoutEnd),holdout,benchmark),
    ranges:{train:{start:trainStart,end:trainEnd,signals:train.length},holdout:{start:holdoutStart,end:holdoutEnd,signals:holdout.length}},
  };
}
function gate(pair){
  const c1=pair?.shadow?.correlation1m,c3=pair?.shadow?.correlation3m;
  const d1=pair?.comparison?.correlation1mDelta,d3=pair?.comparison?.correlation3mDelta;
  return {
    candidatePositive1m:finite(c1)&&c1>0,
    candidatePositive3m:finite(c3)&&c3>0,
    improves1m:finite(d1)&&d1>0,
    improves3m:finite(d3)&&d3>0,
    pass:finite(c1)&&finite(c3)&&finite(d1)&&finite(d3)&&c1>0&&c3>0&&d1>0&&d3>0,
  };
}

export async function backtestDollarR22PitShadow(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const marketFile=path.join(base,"local-market-result.json");
  if(!fs.existsSync(marketFile))throw new Error("LOCAL_MARKET_RESULT_MISSING");
  const market=JSON.parse(fs.readFileSync(marketFile,"utf8"));
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const store=marketOperationalStore(core);
    const [pitBatch,benchmarkBatch]=await Promise.all([
      store.readInput("shadowDollarFxPit"),
      store.readInput("shadowSp500Benchmark"),
    ]);
    const revisions=pitBatch?.body?.series?.DTWEXBGS_PIT_REVISIONS??[];
    const signalDates=pitBatch?.body?.signalDates??[];
    const signalVintagePairs=pitBatch?.body?.signalVintagePairs??[];
    const benchmark=benchmarkBatch?.body?.series?.SP500??[];
    if(!pitBatch?.body?.lookAheadSafe||pitBatch?.body?.historyMode!=="ALFRED_PRIOR_DAY_PIT_OUTPUT_TYPE_1"||pitBatch?.body?.informationCutoffPolicy!=="PRIOR_CALENDAR_DAY")throw new Error("DOLLAR_R22_PIT_BATCH_NOT_SAFE");
    if(revisions.length<252||signalDates.length<250||signalVintagePairs.length!==signalDates.length)throw new Error("DOLLAR_R22_PIT_BATCH_INCOMPLETE");
    if(benchmark.length<250)throw new Error("SP500_SHADOW_BENCHMARK_MISSING");

    const built=buildDollarR22PitTrend({revisions,signalVintagePairs});
    if(built.trend.length<250)throw new Error("DOLLAR_R22_PIT_TREND_SHORT");
    const baseline=domain(market,"dollarFx")?.trend??[];
    const full=evaluationSummaryPair(baseline,built.trend,benchmark);
    const split=splitEvaluation(baseline,built.trend,benchmark);

    const priorFile=path.join(base,"local-dollar-r21-pit-backtest.json");
    let r21=null;
    if(fs.existsSync(priorFile)){
      try{
        const prior=JSON.parse(fs.readFileSync(priorFile,"utf8"));
        r21={
          status:prior.status??null,
          lookAheadSafe:prior.lookAheadSafe??false,
          observations:prior.shadow?.observations??null,
          correlation1m:prior.shadow?.correlation1m??null,
          correlation3m:prior.shadow?.correlation3m??null,
          delta1m:prior.comparison?.correlation1mDelta??null,
          delta3m:prior.comparison?.correlation3mDelta??null,
        };
      }catch{}
    }

    const fullGate=gate(full),trainGate=gate(split.train),holdoutGate=gate(split.holdout);
    const report={
      version:1,
      status:"PASS",
      mode:"DOLLAR_R22_PIT_RESEARCH_ONLY",
      asOf:market?.asOfDate??null,
      lookAheadSafe:true,
      historyMode:"ALFRED_PRIOR_DAY_PIT_OUTPUT_TYPE_1",
      informationCutoffPolicy:"PRIOR_CALENDAR_DAY",
      providerCalls:0,
      publicMutation:false,
      productionFormulaChanged:false,
      benchmark:{id:"SP500",rows:benchmark.length},
      methodology:"ASYMMETRIC_DOLLAR_SHOCK",
      full,
      train:split.train,
      holdout:split.holdout,
      ranges:split.ranges,
      gates:{full:fullGate,train:trainGate,holdout:holdoutGate},
      promotionCandidate:fullGate.pass&&trainGate.pass&&holdoutGate.pass,
      r21,
      pitCoverage:{
        signalDates:signalDates.length,
        scoredDates:built.trend.length,
        first:built.trend[0]?.label??null,
        last:built.trend.at(-1)?.label??null,
        failedDates:built.diagnostics.filter(item=>item.status!=="READY").slice(0,20),
      },
    };
    fs.writeFileSync(path.join(base,OUTPUT_NAME),JSON.stringify(report,null,2));
    return {output:path.join(base,OUTPUT_NAME),...report};
  }finally{core.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  backtestDollarR22PitShadow().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"DOLLAR_R22_PIT_BACKTEST_FAILED")}));
    process.exitCode=1;
  });
}
