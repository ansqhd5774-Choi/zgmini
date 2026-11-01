import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {save} from "./d1.mjs";

export const COMPOSITE_SENSITIVITY_FACTORS=Object.freeze([1.5,2,2.5]);
const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const INPUT_NAME="local-market-result.json";
const OUTPUT_NAME="local-composite-sensitivity-analysis.json";

const finiteScore=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const clamp=value=>Math.max(0,Math.min(100,value));

export function amplifyCompositeScore(score,factor){
  if(!finiteScore(score))throw new TypeError("COMPOSITE_SCORE_INVALID");
  if(typeof factor!=="number"||!Number.isFinite(factor)||factor<=0)throw new TypeError("SENSITIVITY_FACTOR_INVALID");
  return clamp(50+(score-50)*factor);
}

export function scoreBand(score){
  if(!finiteScore(score))return "unknown";
  return score<25?"danger":score<40?"caution":score<60?"neutral":score<75?"positive":"strong";
}

function normalizeTrend(rows=[]){
  const byDate=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=row?.label??row?.date??null;
    const value=typeof row?.value==="number"?row.value:row?.score;
    if(validDate(date)&&finiteScore(value))byDate.set(date,{label:date,value});
  }
  return [...byDate.values()].sort((a,b)=>a.label.localeCompare(b.label));
}

function mean(values){return values.reduce((sum,value)=>sum+value,0)/values.length}
function deviation(values,avg){
  return Math.sqrt(values.reduce((sum,value)=>sum+(value-avg)**2,0)/values.length);
}
function distribution(values){
  const bands={danger:0,caution:0,neutral:0,positive:0,strong:0};
  for(const value of values)bands[scoreBand(value)]++;
  return bands;
}
function bandChanges(values){
  let changes=0;
  for(let i=1;i<values.length;i++)if(scoreBand(values[i])!==scoreBand(values[i-1]))changes++;
  return changes;
}
function stats(values,{rawValues=null}={}){
  const avg=mean(values),min=Math.min(...values),max=Math.max(...values);
  let clippedLow=0,clippedHigh=0;
  if(Array.isArray(rawValues)){
    for(const value of rawValues){if(value<0)clippedLow++;else if(value>100)clippedHigh++;}
  }
  return {
    min,max,range:max-min,mean:avg,stdDev:deviation(values,avg),
    bands:distribution(values),bandChanges:bandChanges(values),
    clippedLow,clippedHigh,clipped:clippedLow+clippedHigh,
    clippedRatio:values.length?(clippedLow+clippedHigh)/values.length:0,
  };
}

export function analyzeCompositeSensitivity(market){
  const trend=normalizeTrend(market?.overall?.trend);
  if(trend.length<2)throw new Error("COMPOSITE_TREND_TOO_SHORT");
  const rawValues=trend.map(point=>point.value);
  const current=finiteScore(market?.overall?.score)?market.overall.score:trend.at(-1).value;
  const candidates=COMPOSITE_SENSITIVITY_FACTORS.map(factor=>{
    const unbounded=rawValues.map(value=>50+(value-50)*factor);
    const series=trend.map((point,index)=>({label:point.label,value:clamp(unbounded[index])}));
    return {
      factor,
      current:amplifyCompositeScore(current,factor),
      stats:stats(series.map(point=>point.value),{rawValues:unbounded}),
      series,
    };
  });
  return {
    version:1,
    status:"PASS",
    mode:"ANALYSIS_ONLY",
    source:"LOCAL_MARKET_RESULT",
    productionScoreChanged:false,
    formulaChanged:false,
    points:trend.length,
    first:trend[0].label,
    last:trend.at(-1).label,
    currentRaw:current,
    raw:{stats:stats(rawValues),series:trend},
    candidates,
    note:"Affine sensitivity changes visual amplitude and threshold occupancy, not the underlying information content or rank ordering before clipping.",
  };
}

export function runCompositeSensitivityAnalysis(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const input=path.join(base,INPUT_NAME),output=path.join(base,OUTPUT_NAME);
  if(!fs.existsSync(input))throw new Error("LOCAL_MARKET_RESULT_MISSING");
  const market=JSON.parse(fs.readFileSync(input,"utf8"));
  const analysis=analyzeCompositeSensitivity(market);
  save(output,analysis);
  return {output,...analysis,candidates:analysis.candidates.map(item=>({
    factor:item.factor,current:item.current,stats:item.stats,
  }))};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(runCompositeSensitivityAnalysis(),null,2))}
  catch(error){
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):"COMPOSITE_SENSITIVITY_ANALYSIS_FAILED"}));
    process.exitCode=1;
  }
}
