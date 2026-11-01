// R43 one-time annual PRIVATE input preparation. No network, D1, Core or writes.
// Accept only manually reviewed issuer membership and 21 integrity-checked
// MarketParquet daily stock snapshots (latest session + 20 previous sessions).
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {r43IssuerKey,rankR43Issuers} from '../../lib/market-calendar-r43-issuer-rank.mjs';

const DAY=/^20\d\d-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const DAILY_DIR='market-calendar-r45-marketparquet';
const FILE=/^stock_daily_(20\d\d-\d\d-\d\d)\.json$/;
const REQUIRED_EXCEPTIONS=new Set(['BERKSHIRE','ARM','ANET','SHOP','DE']);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const sha=value=>createHash('sha256').update(value).digest('hex');
const fail=code=>{throw Error(code)};
const validDay=s=>typeof s==='string'&&DAY.test(s)&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;

function reviewedMembers(universe,asOf){
 if(universe?.version!==1||universe.method!=='R57_REVIEWED_ISSUER_MEMBERSHIP_R1'||
  universe.universeReviewed!==true||universe.marketCapApiUsed!==false||
  universe.permissionForDerivedScores!==true||
  typeof universe.rightsReviewReference!=='string'||
  universe.rightsReviewReference.trim().length<12||universe.rightsReviewReference.length>512||
  !validDay(universe.reviewedAsOf)||universe.reviewedAsOf>asOf||
  Date.parse(asOf+'T00:00:00Z')-Date.parse(universe.reviewedAsOf+'T00:00:00Z')>90*86400000||
  !Number.isInteger(universe.expectedEligibleIssuers)||
  universe.expectedEligibleIssuers<2500||universe.expectedEligibleIssuers>3500||
  !Array.isArray(universe.members)||universe.members.length>25000)
  fail('R43_ANNUAL_ISSUER_REVIEW_OR_RIGHTS_MISSING');
 const tickers=new Set(),aliases=new Set(),issuers=new Set(),exceptions=new Set();
 for(const row of universe.members){
  if(!row||typeof row.ticker!=='string'||!TICKER.test(row.ticker)||
   tickers.has(row.ticker)||typeof row.eligible!=='boolean')
   fail('R43_ANNUAL_ISSUER_MEMBER_INVALID');
  tickers.add(row.ticker);
  const alias=row.ticker.replace(/[.\-]/g,'');
  if(aliases.has(alias))fail('R43_ANNUAL_ISSUER_ALIAS_DUPLICATE');
  aliases.add(alias);
  let issuer;
  try{issuer=r43IssuerKey(row.ticker,row.issuerId??null)}
  catch{fail('R43_ANNUAL_ISSUER_MEMBER_INVALID')}
  if(row.eligible){
   // Explicit approved issuer identity prevents silent multi-class double counts.
   if(typeof row.issuerId!=='string'||!row.issuerId.trim())
    fail('R43_ANNUAL_ISSUER_ID_UNVERIFIED');
   issuers.add(issuer);
   if(REQUIRED_EXCEPTIONS.has(issuer))exceptions.add(issuer);
  }
  for(const key of ['dividendYield','eps','epsGrowthPct']){
   if(row[key]!==undefined&&row[key]!==null&&
    (universe.fundamentalsVerified!==true||!finite(row[key])))
    fail('R43_ANNUAL_FUNDAMENTALS_UNVERIFIED');
  }
 }
 if(issuers.size<Math.ceil(universe.expectedEligibleIssuers*.98)||
  issuers.size>universe.expectedEligibleIssuers*1.05)
  fail('R43_ANNUAL_UNIVERSE_COVERAGE_INSUFFICIENT');
 for(const exception of REQUIRED_EXCEPTIONS){
  if(!exceptions.has(exception))fail('R43_ANNUAL_REVIEWED_EXCEPTION_MISSING');
 }
 return universe.members;
}

function checkedDaily(snapshot){
 if(snapshot?.version!==1||snapshot.method!=='MARKET_CALENDAR_R45_FULL_STOCK_REUSE_R1'||
  snapshot.scope!=='PC_PRIVATE_ONLY'||snapshot.publicFeed!==false||
  snapshot.redistribution!==false||snapshot.source!=='MARKETPARQUET_FREE_SAMPLE'||
  snapshot.priceAdjustment!=='SPLIT_ADJUSTED'||snapshot.providerCallsAdded!==0||
  snapshot.sourceContract!=='ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5'||
  !validDay(snapshot.observationDate)||!Number.isInteger(snapshot.tickerCount)||
  snapshot.tickerCount<2000||snapshot.tickerCount>25000||
  !Array.isArray(snapshot.rows)||snapshot.rows.length!==snapshot.tickerCount||
  sha(JSON.stringify(snapshot.rows))!==snapshot.rowsSha256)
  fail('R43_ANNUAL_DAILY_PROVENANCE_OR_HASH_INVALID');
 const rows=new Map();
 for(const row of snapshot.rows){
  if(!row||!TICKER.test(row.ticker)||rows.has(row.ticker)||
   !finite(row.close)||row.close<=0||
   !finite(row.volume)||row.volume<0||row.volume>1e15)
   fail('R43_ANNUAL_DAILY_ROW_INVALID');
  rows.set(row.ticker,{close:row.close,volume:row.volume});
 }
 return {date:snapshot.observationDate,rows};
}

const candidates=ticker=>[...new Set([ticker,ticker.replaceAll('.','-'),
 ticker.replaceAll('-','.'),ticker.replaceAll('.','').replaceAll('-','')])];
function findStock(day,ticker){
 for(const symbol of candidates(ticker)){
  const observed=day.rows.get(symbol);
  if(observed)return observed;
 }
 return null;
}

export function prepareR43AnnualOfflineInput({snapshots,universe,now=Date.now()}={}){
 if(!Array.isArray(snapshots)||snapshots.length!==21||!Number.isFinite(now))
  fail('R43_ANNUAL_21_DAILY_FILES_REQUIRED');
 const days=snapshots.map(checkedDaily).sort((a,b)=>b.date.localeCompare(a.date));
 if(new Set(days.map(x=>x.date)).size!==21||
  now-Date.parse(days[0].date+'T00:00:00Z')>7*86400000||
  Date.parse(days[0].date+'T00:00:00Z')>now+86400000||
  Date.parse(days[0].date+'T00:00:00Z')-Date.parse(days[20].date+'T00:00:00Z')>60*86400000)
  fail('R43_ANNUAL_DAILY_SESSION_DATES_INVALID');
 // A 21-file set cannot establish exchange-session continuity by itself.
 // Require a reviewed exact session list, weekdays and bounded gaps.
 if(universe?.marketSessionsReviewed!==true||
  !Array.isArray(universe.reviewedTradingSessions)||
  universe.reviewedTradingSessions.length!==21||
  days.some((day,i)=>{
   const stamp=Date.parse(day.date+'T00:00:00Z');
   const weekday=new Date(stamp).getUTCDay();
   const gap=i?Date.parse(days[i-1].date+'T00:00:00Z')-stamp:0;
   return day.date!==universe.reviewedTradingSessions[i]||
    weekday===0||weekday===6||(i>0&&(gap<=0||gap>5*86400000));
  }))fail('R43_ANNUAL_EXCHANGE_SESSIONS_NOT_VERIFIED');
 const asOf=days[0].date,members=reviewedMembers(universe,asOf);
 const rows=members.map(member=>{
  const today=findStock(days[0],member.ticker),yesterday=findStock(days[1],member.ticker);
  const previous=days.slice(1).map(day=>findStock(day,member.ticker));
  const base=previous.every(x=>x)?previous.reduce((sum,x)=>sum+x.volume,0)/20:null;
  return {
   ticker:member.ticker,issuerId:member.issuerId??null,eligible:member.eligible,tradeDate:asOf,
   price:today?.close??null,volume:today?.volume??null,
   relativeVolume:today&&base>0?today.volume/base:null,
   dailyChangePct:today&&yesterday&&yesterday.close>0?
    (today.close/yesterday.close-1)*100:null,
   dividendYield:universe.fundamentalsVerified===true?member.dividendYield??null:null,
   eps:universe.fundamentalsVerified===true?member.eps??null:null,
   epsGrowthPct:universe.fundamentalsVerified===true?member.epsGrowthPct??null:null,
  };
 });
 const ranked=rankR43Issuers(rows,{asOf,expectedEligibleIssuers:universe.expectedEligibleIssuers});
 if(ranked.status!=='READY_SHADOW')
  fail('R43_ANNUAL_R43_COVERAGE_'+String(ranked.reason??'UNKNOWN'));
 return {version:1,asOf,provenance:'APPROVED_PC_STORED_DATA',
  expectedEligibleIssuers:universe.expectedEligibleIssuers,
  approvedUniverseSha256:sha(JSON.stringify(universe)),
  marketCapApiUsed:false,permissionForDerivedScores:true,
  rightsReviewReference:universe.rightsReviewReference,
  scope:'PC_PRIVATE_ONLY',publicFeed:false,redistribution:false,
  sourceContract:'ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5',
  rows};
}

// Existing R45 JSON daily snapshots are sufficient: no extra runtime module.
// This helper only reads local files and returns the PRIVATE input in memory.
export function readStoredR45ToR43Annual({pcHome,universeFile,now=Date.now()}={}){
 if(typeof pcHome!=='string'||!path.isAbsolute(pcHome)||
  typeof universeFile!=='string'||!path.isAbsolute(universeFile))
  fail('R43_ANNUAL_APPROVED_PATH_REQUIRED');
 const base=path.join(pcHome,DAILY_DIR);
 const files=fs.readdirSync(base).map(name=>({name,date:name.match(FILE)?.[1]}))
  .filter(x=>validDay(x.date)).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,21);
 if(files.length!==21)fail('R43_ANNUAL_21_DAILY_FILES_REQUIRED');
 const read=(p,limit)=>{
  const stat=fs.lstatSync(p);
  if(!stat.isFile()||stat.size<1||stat.size>limit)
   fail('R43_ANNUAL_FILE_SIZE_OR_TYPE_INVALID');
  return JSON.parse(fs.readFileSync(p,'utf8'));
 };
 return prepareR43AnnualOfflineInput({
  snapshots:files.map(x=>read(path.join(base,x.name),4_000_000)),
  universe:read(universeFile,8_000_000),now,
 });
}
