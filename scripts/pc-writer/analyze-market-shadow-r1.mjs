import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore,readStoredMarketInputsSelected} from "../../worker/candidate-market-operational-store.mjs";
import {loadStoredInflationR2Analysis} from "../../worker/inflation-r2-reader.mjs";
import {buildInflationR3Shadow} from "../../lib/market-score/inflation-r3-shadow.mjs";
import {buildDollarFxR2Shadow} from "../../lib/market-score/dollar-fx-r2-shadow.mjs";
import {buildCommoditiesR3Shadow} from "../../lib/market-score/commodities-r3-shadow.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const domain=(market,id)=>market?.domains?.find(item=>item?.id===id)??null;
const compare=(baseline,shadow)=>({
  baselineStatus:baseline?.status??"UNAVAILABLE",
  baselineScore:finite(baseline?.score)?baseline.score:null,
  shadowStatus:shadow?.status??"UNAVAILABLE",
  shadowScore:finite(shadow?.score)?shadow.score:null,
  delta:finite(baseline?.score)&&finite(shadow?.score)?shadow.score-baseline.score:null,
});

export async function analyzeMarketShadowR1(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const db=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const marketFile=path.join(base,"local-market-result.json");
    if(!fs.existsSync(marketFile))throw new Error("LOCAL_MARKET_RESULT_MISSING");
    const market=JSON.parse(fs.readFileSync(marketFile,"utf8"));
    const asOf=validDate(market?.asOfDate)?market.asOfDate:new Date().toISOString().slice(0,10);
    const store=marketOperationalStore(db);
    const inputs=await readStoredMarketInputsSelected(store,["macro","supply"],Date.now(),{anchorToLatestBatch:true});
    const inflationInputs=await loadStoredInflationR2Analysis(db,{asOf});
    const inflation=inflationInputs.status==="READY"
      ?buildInflationR3Shadow({axes:inflationInputs.axes,asOfDate:asOf})
      :{status:"PARTIAL",score:null,reason:inflationInputs.reason??"INFLATION_ANALYSIS_NOT_READY"};
    const dollar=buildDollarFxR2Shadow(inputs?.series?.DTWEXBGS??[],{asOfDate:asOf});
    const commodities=buildCommoditiesR3Shadow({
      wtiRows:inputs?.series?.MCOILWTICO??[],
      brentRows:inputs?.series?.MCOILBRENTEU??[],
      gasolineRows:inputs?.series?.GASREGCOVM??[],
      copperRows:inputs?.external?.copperRows??[],
      asOfDate:asOf,
    });
    const report={
      version:1,status:"PASS",mode:"SHADOW_ONLY",asOf,providerCalls:0,publicMutation:false,productionFormulaChanged:false,
      candidates:{
        inflationR3:{...compare(domain(market,"inflation"),inflation),candidate:inflation},
        dollarR2:{...compare(domain(market,"dollarFx"),dollar),candidate:dollar},
        commoditiesR3:{...compare(domain(market,"commodities"),commodities),candidate:commodities},
      },
    };
    const output=path.join(base,"local-market-shadow-r1.json");
    fs.writeFileSync(output,JSON.stringify(report,null,2));
    return {output,...report};
  }finally{db.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  analyzeMarketShadowR1().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):"MARKET_SHADOW_R1_FAILED"}));
    process.exitCode=1;
  });
}
