// ER1 derived scores only. Raw EarningsAPI EPS/revenue and the private source
// rows are never written to the public display snapshot.
import {ER1_METHOD,ER1_STAR3_THRESHOLD} from './market-calendar-er1-earnings-score.mjs';
import {FORECAST_METHOD,FORECAST_STAR3_THRESHOLD} from './market-calendar-er1-forecast-score.mjs';

export const ER1_EARNINGS_DISPLAY_PUBLIC_KEY='market-calendar:earnings-er1-score-public';
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const DAY=/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const validDay=value=>typeof value==='string'&&DAY.test(value)&&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;
const PUBLIC_FIELDS=new Set(['status','method','asOf','threshold','coverage',
 'recordCount','star3Count','scores']);
const COVERAGE_FIELDS=new Set(['inputSymbols','observedIssuers',
 'scoreableIssuers','unscoreableReasons']);
const supportedMethod=method=>method===ER1_METHOD||method===FORECAST_METHOD;
if(FORECAST_STAR3_THRESHOLD!==ER1_STAR3_THRESHOLD)
 throw Error('ER1_FORECAST_THRESHOLD_MISMATCH');

export function validateER1PublicDisplay(snapshot,{now=Date.now()}={}){
 const age=Date.parse(`${snapshot?.asOf}T00:00:00Z`);
 if(snapshot?.status!=='READY_ER1_PUBLIC'||!supportedMethod(snapshot.method)||
  snapshot.threshold!==ER1_STAR3_THRESHOLD||!validDay(snapshot.asOf)||
  !finite(now)||!Number.isFinite(age)||age>now||now-age>366*86400000||
  Object.keys(snapshot).some(key=>!PUBLIC_FIELDS.has(key))||
  !Number.isInteger(snapshot.recordCount)||snapshot.recordCount<1||
  !Array.isArray(snapshot.scores)||snapshot.scores.length!==snapshot.recordCount||
  !Number.isInteger(snapshot.star3Count)||snapshot.star3Count<0||
  !snapshot.coverage||
  Object.keys(snapshot.coverage).some(key=>!COVERAGE_FIELDS.has(key))||
  !Number.isInteger(snapshot.coverage.inputSymbols)||
  !Number.isInteger(snapshot.coverage.observedIssuers)||
  !Number.isInteger(snapshot.coverage.scoreableIssuers)||
  snapshot.coverage.inputSymbols<1||
  snapshot.coverage.observedIssuers<1||
  snapshot.coverage.observedIssuers>snapshot.coverage.inputSymbols||
  snapshot.coverage.scoreableIssuers<1||
  snapshot.coverage.scoreableIssuers>snapshot.coverage.observedIssuers||
  snapshot.coverage.scoreableIssuers!==snapshot.recordCount)return null;
 if(!snapshot.coverage.unscoreableReasons||
  Object.entries(snapshot.coverage.unscoreableReasons).some(([reason,count])=>
   !/^ER1_[A-Z0-9_]+$/.test(reason)||!Number.isInteger(count)||count<1)||
  Object.values(snapshot.coverage.unscoreableReasons).reduce((sum,n)=>sum+n,0)!==
    snapshot.coverage.observedIssuers-snapshot.coverage.scoreableIssuers)return null;
 const index=new Map(),issuers=new Set();let stars=0;
 for(const row of snapshot.scores){
  if(!row||typeof row.issuerId!=='string'||!row.issuerId||
   issuers.has(row.issuerId)||!finite(row.score)||row.score<0||row.score>100||
   !Array.isArray(row.tickers)||!row.tickers.length||
   Object.keys(row).some(key=>!['issuerId','tickers','score'].includes(key)))return null;
  issuers.add(row.issuerId);
  if(row.score>=ER1_STAR3_THRESHOLD)stars++;
  for(const ticker of row.tickers){
   if(typeof ticker!=='string'||!TICKER.test(ticker)||index.has(ticker))return null;
   index.set(ticker,row.score);
  }
 }
 return stars===snapshot.star3Count?{index,asOf:snapshot.asOf,method:snapshot.method}:null;
}

export function makeER1PublicDisplay(result){
 if(result?.status!=='READY_SHADOW'||!supportedMethod(result.method)||
  result.threshold!==ER1_STAR3_THRESHOLD||!Array.isArray(result.rankings))
  throw Error('ER1_ONLY_VALIDATED_COMPLETE_RESULT_MAY_PUBLISH');
 // The forecast calculation has internal basis/status fields. The public
 // contract deliberately retains only aggregated counts and derived scores.
 const coverage=Object.fromEntries([...COVERAGE_FIELDS]
  .map(key=>[key,result.coverage?.[key]]));
 const snapshot={status:'READY_ER1_PUBLIC',method:result.method,
  asOf:result.asOf,threshold:ER1_STAR3_THRESHOLD,coverage,
  recordCount:result.rankings.length,star3Count:result.star3Count,
  scores:result.rankings.map(({issuerId,tickers,score})=>({issuerId,tickers,score}))};
 if(!validateER1PublicDisplay(snapshot))throw Error('ER1_PUBLIC_DISPLAY_INVALID');
 return snapshot;
}
