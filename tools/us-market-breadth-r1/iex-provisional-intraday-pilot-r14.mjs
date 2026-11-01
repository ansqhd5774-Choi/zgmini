/**
 * R14: live-session Alpaca IEX feasibility check, isolated from confirmed breadth.
 * One GET, no source/DB/D1/scheduler writes. Report only aggregate diagnostics.
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';

const validPrice=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const validVolume=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
let apiCalls=0;
export function newYorkClock(now=Date.now()){
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',
    year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
    .formatToParts(now).map(x=>[x.type,x.value]));
  return {date:`${p.year}-${p.month}-${p.day}`,weekday:p.weekday,minutes:Number(p.hour)*60+Number(p.minute)};
}
export function assessIntradayIex({members,confirmedPriorRows,bars,priorDate,currentDate,hasNextPage=false}){
  if(!Array.isArray(members)||members.length<490||members.length>520||new Set(members).size!==members.length)
    throw Error('PILOT_UNIVERSE_INVALID');
  const confirmed=new Map(),duplicates=new Set();
  for(const row of confirmedPriorRows){
    if(confirmed.has(row.ticker))duplicates.add(row.ticker);
    confirmed.set(row.ticker,row);
  }
  let current=0,prior=0,pairs=0,anchorChecked=0,anchorUnder1pct=0,anchorUnder0_1pct=0;
  const provisional={rising:0,unchanged:0,falling:0};
  for(const symbol of members){
    const list=Array.isArray(bars?.[symbol])?bars[symbol]:[];
    const currentList=list.filter(x=>String(x?.t).slice(0,10)===currentDate);
    const priorList=list.filter(x=>String(x?.t).slice(0,10)===priorDate);
    const today=currentList.length===1&&validPrice(currentList[0].c)&&validVolume(currentList[0].v)?currentList[0]:null;
    const yesterday=priorList.length===1&&validPrice(priorList[0].c)&&validVolume(priorList[0].v)?priorList[0]:null;
    if(today)current++;
    if(yesterday)prior++;
    if(!today||!yesterday)continue;
    pairs++;
    const baseline=confirmed.get(symbol);
    if(duplicates.has(symbol)||!baseline||baseline.trade_date!==priorDate||baseline.source!=='MarketParquet Free Sample'||!validPrice(baseline.current_close))continue;
    anchorChecked++;
    const delta=Math.abs(yesterday.c/baseline.current_close-1);
    if(delta<=.01)anchorUnder1pct++;
    if(delta<=.001)anchorUnder0_1pct++;
    if(today.c>yesterday.c)provisional.rising++;
    else if(today.c<yesterday.c)provisional.falling++;
    else provisional.unchanged++;
  }
  const coverage=pairs/members.length;
  const anchorPass=anchorChecked>0&&anchorUnder1pct/anchorChecked>=.98;
  return {observationDate:currentDate,previousConfirmedDate:priorDate,expected:members.length,
    currentIexObserved:current,priorIexObserved:prior,pairedIexObserved:pairs,coverage,
    anchorChecked,anchorUnder1pct,anchorUnder0_1pct,countsDiagnostic:provisional,hasNextPage,
    status:hasNextPage?'INCOMPLETE_PAGINATION':coverage<.98?'INTRADAY_COVERAGE_BELOW_98_PCT':
      !anchorPass?'SPLIT_BASIS_RECONCILIATION_REQUIRED':'COVERAGE_AND_BASIS_PILOT_PASSED'};
}
function loadApprovedBaseline(base,date){
  const file=path.join(base,'storage','core.sqlite');
  if(!fs.existsSync(file))throw Error('PILOT_PC_DB_NOT_FOUND');
  const db=new DatabaseSync(file,{readOnly:true});
  try{
    const universe=db.prepare('SELECT trade_date,members_json,member_count FROM market_score_breadth_b1_r3_universe_v1 WHERE trade_date<? ORDER BY trade_date DESC LIMIT 1').get(date);
    if(!universe)throw Error('PILOT_PRIOR_UNIVERSE_NOT_STORED');
    const members=JSON.parse(universe.members_json);
    if(!Array.isArray(members)||members.length!==universe.member_count||members.length<490||members.length>520)
      throw Error('PILOT_PRIOR_UNIVERSE_INVALID');
    const confirmedPriorRows=db.prepare('SELECT trade_date,ticker,current_close,source FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date=?').all(universe.trade_date);
    return {members,confirmedPriorRows,priorDate:universe.trade_date};
  }finally{db.close();}
}
async function run(now=Date.now()){
  const ny=newYorkClock(now);
  if(['Sat','Sun'].includes(ny.weekday)||ny.minutes<585||ny.minutes>975)
    throw Error('PILOT_OUTSIDE_NY_REGULAR_WINDOW');
  const base=process.env.ZGMINI_PC_HOME??'E:\\ZGmini\\data\\pc-writer';
  const {members,confirmedPriorRows,priorDate}=loadApprovedBaseline(base,ny.date);
  const days=(Date.parse(ny.date+'T00:00:00Z')-Date.parse(priorDate+'T00:00:00Z'))/86400000;
  if(!(days>=1&&days<=5))throw Error('PILOT_PRIOR_ANCHOR_TOO_OLD');
  const f=path.join(base,'providers.env');
  if(!fs.existsSync(f))throw Error('PILOT_PROVIDER_ENV_NOT_FOUND');
  const env=parseEnv(fs.readFileSync(f,'utf8'));
  if(!env.APCA_API_KEY_ID||!env.APCA_API_SECRET_KEY)throw Error('PILOT_ALPACA_CREDENTIALS_MISSING');
  const requestAt=new Date(now).toISOString();
  const url=new URL('https://data.alpaca.markets/v2/stocks/bars');
  url.search=new URLSearchParams({symbols:members.join(','),timeframe:'1Day',start:priorDate+'T00:00:00Z',
    end:requestAt,feed:'iex',adjustment:'split',limit:'10000'});
  apiCalls++;
  const response=await fetch(url,{headers:{'APCA-API-KEY-ID':env.APCA_API_KEY_ID,
    'APCA-API-SECRET-KEY':env.APCA_API_SECRET_KEY},signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('PILOT_ALPACA_HTTP_'+response.status);
  const body=await response.json();
  if(!body?.bars||typeof body.bars!=='object')throw Error('PILOT_ALPACA_BARS_INVALID');
  return {retrievedAt:requestAt,universeBasis:'PRIOR_CONFIRMED_SESSION_SNAPSHOT',
    ...assessIntradayIex({members,confirmedPriorRows,bars:body.bars,priorDate,currentDate:ny.date,
      hasNextPage:Boolean(body.next_page_token)})};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let report;
  try{report={report:'US_BREADTH_IEX_R14_INTRADAY_PILOT',mode:'READ_ONLY_FEASIBILITY',
    dbWritten:false,d1Written:false,confirmedKeyWritten:false,schedulerChanged:false,
    ...await run(),sourceApiRequests:apiCalls};}
  catch(error){report={report:'US_BREADTH_IEX_R14_INTRADAY_PILOT',mode:'READ_ONLY_FEASIBILITY',
    status:'STOP',dbWritten:false,d1Written:false,confirmedKeyWritten:false,schedulerChanged:false,
    sourceApiRequests:apiCalls,
    reason:/^PILOT_[A-Z0-9_]+$/.test(error.message)?error.message:'PILOT_DIAGNOSTIC_UNAVAILABLE'};}
  const reportPath=path.join(path.dirname(fileURLToPath(import.meta.url)),'US_BREADTH_IEX_R14_INTRADAY_PILOT_RESULT.json');
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  process.stdout.write('RESULT_FILE='+reportPath+'\nSTATUS='+report.status+'\n');
}
