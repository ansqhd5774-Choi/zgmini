// Public derived R44 importance ONLY. No CSV, USD values, earnings raw
// payload, private company profiles, or machine-readable proprietary feed.
import {DELTASCREENER_AS_OF,DELTASCREENER_CREDIT_URL} from './market-calendar-deltascreener-snapshot.mjs';
export const DELTA_R44_OUTPUT_KEY='market-calendar:earnings-marketcap-r44-2026-11-public';
export const DELTA_R44_LEGACY_METHOD='R44_MARKETCAP_USD_200B_20B_DELTA_20261103';
export const DELTA_R44_METHOD='R44_MARKETCAP_USD_50B_20B_DELTA_20261103';
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const fail=code=>{throw Error(code)};
export function validateDeltaR44Public(s){
 if(s?.status!=='READY_R44_PUBLIC'||
    ![DELTA_R44_METHOD,DELTA_R44_LEGACY_METHOD].includes(s.method)||
    s.month!=='2026-11'||s.sourceAsOf!==DELTASCREENER_AS_OF||
    s.creditUrl!==DELTASCREENER_CREDIT_URL||
    !Number.isSafeInteger(s.calendarTickerCount)||s.calendarTickerCount<1||
    s.calendarTickerCount>10000||
    !Number.isSafeInteger(s.coveredTickerCount)||s.coveredTickerCount<1||
    s.coveredTickerCount>s.calendarTickerCount||
    !s.counts||Object.keys(s.counts).sort().join(',')!=='conflicting,missing,one,three,two'||
    Object.values(s.counts).some(x=>!Number.isSafeInteger(x)||x<0)||
    s.counts.one+s.counts.two+s.counts.three!==s.coveredTickerCount||
    s.coveredTickerCount+s.counts.missing+s.counts.conflicting!==s.calendarTickerCount||
    !s.grades||Array.isArray(s.grades)||typeof s.grades!=='object'||
    Object.keys(s.grades).length!==s.calendarTickerCount||
    Object.entries(s.grades).some(([ticker,grade])=>!TICKER.test(ticker)||
      ![null,1,2,3].includes(grade))||
    Object.keys(s).some(x=>!['status','method','month','sourceAsOf','creditUrl',
     'calendarTickerCount','coveredTickerCount','counts','grades'].includes(x)))
  return null;
 let count={one:0,two:0,three:0,missing:0};
 for(const grade of Object.values(s.grades))
  count[grade===null?'missing':grade===1?'one':grade===2?'two':'three']++;
 if(count.one!==s.counts.one||count.two!==s.counts.two||
    count.three!==s.counts.three||
    count.missing!==s.counts.missing+s.counts.conflicting)return null;
 return {method:s.method,month:s.month,sourceAsOf:s.sourceAsOf,
  creditUrl:s.creditUrl,grades:s.grades};
}
export function makeDeltaR44Public(result){
 const body={status:'READY_R44_PUBLIC',method:DELTA_R44_METHOD,month:'2026-11',
  sourceAsOf:DELTASCREENER_AS_OF,creditUrl:DELTASCREENER_CREDIT_URL,
  calendarTickerCount:result.calendarTickerCount,
  coveredTickerCount:result.coveredTickerCount,counts:result.counts,grades:result.grades};
 if(!validateDeltaR44Public(body))fail('DELTA_PUBLIC_CONTRACT_INVALID');
 return body;
}
