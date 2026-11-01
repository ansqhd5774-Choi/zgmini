/**
 * R13 diagnostic: one completed session, one Alpaca IEX request, zero DB/D1 writes.
 * Answers whether the existing free IEX feed is adequate for an SP500 provisional lane.
 * Do not use these diagnostic counts as published market breadth.
 */
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';

export const PILOT_DATE = '2026-10-30';
export const PRIOR_DATE = '2026-10-29';

const validPrice = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
const validVolume = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const direction = (today, prior) => today > prior ? 'rising' : today < prior ? 'falling' : 'unchanged';
let sourceApiRequests=0;

export function assessOneDayIexPilot({members,confirmedRows,iexBars,observationDate=PILOT_DATE,priorDate=PRIOR_DATE,hasNextPage=false}) {
  if (!Array.isArray(members) || members.length===0 || new Set(members).size!==members.length)
    throw Error('INVALID_UNIVERSE');
  const confirmed=new Map();
  const duplicates=new Set();
  for(const r of confirmedRows ?? []){
    if(confirmed.has(r.ticker))duplicates.add(r.ticker);
    confirmed.set(r.ticker,r);
  }
  let iexToday=0,iexPrior=0,iexPairs=0,confirmedEligible=0,comparable=0,agreement=0;
  let anchorUnder1pct=0,anchorUnder0_1pct=0;
  const iex={rising:0,unchanged:0,falling:0};
  const reference={rising:0,unchanged:0,falling:0};
  for(const ticker of members){
    const list=iexBars?.[ticker];
    const daily=Array.isArray(list)?list.filter(b=>String(b?.t).slice(0,10)===observationDate):[];
    const prior=Array.isArray(list)?list.filter(b=>String(b?.t).slice(0,10)===priorDate):[];
    const currentBar=daily.length===1&&validPrice(daily[0].c)&&validVolume(daily[0].v)?daily[0]:null;
    const priorBar=prior.length===1&&validPrice(prior[0].c)&&validVolume(prior[0].v)?prior[0]:null;
    if(currentBar)iexToday++;
    if(priorBar)iexPrior++;
    if(!currentBar||!priorBar)continue;
    iexPairs++;
    const rec=confirmed.get(ticker);
    if(duplicates.has(ticker)||!rec||!validPrice(rec.current_close)||!validPrice(rec.previous_close)
      ||rec.trade_date!==observationDate||rec.source!=='MarketParquet Free Sample')continue;
    confirmedEligible++;
    const relative=Math.abs(priorBar.c/rec.previous_close-1);
    if(relative<=.01)anchorUnder1pct++;
    if(relative<=.001)anchorUnder0_1pct++;
    const a=direction(currentBar.c,priorBar.c),b=direction(rec.current_close,rec.previous_close);
    iex[a]++;reference[b]++;comparable++;
    if(a===b)agreement++;
  }
  return {
    observationDate,priorDate,expected:members.length,iexToday,iexPrior,iexPairs,
    confirmedEligible,comparable,agreement,agreementRate:comparable?agreement/comparable:null,
    anchorUnder1pct,anchorUnder0_1pct,iex,reference,hasNextPage,
    // This is a feasibility test, not the provisional publication approval.
    diagnosticStatus:hasNextPage?'INCOMPLETE_PAGINATION':iexPairs/members.length<.98?'COVERAGE_BELOW_98_PCT':'COVERAGE_PILOT_PASSED',
  };
}

function loadMembersAndConfirmed(dbFile) {
  if(!fs.existsSync(dbFile))throw Error('APPROVED_PC_DB_NOT_FOUND');
  const db=new DatabaseSync(dbFile,{readOnly:true});
  try{
    const universe=db.prepare('SELECT members_json,member_count FROM market_score_breadth_b1_r3_universe_v1 WHERE trade_date=?').get(PILOT_DATE);
    if(!universe)throw Error('PILOT_UNIVERSE_NOT_STORED');
    const members=JSON.parse(universe.members_json);
    if(!Array.isArray(members)||members.length<490||members.length>520||universe.member_count!==members.length)
      throw Error('PILOT_UNIVERSE_INVALID');
    const confirmedRows=db.prepare('SELECT trade_date,ticker,previous_close,current_close,source FROM market_score_breadth_b1_r3_current_v1 WHERE trade_date=?').all(PILOT_DATE);
    return {members,confirmedRows};
  }finally{db.close();}
}

async function run() {
  const base=process.env.ZGMINI_PC_HOME??'E:\\ZGmini\\data\\pc-writer';
  const providerFile=path.join(base,'providers.env');
  if(!fs.existsSync(providerFile))throw Error('PROVIDER_ENV_NOT_FOUND');
  const provider=parseEnv(fs.readFileSync(providerFile,'utf8'));
  if(!provider.APCA_API_KEY_ID||!provider.APCA_API_SECRET_KEY)throw Error('ALPACA_IEX_CREDENTIALS_NOT_FOUND');
  const {members,confirmedRows}=loadMembersAndConfirmed(path.join(base,'storage','core.sqlite'));
  const url=new URL('https://data.alpaca.markets/v2/stocks/bars');
  url.search=new URLSearchParams({symbols:members.join(','),timeframe:'1Day',start:PRIOR_DATE+'T00:00:00Z',
    end:'2026-10-31T00:00:00Z',feed:'iex',adjustment:'split',limit:'10000'});
  // Strictly one existing-free-feed request. No pagination or retries in the pilot.
  sourceApiRequests++;
  const response=await fetch(url,{headers:{'APCA-API-KEY-ID':provider.APCA_API_KEY_ID,
    'APCA-API-SECRET-KEY':provider.APCA_API_SECRET_KEY},signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error('ALPACA_IEX_HTTP_'+response.status);
  const body=await response.json();
  if(!body?.bars||typeof body.bars!=='object')throw Error('ALPACA_IEX_BARS_INVALID');
  return assessOneDayIexPilot({members,confirmedRows,iexBars:body.bars,hasNextPage:Boolean(body.next_page_token)});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  let result;
  try{result={report:'US_BREADTH_IEX_R13_ONE_DAY_PILOT',status:'DIAGNOSTIC_ONLY',databaseWritten:false,
    d1Written:false,schedulerChanged:false,...await run(),sourceApiRequests};}
  catch(e){result={report:'US_BREADTH_IEX_R13_ONE_DAY_PILOT',status:'STOP',databaseWritten:false,
    d1Written:false,schedulerChanged:false,sourceApiRequests,
    reason:/^(APPROVED_|PILOT_|PROVIDER_|ALPACA_)/.test(e.message)?e.message:'PILOT_UNAVAILABLE'};}
  const reportPath=path.join(path.dirname(fileURLToPath(import.meta.url)),'US_BREADTH_IEX_R13_ONE_DAY_PILOT_RESULT.json');
  fs.writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n');
  process.stdout.write('RESULT_FILE='+reportPath+'\nSTATUS='+result.status+'\n');
}
