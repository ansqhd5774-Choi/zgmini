/**
 * R45: public HTTP contract smoke check ONLY. The three requests are fixed
 * visitor GET routes; this script never uses D1/provider tokens or writes.
 * In particular, a legacy R1 body returned under a phase alias is a FAIL,
 * even if HTTP is 200. No raw response body or stock counts are logged.
 */
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validFullMarketPercentHistoryRecord}
  from '../../lib/market-breadth/us-marketparquet-confirmed-history-percent-r32.mjs';

const ROOT='https://zgmini.kr';
const PERCENT_FIELDS=['market','phase','status','publicationStage','source','universe',
  'methodologyVersion','observationDate','previousDate','risingPct','fallingPct',
  'unchangedPct'].sort().join(',');
const IEX_FIELDS=['market','phase','status','source','referenceSource',
  'methodologyVersion','observationDate','priorDate','slotEndUtc','collectedAt',
  'collectionStatus','risingPct','fallingPct','unchangedPct','unobservedPct']
  .sort().join(',');
const COUNT_FIELDS=['counts','expectedCount','eligibleCount','invalidCount',
  'observedCount','missingCount','sourceRows','sourceEvidence','coverage',
  'imputedUnchangedCount','sourcePairCoverage'];
const endpoint={
  confirmed:'https://zgmini.kr/api/market-breadth?market=usa&phase=confirmed-r2',
  provisional:'https://zgmini.kr/api/market-breadth?market=usa&phase=provisional',
  history:'https://zgmini.kr/api/market-breadth-r2-history?market=usa',
};
const finitePct=value=>typeof value==='number'&&Number.isFinite(value)
  &&value>=0&&value<=100;
const exactFields=(obj,fields)=>obj&&typeof obj==='object'
  &&!Array.isArray(obj)&&Object.keys(obj).sort().join(',')===fields;
const containsCounts=obj=>obj&&typeof obj==='object'
  &&COUNT_FIELDS.some(field=>Object.hasOwn(obj,field));
const sum100=values=>values.every(finitePct)&&Math.abs(values.reduce((a,b)=>a+b,0)-100)<1e-7;
const result=(status,more={})=>({status,ok:status==='PERCENT_ONLY_VERIFIED',...more});

export function classifyPublicBreadthBody(phase,body){
  if(!body||typeof body!=='object'||Array.isArray(body))
    return result('INVALID_PUBLIC_JSON');
  if(containsCounts(body))return result('LEGACY_OR_COUNT_BEARING_PUBLIC_BODY');
  if(phase==='history'){
    if(!validFullMarketPercentHistoryRecord(body))
      return result('HISTORY_PERCENT_CONTRACT_MISMATCH');
    return result('PERCENT_ONLY_VERIFIED',{lastDate:body.lastDate});
  }
  if(phase==='confirmed'){
    if(!exactFields(body,PERCENT_FIELDS)||body.market!=='usa'||body.phase!=='CONFIRMED'
      ||body.status!=='READY'||body.publicationStage!=='PUBLIC_FINAL'
      ||body.source!=='MARKETPARQUET_STOCK_DAILY'
      ||!sum100([body.risingPct,body.fallingPct,body.unchangedPct]))
      return result('CONFIRMED_R2_PERCENT_CONTRACT_MISMATCH');
    return result('PERCENT_ONLY_VERIFIED',{observationDate:body.observationDate});
  }
  if(phase==='provisional'){
    if(!exactFields(body,IEX_FIELDS)||body.market!=='usa'||body.phase!=='PROVISIONAL'
      ||body.status!=='PROVISIONAL'||body.source!=='ALPACA_IEX_15MIN_SPLIT'
      ||!sum100([body.risingPct,body.fallingPct,body.unchangedPct,body.unobservedPct]))
      return result('IEX_PERCENT_CONTRACT_MISMATCH');
    return result('PERCENT_ONLY_VERIFIED',{observationDate:body.observationDate,
      slotEndUtc:body.slotEndUtc});
  }
  return result('UNKNOWN_PHASE');
}

async function inspectOne(phase,fetchImpl){
  let response;
  try{response=await fetchImpl(endpoint[phase],{method:'GET',redirect:'error',
    cache:'no-store',headers:{Accept:'application/json'},
    signal:AbortSignal.timeout(12_000)});}
  catch{return result('PUBLIC_HTTP_UNAVAILABLE',{httpStatus:null});}
  const httpStatus=Number(response?.status);
  if(httpStatus===404)return result('PUBLIC_ROUTE_NOT_DEPLOYED',{httpStatus});
  if(httpStatus===503){
    let reason=null;
    try{const body=await response.json();
      reason=typeof body?.reason==='string'&&/^[A-Z0-9_]{1,80}$/.test(body.reason)
        ?body.reason:null;
    }catch{}
    return result(reason&&/STALE|NOT_CURRENT/.test(reason)
      ?'STORED_RESULT_STALE':'STORED_RESULT_NOT_READY',{httpStatus,reason});
  }
  if(httpStatus!==200)return result('PUBLIC_HTTP_UNEXPECTED',{httpStatus});
  if(Number(response?.headers?.get?.('content-length')??0)>1_000_000)
    return result('PUBLIC_BODY_TOO_LARGE',{httpStatus});
  if(!/application\/json/i.test(String(response?.headers?.get?.('content-type')??'')))
    return result('PUBLIC_NOT_JSON',{httpStatus});
  let body;
  try{
    const content=await response.text();
    if(content.length>1_000_000)return result('PUBLIC_BODY_TOO_LARGE',{httpStatus});
    body=JSON.parse(content);
  }catch{return result('PUBLIC_INVALID_JSON',{httpStatus});}
  return {...classifyPublicBreadthBody(phase,body),httpStatus};
}

export async function inspectUsBreadthLiveContractR45({fetchImpl=fetch}={}){
  if(typeof fetchImpl!=='function')return {revision:'US_BREADTH_LIVE_CONTRACT_R45',
    mode:'PUBLIC_GET_READ_ONLY',status:'FETCH_REQUIRED',ok:false,
    publicGets:0,d1Writes:0,providerCalls:0,localWrites:0,coreTaskChanges:0};
  const [confirmed,provisional,history]=await Promise.all([
    inspectOne('confirmed',fetchImpl),inspectOne('provisional',fetchImpl),
    inspectOne('history',fetchImpl)]);
  const ok=[confirmed,provisional,history].every(x=>x.ok);
  return {revision:'US_BREADTH_LIVE_CONTRACT_R45',mode:'PUBLIC_GET_READ_ONLY',
    status:ok?'ALL_PUBLIC_CONTRACTS_VERIFIED':'PUBLIC_CONTRACTS_NOT_READY',ok,
    results:{confirmed,provisional,history},publicGets:3,d1Writes:0,
    providerCalls:0,localWrites:0,coreTaskChanges:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const output=process.argv.length===3&&process.argv[2]==='--inspect-live'
    ?await inspectUsBreadthLiveContractR45()
    :{revision:'US_BREADTH_LIVE_CONTRACT_R45',mode:'PUBLIC_GET_READ_ONLY',
      status:'EXPLICIT_INSPECT_LIVE_FLAG_REQUIRED',ok:false,publicGets:0,
      d1Writes:0,providerCalls:0,localWrites:0,coreTaskChanges:0};
  process.stdout.write(JSON.stringify(output)+'\n');
  if(!output.ok)process.exitCode=2;
}
