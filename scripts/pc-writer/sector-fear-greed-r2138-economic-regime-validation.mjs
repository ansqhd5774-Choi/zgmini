import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {buildSectorSpeculativeCandidateR24} from "../../lib/market-score/sector-fear-greed-r24-speculative-shadow.mjs";
import {correlation} from "../../lib/market-score/sector-fear-greed-r28-reference-window.mjs";
import {buildR2134RepairedBenchmarks} from "./sector-fear-greed-r2134-r24-benchmark-repair-shadow.mjs";
import {mergeCanonicalRowsR2135} from "./sector-fear-greed-r2135-r24-source-sensitivity.mjs";
import {R2137_MIXES,mixR2137History} from "./sector-fear-greed-r2137-component-weight-sensitivity.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const IEX_PRICE_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const INVENTORY_FILE="local-sector-fear-greed-r2133-local-benchmark-inventory.json";
const R6_HISTORY_NAME="local-breadth-r6-shadow-history.json";
const R7_HISTORY_NAME="local-breadth-r7-pit-price-history.json";
const OUTPUT_JSON="local-sector-fear-greed-r2138-economic-regime-validation.json";
const OUTPUT_TXT="local-sector-fear-greed-r2138-economic-regime-validation.txt";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const round=value=>finite(value)?Math.round(value*10000)/10000:null;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
const stdPopulation=values=>{if(!values.length)return null;const m=mean(values);return Math.sqrt(mean(values.map(v=>(v-m)**2)));};

function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function tableExists(db,name){return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").get(name));}
function normalizePriceRows(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10),close=Number(row?.close??row?.currentClose??row?.current_close);
    if(validDate(date)&&finite(close)&&close>0)map.set(date,{date,close});
  }
  return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function readCanonicalRows(base){
  const rowSets=[];
  for(const [name,source] of [[R7_HISTORY_NAME,"BREADTH_R7_LOCAL"],[R6_HISTORY_NAME,"BREADTH_R6_LOCAL"]]){
    const payload=safeJson(path.join(base,name));rowSets.push({source,rows:payload?.rows??[]});
  }
  const dbRows=[],dbFile=path.join(base,"storage","core.sqlite");
  if(fs.existsSync(dbFile)){
    const db=new DatabaseSync(dbFile,{readOnly:true});db.exec("PRAGMA query_only=ON");
    try{
      if(tableExists(db,"market_score_breadth_b1_r3_current_v1")){
        for(const row of db.prepare("SELECT trade_date,ticker,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 ORDER BY trade_date,ticker").all())dbRows.push(row);
      }
    }finally{db.close();}
  }
  return mergeCanonicalRowsR2135(rowSets,dbRows);
}
function scoreRows(rows=[]){
  return (Array.isArray(rows)?rows:[]).map(row=>({date:String(row?.date??"").slice(0,10),score:Number(row?.score)})).filter(row=>validDate(row.date)&&finite(row.score)).sort((a,b)=>a.date.localeCompare(b.date));
}
function spearmanPairs(rows,key){
  const a=[],b=[];
  for(const row of rows)if(finite(row?.score)&&finite(row?.[key])){a.push({date:row.date,score:row.score});b.push({date:row.date,score:row[key]});}
  return round(correlation(a,b,{method:"spearman"}));
}
function meanByBand(rows,key,predicate){
  const values=rows.filter(row=>predicate(row.score)&&finite(row?.[key])).map(row=>row[key]);
  return {n:values.length,mean:round(mean(values))};
}

export function buildR2138OutcomeRows(speculative=[],etfRows=[]){
  const prices=normalizePriceRows(etfRows),indexByDate=new Map(prices.map((row,i)=>[row.date,i])),out=[];
  for(const row of scoreRows(speculative)){
    const i=indexByDate.get(row.date);if(!Number.isInteger(i))continue;
    const current=prices[i].close,item={date:row.date,score:row.score};
    if(i>=20){
      item.trailing20Return=current/prices[i-20].close-1;
      const logs=[];for(let j=i-19;j<=i;j++)logs.push(Math.log(prices[j].close/prices[j-1].close));
      const sd=stdPopulation(logs);item.trailingRv20=finite(sd)?sd*Math.sqrt(252):null;
    }
    for(const h of [5,20,60]){
      if(i+h>=prices.length)continue;
      item[`forwardReturn${h}`]=prices[i+h].close/current-1;
      let min=0;for(let j=i+1;j<=i+h;j++)min=Math.min(min,prices[j].close/current-1);
      item[`forwardDrawdown${h}`]=min;
    }
    out.push(item);
  }
  return out;
}

export function summarizeR2138Economic(rows=[]){
  const clean=Array.isArray(rows)?rows:[];
  const result={n:clean.length,
    corrTrailing20:spearmanPairs(clean,"trailing20Return"),
    corrRv20:spearmanPairs(clean,"trailingRv20"),
    corrForward5:spearmanPairs(clean,"forwardReturn5"),
    corrForward20:spearmanPairs(clean,"forwardReturn20"),
    corrForward60:spearmanPairs(clean,"forwardReturn60"),
    corrForwardDrawdown20:spearmanPairs(clean,"forwardDrawdown20"),
    corrForwardDrawdown60:spearmanPairs(clean,"forwardDrawdown60"),
    highBand:{},lowBand:{}
  };
  for(const key of ["forwardReturn20","forwardReturn60","forwardDrawdown20","forwardDrawdown60"]){
    result.highBand[key]=meanByBand(clean,key,score=>score>=75);
    result.lowBand[key]=meanByBand(clean,key,score=>score<=25);
  }
  return result;
}
function median(values){
  const a=values.filter(finite).sort((x,y)=>x-y);if(!a.length)return null;const i=(a.length-1)/2,lo=Math.floor(i),hi=Math.ceil(i);return lo===hi?a[lo]:(a[lo]+a[hi])/2;
}
function aggregateMix(sectors){
  const list=Object.values(sectors),pick=key=>list.map(x=>x.economic[key]).filter(finite);
  const signs={
    trailing20Positive:list.filter(x=>finite(x.economic.corrTrailing20)&&x.economic.corrTrailing20>0).length,
    rv20Negative:list.filter(x=>finite(x.economic.corrRv20)&&x.economic.corrRv20<0).length,
    forward20Negative:list.filter(x=>finite(x.economic.corrForward20)&&x.economic.corrForward20<0).length,
    drawdown20Negative:list.filter(x=>finite(x.economic.corrForwardDrawdown20)&&x.economic.corrForwardDrawdown20<0).length
  };
  return {sectors:list.length,
    medianCorrTrailing20:round(median(pick("corrTrailing20"))),
    medianCorrRv20:round(median(pick("corrRv20"))),
    medianCorrForward20:round(median(pick("corrForward20"))),
    medianCorrForward60:round(median(pick("corrForward60"))),
    medianCorrDrawdown20:round(median(pick("corrForwardDrawdown20"))),
    medianCorrDrawdown60:round(median(pick("corrForwardDrawdown60"))),
    signs};
}

export function runSectorFearGreedR2138EconomicRegimeValidation(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const pitPath=path.join(base,PIT_FILE),iexPath=path.join(base,IEX_PRICE_FILE),inventoryPath=path.join(base,INVENTORY_FILE);
  if(!fs.existsSync(pitPath))throw new Error("R2138_PIT_HISTORY_MISSING");
  if(!fs.existsSync(iexPath))throw new Error("R2138_IEX_PRICE_HISTORY_MISSING");
  if(!fs.existsSync(inventoryPath))throw new Error("R2138_R2133_INVENTORY_MISSING");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8")),iex=safeJson(iexPath),inventory=safeJson(inventoryPath),repair=buildR2134RepairedBenchmarks(iex?.series??{},inventory),canonical=readCanonicalRows(base),spyRows=normalizePriceRows(repair.series.SPY??[]),mixes=Object.fromEntries(R2137_MIXES.map(m=>[m.id,{mix:m,sectors:{}}]));
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const etfRows=normalizePriceRows(repair.series[ticker]??[]),candidate=buildSectorSpeculativeCandidateR24({rows:canonical.rows,spyRows,etfRows,pitHistory:pit,sectorId});
    for(const mix of R2137_MIXES){
      const spec=mixR2137History(candidate.history,mix.lottery,mix.volume),outcomes=buildR2138OutcomeRows(spec,etfRows);
      mixes[mix.id].sectors[sectorId]={ticker,status:candidate.status,scoreRows:spec.length,outcomeRows:outcomes.length,economic:summarizeR2138Economic(outcomes)};
    }
  }
  const summaries=Object.fromEntries(R2137_MIXES.map(m=>[m.id,aggregateMix(mixes[m.id].sectors)])),generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={
    version:"R2.13.8-ECONOMIC-REGIME-VALIDATION",generatedAt,status:"SHADOW_R2138_ECONOMIC_REGIME_VALIDATION_COMPLETE",mode:"LOCAL_READ_ONLY_SPECULATIVE_APPETITE_ECONOMIC_BEHAVIOR",
    providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,fillForwardFill:false,sourceFilesMutated:false,r24ApprovedForProduction:false,candidateSelected:false,optionsEquivalenceClaimed:false,selectionThresholdIntroduced:false,currentR24WeightsChanged:false,
    testedMixes:R2137_MIXES,repair:{targetDate:repair.targetDate,complete:repair.complete,injected:repair.injected.length,alreadyPresent:repair.alreadyPresent.length},canonicalRows:canonical.rows.length,summaries,mixes
  };
  const lines=[
    "ZGMINI SECTOR FEAR & GREED R2.13.8 ECONOMIC REGIME VALIDATION",
    `generatedAt=${generatedAt}`,
    `status=${report.status}`,
    "mode=LOCAL_READ_ONLY_SPECULATIVE_APPETITE_ECONOMIC_BEHAVIOR",
    "providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false",
    "productionFormulaChanged=false dbSchemaChanged=false schedulerChanged=false referenceRequirementChanged=false",
    "approvedR1ReferenceRequirement=756 (UNCHANGED)",
    "fillForwardFill=false sourceFilesMutated=false candidateSelected=false r24ApprovedForProduction=false",
    "optionsEquivalenceClaimed=false selectionThresholdIntroduced=false currentR24WeightsChanged=false",
    `repair targetDate=${report.repair.targetDate} complete=${report.repair.complete} injected=${report.repair.injected}`,
    `canonicalRows=${report.canonicalRows}`,
    "",
    "MIX | MED_TRAIL20 | MED_RV20 | MED_FWD20 | MED_FWD60 | MED_DD20 | MED_DD60 | TRAIL20_POS | RV20_NEG | FWD20_NEG | DD20_NEG"
  ];
  for(const mix of R2137_MIXES){
    const s=summaries[mix.id];lines.push(`${mix.id} | ${s.medianCorrTrailing20??"NA"} | ${s.medianCorrRv20??"NA"} | ${s.medianCorrForward20??"NA"} | ${s.medianCorrForward60??"NA"} | ${s.medianCorrDrawdown20??"NA"} | ${s.medianCorrDrawdown60??"NA"} | ${s.signs.trailing20Positive}/11 | ${s.signs.rv20Negative}/11 | ${s.signs.forward20Negative}/11 | ${s.signs.drawdown20Negative}/11`);
  }
  lines.push("","SECTOR DETAIL: L50_V50 AND L60_V40");
  for(const id of ["L50_V50","L60_V40"]){
    lines.push("",`[${id}]`,"SECTOR | ETF | N | TRAIL20 | RV20 | FWD20 | FWD60 | DD20 | DD60 | HIGH75_FWD20_N | HIGH75_FWD20_MEAN | LOW25_FWD20_N | LOW25_FWD20_MEAN");
    for(const [sectorId,item] of Object.entries(mixes[id].sectors)){
      const e=item.economic;lines.push(`${sectorId} | ${item.ticker} | ${e.n} | ${e.corrTrailing20??"NA"} | ${e.corrRv20??"NA"} | ${e.corrForward20??"NA"} | ${e.corrForward60??"NA"} | ${e.corrForwardDrawdown20??"NA"} | ${e.corrForwardDrawdown60??"NA"} | ${e.highBand.forwardReturn20.n} | ${e.highBand.forwardReturn20.mean??"NA"} | ${e.lowBand.forwardReturn20.n} | ${e.lowBand.forwardReturn20.mean??"NA"}`);
    }
  }
  lines.push("","note=THIS_TEST_EVALUATES_SPECULATIVE_APPETITE_ECONOMIC_BEHAVIOR_ONLY","note=IT_DOES_NOT_CLAIM_PUT_CALL_OR_OPTIONS_EQUIVALENCE","note=FORWARD_METRICS_ARE_DESCRIPTIVE_VALIDATION_NOT_A_PRODUCTION_SELECTION_RULE","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_OR_REFERENCE_CHANGE");
  fs.writeFileSync(path.join(base,OUTPUT_JSON),JSON.stringify(report,null,2));
  fs.writeFileSync(path.join(base,OUTPUT_TXT),lines.join("\n")+"\n");
  return report;
}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
  try{
    const report=runSectorFearGreedR2138EconomicRegimeValidation();
    console.log(JSON.stringify({status:report.status,jsonFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,OUTPUT_JSON),txtFile:path.join(process.env.ZGMINI_PC_HOME??DEFAULT_BASE,OUTPUT_TXT),providerCalls:report.providerCalls,publicMutation:report.publicMutation,productionFormulaChanged:report.productionFormulaChanged,referenceRequirementChanged:report.referenceRequirementChanged,summaries:report.summaries},null,2));
  }catch(error){console.error(error?.message??String(error));process.exitCode=1;}
}
