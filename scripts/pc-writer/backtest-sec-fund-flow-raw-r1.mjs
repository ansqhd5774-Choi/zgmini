import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {evaluateSeries} from "./backtest-market-shadow-r1.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const STATE_NAME="local-sec-fund-flow-raw-backfill-r1.json";
const OUTPUT_NAME="local-sec-fund-flow-raw-backtest-r1.json";
const finite=value=>typeof value==="number"&&Number.isFinite(value);

function signals(rows,field){
  return rows.flatMap(row=>finite(row?.[field])?[{label:row.availableAt,value:row[field]}]:[]);
}
function momentum(rows){
  const out=[];
  for(let i=1;i<rows.length;i++){
    if(!finite(rows[i].allNetRatio)||!finite(rows[i-1].allNetRatio))continue;
    out.push({label:rows[i].availableAt,value:rows[i].allNetRatio-rows[i-1].allNetRatio});
  }
  return out;
}
export async function backtestSecRawFundFlows(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const stateFile=path.join(base,STATE_NAME);
  if(!fs.existsSync(stateFile))throw new Error("SEC_RAW_BACKFILL_STATE_MISSING");
  const state=JSON.parse(fs.readFileSync(stateFile,"utf8"));
  if((state.nportProcessed??[]).length<15)throw new Error("SEC_RAW_BACKFILL_INCOMPLETE");
  const rows=Object.values(state.monthly??{}).sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const store=marketOperationalStore(core);
    const benchmark=(await store.readInput("shadowSp500Benchmark"))?.body?.series?.SP500??[];
    if(benchmark.length<250)throw new Error("SP500_SHADOW_BENCHMARK_MISSING");
    const features={
      allNetRatio:signals(rows,"allNetRatio"),
      netFlowMomentum:momentum(rows),
      indexNetRatio:signals(rows,"indexNetRatio"),
      nonIndexNetRatio:signals(rows,"nonIndexNetRatio"),
      outflowPressure:rows.flatMap(row=>finite(row?.allOutflowRatio)?[{label:row.availableAt,value:Math.abs(row.allOutflowRatio)}]:[]),
    };
    const evaluated={};
    for(const [name,series] of Object.entries(features)){
      const out=evaluateSeries(series,benchmark);
      evaluated[name]={observations:out.observations,eligible1m:out.eligible1m,eligible3m:out.eligible3m,correlation1m:out.correlation1m,correlation3m:out.correlation3m};
    }
    const coverage=rows.map(row=>row.classificationCoverageRatio).filter(finite);
    const report={
      version:1,status:"PASS",mode:"SEC_RAW_NPORT_NCEN_PIT_BACKTEST_ONLY",lookAheadSafe:true,
      historyMode:"AS_FILED_ORIGINAL_NPORT_WITH_PRIOR_NCEN_CLASSIFICATION",
      providerCalls:0,publicMutation:false,productionFormulaChanged:false,formulaSelected:false,weightSelected:false,
      coverage:{months:rows.length,first:rows[0]?.observationDate??null,last:rows.at(-1)?.observationDate??null,meanClassificationCoverage:coverage.length?coverage.reduce((a,b)=>a+b,0)/coverage.length:null},
      features:evaluated,
      conclusion:"This raw pre-Registered-Fund-Statistics sample is an independent historical extension. Use it only to validate direction and stability; do not change production weights without a separate approved candidate and validation gate.",
    };
    const output=path.join(base,OUTPUT_NAME);fs.writeFileSync(output,JSON.stringify(report,null,2));return {output,...report};
  }finally{core.close()}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  backtestSecRawFundFlows().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.log(JSON.stringify({status:"FAILED",code:error?.message??"SEC_RAW_BACKTEST_FAILED"}));process.exitCode=1});
}
