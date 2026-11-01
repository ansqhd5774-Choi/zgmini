/**
 * R16: complete the historical 2026-10-30 IEX 15-minute replay by consuming
 * every Alpaca page, with a conservative 24-request safety ceiling.
 * READ-ONLY: no DB, confirmed-score, D1, scheduler, or provisional writes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {replay15Min,OBSERVATION_DATE} from './iex-intraday-replay-r15.mjs';

export const MAX_API_REQUESTS=24;

/**
 * Injected fetchPage makes page continuation testable without live API calls.
 * Raw bars never leave this process except for aggregate in-memory analysis.
 */
export async function collectIexPages({fetchPage,maxRequests=MAX_API_REQUESTS}){
  if(typeof fetchPage!=='function'||!Number.isSafeInteger(maxRequests)||maxRequests<1||maxRequests>MAX_API_REQUESTS)
    throw Error('R16_REQUEST_BUDGET_INVALID');
  const bars={};
  const seenTokens=new Set();
  let pageToken;
  let requests=0;
  let dataPoints=0;
  let complete=false;
  for(let page=0;page<maxRequests;page++){
    const body=await fetchPage(pageToken);
    requests++;
    if(!body||!body.bars||typeof body.bars!=='object'||Array.isArray(body.bars))
      throw Error('R16_ALPACA_BARS_INVALID');
    let pagePoints=0;
    for(const [ticker,items] of Object.entries(body.bars)){
      if(!Array.isArray(items))throw Error('R16_ALPACA_BARS_INVALID');
      pagePoints+=items.length;
      (bars[ticker]??=[]).push(...items);
    }
    dataPoints+=pagePoints;
    const next=body.next_page_token;
    if(next==null||next===''){
      complete=true;
      break;
    }
    if(typeof next!=='string'||seenTokens.has(next)||pagePoints===0)
      throw Error('R16_PAGINATION_INVALID');
    seenTokens.add(next);
    pageToken=next;
  }
  return {bars,requests,dataPoints,hasNextPage:!complete};
}

function readStoredBaseline(pcRoot){
  const dbFile=path.join(pcRoot,'storage','core.sqlite');
  if(!fs.existsSync(dbFile))throw Error('R16_PC_DB_NOT_FOUND');
  const db=new DatabaseSync(dbFile,{readOnly:true});
  try{
    const universe=db.prepare('SELECT members_json,member_count FROM market_score_breadth_b1_r3_universe_v1 WHERE trade_date=?').get(OBSERVATION_DATE);
    if(!universe)throw Error('R16_UNIVERSE_NOT_STORED');
    const members=JSON.parse(universe.members_json);
    if(!Array.isArray(members)||members.length!==universe.member_count||members.length<490||members.length>520)
      throw Error('R16_UNIVERSE_INVALID');
    const confirmedRows=db.prepare('SELECT trade_date,ticker,previous_close,current_close,source FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date=?').all(OBSERVATION_DATE);
    return {members,confirmedRows};
  }finally{db.close();}
}

let sourceApiRequests=0;
async function run(){
  const pcRoot=process.env.ZGMINI_PC_HOME??'E:\\ZGmini\\data\\pc-writer';
  const {members,confirmedRows}=readStoredBaseline(pcRoot);
  const providerFile=path.join(pcRoot,'providers.env');
  if(!fs.existsSync(providerFile))throw Error('R16_PROVIDER_ENV_NOT_FOUND');
  const env=parseEnv(fs.readFileSync(providerFile,'utf8'));
  if(!env.APCA_API_KEY_ID||!env.APCA_API_SECRET_KEY)throw Error('R16_ALPACA_CREDENTIALS_MISSING');
  const params={symbols:members.join(','),timeframe:'15Min',
    start:'2026-10-30T13:30:00Z',end:'2026-10-30T20:00:00Z',
    feed:'iex',adjustment:'split',limit:'10000'};
  const collected=await collectIexPages({fetchPage:async pageToken=>{
    const url=new URL('https://data.alpaca.markets/v2/stocks/bars');
    url.search=new URLSearchParams({...params,...(pageToken?{page_token:pageToken}:{})});
    sourceApiRequests++;
    const response=await fetch(url,{headers:{'APCA-API-KEY-ID':env.APCA_API_KEY_ID,
      'APCA-API-SECRET-KEY':env.APCA_API_SECRET_KEY},signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('R16_ALPACA_HTTP_'+response.status);
    return response.json();
  }});
  return {apiRequestLimit:MAX_API_REQUESTS,sourceApiRequests,
    pagesFetched:collected.requests,receivedBars:collected.dataPoints,
    ...replay15Min({members,confirmedRows,bars:collected.bars,
      hasNextPage:collected.hasNextPage})};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let report;
  try{
    report={report:'US_BREADTH_IEX_R16_COMPLETE_INTRADAY_REPLAY',
      mode:'DIAGNOSTIC_ONLY',confirmedWritten:false,dbWritten:false,d1Written:false,
      schedulerChanged:false,provisionalPublished:false,...await run()};
  }catch(e){
    report={report:'US_BREADTH_IEX_R16_COMPLETE_INTRADAY_REPLAY',
      mode:'DIAGNOSTIC_ONLY',status:'STOP',confirmedWritten:false,dbWritten:false,
      d1Written:false,schedulerChanged:false,provisionalPublished:false,
      sourceApiRequests,reason:/^R16_[A-Z0-9_]+$/.test(e.message)?e.message:'R16_DIAGNOSTIC_UNAVAILABLE'};
  }
  const file=path.join(path.dirname(fileURLToPath(import.meta.url)),
    'US_BREADTH_IEX_R16_COMPLETE_INTRADAY_REPLAY_RESULT.json');
  fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
  process.stdout.write('RESULT_FILE='+file+'\nSTATUS='+(report.diagnosticStatus??report.status)+'\n');
}
