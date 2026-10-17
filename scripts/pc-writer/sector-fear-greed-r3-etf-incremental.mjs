import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadLocalProviders} from './local-env.mjs';
import {SECTOR_FEAR_GREED_R3_BENCHMARKS} from '../../lib/market-score/sector-fear-greed-r3-rolling.mjs';

const DEFAULT_BASE=path.join(os.homedir(),'.zgmini','pc-writer');
export const SECTOR_FEAR_GREED_R3_ETF_INCREMENTAL_METHOD='SECTOR-FEAR-GREED-R3-ALPACA-IEX-INCREMENTAL-V1';
export const SECTOR_FEAR_GREED_R3_ETF_INCREMENTAL_FILE='local-sector-fear-greed-r3-etf-incremental.json';
const IEX_FILE='local-sector-fear-greed-r1-iex-price-history.json';
const REPORT_FILE='local-sector-fear-greed-r3-etf-incremental-last-run.json';
const ENDPOINT='https://data.alpaca.markets/v2/stocks/bars';
const CACHE_MS=20*60*60*1000;
const MAX_REQUESTS=4;
const MAX_OVERLAP_RELATIVE_DIFF=0.01;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x);

const readJson=file=>{if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};
const saveJson=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');fs.renameSync(tmp,file);};
const day=x=>new Date(x).toISOString().slice(0,10);
function normalizeRows(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=String(row?.date??row?.t??'').slice(0,10),close=Number(row?.close??row?.c),volume=Number(row?.volume??row?.v);
    if(!validDate(date)||!finite(close)||close<=0||!finite(volume)||volume<0)continue;
    const old=map.get(date);
    if(old&&(old.close!==close||old.volume!==volume))throw Error(`SECTOR_FEAR_GREED_R3_ETF_DUPLICATE_CONFLICT:${date}`);
    map.set(date,{date,close,volume});
  }
  return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function mergeRows(prior=[],fresh=[]){
  const map=new Map(normalizeRows(prior).map(x=>[x.date,x]));
  let added=0;const revisions=[];
  for(const row of normalizeRows(fresh)){
    const old=map.get(row.date);
    if(old){
      if(old.close!==row.close||old.volume!==row.volume){revisions.push({previous:old,replacement:row});map.set(row.date,row);}
    }else{map.set(row.date,row);added++;}
  }
  return {rows:[...map.values()].sort((a,b)=>a.date.localeCompare(b.date)),added,revisions};
}
function baseAnchor(iex){
  const dates=SECTOR_FEAR_GREED_R3_BENCHMARKS.map(t=>normalizeRows(iex?.series?.[t]??[]).at(-1)?.date??null);
  if(dates.some(x=>!validDate(x)))throw Error('SECTOR_FEAR_GREED_R3_ETF_BASE_MISSING');
  const anchor=[...dates].sort()[0];
  if(dates.some(x=>x!==anchor))throw Error('SECTOR_FEAR_GREED_R3_ETF_BASE_NOT_ALIGNED');
  return anchor;
}
function buildUrl(start,end,token){
  const url=new URL(ENDPOINT);
  url.searchParams.set('symbols',SECTOR_FEAR_GREED_R3_BENCHMARKS.join(','));
  url.searchParams.set('timeframe','1Day');
  url.searchParams.set('start',`${start}T00:00:00Z`);
  url.searchParams.set('end',`${end}T23:59:59Z`);
  url.searchParams.set('feed','iex');
  url.searchParams.set('adjustment','split');
  url.searchParams.set('limit','10000');
  if(token)url.searchParams.set('page_token',token);
  return url;
}
export async function collectSectorFearGreedR3EtfIncremental(base=DEFAULT_BASE,{fetchImpl=globalThis.fetch,now=Date.now()}={}){
  const reportPath=path.join(base,REPORT_FILE),outputPath=path.join(base,SECTOR_FEAR_GREED_R3_ETF_INCREMENTAL_FILE);
  const priorReport=readJson(reportPath);
  const end=day(now-24*60*60*1000);
  if(priorReport?.storageVerified&&priorReport.requestEnd===end&&Number.isFinite(Date.parse(priorReport.checkedAt))&&now-Date.parse(priorReport.checkedAt)>=0&&now-Date.parse(priorReport.checkedAt)<CACHE_MS){
    return {...priorReport,status:'CACHED',providerRequests:0};
  }
  const report={version:1,checkedAt:new Date(now).toISOString(),status:'FAILED_PRESERVE_EXISTING',providerRequests:0,maxProviderRequests:MAX_REQUESTS,storageVerified:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false};
  try{
    const iex=readJson(path.join(base,IEX_FILE));
    if(!iex)throw Error('SECTOR_FEAR_GREED_R3_ETF_BASE_FILE_MISSING');
    const anchor=baseAnchor(iex);
    report.baseAnchorDate=anchor;report.requestEnd=end;
    if(end<anchor){report.status='NO_NEW_WINDOW';report.storageVerified=true;saveJson(reportPath,report);return report;}
    const env=loadLocalProviders(base),key=env.APCA_API_KEY_ID,secret=env.APCA_API_SECRET_KEY;
    if(!key||!secret)throw Error('SECTOR_FEAR_GREED_R3_ETF_ALPACA_CREDENTIALS_MISSING');
    if(typeof fetchImpl!=='function')throw Error('SECTOR_FEAR_GREED_R3_ETF_FETCH_UNAVAILABLE');
    const bars=Object.fromEntries(SECTOR_FEAR_GREED_R3_BENCHMARKS.map(t=>[t,[]]));
    let token=null;
    do{
      report.providerRequests++;
      if(report.providerRequests>MAX_REQUESTS)throw Error('SECTOR_FEAR_GREED_R3_ETF_REQUEST_LIMIT');
      const response=await fetchImpl(buildUrl(anchor,end,token),{
        headers:{'APCA-API-KEY-ID':key,'APCA-API-SECRET-KEY':secret,accept:'application/json'},
        signal:AbortSignal.timeout(20000),
      });
      if(!response.ok)throw Error(`SECTOR_FEAR_GREED_R3_ETF_HTTP_${response.status}`);
      const body=await response.json();
      if(!body?.bars||typeof body.bars!=='object')throw Error('SECTOR_FEAR_GREED_R3_ETF_INVALID_RESPONSE');
      for(const ticker of SECTOR_FEAR_GREED_R3_BENCHMARKS){
        for(const row of body.bars[ticker]??[])bars[ticker].push(row);
      }
      token=body.next_page_token??null;
    }while(token);

    let overlapChecks=0,maxOverlapRelativeDiff=0;
    const fresh={},prior=readJson(outputPath),series={},revisions=[];
    if(prior&&(prior.source!=='ALPACA_IEX'||prior.feed!=='iex'||prior.adjustment!=='split'))throw Error('SECTOR_FEAR_GREED_R3_ETF_PRIOR_SOURCE_MISMATCH');
    for(const ticker of SECTOR_FEAR_GREED_R3_BENCHMARKS){
      fresh[ticker]=normalizeRows(bars[ticker]);
      const anchorFresh=fresh[ticker].find(x=>x.date===anchor);
      const anchorBase=normalizeRows(iex.series?.[ticker]??[]).find(x=>x.date===anchor);
      if(!anchorFresh||!anchorBase)throw Error(`SECTOR_FEAR_GREED_R3_ETF_OVERLAP_MISSING:${ticker}`);
      const diff=Math.abs(anchorFresh.close/anchorBase.close-1);
      maxOverlapRelativeDiff=Math.max(maxOverlapRelativeDiff,diff);overlapChecks++;
      if(diff>MAX_OVERLAP_RELATIVE_DIFF)throw Error(`SECTOR_FEAR_GREED_R3_ETF_OVERLAP_DIFF:${ticker}`);
      const append=fresh[ticker].filter(x=>x.date>anchor);
      const merged=mergeRows(prior?.series?.[ticker]??[],append);
      series[ticker]=merged.rows;
      revisions.push(...merged.revisions.map(row=>({ticker,...row})));
    }
    const latestDates=SECTOR_FEAR_GREED_R3_BENCHMARKS.map(t=>series[t].at(-1)?.date??anchor);
    const commonLatest=[...latestDates].sort()[0];
    // A successful HTTP response can still omit a symbol's latest session.
    // Do not certify/cache a partial batch for 20 hours or mix session dates.
    const freshLatest=SECTOR_FEAR_GREED_R3_BENCHMARKS.map(t=>fresh[t].at(-1)?.date??null);
    const newestFresh=[...freshLatest].filter(validDate).sort().at(-1);
    if(!newestFresh||freshLatest.some(date=>date!==newestFresh)||latestDates.some(date=>date!==newestFresh))throw Error('SECTOR_FEAR_GREED_R3_ETF_INCOMPLETE_SESSION');
    const payload={
      version:1,methodologyVersion:SECTOR_FEAR_GREED_R3_ETF_INCREMENTAL_METHOD,
      source:'ALPACA_IEX',feed:'iex',adjustment:'split',generatedAt:new Date(now).toISOString(),
      baseAnchorDate:anchor,targets:[...SECTOR_FEAR_GREED_R3_BENCHMARKS],series,
    };
    // Keep the previous observations before accepting official revisions.
    if(revisions.length)saveJson(path.join(base,'sector-etf-revisions',`${now}.json`),{source:'ALPACA_IEX',checkedAt:report.checkedAt,requestEnd:end,revisions});
    saveJson(outputPath,payload);
    const check=readJson(outputPath);
    if(!check||check.methodologyVersion!==SECTOR_FEAR_GREED_R3_ETF_INCREMENTAL_METHOD)throw Error('SECTOR_FEAR_GREED_R3_ETF_READBACK_FAILED');
    report.status=commonLatest>anchor?'COLLECTED':'NO_NEW_MARKET_SESSION';
    report.storageVerified=true;report.overlapChecks=overlapChecks;report.maxOverlapRelativeDiff=maxOverlapRelativeDiff;
    report.commonLatest=commonLatest;report.rows=Object.values(series).reduce((n,x)=>n+x.length,0);
    report.revisedRows=revisions.length;
  }catch(error){
    report.error=/^[A-Z0-9_:.-]+$/.test(error?.message??'')?error.message:'SECTOR_FEAR_GREED_R3_ETF_COLLECTION_FAILED';
  }
  saveJson(reportPath,report);
  if(!report.storageVerified)throw Object.assign(Error(report.error),{code:report.error});
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(await collectSectorFearGreedR3EtfIncremental(),null,2));}
  catch(error){console.log(JSON.stringify({status:'FAILED_PRESERVE_EXISTING',code:error.code??'SECTOR_FEAR_GREED_R3_ETF_COLLECTION_FAILED',publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false}));process.exitCode=1;}
}
