import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore,readStoredMarketInputsSelected} from "../../worker/candidate-market-operational-store.mjs";
import {loadStoredInflationR2Analysis} from "../../worker/inflation-r2-reader.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const normalizeRows=(rows=[])=>{
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const observationDate=row?.observationDate??row?.date;
    const value=Number(row?.value);
    if(validDate(observationDate)&&finite(value))map.set(observationDate,{observationDate,value});
  }
  return [...map.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
};
const pct=(current,prior)=>finite(current)&&finite(prior)&&prior!==0?100*(current/prior-1):null;
function rollingStd(values){
  const clean=values.filter(finite);
  if(clean.length<2)return null;
  const avg=clean.reduce((a,b)=>a+b,0)/clean.length;
  return Math.sqrt(clean.reduce((sum,value)=>sum+(value-avg)**2,0)/clean.length);
}
function dollarFeatures(rows=[]){
  const data=normalizeRows(rows);
  if(data.length<61)return {status:"PARTIAL",reason:"DOLLAR_HISTORY_SHORT",rows:data.length};
  const latest=data.at(-1),p20=data.at(-21),p40=data.at(-41),p60=data.at(-61);
  const daily=[];
  for(let i=Math.max(1,data.length-20);i<data.length;i++)daily.push(pct(data[i].value,data[i-1].value));
  const change20=pct(latest.value,p20.value),prior20=pct(p20.value,p40.value),change60=pct(latest.value,p60.value);
  return {
    status:"READY",rows:data.length,first:data[0].observationDate,last:latest.observationDate,
    level:latest.value,change20,change60,acceleration20:finite(change20)&&finite(prior20)?change20-prior20:null,
    volatility20:rollingStd(daily),
  };
}
function monthlyFeatures(rows=[]){
  const data=normalizeRows(rows);
  if(data.length<4)return {status:"PARTIAL",reason:"MONTHLY_HISTORY_SHORT",rows:data.length};
  const latest=data.at(-1),p1=data.at(-2),p3=data.at(-4);
  return {
    status:"READY",rows:data.length,first:data[0].observationDate,last:latest.observationDate,
    level:latest.value,change1m:pct(latest.value,p1.value),change3m:pct(latest.value,p3.value),
  };
}
async function breadthCoverage(db){
  try{
    const summary=await db.prepare(
      "SELECT COUNT(DISTINCT trade_date) AS sessions,MIN(trade_date) AS first,MAX(trade_date) AS last,COUNT(*) AS rows FROM market_score_breadth_b1_r3_current_v1"
    ).first();
    const perTicker=(await db.prepare(
      "SELECT ticker,COUNT(DISTINCT trade_date) AS sessions FROM market_score_breadth_b1_r3_current_v1 GROUP BY ticker"
    ).all()).results??[];
    const counts=perTicker.map(row=>Number(row.sessions)).filter(Number.isFinite);
    const countAtLeast=n=>counts.filter(value=>value>=n).length;
    return {
      status:Number(summary?.sessions??0)>0?"READY":"PARTIAL",
      sessions:Number(summary?.sessions??0),rows:Number(summary?.rows??0),
      first:summary?.first??null,last:summary?.last??null,tickers:counts.length,
      tickersWith50Sessions:countAtLeast(50),
      tickersWith200Sessions:countAtLeast(200),
      tickersWith252Sessions:countAtLeast(252),
      readiness:{
        ma50:countAtLeast(50)>=490,
        ma200:countAtLeast(200)>=490,
        highLow52w:countAtLeast(252)>=490,
      },
    };
  }catch{return {status:"PARTIAL",reason:"BREADTH_STORAGE_UNAVAILABLE"}}
}
function fundFlowCoverage(rows=[]){
  const data=(Array.isArray(rows)?rows:[]).filter(row=>validDate(row?.observationDate)).sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
  const latest=data.at(-1)??null;
  return {
    status:data.length?"READY":"PARTIAL",rows:data.length,
    first:data[0]?.observationDate??null,last:latest?.observationDate??null,
    availableSeries:["allNetRatio","indexNetRatio","nonIndexNetRatio","allOutflowRatio"],
    equityBondSplitAvailable:false,
    latest:latest?{
      allNetRatio:finite(latest.allNetRatio)?latest.allNetRatio:null,
      indexNetRatio:finite(latest.indexNetRatio)?latest.indexNetRatio:null,
      nonIndexNetRatio:finite(latest.nonIndexNetRatio)?latest.nonIndexNetRatio:null,
      allOutflowRatio:finite(latest.allOutflowRatio)?latest.allOutflowRatio:null,
    }:null,
  };
}

export async function analyzeMarketImprovementReadiness(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const db=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const marketFile=path.join(base,"local-market-result.json");
    const market=fs.existsSync(marketFile)?JSON.parse(fs.readFileSync(marketFile,"utf8")):{};
    const asOf=validDate(market?.asOfDate)?market.asOfDate:new Date().toISOString().slice(0,10);
    const store=marketOperationalStore(db);
    const inputs=await readStoredMarketInputsSelected(store,["macro","supply","fundFlows"],Date.now(),{anchorToLatestBatch:true});
    const inflation=await loadStoredInflationR2Analysis(db,{asOf});
    const dollar=dollarFeatures(inputs?.series?.DTWEXBGS??[]);
    const commodities={
      wti:monthlyFeatures(inputs?.series?.MCOILWTICO??[]),
      brent:monthlyFeatures(inputs?.series?.MCOILBRENTEU??[]),
      gasoline:monthlyFeatures(inputs?.series?.GASREGCOVM??[]),
      copper:monthlyFeatures(inputs?.external?.copperRows??[]),
    };
    const breadth=await breadthCoverage(db);
    const fundFlows=fundFlowCoverage(inputs?.external?.registeredFundFlowRows??[]);
    const report={
      version:1,status:"PASS",mode:"ANALYSIS_ONLY",asOf,providerCalls:0,publicMutation:false,formulaChanged:false,
      inflation,
      dollar,
      breadth,
      commodities,
      fundFlows,
      implementation:{
        inflationR3:inflation.status==="READY"?"INPUT_READY":"INPUT_BLOCKED",
        dollarR2:dollar.status==="READY"?"INPUT_READY":"INPUT_BLOCKED",
        breadthR6:breadth?.readiness?.ma50&&breadth?.readiness?.ma200?"INPUT_READY":breadth.status==="READY"?"PARTIAL_HISTORY":"INPUT_BLOCKED",
        commoditiesR3:Object.values(commodities).every(item=>item.status==="READY")?"INPUT_READY":"INPUT_BLOCKED",
        fundFlowsR2:fundFlows.status==="READY"?"BASE_INPUT_READY_ICI_REQUIRED_FOR_EQUITY_BOND_SPLIT":"INPUT_BLOCKED",
      },
    };
    const output=path.join(base,"local-market-improvement-readiness.json");
    fs.writeFileSync(output,JSON.stringify(report,null,2));
    return {output,...report};
  }finally{db.close()}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  analyzeMarketImprovementReadiness().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):"MARKET_IMPROVEMENT_READINESS_FAILED"}));
    process.exitCode=1;
  });
}
