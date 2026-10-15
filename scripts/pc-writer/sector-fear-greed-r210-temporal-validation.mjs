import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {DatabaseSync} from "node:sqlite";
import {fileURLToPath} from "node:url";
import {parsePitSectorHistoryCsv,buildPointInTimeSectorInputs} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";
import {SECTOR_FEAR_GREED_R1_ETFS} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {
  percentileWindow,
  scoreRawAxis,
  buildCompositeSeries,
  alignSeries,
  correlation,
  rankCorrelationByKey
} from "../../lib/market-score/sector-fear-greed-r28-reference-window.mjs";
import {deriveR28RawAxes} from "./sector-fear-greed-r28-reference-window-diagnostic.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const PIT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const PRICE_FILE="local-sector-fear-greed-r1-iex-price-history.json";
const R6_HISTORY_NAME="local-breadth-r6-shadow-history.json";
const R7_HISTORY_NAME="local-breadth-r7-pit-price-history.json";
const OUTPUT_JSON="local-sector-fear-greed-r210-temporal-validation.json";
const OUTPUT_TXT="local-sector-fear-greed-r210-temporal-validation.txt";
const WINDOW=252;
const AXIS_WEIGHTS=Object.freeze({trend:.20,breadth:.20,demand:.15,relativeStrength:.15,volatility:.15});
const AXIS_SPECS=Object.freeze({
  trend:{metrics:[{key:"m125",weight:.50},{key:"r60",weight:.30},{key:"r20",weight:.20}]},
  breadth:{metrics:[{key:"b50",weight:.35},{key:"b200",weight:.35},{key:"highLowNet",weight:.30}]},
  demand:{metrics:[{key:"vb5",weight:.60},{key:"vb20",weight:.40}]},
  relativeStrength:{metrics:[{key:"rs20",weight:.25},{key:"rs60",weight:.45},{key:"rs125",weight:.30}]},
  volatility:{metrics:[{key:"rv20",weight:.40,invert:true},{key:"dsv20",weight:.35,invert:true},{key:"dd63",weight:.25}]},
});
const AXES=Object.keys(AXIS_WEIGHTS);
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const round=value=>finite(value)?Math.round(value*10000)/10000:null;
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
function quantile(values,p){const x=values.filter(finite).sort((a,b)=>a-b);if(!x.length)return null;const pos=(x.length-1)*p,lo=Math.floor(pos),hi=Math.ceil(pos);return lo===hi?x[lo]:x[lo]+(x[hi]-x[lo])*(pos-lo);}
function median(values){return quantile(values,.5);}
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function validDate(value){return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));}
function tableExists(db,name){return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").get(name));}
function putRow(map,row,source,diagnostics){
  const tradeDate=String(row?.tradeDate??row?.trade_date??row?.date??"").slice(0,10);
  const ticker=String(row?.ticker??"").trim();
  const currentClose=Number(row?.currentClose??row?.current_close??row?.close);
  const currentVolume=Number(row?.currentVolume??row?.current_volume??row?.volume);
  if(!validDate(tradeDate)||!ticker||!finite(currentClose)||currentClose<=0||!finite(currentVolume)||currentVolume<0)return;
  const key=`${tradeDate}|${ticker}`,old=map.get(key);
  if(old&&(old.currentClose!==currentClose||old.currentVolume!==currentVolume)){
    diagnostics.conflicts++;
    const transition=`${old.source}->${source}`;
    diagnostics.overrides[transition]=(diagnostics.overrides[transition]??0)+1;
  }
  map.set(key,{tradeDate,ticker,currentClose,currentVolume,source});
}
function readStorage(base){
  const map=new Map(),diagnostics={conflicts:0,overrides:{}};
  for(const [name,source] of [[R7_HISTORY_NAME,"BREADTH_R7_LOCAL"],[R6_HISTORY_NAME,"BREADTH_R6_LOCAL"]]){
    const payload=safeJson(path.join(base,name));
    for(const row of payload?.rows??[])putRow(map,row,source,diagnostics);
  }
  const dbFile=path.join(base,"storage","core.sqlite");
  if(fs.existsSync(dbFile)){
    const db=new DatabaseSync(dbFile,{readOnly:true});
    db.exec("PRAGMA query_only=ON");
    try{
      if(tableExists(db,"market_score_breadth_b1_r3_current_v1")){
        for(const row of db.prepare("SELECT trade_date,ticker,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 ORDER BY trade_date,ticker").all())putRow(map,row,"B1_R3_STORED",diagnostics);
      }
    }finally{db.close();}
  }
  return {rows:[...map.values()],diagnostics};
}
function normalizePriceRows(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10),close=Number(row?.close??row?.currentClose??row?.current_close);
    if(validDate(date)&&finite(close)&&close>0)map.set(date,{date,close});
  }
  return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function percentileFromAll(values,current){
  return percentileWindow(values,current,values.length);
}
export function scoreRawAxisExpanding(rows,spec,minHistory=WINDOW){
  const source=(Array.isArray(rows)?rows:[]).filter(row=>row&&typeof row.date==="string");
  const metrics=Array.isArray(spec?.metrics)?spec.metrics:[];
  if(!metrics.length||!Number.isInteger(minHistory)||minHistory<1)return [];
  const histories=Object.fromEntries(metrics.map(metric=>[metric.key,[]]));
  const output=[];
  for(const row of source){
    const valuesNow=metrics.map(metric=>Number(row[metric.key]));
    if(valuesNow.some(value=>!finite(value)))continue;
    metrics.forEach((metric,index)=>histories[metric.key].push(valuesNow[index]));
    if(metrics.some(metric=>histories[metric.key].length<minHistory))continue;
    let score=0,valid=true;
    for(const metric of metrics){
      const values=histories[metric.key],current=values.at(-1),pct=percentileFromAll(values,current);
      if(!finite(pct)){valid=false;break;}
      score+=Number(metric.weight)*(metric.invert?100-pct:pct);
    }
    if(valid)output.push({date:row.date,score:Math.max(0,Math.min(100,score))});
  }
  return output;
}
export function summarizeTemporalPair(rolling,expanding){
  const pairs=alignSeries(rolling,expanding);
  if(!pairs.length)return {n:0,mae:null,medianAbsDelta:null,p95AbsDelta:null,maxAbsDelta:null,bias:null,pearson:null,spearman:null,currentAbsDelta:null};
  const diffs=pairs.map(row=>row.left-row.right),abs=diffs.map(Math.abs);
  return {
    n:pairs.length,
    mae:round(mean(abs)),
    medianAbsDelta:round(median(abs)),
    p95AbsDelta:round(quantile(abs,.95)),
    maxAbsDelta:round(Math.max(...abs)),
    bias:round(mean(diffs)),
    pearson:round(correlation(rolling,expanding,{method:"pearson"})),
    spearman:round(correlation(rolling,expanding,{method:"spearman"})),
    currentAbsDelta:round(abs.at(-1))
  };
}
function pooledPairSummary(pairGroups){
  const pairs=pairGroups.flatMap(({rolling,expanding})=>alignSeries(rolling,expanding));
  if(!pairs.length)return {n:0,mae:null,medianAbsDelta:null,p95AbsDelta:null,maxAbsDelta:null,bias:null};
  const diffs=pairs.map(row=>row.left-row.right),abs=diffs.map(Math.abs);
  return {n:pairs.length,mae:round(mean(abs)),medianAbsDelta:round(median(abs)),p95AbsDelta:round(quantile(abs,.95)),maxAbsDelta:round(Math.max(...abs)),bias:round(mean(diffs))};
}
function dailyRankSummary(sectorPairs){
  const byDate=new Map();
  for(const [sectorId,pair] of Object.entries(sectorPairs)){
    const expandingMap=new Map(pair.expanding.map(row=>[row.date,row.score]));
    for(const row of pair.rolling){
      if(!expandingMap.has(row.date))continue;
      const slot=byDate.get(row.date)??{rolling:{},expanding:{}};
      slot.rolling[sectorId]=row.score;
      slot.expanding[sectorId]=expandingMap.get(row.date);
      byDate.set(row.date,slot);
    }
  }
  const values=[];
  for(const [date,slot] of [...byDate.entries()].sort(([a],[b])=>a.localeCompare(b))){
    const rho=rankCorrelationByKey(slot.rolling,slot.expanding);
    if(finite(rho))values.push({date,rho});
  }
  const rhos=values.map(row=>row.rho);
  return {
    nDates:rhos.length,
    mean:round(rhos.length?mean(rhos):null),
    median:round(median(rhos)),
    p10:round(quantile(rhos,.10)),
    min:round(rhos.length?Math.min(...rhos):null),
    last:round(rhos.at(-1)),
    firstDate:values[0]?.date??null,
    lastDate:values.at(-1)?.date??null
  };
}
function worstSectorByMae(sectorSummaries){
  const items=Object.entries(sectorSummaries).filter(([,summary])=>finite(summary?.mae));
  items.sort((a,b)=>b[1].mae-a[1].mae||a[0].localeCompare(b[0]));
  return items.length?{sector:items[0][0],mae:items[0][1].mae}:{sector:null,mae:null};
}
export function runSectorFearGreedR210TemporalValidation(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const pitPath=path.join(base,PIT_FILE),pricePath=path.join(base,PRICE_FILE);
  if(!fs.existsSync(pitPath))throw new Error("R210_PIT_HISTORY_MISSING");
  if(!fs.existsSync(pricePath))throw new Error("R210_IEX_PRICE_HISTORY_MISSING");
  const pit=parsePitSectorHistoryCsv(fs.readFileSync(pitPath,"utf8"));
  const storage=readStorage(base);
  const derived=buildPointInTimeSectorInputs({rows:storage.rows,pitHistory:pit});
  const pricePayload=safeJson(pricePath),series=pricePayload?.series??{},spyRows=normalizePriceRows(series.SPY??[]);
  const sectors={},axisPairGroups=Object.fromEntries(AXES.map(axis=>[axis,[]])),compositePairGroups=[],sectorCompositePairs={};
  for(const [sectorId,ticker] of Object.entries(SECTOR_FEAR_GREED_R1_ETFS)){
    const etfRows=normalizePriceRows(series[ticker]??[]),pitRows=derived.sectors[sectorId]??[];
    const breadthRows=pitRows.filter(row=>[row?.b50,row?.b200,row?.highLowNet].every(finite));
    const demandRows=pitRows.filter(row=>finite(row?.volumeBreadth));
    const raw=deriveR28RawAxes({etfRows,spyRows,breadthRows,demandRows});
    const rollingAxes={},expandingAxes={},axisTemporal={};
    for(const axis of AXES){
      rollingAxes[axis]=scoreRawAxis(raw[axis],AXIS_SPECS[axis],WINDOW);
      expandingAxes[axis]=scoreRawAxisExpanding(raw[axis],AXIS_SPECS[axis],WINDOW);
      axisTemporal[axis]=summarizeTemporalPair(rollingAxes[axis],expandingAxes[axis]);
      axisPairGroups[axis].push({rolling:rollingAxes[axis],expanding:expandingAxes[axis]});
    }
    const rollingComposite=buildCompositeSeries(rollingAxes,AXIS_WEIGHTS);
    const expandingComposite=buildCompositeSeries(expandingAxes,AXIS_WEIGHTS);
    const compositeTemporal=summarizeTemporalPair(rollingComposite,expandingComposite);
    compositePairGroups.push({rolling:rollingComposite,expanding:expandingComposite});
    sectorCompositePairs[sectorId]={rolling:rollingComposite,expanding:expandingComposite};
    sectors[sectorId]={
      ticker,
      rawCounts:Object.fromEntries(AXES.map(axis=>[axis,raw[axis].length])),
      axisTemporal,
      compositeTemporal,
      compositeDateStart:rollingComposite[0]?.date??null,
      compositeDateEnd:rollingComposite.at(-1)?.date??null
    };
  }
  const axisPooled=Object.fromEntries(AXES.map(axis=>[axis,pooledPairSummary(axisPairGroups[axis])]));
  const sectorCompositeSummaries=Object.fromEntries(Object.entries(sectors).map(([sectorId,item])=>[sectorId,item.compositeTemporal]));
  const compositePooled=pooledPairSummary(compositePairGroups);
  const worstCompositeSector=worstSectorByMae(sectorCompositeSummaries);
  const crossSectorRankDaily=dailyRankSummary(sectorCompositePairs);
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const report={
    version:"R2.10-252-TEMPORAL-VALIDATION",
    generatedAt,
    status:"SHADOW_R210_TEMPORAL_VALIDATION_COMPLETE",
    mode:"SHADOW_RESEARCH_ONLY",
    providerCalls:0,
    rawRowsStored:false,
    publicMutation:false,
    dbSchemaChanged:false,
    productionFormulaChanged:false,
    schedulerChanged:false,
    referenceRequirementChanged:false,
    approvedR1ReferenceRequirement:756,
    testedReferenceWindow:252,
    candidateSelected:false,
    comparator:"EXPANDING_HISTORY_AVAILABLE_AT_EACH_DATE_NOT_756",
    no85PercentRenormalization:true,
    constituentRows:storage.rows.length,
    storedMergeDiagnostics:storage.diagnostics,
    axisPooled,
    compositePooled,
    crossSectorRankDaily,
    worstCompositeSector,
    sectors
  };
  const lines=[
    "ZGMINI SECTOR FEAR & GREED R2.10 252-DAY TEMPORAL VALIDATION",
    `generatedAt=${generatedAt}`,
    `status=${report.status}`,
    "approvedR1ReferenceRequirement=756 (UNCHANGED)",
    "testedReferenceWindow=252",
    "candidateSelected=false",
    "comparator=EXPANDING_HISTORY_AVAILABLE_AT_EACH_DATE_NOT_756",
    "providerCalls=0 publicMutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false referenceRequirementChanged=false",
    "",
    `COMPOSITE_POOLED n=${compositePooled.n} mae=${compositePooled.mae??"NA"} median=${compositePooled.medianAbsDelta??"NA"} p95=${compositePooled.p95AbsDelta??"NA"} max=${compositePooled.maxAbsDelta??"NA"} bias=${compositePooled.bias??"NA"}`,
    `DAILY_CROSS_SECTOR_RANK nDates=${crossSectorRankDaily.nDates} mean=${crossSectorRankDaily.mean??"NA"} median=${crossSectorRankDaily.median??"NA"} p10=${crossSectorRankDaily.p10??"NA"} min=${crossSectorRankDaily.min??"NA"} last=${crossSectorRankDaily.last??"NA"} firstDate=${crossSectorRankDaily.firstDate??"NA"} lastDate=${crossSectorRankDaily.lastDate??"NA"}`,
    `WORST_COMPOSITE_SECTOR sector=${worstCompositeSector.sector??"NA"} mae=${worstCompositeSector.mae??"NA"}`,
    "",
    "AXIS | N | MAE | MEDIAN | P95 | MAX | BIAS"
  ];
  for(const axis of AXES){
    const s=axisPooled[axis];
    lines.push(`${axis} | ${s.n} | ${s.mae??"NA"} | ${s.medianAbsDelta??"NA"} | ${s.p95AbsDelta??"NA"} | ${s.maxAbsDelta??"NA"} | ${s.bias??"NA"}`);
  }
  lines.push("","SECTOR | COMP_N | COMP_MAE | COMP_P95 | COMP_MAX | PEARSON | SPEARMAN | START | END");
  for(const [sectorId,item] of Object.entries(sectors).sort()){
    const s=item.compositeTemporal;
    lines.push(`${sectorId} | ${s.n} | ${s.mae??"NA"} | ${s.p95AbsDelta??"NA"} | ${s.maxAbsDelta??"NA"} | ${s.pearson??"NA"} | ${s.spearman??"NA"} | ${item.compositeDateStart??"NA"} | ${item.compositeDateEnd??"NA"}`);
  }
  lines.push(
    "",
    "note=R2_10_TESTS_252_VS_DATE_LOCAL_EXPANDING_HISTORY_ONLY",
    "note=EXPANDING_COMPARATOR_IS_NOT_APPROVED_756_ECDF_AND_DOES_NOT_REPLACE_IT",
    "note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_OR_REFERENCE_CHANGE"
  );
  fs.mkdirSync(base,{recursive:true});
  const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);
  fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");
  fs.writeFileSync(txtFile,lines.join("\n")+"\n");
  return {status:report.status,jsonFile,txtFile,providerCalls:0,publicMutation:false,productionFormulaChanged:false,referenceRequirementChanged:false,axisPooled,compositePooled,crossSectorRankDaily,worstCompositeSector};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(runSectorFearGreedR210TemporalValidation(),null,2));}
  catch(error){
    const message=String(error?.message??""),code=/^[A-Z0-9_:-]+$/.test(message)?message:"R210_TEMPORAL_VALIDATION_FAILED";
    console.log(JSON.stringify({status:"FAILED",code,errorName:String(error?.name??"Error"),providerCalls:0,publicMutation:false,productionFormulaChanged:false,referenceRequirementChanged:false}));
    process.exitCode=1;
  }
}
