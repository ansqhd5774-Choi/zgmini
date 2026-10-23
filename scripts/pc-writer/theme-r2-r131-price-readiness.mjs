// R2 targeted R131 price read-only validation. Read the known market-history
// research folder only, summarize date/close coverage; never transmit or print
// raw prices, call providers, or update DB, scheduler or public data.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const OUTPUT=path.join(HERE,'THEME_R2_R131_PRICE_READINESS_RESULT.json');
const ROOT='E:\\ZGmini\\data\\theme-market-history-r131';
const SYMBOLS=['ARKF','BOTZ','BUG','CIBR','CLOU','DRIV','FINX','ITA','NLR','ROBO','SHLD','SKYY','SPY','URA'];
const PRICE=/^(close|proxyClose|adjClose|adjustedClose|adj_close|closingPrice|marketClose|price|c)$/i;
const DATE=/^(date|day|tradeDate|trade_date|tradingDate|trading_day|observationDate|asOfDate|session|sessionDate|timestamp|datetime|time|ts)$/i;
const AUM=/^(netAssetsUSD|fundNetAssetsUSD|totalNetAssetsUSD|assetsUnderManagementUSD|aumUSD)$/i;
const MAX_BYTES=8*1024*1024,MAX_NODES=500000,MAX_DEPTH=9;
const real=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
function asDay(value){
  if(typeof value==='number'&&Number.isFinite(value)&&value>1e9){
    try{const d=new Date(value>1e12?value:value*1000).toISOString().slice(0,10);return d;}catch{return null;}
  }
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}/.test(value))return null;
  const part=value.slice(0,10),time=Date.parse(part+'T00:00:00Z');
  return Number.isNaN(time)||new Date(time).toISOString().slice(0,10)!==part?null:part;
}
const pick=(obj,pattern)=>{
  const key=Object.keys(obj).find(x=>pattern.test(x));return key===undefined?undefined:obj[key];
};
const summarize=set=>{
  const sorted=[...set].sort();return {dates:sorted.length,firstDate:sorted[0]??null,lastDate:sorted.at(-1)??null};
};
function inspectFile(filename){
  if(!filename)return {status:'MISSING',priceDates:new Set(),aumDates:new Set(),shapeSamples:[]};
  const stat=fs.statSync(filename);
  if(stat.size>MAX_BYTES||stat.size<=0)return {status:'SIZE_LIMIT',bytes:stat.size,
    priceDates:new Set(),aumDates:new Set(),shapeSamples:[]};
  let parsed;
  try{parsed=JSON.parse(fs.readFileSync(filename,'utf8'));}
  catch{return {status:'INVALID_JSON',bytes:stat.size,priceDates:new Set(),aumDates:new Set(),shapeSamples:[]};}
  const priceDates=new Set(),aumDates=new Set(),shapeSamples=[],seen=new Set();
  let nodes=0,priceRows=0,aumRows=0,duplicatePriceRows=0,capped=false;
  const queue=[{value:parsed,depth:0,loc:'$'}];
  // Index-based FIFO avoids quadratic Array.shift() cost on hourly raw files.
  for(let head=0;head<queue.length;head++){
    const {value,depth,loc}=queue[head];
    if(++nodes>MAX_NODES){capped=true;break;}
    if(!value||typeof value!=='object'||depth>MAX_DEPTH)continue;
    if(Array.isArray(value)){
      if(value.length&&typeof value[0]==='object'&&value[0]&&shapeSamples.length<14&& !seen.has(loc)){
        shapeSamples.push({arrayPath:loc,length:value.length,firstRowKeys:Object.keys(value[0]).slice(0,22)});
        seen.add(loc);
      }
      for(const x of value)queue.push({value:x,depth:depth+1,loc:loc+'[]'});
      continue;
    }
    const day=asDay(pick(value,DATE));
    if(day&&real(pick(value,PRICE))){priceRows++;if(priceDates.has(day))duplicatePriceRows++;priceDates.add(day);}
    if(day&&real(pick(value,AUM))){aumRows++;aumDates.add(day);}
    for(const [key,child] of Object.entries(value)){
      if(child&&typeof child==='object'&&!/secret|token|credential|password|privateKey/i.test(key))
        queue.push({value:child,depth:depth+1,loc:loc+'.'+key});
    }
  }
  return {status:capped?'PARTIAL_NODE_LIMIT':'READ_COMPLETE',bytes:stat.size,
    priceDates,aumDates,priceRows,aumRows,duplicatePriceRows,shapeSamples,
    topKeys:parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?Object.keys(parsed).slice(0,30):[],nodes};
}
const publicFile=info=>({status:info.status,bytes:info.bytes??null,priceRows:info.priceRows??0,
  uniquePriceDates:summarize(info.priceDates),duplicatePriceRows:info.duplicatePriceRows??0,
  datedNetAssetObservations:summarize(info.aumDates),
  topKeys:info.topKeys??[],shapeSamples:info.shapeSamples??[]});

export function auditR131PriceReadiness(root=ROOT){
  const output={version:'THEME_R2_R131_READONLY_PRICE_READINESS_V1',status:'NOT_VALIDATED',
    checkedAt:new Date().toISOString(),sourceRoot:root,expectedSymbols:SYMBOLS,
    thresholds:{rank63LatestPriceDates:188,rank126LatestPriceDates:251,
      rank252LatestPriceDates:377,rank63Full252ChartPriceDates:439,
      rank126Full252ChartPriceDates:502,rank252Full252ChartPriceDates:628,
      absoluteAdmissionRequirement628:false},
    symbols:{},alignment:null,issues:[],fileContentsExported:false,
    providerCalls:0,dbWrites:0,sourceWrites:0,productionChanged:false,published:false,
    licenseRightsVerified:false,priceLineageIndependentlyVerified:false,
    historicalDatedAumVerified:false};
  if(!fs.existsSync(root)||!fs.statSync(root).isDirectory()){
    output.status='SOURCE_ROOT_MISSING';output.issues.push('R131_SOURCE_FOLDER_NOT_FOUND');return output;
  }
  const dailySets=new Map();
  for(const symbol of SYMBOLS){
    const matches=(dir,suffix)=>{
      let names=[];try{names=fs.readdirSync(path.join(root,dir));}catch{return [];}
      return names.filter(name=>new RegExp('^'+symbol+'_2025-10-20_2026-10-20_[a-f0-9]{16}'+suffix+'$','i').test(name))
        .map(name=>path.join(root,dir,name));
    };
    const raw=matches('raw','\\.json'),daily=matches('derived','\\.daily-research\\.json');
    const rawInfo=inspectFile(raw.length===1?raw[0]:null);
    const dailyInfo=inspectFile(daily.length===1?daily[0]:null);
    output.symbols[symbol]={rawMatches:raw.length,derivedMatches:daily.length,
      raw:publicFile(rawInfo),derived:publicFile(dailyInfo)};
    if(raw.length!==1||daily.length!==1)output.issues.push('SOURCE_PAIR_NOT_UNIQUE_'+symbol);
    if(dailyInfo.status!=='READ_COMPLETE'||dailyInfo.priceDates.size===0)
      output.issues.push('DERIVED_PRICE_SHAPE_UNVERIFIED_'+symbol);
    dailySets.set(symbol,dailyInfo.priceDates);
  }
  let common=[...(dailySets.get('SPY')??[])];
  for(const symbol of SYMBOLS)common=common.filter(date=>dailySets.get(symbol)?.has(date));
  common.sort();
  const n=common.length;
  output.alignment={commonUniquePriceDates:n,firstDate:common[0]??null,lastDate:common.at(-1)??null,
    latestRank63CountGate:n>=188,latestRank126CountGate:n>=251,
    latestRank252CountGate:n>=377,full252Chart63CountGate:n>=439,
    full252Chart126CountGate:n>=502,full252Chart252CountGate:n>=628};
  if(n<188)output.issues.push('INSUFFICIENT_SHARED_PRICE_DATES_FOR_63_RANK');
  if(n<377)output.issues.push('NO_MATURE_252_RANK_REFERENCE_ON_R131_WINDOW');
  if(SYMBOLS.some(t=>output.symbols[t].derived.datedNetAssetObservations.dates===0))
    output.issues.push('POINT_IN_TIME_NET_ASSETS_NOT_FOUND_IN_DERIVED_PRICE_ROWS');
  output.status=output.issues.some(x=>x.startsWith('SOURCE_PAIR')||x.startsWith('DERIVED_PRICE'))
    ?'NEEDS_SCHEMA_OR_FILE_REVIEW':'PRICE_DATE_COUNTS_ONLY_NOT_LICENSED';
  return output;
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url))){
  const report=auditR131PriceReadiness();
  const stage=OUTPUT+'.'+process.pid+'.tmp';
  try{fs.writeFileSync(stage,JSON.stringify(report,null,2)+'\r\n',{flag:'wx'});fs.renameSync(stage,OUTPUT);}
  finally{if(fs.existsSync(stage))fs.unlinkSync(stage);}
  console.log('R131_R2='+report.status);
  console.log('ALIGNED_PRICE_DATES='+String(report.alignment?.commonUniquePriceDates??0));
  console.log('RESULT='+OUTPUT);
  console.log('NO_PROVIDER_CALLS_OR_PUBLICATION');
}
