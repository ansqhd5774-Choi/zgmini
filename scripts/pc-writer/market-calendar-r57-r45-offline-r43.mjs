// R57: read-only bridge from already-stored R45 full-stock daily snapshots
// to the R43 issuer scorer. Never fetch, write, publish or alter Core state.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {rankR43Issuers,r43ImportanceIndex,R43_METHOD,r43IssuerKey} from '../../lib/market-calendar-r43-issuer-rank.mjs';

export const R57_METHOD='R57_R45_20_PRIOR_SESSIONS_TO_R43_SHADOW_R1';
export const R57_REVIEWED_UNIVERSE='local-market-calendar-r43-reviewed-issuers.json';
const DAILY='market-calendar-r45-marketparquet';
const DAYS=21,MAX_DAY_BYTES=4_000_000,MAX_MEMBERSHIP_BYTES=8_000_000;
const DAY_RE=/^stock_daily_(20\d\d-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))\.json$/;
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const sha=value=>createHash('sha256').update(value).digest('hex');
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const validDay=d=>typeof d==='string'&&/^20\d\d-\d\d-\d\d$/.test(d)&&
 !Number.isNaN(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const boundedRegular=(file,limit)=>{
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.size<1||st.size>limit)throw Error('R57_FILE_TYPE_OR_SIZE_INVALID');
 return JSON.parse(fs.readFileSync(file,'utf8'));
};
const noWrite=()=>({providerCalls:0,dbWrites:0,filesystemWrites:0,published:false,schedulerChanged:false});

function readDay(dir,date){
 const payload=boundedRegular(path.join(dir,`stock_daily_${date}.json`),MAX_DAY_BYTES);
 if(payload?.version!==1||payload?.method!=='MARKET_CALENDAR_R45_FULL_STOCK_REUSE_R1'||
  payload?.scope!=='PC_PRIVATE_ONLY'||payload?.publicFeed!==false||payload?.redistribution!==false||
  payload?.source!=='MARKETPARQUET_FREE_SAMPLE'||payload?.priceAdjustment!=='SPLIT_ADJUSTED'||
  payload?.providerCallsAdded!==0||
  payload?.sourceContract!=='ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5'||
  payload?.observationDate!==date||!Number.isInteger(payload.tickerCount)||
  payload.tickerCount<2000||payload.tickerCount>25000||
  !Array.isArray(payload.rows)||payload.rows.length!==payload.tickerCount||
  sha(JSON.stringify(payload.rows))!==payload.rowsSha256)
  throw Error('R57_R45_SNAPSHOT_INTEGRITY_INVALID');
 const values=new Map();
 for(const row of payload.rows){
  if(!TICKER.test(row?.ticker)||values.has(row.ticker)||
   !finite(row.close)||row.close<=0||
   !Number.isSafeInteger(row.volume)||row.volume<0)
   throw Error('R57_R45_SNAPSHOT_ROWS_INVALID');
  values.set(row.ticker,{close:row.close,volume:row.volume});
 }
 return values;
}
function reviewedMembers(file,asOf){
 const source=boundedRegular(file,MAX_MEMBERSHIP_BYTES);
 if(source?.version!==1||source?.method!=='R57_REVIEWED_ISSUER_MEMBERSHIP_R1'||
  source?.universeReviewed!==true||source?.marketCapApiUsed!==false||
  source?.permissionForDerivedScores!==true||source?.reviewedAsOf===undefined||
  !validDay(source.reviewedAsOf)||source.reviewedAsOf>asOf||
  Date.parse(asOf+'T00:00:00Z')-Date.parse(source.reviewedAsOf+'T00:00:00Z')>90*86400000||
  !Number.isInteger(source.expectedEligibleIssuers)||source.expectedEligibleIssuers<2500||
  source.expectedEligibleIssuers>3500||!Array.isArray(source.members)||
  source.members.length>25000)
  throw Error('R57_ISSUER_MEMBERSHIP_NOT_APPROVED');
 const memberSet=new Set(),issuerSet=new Set(),members=[];
 for(const row of source.members){
  const ticker=row?.ticker;
  if(typeof ticker!=='string'||!TICKER.test(ticker)||memberSet.has(ticker)||
   typeof row.eligible!=='boolean')
   throw Error('R57_ISSUER_MEMBER_INVALID');
  memberSet.add(ticker);
  let issuer;
  try{issuer=r43IssuerKey(ticker,row.issuerId??null);}
  catch{throw Error('R57_ISSUER_MEMBER_INVALID');}
  if(row.eligible)issuerSet.add(issuer);
  const fundamentals=['dividendYield','eps','epsGrowthPct'];
  if(fundamentals.some(key=>row[key]!==undefined&&row[key]!==null)&&source.fundamentalsVerified!==true)
   throw Error('R57_FUNDAMENTALS_UNVERIFIED');
  if(fundamentals.some(key=>row[key]!==undefined&&row[key]!==null&&!finite(row[key])))
   throw Error('R57_FUNDAMENTALS_INVALID');
  members.push(row);
 }
 if(issuerSet.size<Math.ceil(source.expectedEligibleIssuers*.98)||
  issuerSet.size>source.expectedEligibleIssuers*1.05)
  throw Error('R57_REVIEWED_UNIVERSE_SCOPE_MISMATCH');
 // Review of the tickers and jurisdiction cannot be inferred from a price file.
 return {members,expectedEligibleIssuers:source.expectedEligibleIssuers,
  reviewDate:source.reviewedAsOf};
}
function inputRows(snapshots,members,asOf){
 const today=snapshots[0],yesterday=snapshots[1];
 return members.map(member=>{
  const ticker=member.ticker,c=today.get(ticker),p=yesterday.get(ticker);
  const previous=snapshots.slice(1).map(day=>day.get(ticker));
  const mean=previous.length===20&&previous.every(v=>v&&Number.isSafeInteger(v.volume)&&v.volume>=0)?
   previous.reduce((sum,v)=>sum+v.volume,0)/20:null;
  return {
   ticker,issuerId:member.issuerId??null,eligible:member.eligible,tradeDate:asOf,
   price:c?.close??null,volume:c?.volume??null,
   relativeVolume:c&&mean>0?c.volume/mean:null,
   dailyChangePct:c&&p&&p.close>0?(c.close/p.close-1)*100:null,
   dividendYield:member.dividendYield??null,eps:member.eps??null,
   epsGrowthPct:member.epsGrowthPct??null,
  };
 });
}

function optionalFieldCoverage(rows){
 const eligible=rows.filter(row=>row.eligible===true);
 const of=predicate=>{
  const observed=eligible.filter(predicate).length;
  return {observed,eligibleTickers:eligible.length,
   fraction:eligible.length?observed/eligible.length:0};
 };
 return {
  dividendYield:of(row=>finite(row.dividendYield)),
  positiveEps:of(row=>finite(row.eps)&&row.eps>0),
  epsGrowthPct:of(row=>finite(row.epsGrowthPct)),
 };
}

export function buildR57R43Shadow({
 base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),
 now=Date.now(),membershipName=R57_REVIEWED_UNIVERSE,
}={}){
 const result={method:R57_METHOD,scorer:R43_METHOD,
  status:'BLOCKED',reason:null,asOf:null,historyDays:0,
  eligibleIssuers:0,topCount:0,...noWrite()};
 if(typeof base!=='string'||!path.isAbsolute(base)||!fs.existsSync(base)){
  result.reason='R57_PC_HOME_NOT_PRESENT';return result;
 }
 const dir=path.join(base,DAILY);
 if(!fs.existsSync(dir)){result.reason='R57_R45_SNAPSHOTS_NOT_PRESENT';return result;}
 try{
  if(!fs.lstatSync(dir).isDirectory())throw Error('R57_R45_DIRECTORY_INVALID');
  const available=fs.readdirSync(dir).map(name=>name.match(DAY_RE)?.[1]??null)
   .filter(validDay).sort().reverse();
  result.historyDays=available.length;
  if(available.length<DAYS){result.reason='R57_R45_20_PRIOR_SESSIONS_MISSING';return result;}
  const selected=available.slice(0,DAYS),asOf=selected[0];
  result.asOf=asOf;
  const age=now-Date.parse(asOf+'T00:00:00Z');
  if(!Number.isFinite(now)||age>7*86400000||age< -86400000){
   result.reason='R57_R45_LATEST_SESSION_STALE_OR_FUTURE';return result;
  }
  if(Date.parse(asOf+'T00:00:00Z')-Date.parse(selected[DAYS-1]+'T00:00:00Z')>60*86400000){
   result.reason='R57_R45_HISTORY_GAP_TOO_LARGE';return result;
  }
  const membershipPath=path.join(base,membershipName);
  if(membershipName!==R57_REVIEWED_UNIVERSE||
   !fs.existsSync(membershipPath)){
   result.reason='R57_REVIEWED_ISSUER_MEMBERSHIP_MISSING';return result;
  }
  const {members,expectedEligibleIssuers}=reviewedMembers(membershipPath,asOf);
  const snapshots=selected.map(date=>readDay(dir,date));
  const rows=inputRows(snapshots,members,asOf);
  const rank=rankR43Issuers(rows,{asOf,expectedEligibleIssuers});
  result.optionalFieldCoverage=optionalFieldCoverage(rows);
  result.eligibleIssuers=rank.coverage?.eligibleIssuers??0;
  result.coverage=rank.coverage;
  if(rank.status!=='READY_SHADOW'){
   result.reason=rank.reason;return result;
  }
  if(!r43ImportanceIndex(rank,{now})){
   result.reason='R57_R43_SHADOW_INTEGRITY_INVALID';return result;
  }
  result.status='READY_SHADOW';
  result.topCount=rank.topCount;
  // In-memory only. Do not write the existing production-readable R43 file.
  result.rankings=rank.rankings;
  return result;
 }catch(error){
  result.reason=/^R57_[A-Z0-9_]+$/.test(error?.message??'')?
   error.message:'R57_PRIVATE_INPUT_READ_FAILED';
  return result;
 }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const r=buildR57R43Shadow();
 const {rankings,...summary}=r;
 console.log(JSON.stringify(summary));
 if(r.status!=='READY_SHADOW')process.exitCode=2;
}
