import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {BREADTH_R8_WEIGHTS,buildBreadthR8Components} from '../../lib/market-score/breadth-r8-shadow.mjs';

const DEFAULT_BASE=path.join(os.homedir(),'.zgmini','pc-writer');
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const domain=(market,id)=>Array.isArray(market?.domains)?market.domains.find(item=>item?.id===id)??null:null;
const rowKey=(date,ticker)=>`${date}|${ticker}`;

function addPriceRow(map,row,source){
  const tradeDate=String(row?.tradeDate??row?.trade_date??row?.date??'');
  const ticker=String(row?.ticker??row?.symbol??'').trim();
  const currentClose=Number(row?.currentClose??row?.current_close??row?.close);
  const currentVolume=Number(row?.currentVolume??row?.current_volume??row?.volume??0);
  const previousCloseRaw=row?.previousClose??row?.previous_close;
  const previousClose=previousCloseRaw==null?null:Number(previousCloseRaw);
  const previousDate=String(row?.previousDate??row?.previous_date??'');
  if(!validDate(tradeDate)||!ticker||!finite(currentClose)||currentClose<=0||!finite(currentVolume)||currentVolume<0)return;
  map.set(rowKey(tradeDate,ticker),{
    trade_date:tradeDate,ticker,
    previous_date:validDate(previousDate)?previousDate:null,
    previous_close:finite(previousClose)&&previousClose>0?previousClose:null,
    current_close:currentClose,current_volume:currentVolume,source,
  });
}
function normalizeSeriesRows(rows=[]){
  return (Array.isArray(rows)?rows:[]).map(row=>({
    date:String(row?.date??row?.tradeDate??row?.observationDate??''),
    value:Number(row?.value??row?.close??row?.currentClose),
  })).filter(row=>validDate(row.date)&&finite(row.value)&&row.value>0).sort((a,b)=>a.date.localeCompare(b.date));
}
function seriesFromDoc(doc,symbol){
  const direct=doc?.series?.[symbol];
  if(Array.isArray(direct))return normalizeSeriesRows(direct);
  const rows=doc?.rows;
  if(Array.isArray(rows))return normalizeSeriesRows(rows.filter(row=>String(row?.ticker??row?.symbol??'').trim()===symbol));
  return [];
}
function loadRelativeSeries(base){
  const candidates=[
    'local-breadth-r8-relative-rsp-spy.json',
    'local-sector-fear-greed-r3-etf-incremental.json',
    'local-sector-fear-greed-r21331-alpaca-sector-etf-backfill.json',
    'local-sector-fear-greed-r3-rolling-252.json',
  ];
  for(const name of candidates){
    const file=path.join(base,name);
    if(!fs.existsSync(file))continue;
    try{
      const doc=readJson(file),rsp=seriesFromDoc(doc,'RSP'),spy=seriesFromDoc(doc,'SPY');
      if(rsp.length&&spy.length)return {relativeSeries:{equalWeighted:rsp,capWeighted:spy},sourceFile:name,rspRows:rsp.length,spyRows:spy.length};
    }catch{}
  }
  return {relativeSeries:null,sourceFile:null,rspRows:0,spyRows:0};
}
function mergePriceRows(base,db,pit){
  const map=new Map();
  const sources=[];
  for(const name of ['local-breadth-r7-pit-price-history.json','local-breadth-r6-shadow-history.json']){
    const file=path.join(base,name);
    if(!fs.existsSync(file))continue;
    try{
      const doc=readJson(file),rows=Array.isArray(doc?.rows)?doc.rows:[];
      for(const row of rows)addPriceRow(map,row,name);
      sources.push({name,rows:rows.length});
    }catch(error){sources.push({name,error:String(error?.message??error)})}
  }
  const currentDate=validDate(pit?.currentDate)?pit.currentDate:null;
  if(currentDate){
    const rows=db.prepare(`SELECT trade_date,ticker,previous_date,previous_close,current_close,current_volume
      FROM market_score_breadth_b1_r3_current_v1
      WHERE trade_date IN (
        SELECT trade_date FROM (
          SELECT DISTINCT trade_date FROM market_score_breadth_b1_r3_current_v1
          WHERE trade_date<=? ORDER BY trade_date DESC LIMIT 400
        )
      ) ORDER BY trade_date,ticker`).all(currentDate);
    for(const row of rows)addPriceRow(map,row,'core.sqlite:B1_R3');
    sources.push({name:'core.sqlite:B1_R3',rows:rows.length});
  }
  const rows=[...map.values()].sort((a,b)=>a.trade_date.localeCompare(b.trade_date)||a.ticker.localeCompare(b.ticker));
  return {rows,sources,first:rows[0]?.trade_date??null,last:rows.at(-1)?.trade_date??null};
}

export function analyzeBreadthR8Readonly(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const pitFile=path.join(base,'local-breadth-r7-pit-universe.json');
  const marketFile=path.join(base,'local-market-result.json');
  const dbFile=path.join(base,'storage','core.sqlite');
  if(!fs.existsSync(pitFile)||!fs.existsSync(marketFile)||!fs.existsSync(dbFile))throw new Error('BREADTH_R8_READONLY_INPUT_MISSING');
  const pit=readJson(pitFile),market=readJson(marketFile);
  if(pit?.status!=='READY'||!pit?.membershipLookAheadSafe||!pit?.currentUniverseSurvivorshipBiasRemoved)throw new Error('BREADTH_R8_PIT_UNIVERSE_NOT_SAFE');
  const db=new DatabaseSync(dbFile,{readOnly:true});
  db.exec('PRAGMA query_only=ON');
  try{
    const prices=mergePriceRows(base,db,pit);
    const relative=loadRelativeSeries(base);
    const result=buildBreadthR8Components({rows:prices.rows,universes:pit.universes??[],relativeSeries:relative.relativeSeries,asOfDate:pit.currentDate});
    const baseline=domain(market,'breadth');
    const availableContributions=Object.fromEntries(Object.entries(BREADTH_R8_WEIGHTS).map(([key,weight])=>[
      key,finite(result?.components?.[key])?weight*result.components[key]:null,
    ]));
    const availableWeight=Object.entries(BREADTH_R8_WEIGHTS).reduce((sum,[key,weight])=>sum+(finite(result?.components?.[key])?weight:0),0);
    const availableSubtotal=Object.values(availableContributions).filter(finite).reduce((sum,value)=>sum+value,0);
    return {
      version:1,status:'PASS',mode:'READ_ONLY_SHADOW_DIAGNOSTIC',providerCalls:0,dbWrites:0,d1Writes:0,publicMutation:false,productionFormulaChanged:false,
      asOf:pit.currentDate??market?.asOfDate??null,
      production:{status:baseline?.status??null,score:finite(baseline?.score)?baseline.score:null,methodologyVersion:baseline?.methodologyVersion??null},
      source:{pitMethodologyVersion:pit.methodologyVersion??null,pitUniverses:Array.isArray(pit.universes)?pit.universes.length:0,priceSources:prices.sources,priceRows:prices.rows.length,first:prices.first,last:prices.last},
      relativeSource:{status:relative.relativeSeries?'READY_LOCAL':'MISSING_LOCAL',sourceFile:relative.sourceFile,rspRows:relative.rspRows,spyRows:relative.spyRows},
      r8:result,
      diagnosticOnly:{availableWeight,availableSubtotal,notReweighted:true,notFinalScore:true,contributions:availableContributions},
    };
  }finally{db.close()}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    console.log(JSON.stringify(analyzeBreadthR8Readonly(),null,2));
  }catch(error){
    console.log(JSON.stringify({status:'FAILED',code:/^[A-Z0-9_:-]+$/.test(String(error?.message??''))?String(error.message):'BREADTH_R8_READONLY_FAILED',detail:String(error?.message??error)},null,2));
    process.exitCode=1;
  }
}
