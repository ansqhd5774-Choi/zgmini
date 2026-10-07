import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore} from "../../worker/market-operational-store.mjs";
import {buildBreadthR7PitTrend,monthEndPitDates} from "../../lib/market-score/breadth-r7-pit-shadow.mjs";
import {evaluationSummaryPair} from "./backtest-market-shadow-r1.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_NAME="local-breadth-r7-pit-universe.json";
const HISTORY_NAME="local-breadth-r7-pit-price-history.json";
const OUTPUT_NAME="local-breadth-r7-pit-backtest.json";
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const domain=(market,id)=>market?.domains?.find(item=>item?.id===id)??null;
function read(file){return JSON.parse(fs.readFileSync(file,"utf8"))}

export async function backtestBreadthR7Pit(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const pitFile=path.join(base,PIT_NAME),historyFile=path.join(base,HISTORY_NAME),marketFile=path.join(base,"local-market-result.json");
  if(!fs.existsSync(pitFile)||!fs.existsSync(historyFile)||!fs.existsSync(marketFile))throw new Error("BREADTH_R7_PIT_INPUT_MISSING");
  const pit=read(pitFile),history=read(historyFile),market=read(marketFile);
  if(pit?.status!=="READY"||!pit?.membershipLookAheadSafe||!pit?.currentUniverseSurvivorshipBiasRemoved)throw new Error("BREADTH_R7_PIT_UNIVERSE_NOT_SAFE");
  if(history?.pitEventDigest!==pit.eventDigest||history?.currentMemberHash!==pit.currentMemberHash)throw new Error("BREADTH_R7_PIT_PRICE_HISTORY_STALE");
  const asOf=validDate(market?.asOfDate)?market.asOfDate:pit.last;
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const store=marketOperationalStore(core);
    const benchmarkBatch=await store.readInput("shadowSp500Benchmark");
    const benchmark=benchmarkBatch?.body?.series?.SP500??[];
    if(benchmark.length<250)throw new Error("SP500_SHADOW_BENCHMARK_MISSING");
    const dates=monthEndPitDates(pit.universes.filter(row=>row.tradeDate<=asOf),13);
    const built=buildBreadthR7PitTrend({rows:history.rows??[],universes:pit.universes,dates});
    if(built.readyDates<10)throw new Error("BREADTH_R7_PIT_READY_DATES_SHORT");
    const comparison=evaluationSummaryPair(domain(market,"breadth")?.trend??[],built.trend,benchmark);
    const report={
      version:1,status:"PASS",mode:"BREADTH_R7_PIT_BACKTEST_ONLY",
      asOf,providerCalls:0,publicMutation:false,productionFormulaChanged:false,
      membershipMethodologyVersion:pit.methodologyVersion,
      scoringMethodologyVersion:built.methodologyVersion,
      membershipLookAheadSafe:true,
      currentUniverseSurvivorshipBiasRemoved:true,
      currentAnchorReconciled:pit.currentAnchorReconciled??false,
      currentAnchorRepairCount:Number(pit.currentAnchorRepairCount??0),
      priceHistoryMode:"CURRENT_VINTAGE_DAILY_MARKET_BARS",
      priceHistoryCaveat:"Historical market bars may reflect later data corrections/corporate-action adjustments; the membership universe itself is PIT reconstructed from official effective-date changes.",
      targetDates:dates,readyDates:built.readyDates,
      candidateTrend:built.trend,
      ...comparison,
      productionPromotionCandidate:false,
      conclusion:"Survivorship bias is removed from S&P 500 membership for the evaluated Breadth R6 shadow dates. This report is diagnostic only and does not authorize production promotion.",
    };
    const output=path.join(base,OUTPUT_NAME);
    fs.writeFileSync(output,JSON.stringify(report,null,2));
    return {output,...report};
  }finally{core.close()}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  backtestBreadthR7Pit().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"BREADTH_R7_PIT_BACKTEST_FAILED")}));
    process.exitCode=1;
  });
}
