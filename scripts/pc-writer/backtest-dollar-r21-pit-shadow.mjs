import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {buildDollarFxR2Shadow} from "../../lib/market-score/dollar-fx-r2-shadow.mjs";
import {evaluationSummaryPair} from "./backtest-market-shadow-r1.mjs";
import {pointInTimeDollarRows} from "./collect-dollar-r21-pit-shadow.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const OUTPUT_NAME="local-dollar-r21-pit-backtest.json";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const domain=(market,id)=>market?.domains?.find(item=>item?.id===id)??null;

export function buildDollarPitTrend({revisions=[],signalDates=[]}={}){
  const trend=[],diagnostics=[];
  for(const date of Array.isArray(signalDates)?signalDates:[]){
    if(!validDate(date))continue;
    const rows=pointInTimeDollarRows(revisions,date);
    const out=buildDollarFxR2Shadow(rows,{asOfDate:date,minValid:252});
    diagnostics.push({date,inputRows:rows.length,status:out.status,score:finite(out.score)?out.score:null,reason:out.reason??null});
    if(out.status==="READY"&&finite(out.score))trend.push({label:date,value:out.score});
  }
  return {trend,diagnostics};
}

export async function backtestDollarR21PitShadow(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
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
    const benchmark=benchmarkBatch?.body?.series?.SP500??[];
    if(!pitBatch?.body?.lookAheadSafe||pitBatch?.body?.historyMode!=="ALFRED_VINTAGE_DATES_OUTPUT_TYPE_1")throw new Error("DOLLAR_R21_PIT_BATCH_NOT_SAFE");
    if(revisions.length<252||signalDates.length<250)throw new Error("DOLLAR_R21_PIT_BATCH_INCOMPLETE");
    if(benchmark.length<250)throw new Error("SP500_SHADOW_BENCHMARK_MISSING");

    const built=buildDollarPitTrend({revisions,signalDates});
    if(built.trend.length<250)throw new Error("DOLLAR_R21_PIT_TREND_SHORT");
    const pair=evaluationSummaryPair(domain(market,"dollarFx")?.trend??[],built.trend,benchmark);

    const currentVintageFile=path.join(base,"local-market-shadow-backtest-r1.json");
    let currentVintage=null;
    if(fs.existsSync(currentVintageFile)){
      try{
        const existing=JSON.parse(fs.readFileSync(currentVintageFile,"utf8"));
        const value=existing?.results?.dollarFx;
        if(value?.shadow)currentVintage={
          observations:value.shadow.observations,
          correlation1m:value.shadow.correlation1m,
          correlation3m:value.shadow.correlation3m,
          matchedSignals:value.comparison?.matchedSignals??null,
          lookAheadSafe:value.lookAheadSafe??false,
          caveat:value.caveat??null,
        };
      }catch{}
    }

    const report={
      version:1,
      status:"PASS",
      mode:"DOLLAR_R21_PIT_BACKTEST_ONLY",
      asOf:market?.asOfDate??null,
      lookAheadSafe:true,
      historyMode:"ALFRED_VINTAGE_DATES_OUTPUT_TYPE_1",
      providerCalls:0,
      publicMutation:false,
      productionFormulaChanged:false,
      benchmark:{id:"SP500",rows:benchmark.length},
      baseline:pair.baseline,
      shadow:pair.shadow,
      comparison:pair.comparison,
      currentVintage,
      pitCoverage:{
        signalDates:signalDates.length,
        scoredDates:built.trend.length,
        first:built.trend[0]?.label??null,
        last:built.trend.at(-1)?.label??null,
        failedDates:built.diagnostics.filter(item=>item.status!=="READY").slice(0,20),
      },
      decisionInputs:{
        delta1m:pair.comparison.correlation1mDelta,
        delta3m:pair.comparison.correlation3mDelta,
        bothPositive:finite(pair.comparison.correlation1mDelta)&&finite(pair.comparison.correlation3mDelta)&&pair.comparison.correlation1mDelta>0&&pair.comparison.correlation3mDelta>0,
      },
    };
    fs.writeFileSync(path.join(base,OUTPUT_NAME),JSON.stringify(report,null,2));
    return {output:path.join(base,OUTPUT_NAME),...report};
  }finally{core.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  backtestDollarR21PitShadow().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"DOLLAR_R21_PIT_BACKTEST_FAILED")}));
    process.exitCode=1;
  });
}
