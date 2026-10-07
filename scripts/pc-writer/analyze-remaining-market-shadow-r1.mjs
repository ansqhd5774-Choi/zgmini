import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore} from "../../worker/candidate-market-operational-store.mjs";
import {buildBreadthR6Components} from "../../lib/market-score/breadth-r6-shadow.mjs";
import {buildFundFlowsR2Components} from "../../lib/market-score/fund-flows-r2-shadow.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const domain=(market,id)=>market?.domains?.find(item=>item?.id===id)??null;

async function breadthInputs(db,asOf){
  const universe=await db.prepare(
    "SELECT trade_date,members_json,member_count FROM market_score_breadth_b1_r3_universe_v1 WHERE trade_date<=? ORDER BY trade_date DESC LIMIT 1"
  ).bind(asOf).first();
  const members=(()=>{try{return JSON.parse(universe?.members_json??"[]")}catch{return[]}})();
  const rows=(await db.prepare(
    "SELECT trade_date,ticker,previous_close,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date IN (SELECT trade_date FROM (SELECT DISTINCT trade_date FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date<=? ORDER BY trade_date DESC LIMIT 270)) ORDER BY trade_date,ticker"
  ).bind(asOf).all()).results??[];
  return {members,rows,universeDate:universe?.trade_date??null,memberCount:Number(universe?.member_count??0)};
}

export async function analyzeRemainingMarketShadowR1(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const db=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const marketFile=path.join(base,"local-market-result.json");
    if(!fs.existsSync(marketFile))throw new Error("LOCAL_MARKET_RESULT_MISSING");
    const market=JSON.parse(fs.readFileSync(marketFile,"utf8"));
    const asOf=validDate(market?.asOfDate)?market.asOfDate:new Date().toISOString().slice(0,10);
    const store=marketOperationalStore(db);

    const breadthRaw=await breadthInputs(db,asOf);
    const breadth=buildBreadthR6Components({rows:breadthRaw.rows,members:breadthRaw.members,asOfDate:breadthRaw.universeDate??asOf});

    const [secBatch,iciBatch]=await Promise.all([
      store.readInput("fundFlows"),
      store.readInput("shadowIciFundFlows"),
    ]);
    const secRows=secBatch?.body?.external?.registeredFundFlowRows??[];
    const iciRows=iciBatch?.body?.external?.iciCombinedFlowRows??[];
    const fundBase=domain(market,"fundFlows");
    const fundFlows=buildFundFlowsR2Components({secRows,iciRows,secBaselineScore:finite(fundBase?.score)?fundBase.score:null});

    const breadthBase=domain(market,"breadth");
    const report={
      version:1,status:"PASS",mode:"SHADOW_ONLY",asOf,providerCalls:0,publicMutation:false,productionFormulaChanged:false,
      breadthR6:{
        baselineScore:finite(breadthBase?.score)?breadthBase.score:null,
        baselineStatus:breadthBase?.status??"UNAVAILABLE",
        candidateScore:finite(breadth?.score)?breadth.score:null,
        candidateStatus:breadth.status,
        candidate:breadth,
      },
      fundFlowsR2:{
        baselineScore:finite(fundBase?.score)?fundBase.score:null,
        baselineStatus:fundBase?.status??"UNAVAILABLE",
        candidateScore:finite(fundFlows?.score)?fundFlows.score:null,
        candidateStatus:fundFlows.status,
        candidate:fundFlows,
      },
    };
    const output=path.join(base,"local-market-remaining-shadow-r1.json");
    fs.writeFileSync(output,JSON.stringify(report,null,2));
    return {output,...report};
  }finally{db.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  analyzeRemainingMarketShadowR1().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"REMAINING_MARKET_SHADOW_FAILED")}));
    process.exitCode=1;
  });
}
