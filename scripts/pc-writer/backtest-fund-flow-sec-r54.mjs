import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {buildFundFlowR54} from "../../lib/diagnostic-layer/open-resolution-r53-components.mjs";
import {evaluateSeries,evaluationSummaryPair} from "./backtest-market-shadow-r1.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const OUTPUT_NAME="local-fund-flow-sec-r54-backtest.json";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const domain=(market,id)=>market?.domains?.find(item=>item?.id===id)??null;

function series(rows,field){
  return (Array.isArray(rows)?rows:[])
    .flatMap(row=>validDate(row?.observationDate)&&finite(row?.[field])?[{label:row.observationDate,value:row[field]}]:[])
    .sort((a,b)=>a.label.localeCompare(b.label));
}
function compareTrendValues(a=[],b=[]){
  const map=new Map((Array.isArray(a)?a:[]).map(row=>[String(row?.label??row?.date??""),Number(row?.value)]));
  let matched=0,mismatched=0,maxAbsDiff=0;
  for(const row of Array.isArray(b)?b:[]){
    const label=String(row?.label??row?.date??"");
    const left=map.get(label),right=Number(row?.value);
    if(!finite(left)||!finite(right))continue;
    matched++;
    const diff=Math.abs(left-right);
    maxAbsDiff=Math.max(maxAbsDiff,diff);
    if(diff>1e-9)mismatched++;
  }
  return {matched,mismatched,maxAbsDiff};
}

export function buildSecFundFlowFeatureSeries(rows=[],{asOfDate="9999-12-31"}={}){
  const model=buildFundFlowR54(rows,{asOfDate,minValid:12});
  if(model.status!=="READY"||!Array.isArray(model.rows))return {status:"PARTIAL",reason:model.reason??"FUND_FLOW_R54_NOT_READY",model,features:{}};
  const scored=model.rows.filter(row=>row.observationDate<=asOfDate);
  return {
    status:"READY",
    model,
    features:{
      score:series(scored,"score"),
      allNetScore:series(scored,"allNetScore"),
      momentumScore:series(scored,"momentumScore"),
      participationScore:series(scored,"participationScore"),
      redemptionScore:series(scored,"redemptionScore"),
      allNetRatio:series(scored,"allNetRatio"),
      netFlowMomentum:series(scored,"netFlowMomentum"),
      indexNetRatio:series(scored,"indexNetRatio"),
      nonIndexNetRatio:series(scored,"nonIndexNetRatio"),
      outflowPressure:series(scored,"outflowPressure"),
    },
  };
}

export async function backtestFundFlowSecR54(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const marketFile=path.join(base,"local-market-result.json");
  if(!fs.existsSync(marketFile))throw new Error("LOCAL_MARKET_RESULT_MISSING");
  const market=JSON.parse(fs.readFileSync(marketFile,"utf8"));
  const asOf=validDate(market?.asOfDate)?market.asOfDate:new Date().toISOString().slice(0,10);
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const store=marketOperationalStore(core);
    const [fundBatch,benchmarkBatch]=await Promise.all([
      store.readInput("fundFlows"),
      store.readInput("shadowSp500Benchmark"),
    ]);
    const rows=fundBatch?.body?.external?.registeredFundFlowRows??[];
    const benchmark=benchmarkBatch?.body?.series?.SP500??[];
    if(rows.length<24)throw new Error("SEC_FUND_FLOW_HISTORY_SHORT");
    if(benchmark.length<250)throw new Error("SP500_SHADOW_BENCHMARK_MISSING");

    const built=buildSecFundFlowFeatureSeries(rows,{asOfDate:asOf});
    if(built.status!=="READY"||built.features.score.length<12)throw new Error("SEC_FUND_FLOW_R54_WARMUP");

    const publicTrend=domain(market,"fundFlows")?.trend??[];
    const comparison=evaluationSummaryPair(publicTrend,built.features.score,benchmark);
    const features={};
    for(const [name,featureSeries] of Object.entries(built.features)){
      const evaluated=evaluateSeries(featureSeries,benchmark);
      features[name]={
        observations:evaluated.observations,
        eligible1m:evaluated.eligible1m,
        eligible3m:evaluated.eligible3m,
        correlation1m:evaluated.correlation1m,
        correlation3m:evaluated.correlation3m,
        meanReturn1m:evaluated.meanReturn1m,
        meanReturn3m:evaluated.meanReturn3m,
        meanMaxDrawdown3m:evaluated.meanMaxDrawdown3m,
      };
    }

    const normalizedSec=rows.filter(row=>validDate(row?.observationDate)&&row.observationDate<=asOf).sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
    const report={
      version:1,
      status:"PASS",
      mode:"SEC_REGISTERED_FUND_HISTORY_BACKTEST_ONLY",
      asOf,
      source:"U.S. SEC Registered Fund Statistics / Form N-PORT derived Table 3.2",
      historyMode:"CURRENT_VINTAGE_SEC_REGISTERED_FUND_STATISTICS",
      lookAheadSafe:false,
      caveat:"CURRENT_VINTAGE_SEC_HISTORY_MAY_INCLUDE_LATER_REVISIONS",
      providerCalls:0,
      publicMutation:false,
      productionFormulaChanged:false,
      providerSubstitutionApprovedForResearch:true,
      iciHistoricalReplacementDecision:"NOT_DECIDED",
      secCoverage:{
        rows:normalizedSec.length,
        first:normalizedSec[0]?.observationDate??null,
        last:normalizedSec.at(-1)?.observationDate??null,
        sourceStoredAt:fundBatch?.storedAt??null,
      },
      publicR54Alignment:compareTrendValues(publicTrend,built.features.score),
      r54Comparison:comparison,
      features,
      bridgeAssessment:{
        monthlyHistoryUsable:normalizedSec.length>=24,
        frequency:"MONTHLY",
        iciFrequency:"WEEKLY",
        sameInformationSet:false,
        conclusion:"SEC history is suitable for historical validation of SEC-derived fund-flow features, but it is not treated as a one-for-one historical replacement for weekly ICI equity/bond flow splits.",
      },
    };
    const output=path.join(base,OUTPUT_NAME);
    fs.writeFileSync(output,JSON.stringify(report,null,2));
    return {output,...report};
  }finally{core.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  backtestFundFlowSecR54().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"SEC_FUND_FLOW_BACKTEST_FAILED")}));
    process.exitCode=1;
  });
}
