import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {buildFundFlowR54} from "../../lib/diagnostic-layer/open-resolution-r53-components.mjs";
import {buildFundFlowR3IndexShadow} from "../../lib/market-score/fund-flow-r3-index-shadow.mjs";
import {evaluateSeries,evaluationSummaryPair} from "./backtest-market-shadow-r1.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const RAW_STATE_NAME="local-sec-fund-flow-raw-backfill-r2.json";
const OUTPUT_NAME="local-fund-flow-r3-index-shadow-backtest.json";
const RAW_METHOD="SEC_RAW_NPORT_3M_CUMULATIVE_R2";
const finite=value=>typeof value==="number"&&Number.isFinite(value);

function rowAtOrBefore(rows,date){
  return (Array.isArray(rows)?rows:[]).filter(row=>row.observationDate<=date).at(-1)??null;
}
export function buildReleaseIndexR3Signals(vintages=[]){
  const byMonth=new Map(),candidate=[],baseline=[],raw=[];
  for(const vintage of [...(Array.isArray(vintages)?vintages:[])].sort((a,b)=>a.availableAt.localeCompare(b.availableAt))){
    for(const row of vintage.rows??[]){
      if(typeof row?.observationDate==="string")byMonth.set(row.observationDate,row);
    }
    const history=[...byMonth.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
    const indexRows=history.flatMap(row=>finite(row?.indexNetRatio)?[{observationDate:row.observationDate,value:row.indexNetRatio}]:[]);
    const shadow=buildFundFlowR3IndexShadow(indexRows,{asOfDate:vintage.periodEnd,minValid:12});
    const base=buildFundFlowR54(history,{asOfDate:vintage.periodEnd,minValid:12});
    const latest=rowAtOrBefore(history,vintage.periodEnd);
    if(shadow.status==="READY"&&finite(shadow.score))candidate.push({label:vintage.availableAt,value:shadow.score});
    if(base.status==="READY"&&finite(base.score))baseline.push({label:vintage.availableAt,value:base.score});
    if(finite(latest?.indexNetRatio))raw.push({label:vintage.availableAt,value:latest.indexNetRatio});
  }
  return {candidate,baseline,raw};
}
export function buildRawIndexR3Signals(state){
  const rows=Object.values(state?.signals??{})
    .filter(row=>typeof row?.availableAt==="string"&&finite(row?.indexNetFlow3mToCurrentAssetsPct))
    .sort((a,b)=>a.availableAt.localeCompare(b.availableAt)||String(a.observationDate).localeCompare(String(b.observationDate)));
  const input=rows.map(row=>({observationDate:row.availableAt,value:row.indexNetFlow3mToCurrentAssetsPct}));
  const shadow=buildFundFlowR3IndexShadow(input,{minValid:12});
  return {
    candidate:shadow.trend??[],
    raw:input.map(row=>({label:row.observationDate,value:row.value})),
    sourceRows:rows.length,
  };
}
function positiveGate(evaluation,{minEligible=3}={}){
  const c1=evaluation?.correlation1m,c3=evaluation?.correlation3m;
  return {
    enough1m:Number(evaluation?.eligible1m??0)>=minEligible,
    enough3m:Number(evaluation?.eligible3m??0)>=minEligible,
    positive1m:finite(c1)&&c1>0,
    positive3m:finite(c3)&&c3>0,
    pass:Number(evaluation?.eligible1m??0)>=minEligible&&Number(evaluation?.eligible3m??0)>=minEligible&&finite(c1)&&finite(c3)&&c1>0&&c3>0,
  };
}

export async function backtestFundFlowR3IndexShadow(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const rawFile=path.join(base,RAW_STATE_NAME);
  if(!fs.existsSync(rawFile))throw new Error("FUND_FLOW_R3_RAW_STATE_MISSING");
  const rawState=JSON.parse(fs.readFileSync(rawFile,"utf8"));
  if(rawState?.version!==2||rawState?.methodologyVersion!==RAW_METHOD||(rawState?.nportProcessed??[]).length<15)throw new Error("FUND_FLOW_R3_RAW_STATE_INCOMPLETE");

  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const store=marketOperationalStore(core);
    const [pitBatch,benchmarkBatch]=await Promise.all([
      store.readInput("shadowSecFundFlowPit"),
      store.readInput("shadowSp500Benchmark"),
    ]);
    const vintages=pitBatch?.body?.vintages??[];
    const benchmark=benchmarkBatch?.body?.series?.SP500??[];
    if(!pitBatch?.body?.lookAheadSafe||pitBatch?.body?.historyMode!=="SEC_RELEASE_VINTAGE_PIT")throw new Error("FUND_FLOW_R3_RELEASE_PIT_NOT_SAFE");
    if(vintages.length<8||benchmark.length<250)throw new Error("FUND_FLOW_R3_INPUT_SHORT");

    const releaseSeries=buildReleaseIndexR3Signals(vintages);
    const rawSeries=buildRawIndexR3Signals(rawState);
    const releaseCandidate=evaluateSeries(releaseSeries.candidate,benchmark);
    const releaseRaw=evaluateSeries(releaseSeries.raw,benchmark);
    const rawCandidate=evaluateSeries(rawSeries.candidate,benchmark);
    const rawUnderlying=evaluateSeries(rawSeries.raw,benchmark);
    const releaseBaselineComparison=evaluationSummaryPair(releaseSeries.baseline,releaseSeries.candidate,benchmark);

    const releaseGate=positiveGate(releaseCandidate,{minEligible:5});
    const rawGate=positiveGate(rawCandidate,{minEligible:20});
    const directionalGatePass=releaseGate.pass&&rawGate.pass;
    const releaseSmallSample=releaseCandidate.observations<12;

    const report={
      version:1,
      status:"PASS",
      mode:"FUND_FLOW_R3_INDEX_ONLY_SHADOW_BACKTEST",
      methodologyVersion:"FUND_FLOW_R3_INDEX_ONLY_SHADOW_R1",
      lookAheadSafe:true,
      providerCalls:0,
      publicMutation:false,
      productionFormulaChanged:false,
      approvedShadowWeight:{indexFlow:1},
      sourceRoles:{
        releasePIT:"OFFICIAL_SEC_TABLE_3_2_RELEASE_VINTAGE",
        rawExtension:"INDEPENDENT_RAW_NPORT_3M_INDEX_FLOW_PROXY",
      },
      release:{
        coverage:{vintages:vintages.length,candidateSignals:releaseSeries.candidate.length,rawSignals:releaseSeries.raw.length},
        candidate:releaseCandidate,
        underlyingRawIndexFlow:releaseRaw,
        baselineR54Comparison:releaseBaselineComparison,
        gate:releaseGate,
      },
      rawExtension:{
        coverage:{sourceRows:rawSeries.sourceRows,candidateSignals:rawSeries.candidate.length,rawSignals:rawSeries.raw.length},
        candidate:rawCandidate,
        underlyingRawIndexFlow:rawUnderlying,
        officialTable32Comparable:false,
        gate:rawGate,
      },
      directionalGatePass,
      researchCandidate:directionalGatePass,
      productionPromotionCandidate:false,
      productionHoldReasons:[
        ...(releaseSmallSample?["RELEASE_VINTAGE_SAMPLE_LT_12"]:[]),
        "RAW_EXTENSION_IS_DIRECTIONAL_PROXY_NOT_OFFICIAL_TABLE_3_2",
        "PRODUCTION_CHANGE_NOT_APPROVED",
      ],
      conclusion:directionalGatePass
        ?"Index-only R3 is directionally positive in both independent PIT samples. Keep it shadow-only until a separate production promotion decision."
        :"Index-only R3 fails at least one required positive 1M/3M gate across the independent PIT samples.",
    };
    const output=path.join(base,OUTPUT_NAME);
    fs.writeFileSync(output,JSON.stringify(report,null,2));
    return {output,...report};
  }finally{core.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  backtestFundFlowR3IndexShadow().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"FUND_FLOW_R3_INDEX_BACKTEST_FAILED")}));
    process.exitCode=1;
  });
}
