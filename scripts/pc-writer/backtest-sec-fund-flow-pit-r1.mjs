import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {buildFundFlowR54} from "../../lib/diagnostic-layer/open-resolution-r53-components.mjs";
import {evaluateSeries} from "./backtest-market-shadow-r1.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const OUTPUT_NAME="local-sec-fund-flow-pit-backtest-r1.json";
const finite=value=>typeof value==="number"&&Number.isFinite(value);

function signalSeries(signals,field){
  return signals.flatMap(item=>finite(item?.[field])?[{label:item.availableAt,value:item[field]}]:[]);
}
function rowAtOrBefore(rows,date){
  return (Array.isArray(rows)?rows:[]).filter(row=>row.observationDate<=date).at(-1)??null;
}
function revisionAudit(vintages){
  const fields=["allNetRatio","indexNetRatio","nonIndexNetRatio","allOutflowRatio"];
  const byMonth=new Map(),summary=Object.fromEntries(fields.map(field=>[field,{comparisons:0,revisions:0,maxAbsDiff:0}]));
  for(const vintage of vintages){
    for(const row of vintage.rows??[]){
      const prior=byMonth.get(row.observationDate);
      if(prior){
        for(const field of fields){
          if(!finite(prior[field])||!finite(row[field]))continue;
          const diff=Math.abs(prior[field]-row[field]);
          summary[field].comparisons++;
          if(diff>1e-12)summary[field].revisions++;
          summary[field].maxAbsDiff=Math.max(summary[field].maxAbsDiff,diff);
        }
      }
      byMonth.set(row.observationDate,row);
    }
  }
  return summary;
}

export function buildSecFundFlowPitSignals(vintages=[]){
  const byMonth=new Map(),signals=[];
  for(const vintage of [...(Array.isArray(vintages)?vintages:[])].sort((a,b)=>a.availableAt.localeCompare(b.availableAt))){
    for(const row of vintage.rows??[])byMonth.set(row.observationDate,row);
    const history=[...byMonth.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
    const model=buildFundFlowR54(history,{asOfDate:vintage.periodEnd,minValid:12});
    if(model.status!=="READY"||!Array.isArray(model.rows))continue;
    const latest=rowAtOrBefore(model.rows,vintage.periodEnd);
    if(!latest||![latest.score,latest.allNetScore,latest.momentumScore,latest.participationScore,latest.redemptionScore].every(finite))continue;
    signals.push({
      availableAt:vintage.availableAt,
      periodEnd:vintage.periodEnd,
      sourceSha256:vintage.sourceSha256??null,
      score:latest.score,
      allNetScore:latest.allNetScore,
      momentumScore:latest.momentumScore,
      participationScore:latest.participationScore,
      redemptionScore:latest.redemptionScore,
      allNetRatio:latest.allNetRatio,
      netFlowMomentum:latest.netFlowMomentum,
      indexNetRatio:latest.indexNetRatio,
      nonIndexNetRatio:latest.nonIndexNetRatio,
      outflowPressure:latest.outflowPressure,
    });
  }
  return signals;
}

export async function backtestSecFundFlowPit(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const store=marketOperationalStore(core);
    const [pitBatch,benchmarkBatch]=await Promise.all([
      store.readInput("shadowSecFundFlowPit"),
      store.readInput("shadowSp500Benchmark"),
    ]);
    const vintages=pitBatch?.body?.vintages??[];
    const benchmark=benchmarkBatch?.body?.series?.SP500??[];
    if(!pitBatch?.body?.lookAheadSafe||pitBatch?.body?.historyMode!=="SEC_RELEASE_VINTAGE_PIT")throw new Error("SEC_FUND_FLOW_PIT_BATCH_NOT_SAFE");
    if(vintages.length<8||benchmark.length<250)throw new Error("SEC_FUND_FLOW_PIT_INPUT_SHORT");
    const signals=buildSecFundFlowPitSignals(vintages);
    if(signals.length<5)throw new Error("SEC_FUND_FLOW_PIT_SIGNAL_SHORT");
    const fields=["score","allNetScore","momentumScore","participationScore","redemptionScore","allNetRatio","netFlowMomentum","indexNetRatio","nonIndexNetRatio","outflowPressure"];
    const features={};
    for(const field of fields){
      const evaluated=evaluateSeries(signalSeries(signals,field),benchmark);
      features[field]={
        observations:evaluated.observations,
        eligible1m:evaluated.eligible1m,
        eligible3m:evaluated.eligible3m,
        correlation1m:evaluated.correlation1m,
        correlation3m:evaluated.correlation3m,
        meanReturn1m:evaluated.meanReturn1m,
        meanReturn3m:evaluated.meanReturn3m,
      };
    }
    const report={
      version:1,
      status:"PASS",
      mode:"SEC_FUND_FLOW_RELEASE_VINTAGE_PIT_BACKTEST_ONLY",
      lookAheadSafe:true,
      historyMode:"SEC_RELEASE_VINTAGE_PIT",
      providerCalls:0,
      publicMutation:false,
      productionFormulaChanged:false,
      formulaSelected:false,
      weightSelected:false,
      iciHistoricalReplacementDecision:"NO_1_TO_1_REPLACEMENT",
      coverage:{
        vintages:vintages.length,
        signals:signals.length,
        firstVintage:vintages[0]?.periodEnd??null,
        lastVintage:vintages.at(-1)?.periodEnd??null,
        firstSignal:signals[0]?.availableAt??null,
        lastSignal:signals.at(-1)?.availableAt??null,
        smallSample:signals.length<12,
      },
      revisionAudit:revisionAudit(vintages),
      features,
      conclusion:signals.length<12
        ?"PIT reconstruction is look-ahead-safe but the release-level sample is small; use it as directional validation only and do not select formula weights."
        :"PIT release-level evidence is available; formula selection still requires an independent validation sample.",
    };
    const output=path.join(base,OUTPUT_NAME);
    fs.writeFileSync(output,JSON.stringify(report,null,2));
    return {output,...report};
  }finally{core.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  backtestSecFundFlowPit().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"SEC_FUND_FLOW_PIT_BACKTEST_FAILED")}));
    process.exitCode=1;
  });
}
