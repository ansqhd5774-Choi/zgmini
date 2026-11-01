/**
 * R15: reconstruct the already-completed 2026-10-30 IEX session at 15-minute
 * checkpoints. Uses approved confirmed rows READ-ONLY as comparison anchors.
 * Does not collect 250 days, publish provisional scores, or modify confirmed.
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';

export const OBSERVATION_DATE='2026-10-30';
export const SNAPSHOTS=[
  ['10:00','2026-10-30T14:00:00Z'],
  ['11:30','2026-10-30T15:30:00Z'],
  ['13:00','2026-10-30T17:00:00Z'],
  ['14:30','2026-10-30T18:30:00Z'],
  ['15:45','2026-10-30T19:45:00Z'],
  ['16:00','2026-10-30T20:00:00Z'],
];
const MINUTES_15=15*60*1000;
const validPrice=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const validVolume=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
let apiRequests=0;

export function replay15Min({members,confirmedRows,bars,hasNextPage=false}){
  if(!Array.isArray(members)||members.length<490||members.length>520||new Set(members).size!==members.length)
    throw Error('R15_UNIVERSE_INVALID');
  const confirmed=new Map();
  const duplicates=new Set();
  for(const row of confirmedRows){
    if(confirmed.has(row.ticker))duplicates.add(row.ticker);
    confirmed.set(row.ticker,row);
  }
  const eligible=new Map();
  for(const ticker of members){
    const c=confirmed.get(ticker);
    if(!duplicates.has(ticker)&&c?.trade_date===OBSERVATION_DATE&&
      c.source==='MarketParquet Free Sample'&&validPrice(c.previous_close)&&validPrice(c.current_close))
      eligible.set(ticker,c);
  }
  const collected=new Map();
  let badOrRepeatedBars=0;
  const lower=Date.parse('2026-10-30T13:30:00Z');
  const upper=Date.parse('2026-10-30T20:00:00Z');
  for(const ticker of members){
    const list=Array.isArray(bars?.[ticker])?bars[ticker]:[];
    const seen=new Set();
    const good=[];
    for(const b of list){
      const start=Date.parse(b?.t);
      if(!Number.isFinite(start)||start<lower||start>=upper||!validPrice(b?.c)||!validVolume(b?.v)||seen.has(start)){
        badOrRepeatedBars++;continue;
      }
      seen.add(start);
      good.push({end:start+MINUTES_15,close:b.c});
    }
    good.sort((a,b)=>a.end-b.end);
    collected.set(ticker,good);
  }
  const snapshots=SNAPSHOTS.map(([localTime,iso])=>{
    const cutoff=Date.parse(iso);
    const counts={rising:0,falling:0,unchanged:0};
    let observed=0,fresh30m=0,fresh60m=0,comparable=0,finalDirectionAgreement=0;
    for(const ticker of members){
      const list=collected.get(ticker);
      let last;
      for(const b of list){if(b.end<=cutoff)last=b;else break;}
      if(!last)continue;
      observed++;
      if(cutoff-last.end<=30*60*1000)fresh30m++;
      if(cutoff-last.end<=60*60*1000)fresh60m++;
      const reference=eligible.get(ticker);
      if(!reference)continue;
      comparable++;
      const direction=last.close>reference.previous_close?'rising':last.close<reference.previous_close?'falling':'unchanged';
      counts[direction]++;
      if(localTime==='16:00'){
        const finalDirection=reference.current_close>reference.previous_close?'rising':
          reference.current_close<reference.previous_close?'falling':'unchanged';
        if(direction===finalDirection)finalDirectionAgreement++;
      }
    }
    return {newYorkTime:localTime,observed,comparable,fresh30m,fresh60m,
      counts,finalDirectionAgreement:localTime==='16:00'?finalDirectionAgreement:null,
      finalAgreementRate:localTime==='16:00'&&comparable?finalDirectionAgreement/comparable:null};
  });
  const last=snapshots.at(-1);
  return {observationDate:OBSERVATION_DATE,previousConfirmedDate:'2026-10-29',
    timeframe:'15Min',universeBasis:'OBSERVATION_DAY_STORED_UNIVERSE',expected:members.length,
    referenceEligible:eligible.size,invalidOrRepeatedBars:badOrRepeatedBars,snapshots,hasNextPage,
    diagnosticStatus:hasNextPage?'INCOMPLETE_PAGINATION':
      eligible.size/members.length<.98?'CONFIRMED_REFERENCE_INCOMPLETE':
      last.comparable/members.length<.98?'FINAL_COVERAGE_BELOW_98_PCT':'REPLAY_READY_FOR_REVIEW'};
}

function readStoredBaseline(pcRoot){
  const dbFile=path.join(pcRoot,'storage','core.sqlite');
  if(!fs.existsSync(dbFile))throw Error('R15_PC_DB_NOT_FOUND');
  const db=new DatabaseSync(dbFile,{readOnly:true});
  try{
    const universe=db.prepare('SELECT members_json,member_count FROM market_score_breadth_b1_r3_universe_v1 WHERE trade_date=?').get(OBSERVATION_DATE);
    if(!universe)throw Error('R15_UNIVERSE_NOT_STORED');
    const members=JSON.parse(universe.members_json);
    if(!Array.isArray(members)||members.length!==universe.member_count||members.length<490||members.length>520)
      throw Error('R15_UNIVERSE_INVALID');
    const confirmedRows=db.prepare('SELECT trade_date,ticker,previous_close,current_close,source FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date=?').all(OBSERVATION_DATE);
    return {members,confirmedRows};
  }finally{db.close();}
}

async function run(){
  const pcRoot=process.env.ZGMINI_PC_HOME??'E:\\ZGmini\\data\\pc-writer';
  const {members,confirmedRows}=readStoredBaseline(pcRoot);
  const providerFile=path.join(pcRoot,'providers.env');
  if(!fs.existsSync(providerFile))throw Error('R15_PROVIDER_ENV_NOT_FOUND');
  const env=parseEnv(fs.readFileSync(providerFile,'utf8'));
  if(!env.APCA_API_KEY_ID||!env.APCA_API_SECRET_KEY)throw Error('R15_ALPACA_CREDENTIALS_MISSING');
  const baseParams={symbols:members.join(','),timeframe:'15Min',
    start:'2026-10-30T13:30:00Z',end:'2026-10-30T20:00:00Z',
    feed:'iex',adjustment:'split',limit:'10000'};
  const allBars={};
  let nextPageToken;
  let exhausted=false;
  const MAX_API_REQUESTS=4;
  for(let page=0;page<MAX_API_REQUESTS;page++){
    const url=new URL('https://data.alpaca.markets/v2/stocks/bars');
    url.search=new URLSearchParams({...baseParams,...(nextPageToken?{page_token:nextPageToken}:{})});
    apiRequests++;
    const response=await fetch(url,{headers:{'APCA-API-KEY-ID':env.APCA_API_KEY_ID,
      'APCA-API-SECRET-KEY':env.APCA_API_SECRET_KEY},signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('R15_ALPACA_HTTP_'+response.status);
    const body=await response.json();
    if(!body?.bars||typeof body.bars!=='object')throw Error('R15_ALPACA_BARS_INVALID');
    for(const [ticker,bars] of Object.entries(body.bars)){
      if(!Array.isArray(bars))throw Error('R15_ALPACA_BARS_INVALID');
      (allBars[ticker]??=[]).push(...bars);
    }
    nextPageToken=body.next_page_token;
    if(!nextPageToken){exhausted=true;break;}
  }
  return {apiRequestLimit:MAX_API_REQUESTS,...replay15Min({members,confirmedRows,bars:allBars,
    hasNextPage:!exhausted})};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let report;
  try{report={report:'US_BREADTH_IEX_R15_HISTORICAL_INTRADAY_REPLAY',
    mode:'DIAGNOSTIC_ONLY',confirmedWritten:false,dbWritten:false,d1Written:false,
    schedulerChanged:false,provisionalPublished:false,...await run(),sourceApiRequests:apiRequests};}
  catch(e){report={report:'US_BREADTH_IEX_R15_HISTORICAL_INTRADAY_REPLAY',
    mode:'DIAGNOSTIC_ONLY',status:'STOP',confirmedWritten:false,dbWritten:false,
    d1Written:false,schedulerChanged:false,provisionalPublished:false,sourceApiRequests:apiRequests,
    reason:/^R15_[A-Z0-9_]+$/.test(e.message)?e.message:'R15_DIAGNOSTIC_UNAVAILABLE'};}
  const file=path.join(path.dirname(fileURLToPath(import.meta.url)),
    'US_BREADTH_IEX_R15_HISTORICAL_INTRADAY_REPLAY_RESULT.json');
  fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
  process.stdout.write('RESULT_FILE='+file+'\nSTATUS='+(report.diagnosticStatus??report.status)+'\n');
}
