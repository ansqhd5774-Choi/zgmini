// ER1 derived scores only. Raw EarningsAPI EPS/revenue and the private source
// rows are never written to the public display snapshot.
import {ER1_METHOD,ER1_STAR3_THRESHOLD} from './market-calendar-er1-earnings-score.mjs';

export const ER1_EARNINGS_DISPLAY_PUBLIC_KEY='market-calendar:earnings-er1-score-public';
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const DAY=/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const validDay=value=>typeof value==='string'&&DAY.test(value)&&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;

export function validateER1PublicDisplay(snapshot){
 if(snapshot?.status!=='READY_ER1_PUBLIC'||snapshot.method!==ER1_METHOD||
  snapshot.threshold!==ER1_STAR3_THRESHOLD||!validDay(snapshot.asOf)||
  !Number.isInteger(snapshot.recordCount)||snapshot.recordCount<1||
  !Array.isArray(snapshot.scores)||snapshot.scores.length!==snapshot.recordCount||
  !Number.isInteger(snapshot.star3Count)||snapshot.star3Count<0||
  !snapshot.coverage||
  !Number.isInteger(snapshot.coverage.expectedEligibleIssuers)||
  !Number.isInteger(snapshot.coverage.reviewedEligibleIssuers)||
  !Number.isInteger(snapshot.coverage.scoreableIssuers)||
  snapshot.coverage.expectedEligibleIssuers<1||
  snapshot.coverage.reviewedEligibleIssuers>snapshot.coverage.expectedEligibleIssuers||
  snapshot.coverage.reviewedEligibleIssuers/snapshot.coverage.expectedEligibleIssuers<.98||
  snapshot.coverage.scoreableIssuers/snapshot.coverage.reviewedEligibleIssuers<.98||
  snapshot.coverage.scoreableIssuers!==snapshot.recordCount)return null;
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
 return stars===snapshot.star3Count?{index,asOf:snapshot.asOf}:null;
}

export function makeER1PublicDisplay(result){
 if(result?.status!=='READY_SHADOW'||result.method!==ER1_METHOD||
  result.threshold!==ER1_STAR3_THRESHOLD||!Array.isArray(result.rankings))
  throw Error('ER1_ONLY_VALIDATED_COMPLETE_RESULT_MAY_PUBLISH');
 const snapshot={status:'READY_ER1_PUBLIC',method:ER1_METHOD,
  asOf:result.asOf,threshold:ER1_STAR3_THRESHOLD,coverage:result.coverage,
  recordCount:result.rankings.length,star3Count:result.star3Count,
  scores:result.rankings.map(({issuerId,tickers,score})=>({issuerId,tickers,score}))};
 if(!validateER1PublicDisplay(snapshot))throw Error('ER1_PUBLIC_DISPLAY_INVALID');
 return snapshot;
}
