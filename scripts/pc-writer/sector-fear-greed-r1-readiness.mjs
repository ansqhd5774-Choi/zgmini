import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {DatabaseSync} from "node:sqlite";
import {gunzipSync} from "node:zlib";
import {fileURLToPath} from "node:url";
import {
  SECTOR_FEAR_GREED_R1_ETFS,
  buildSectorFearGreedR1Shadow,
} from "../../lib/market-score/sector-fear-greed-r1-shadow.mjs";
import {
  buildCurrentUniverseSectorInputs,
  parseSectorUniverseCsv,
} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";

export const SECTOR_FEAR_GREED_R1_READINESS_VERSION="SECTOR-FEAR-GREED-R1-READINESS-V1";
const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const DEFAULT_UNIVERSE_NAME="local-sector-fear-greed-r1-universe.csv";
const DEFAULT_PRICE_NAME="local-sector-fear-greed-r1-price-history.json";
const OUTPUT_JSON="local-sector-fear-greed-r1-readiness.json";
const OUTPUT_TXT="local-sector-fear-greed-r1-readiness.txt";
const R6_HISTORY_NAME="local-breadth-r6-shadow-history.json";
const R7_HISTORY_NAME="local-breadth-r7-pit-price-history.json";
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const sectorIds=Object.keys(SECTOR_FEAR_GREED_R1_ETFS);

function safeJson(file){
  if(!file||!fs.existsSync(file))return null;
  try{return JSON.parse(fs.readFileSync(file,"utf8"))}catch{return null}
}
function decodeBody(value){
  const text=String(value??"");
  try{return JSON.parse(text.startsWith("gzip:")?gunzipSync(Buffer.from(text.slice(5),"base64")).toString():text)}catch{return null}
}
function fileMeta(file){
  if(!file||!fs.existsSync(file))return {exists:false,path:file??null,sizeBytes:0};
  const stat=fs.statSync(file);
  return {exists:true,path:file,sizeBytes:Number(stat.size),modifiedAt:stat.mtime.toISOString()};
}
function normalizePriceRows(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=String(row?.date??row?.tradeDate??row?.trade_date??row?.observationDate??"").slice(0,10);
    const close=Number(row?.close??row?.currentClose??row?.current_close??row?.value);
    if(validDate(date)&&finite(close)&&close>0)map.set(date,{date,close});
  }
  return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function normalizePriceBundle(payload){
  const source=payload?.series&&typeof payload.series==="object"?payload.series:{};
  const out={};
  for(const ticker of ["SPY",...Object.values(SECTOR_FEAR_GREED_R1_ETFS)])out[ticker]=normalizePriceRows(source[ticker]??[]);
  return out;
}
function addConstituentRow(map,row,source){
  const tradeDate=String(row?.tradeDate??row?.trade_date??row?.date??"");
  const ticker=String(row?.ticker??"").trim();
  const currentClose=Number(row?.currentClose??row?.current_close??row?.close);
  const currentVolume=Number(row?.currentVolume??row?.current_volume??row?.volume);
  if(!validDate(tradeDate)||!ticker||!finite(currentClose)||currentClose<=0||!finite(currentVolume)||currentVolume<0)return;
  map.set(`${tradeDate}|${ticker}`,{tradeDate,ticker,currentClose,currentVolume,source});
}
function readOptionalRows(base,map){
  for(const [name,source] of [[R7_HISTORY_NAME,"BREADTH_R7_LOCAL"],[R6_HISTORY_NAME,"BREADTH_R6_LOCAL"]]){
    const payload=safeJson(path.join(base,name));
    for(const row of payload?.rows??[])addConstituentRow(map,row,source);
  }
}
function tableExists(db,name){
  return Boolean(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=? LIMIT 1").get(name));
}
function readLocalStorage(base){
  const dbFile=path.join(base,"storage","core.sqlite");
  if(!fs.existsSync(dbFile))return {dbFile,dbExists:false,rows:[],benchmark:null,tables:{}};
  const db=new DatabaseSync(dbFile,{readOnly:true});
  db.exec("PRAGMA query_only=ON");
  try{
    const tables={
      breadth:tableExists(db,"market_score_breadth_b1_r3_current_v1"),
      batches:tableExists(db,"market_input_batches_v1"),
    };
    const rows=[];
    if(tables.breadth){
      const stored=db.prepare("SELECT trade_date,ticker,current_close,current_volume FROM market_score_breadth_b1_r3_current_v1 ORDER BY trade_date,ticker").all();
      rows.push(...stored);
    }
    let benchmark=null;
    if(tables.batches){
      const batch=db.prepare("SELECT batch_key,body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE 'shadowSp500Benchmark:%' ORDER BY stored_at DESC LIMIT 1").get();
      if(batch){
        const body=decodeBody(batch.body);
        const series=normalizePriceRows(body?.series?.SP500??[]);
        benchmark={batchKey:String(batch.batch_key),storedAt:Number(batch.stored_at),rows:series.length,first:series[0]?.date??null,last:series.at(-1)?.date??null,usedAsSpy:false};
      }
    }
    return {dbFile,dbExists:true,rows,benchmark,tables};
  }finally{db.close()}
}
function referenceCount(component){
  const metrics=component?.metrics&&typeof component.metrics==="object"?Object.values(component.metrics):[];
  if(!metrics.length)return 0;
  return Math.min(...metrics.map(metric=>Number(metric?.referenceObservations??0)));
}
function componentReason(name,component,{etfRows=0,spyRows=0,breadthRows=0,demandRows=0,universeReady=false}={}){
  if(component?.status==="READY")return null;
  if((name==="trend"||name==="volatility")&&etfRows===0)return "SECTOR_ETF_HISTORY_MISSING";
  if(name==="relativeStrength"&&etfRows===0)return "SECTOR_ETF_HISTORY_MISSING";
  if(name==="relativeStrength"&&spyRows===0)return "SPY_HISTORY_MISSING";
  if(name==="breadth"&&!universeReady)return "CURRENT_GICS_UNIVERSE_MISSING";
  if(name==="breadth"&&breadthRows===0)return "SECTOR_BREADTH_HISTORY_MISSING";
  if(name==="demand"&&!universeReady)return "CURRENT_GICS_UNIVERSE_MISSING";
  if(name==="demand"&&demandRows===0)return "SECTOR_VOLUME_BREADTH_HISTORY_MISSING";
  return "REFERENCE_HISTORY_INCOMPLETE";
}
function latestCoverage(rows=[]){
  const row=Array.isArray(rows)?rows.at(-1):null;
  return row?.coverage??null;
}
export function buildSectorReadinessReport({
  now=new Date(),
  base=DEFAULT_BASE,
  universe=null,
  priceBundle={},
  constituentInputs=null,
  constituentRows=0,
  benchmark=null,
  storage={},
  sourceFiles={},
}={}){
  const spyRows=priceBundle.SPY??[];
  const sectors={};
  for(const sectorId of sectorIds){
    const ticker=SECTOR_FEAR_GREED_R1_ETFS[sectorId];
    const etfRows=priceBundle[ticker]??[];
    const derived=constituentInputs?.sectors?.[sectorId]??[];
    const breadthRows=derived.filter(row=>finite(row?.b50)&&finite(row?.b200)&&finite(row?.highLowNet));
    const demandRows=derived.filter(row=>finite(row?.volumeBreadth));
    const model=buildSectorFearGreedR1Shadow({
      sectorId,
      etfSeries:etfRows,
      spySeries:spyRows,
      breadthSeries:breadthRows,
      volumeBreadthSeries:demandRows,
      optionsScore:null,
    });
    const componentNames=["trend","breadth","demand","relativeStrength","volatility"];
    const readiness={};
    for(const name of componentNames){
      const component=model.components[name];
      readiness[name]={
        status:component.status,
        score:component.score,
        date:component.date??null,
        referenceObservations:referenceCount(component),
        reason:componentReason(name,component,{
          etfRows:etfRows.length,spyRows:spyRows.length,breadthRows:breadthRows.length,demandRows:demandRows.length,universeReady:Boolean(universe),
        }),
      };
    }
    const fiveReady=componentNames.every(name=>readiness[name].status==="READY");
    sectors[sectorId]={
      sectorId,ticker,
      status:fiveReady?"READY_5_OF_5":"PARTIAL",
      finalStatus:model.status,
      finalScore:model.score,
      availableWeight:model.availableWeight,
      weightedContribution:model.weightedContribution,
      options:{status:"BLOCKED",score:null,reason:"OPTIONS_BLOCKED_BY_DATA_LICENSE"},
      counts:{etfRows:etfRows.length,spyRows:spyRows.length,breadthRows:breadthRows.length,demandRows:demandRows.length},
      latestCoverage:latestCoverage(derived),
      components:readiness,
    };
  }
  const readyFive=Object.values(sectors).filter(item=>item.status==="READY_5_OF_5").length;
  return {
    version:1,
    methodologyVersion:SECTOR_FEAR_GREED_R1_READINESS_VERSION,
    status:readyFive===sectorIds.length?"READY_5_OF_5_ALL_SECTORS":"PARTIAL",
    mode:"SHADOW_READINESS_ONLY",
    generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),
    base,
    providerCalls:0,
    publicMutation:false,
    productionFormulaChanged:false,
    dbSchemaChanged:false,
    optionsConnected:false,
    noRenormalization:true,
    currentUniverseOnly:Boolean(universe),
    pointInTimeSectorHistoryVerified:false,
    warnings:[
      "CURRENT_GICS_UNIVERSE_IS_RESEARCH_ONLY_NOT_PIT_HISTORY",
      "SP500_BENCHMARK_IS_DIAGNOSTIC_ONLY_AND_IS_NOT_SUBSTITUTED_FOR_SPY",
      "OPTIONS_REMAIN_BLOCKED_AND_85_PERCENT_IS_NOT_RENORMALIZED",
    ],
    sources:{sourceFiles,storage,benchmark,constituentRows,universeMembers:universe?.memberCount??0},
    summary:{sectors:sectorIds.length,readyFive,partial:sectorIds.length-readyFive,finalReady:0},
    sectors,
  };
}
export function renderSectorReadinessText(report){
  const lines=[
    "ZGMINI SECTOR FEAR & GREED R1 SHADOW READINESS",
    `generatedAt=${report.generatedAt}`,
    `status=${report.status}`,
    `providerCalls=${report.providerCalls} publicMutation=${report.publicMutation} dbSchemaChanged=${report.dbSchemaChanged}`,
    `universeMembers=${report.sources.universeMembers} constituentRows=${report.sources.constituentRows}`,
    `sp500BenchmarkRows=${report.sources.benchmark?.rows??0} usedAsSpy=false`,
    "",
    "SECTOR | ETF | T | B | D | R | V | O | 5AXIS | FINAL",
  ];
  for(const item of Object.values(report.sectors)){
    const c=item.components;
    lines.push(`${item.sectorId} | ${item.ticker} | ${c.trend.status} | ${c.breadth.status} | ${c.demand.status} | ${c.relativeStrength.status} | ${c.volatility.status} | ${item.options.status} | ${item.status} | ${item.finalStatus}`);
    const reasons=Object.entries(c).filter(([,v])=>v.reason).map(([k,v])=>`${k}:${v.reason}`);
    if(reasons.length)lines.push(`  reasons=${reasons.join(",")}`);
    lines.push(`  counts=ETF:${item.counts.etfRows},SPY:${item.counts.spyRows},B:${item.counts.breadthRows},D:${item.counts.demandRows}`);
  }
  lines.push("",...report.warnings.map(value=>`warning=${value}`));
  return lines.join("\n")+"\n";
}
export function runSectorFearGreedR1Readiness(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{universeFile,priceFile,now=new Date()}={}){
  const resolvedUniverse=universeFile??process.env.ZGMINI_SECTOR_UNIVERSE_CSV??path.join(base,DEFAULT_UNIVERSE_NAME);
  const resolvedPrices=priceFile??process.env.ZGMINI_SECTOR_PRICE_HISTORY_JSON??path.join(base,DEFAULT_PRICE_NAME);
  const storage=readLocalStorage(base);
  const rowMap=new Map();
  readOptionalRows(base,rowMap);
  for(const row of storage.rows)addConstituentRow(rowMap,row,"B1_R3_STORED");

  let universe=null,universeError=null;
  if(fs.existsSync(resolvedUniverse)){
    try{universe=parseSectorUniverseCsv(fs.readFileSync(resolvedUniverse,"utf8"))}catch(error){universeError=String(error?.message??"SECTOR_UNIVERSE_INVALID")}
  }
  const pricePayload=safeJson(resolvedPrices);
  const priceBundle=normalizePriceBundle(pricePayload);
  let constituentInputs=null,inputError=null;
  if(universe){
    try{constituentInputs=buildCurrentUniverseSectorInputs({rows:[...rowMap.values()],universe})}catch(error){inputError=String(error?.message??"SECTOR_INPUT_BUILD_FAILED")}
  }
  const sourceFiles={
    universe:{...fileMeta(resolvedUniverse),error:universeError},
    priceHistory:{...fileMeta(resolvedPrices),validJson:Boolean(pricePayload)},
    breadthR6:fileMeta(path.join(base,R6_HISTORY_NAME)),
    breadthR7:fileMeta(path.join(base,R7_HISTORY_NAME)),
    inputError,
  };
  const report=buildSectorReadinessReport({
    now,base,universe,priceBundle,constituentInputs,constituentRows:rowMap.size,benchmark:storage.benchmark,
    storage:{dbFile:storage.dbFile,dbExists:storage.dbExists,tables:storage.tables},sourceFiles,
  });
  fs.mkdirSync(base,{recursive:true});
  const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);
  fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");
  fs.writeFileSync(txtFile,renderSectorReadinessText(report));
  return {status:report.status,jsonFile,txtFile,summary:report.summary,providerCalls:0,publicMutation:false,dbSchemaChanged:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const result=runSectorFearGreedR1Readiness();
    console.log(JSON.stringify(result,null,2));
  }catch(error){
    const code=/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"SECTOR_READINESS_FAILED");
    console.log(JSON.stringify({status:"FAILED",code,providerCalls:0,publicMutation:false,dbSchemaChanged:false}));
    process.exitCode=1;
  }
}
