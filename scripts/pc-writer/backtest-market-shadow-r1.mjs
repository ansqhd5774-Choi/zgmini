import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {localDatabase} from "./local-db.mjs";
import {marketOperationalStore,readStoredMarketInputsSelected} from "../../worker/candidate-market-operational-store.mjs";
import {loadStoredInflationR2AnalysisTimeline} from "../../worker/inflation-r2-reader.mjs";
import {buildInflationR3Shadow} from "../../lib/market-score/inflation-r3-shadow.mjs";
import {buildDollarFxR2Shadow} from "../../lib/market-score/dollar-fx-r2-shadow.mjs";
import {buildCommoditiesR3Shadow} from "../../lib/market-score/commodities-r3-shadow.mjs";
import {buildBreadthR6Trend} from "../../lib/market-score/breadth-r6-shadow.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const OUTPUT_NAME="local-market-shadow-backtest-r1.json";
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const domain=(market,id)=>market?.domains?.find(item=>item?.id===id)??null;
const days=(a,b)=>Math.floor((Date.parse(b+"T00:00:00Z")-Date.parse(a+"T00:00:00Z"))/86400000);
const addDays=(date,n)=>new Date(Date.parse(date+"T00:00:00Z")+n*86400000).toISOString().slice(0,10);
const memberHash=members=>createHash("sha256").update(JSON.stringify([...members].sort())).digest("hex");

function normalizeSeries(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const label=String(row?.label??row?.date??row?.observationDate??"").slice(0,10);
    const value=Number(row?.value??row?.score);
    if(validDate(label)&&finite(value))map.set(label,{label,value});
  }
  return [...map.values()].sort((a,b)=>a.label.localeCompare(b.label));
}
function benchmarkRows(rows=[]){
  return normalizeSeries(rows).filter(row=>row.value>0);
}
function latestAtOrBefore(rows,date){
  let found=null;
  for(const row of rows){if(row.label<=date)found=row;else break}
  return found;
}
function firstAtOrAfter(rows,date,maxGapDays=10){
  const found=rows.find(row=>row.label>=date)??null;
  if(!found||days(date,found.label)>maxGapDays)return null;
  return found;
}
function scoreBand(score){
  return score<25?"danger":score<40?"caution":score<60?"neutral":score<75?"positive":"strong";
}
function mean(values){
  const x=values.filter(finite);
  return x.length?x.reduce((a,b)=>a+b,0)/x.length:null;
}
function pearson(xs,ys){
  const pairs=xs.map((x,i)=>[x,ys[i]]).filter(([x,y])=>finite(x)&&finite(y));
  if(pairs.length<3)return null;
  const mx=mean(pairs.map(x=>x[0])),my=mean(pairs.map(x=>x[1]));
  const num=pairs.reduce((s,[x,y])=>s+(x-mx)*(y-my),0);
  const dx=Math.sqrt(pairs.reduce((s,[x])=>s+(x-mx)**2,0));
  const dy=Math.sqrt(pairs.reduce((s,[,y])=>s+(y-my)**2,0));
  return dx>0&&dy>0?num/(dx*dy):null;
}
export function evaluateSeries(series,benchmark){
  const signals=normalizeSeries(series),prices=benchmarkRows(benchmark),rows=[];
  for(const signal of signals){
    const base=latestAtOrBefore(prices,signal.label);
    if(!base)continue;
    const p30=firstAtOrAfter(prices,addDays(signal.label,30));
    const p90=firstAtOrAfter(prices,addDays(signal.label,90));
    const end90=p90?.label??addDays(signal.label,90);
    const forward=prices.filter(row=>row.label>base.label&&row.label<=end90);
    const minForward=forward.length?Math.min(...forward.map(row=>row.value)):null;
    rows.push({
      date:signal.label,score:signal.value,band:scoreBand(signal.value),
      benchmarkDate:base.label,benchmarkPrice:base.value,
      return1m:p30?100*(p30.value/base.value-1):null,
      return3m:p90?100*(p90.value/base.value-1):null,
      maxDrawdown3m:finite(minForward)?100*(minForward/base.value-1):null,
    });
  }
  const bands={};
  for(const name of ["danger","caution","neutral","positive","strong"]){
    const subset=rows.filter(row=>row.band===name);
    bands[name]={
      n:subset.length,
      return1m:mean(subset.map(row=>row.return1m)),
      return3m:mean(subset.map(row=>row.return3m)),
      maxDrawdown3m:mean(subset.map(row=>row.maxDrawdown3m)),
    };
  }
  return {
    observations:rows.length,
    eligible1m:rows.filter(row=>finite(row.return1m)).length,
    eligible3m:rows.filter(row=>finite(row.return3m)).length,
    meanScore:mean(rows.map(row=>row.score)),
    correlation1m:pearson(rows.map(row=>row.score),rows.map(row=>row.return1m)),
    correlation3m:pearson(rows.map(row=>row.score),rows.map(row=>row.return3m)),
    meanReturn1m:mean(rows.map(row=>row.return1m)),
    meanReturn3m:mean(rows.map(row=>row.return3m)),
    meanMaxDrawdown3m:mean(rows.map(row=>row.maxDrawdown3m)),
    bands,rows,
  };
}
function alignForComparison(baseline,candidate){
  const base=normalizeSeries(baseline),cand=normalizeSeries(candidate);
  if(!base.length||!cand.length)return {baseline:[],shadow:[]};
  const first=base[0].label,last=base.at(-1).label;
  const shadow=cand.filter(row=>row.label>=first&&row.label<=last);
  const aligned=[];
  for(const row of shadow){
    const found=latestAtOrBefore(base,row.label);
    if(found)aligned.push({label:row.label,value:found.value});
  }
  return {baseline:aligned,shadow:shadow.slice(-aligned.length)};
}
export function evaluationSummaryPair(baseline,candidate,benchmark){
  const baselineEval=evaluateSeries(baseline,benchmark);
  const shadowEval=evaluateSeries(candidate,benchmark);
  const aligned=alignForComparison(baseline,candidate);
  const matchedBaseline=evaluateSeries(aligned.baseline,benchmark);
  const matchedShadow=evaluateSeries(aligned.shadow,benchmark);
  return {
    baseline:baselineEval,
    shadow:shadowEval,
    comparison:{
      matchedSignals:Math.min(matchedBaseline.observations,matchedShadow.observations),
      correlation1mDelta:finite(matchedBaseline.correlation1m)&&finite(matchedShadow.correlation1m)?matchedShadow.correlation1m-matchedBaseline.correlation1m:null,
      correlation3mDelta:finite(matchedBaseline.correlation3m)&&finite(matchedShadow.correlation3m)?matchedShadow.correlation3m-matchedBaseline.correlation3m:null,
      note:"Candidate metrics use the full available shadow history; baseline deltas use matched overlapping signal dates only.",
    },
  };
}

function monthEndDates(rows=[],count=13){
  const byMonth=new Map();
  for(const row of normalizeSeries(rows))byMonth.set(row.label.slice(0,7),row.label);
  return [...byMonth.values()].sort().slice(-count);
}

async function loadBreadthInputs(db,base,asOf){
  const universe=await db.prepare(
    "SELECT trade_date,members_json,member_count FROM market_score_breadth_b1_r3_universe_v1 WHERE trade_date<=? ORDER BY trade_date DESC LIMIT 1"
  ).bind(asOf).first();
  const members=(()=>{try{return JSON.parse(universe?.members_json??"[]")}catch{return[]}})();
  const stored=(await db.prepare(
    "SELECT trade_date,ticker,previous_close,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date<=? ORDER BY trade_date,ticker"
  ).bind(asOf).all()).results??[];
  const byKey=new Map();
  const shadowFile=path.join(base,"local-breadth-r6-shadow-history.json");
  if(fs.existsSync(shadowFile)){
    try{
      const shadow=JSON.parse(fs.readFileSync(shadowFile,"utf8"));
      if(shadow?.universeDate===universe?.trade_date&&shadow?.memberHash===memberHash(members)){
        for(const row of shadow.rows??[]){
          const tradeDate=String(row?.tradeDate??""),ticker=String(row?.ticker??"").trim();
          const close=Number(row?.currentClose),volume=Number(row?.currentVolume??0);
          if(validDate(tradeDate)&&ticker&&finite(close)&&close>0&&finite(volume)&&volume>=0){
            byKey.set(tradeDate+"|"+ticker,{trade_date:tradeDate,ticker,previous_close:null,current_close:close,current_volume:volume});
          }
        }
      }
    }catch{}
  }
  for(const row of stored){
    const tradeDate=String(row?.trade_date??""),ticker=String(row?.ticker??"").trim();
    if(validDate(tradeDate)&&ticker)byKey.set(tradeDate+"|"+ticker,row);
  }
  return {
    members,
    rows:[...byKey.values()].sort((a,b)=>String(a.trade_date).localeCompare(String(b.trade_date))||String(a.ticker).localeCompare(String(b.ticker))),
    universeDate:universe?.trade_date??null,
  };
}

export async function runMarketShadowBacktest(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const core=localDatabase(path.join(base,"storage","core.sqlite"));
  try{
    const marketFile=path.join(base,"local-market-result.json");
    if(!fs.existsSync(marketFile))throw new Error("LOCAL_MARKET_RESULT_MISSING");
    const market=JSON.parse(fs.readFileSync(marketFile,"utf8"));
    const asOf=validDate(market?.asOfDate)?market.asOfDate:new Date().toISOString().slice(0,10);
    const store=marketOperationalStore(core);
    const benchmarkBatch=await store.readInput("shadowSp500Benchmark");
    const benchmark=benchmarkBatch?.body?.series?.SP500??[];
    if(benchmark.length<250)throw new Error("SP500_SHADOW_BENCHMARK_MISSING");

    const inputs=await readStoredMarketInputsSelected(store,["macro","supply"],Date.now(),{anchorToLatestBatch:true});

    const baselineInflation=normalizeSeries(domain(market,"inflation")?.trend??[]);
    const inflationTimeline=await loadStoredInflationR2AnalysisTimeline(core,{asOf,dates:baselineInflation.map(row=>row.label)});
    const shadowInflation=inflationTimeline.rows.flatMap(item=>{
      const out=buildInflationR3Shadow({features:item.features,axes:item.axes,asOfDate:item.date});
      return out.status==="READY"&&finite(out.score)?[{label:item.date,value:out.score}]:[];
    });

    const dollar=buildDollarFxR2Shadow(inputs?.series?.DTWEXBGS??[],{asOfDate:asOf});
    const commodities=buildCommoditiesR3Shadow({
      wtiRows:inputs?.series?.MCOILWTICO??[],
      brentRows:inputs?.series?.MCOILBRENTEU??[],
      gasolineRows:inputs?.series?.GASREGCOVM??[],
      copperRows:inputs?.external?.copperRows??[],
      asOfDate:asOf,
    });

    const breadthInput=await loadBreadthInputs(core,base,asOf);
    const breadthDates=monthEndDates(breadthInput.rows.map(row=>({label:row.trade_date,value:1})),13);
    const shadowBreadth=buildBreadthR6Trend({rows:breadthInput.rows,members:breadthInput.members,dates:breadthDates});

    const results={
      inflation:{
        ...evaluationSummaryPair(domain(market,"inflation")?.trend??[],shadowInflation,benchmark),
        lookAheadSafe:true,
      },
      dollarFx:{
        ...evaluationSummaryPair(domain(market,"dollarFx")?.trend??[],dollar?.trend??[],benchmark),
        lookAheadSafe:false,
        caveat:"CURRENT_VINTAGE_DOLLAR_HISTORY",
      },
      commodities:{
        ...evaluationSummaryPair(domain(market,"commodities")?.trend??[],commodities?.trend??[],benchmark),
        lookAheadSafe:false,
        caveat:"CURRENT_VINTAGE_COMMODITY_HISTORY",
      },
      breadth:{
        ...evaluationSummaryPair(domain(market,"breadth")?.trend??[],shadowBreadth,benchmark),
        lookAheadSafe:false,
        caveat:"CURRENT_UNIVERSE_SURVIVORSHIP_BIAS",
        historySessions:[...new Set(breadthInput.rows.map(row=>row.trade_date))].length,
      },
      fundFlows:{
        status:"DEFERRED_HISTORICAL_SOURCE_ACCESS",
        reason:"ICI_WEEKLY_HISTORY_NOT_AVAILABLE_IN_CURRENT_PUBLIC_SHADOW_STORE",
        currentShadowOnly:true,
      },
    };

    const report={
      version:1,status:"PASS",mode:"BACKTEST_ANALYSIS_ONLY",asOf,
      benchmark:{id:"SP500",rows:benchmark.length,first:benchmark[0]?.observationDate??null,last:benchmark.at(-1)?.observationDate??null},
      providerCalls:0,publicMutation:false,productionFormulaChanged:false,
      results,
    };
    const output=path.join(base,OUTPUT_NAME);
    fs.writeFileSync(output,JSON.stringify(report,null,2));
    return {output,...report};
  }finally{core.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  runMarketShadowBacktest().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"MARKET_SHADOW_BACKTEST_FAILED")}));
    process.exitCode=1;
  });
}
