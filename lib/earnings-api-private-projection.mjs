// R30: read-only projection of R29 PC SQLite inputs. No HTTP, D1 output,
// public calendar promotion, confirmation inference, or extra DB schema.
import {earningsApiNewYorkDay,earningsApiWindow,parseEarningsApiDay,
 EARNINGS_API_ENDPOINT} from './earnings-api-calendar.mjs';

export const EARNINGS_API_R30_PRIVATE_KEY='release-calendar:earnings-api:private-events';
export const EARNINGS_API_R30_PRIORITY_TICKERS=Object.freeze([
 'NVDA','AAPL','MSFT','GOOG','GOOGL','AMZN','META','TSLA','AVGO',
]);
const priority=new Set(EARNINGS_API_R30_PRIORITY_TICKERS);

const fail=code=>{throw Error(code);};
const validIso=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&
 new Date(s).toISOString()===s;

export async function readEarningsApiPrivateProjection({store,sourceState,
 feedKey='release-calendar',now=Date.now()}={}){
 if(!store||typeof store.readInput!=='function')fail('R30_PRIVATE_STORE_REQUIRED');
 if(!Number.isFinite(now))fail('R30_TIME_INVALID');
 if(sourceState?.status!=='READY'||sourceState.publicationStatus!=='HELD_UNCONFIRMED')
  fail('R30_SOURCE_NOT_READY');
 const days=earningsApiWindow(now);
 if(sourceState.attemptedNyDay!==earningsApiNewYorkDay(now)||
  !Array.isArray(sourceState.coveredDays)||sourceState.coveredDays.length!==days.length||
  days.some((day,i)=>day!==sourceState.coveredDays[i])||!validIso(sourceState.checkedAt))
  fail('R30_SOURCE_COVERAGE_INVALID');
 if(!Number.isSafeInteger(sourceState.recordCount)||sourceState.recordCount<0)
  fail('R30_SOURCE_COUNT_INVALID');

 const events=[],seen=new Set();
 for(const day of days){
  const row=await store.readInput(`${feedKey}:earnings-api:${day}`);
  if(row?.body?.requestedDate!==day||row.body.sourceUrl!==EARNINGS_API_ENDPOINT||
   typeof row.body.text!=='string')fail('R30_INPUT_MISSING_OR_INVALID');
  const entries=parseEarningsApiDay(row.body.text,day);
  for(const item of entries){
   // A complete current-window snapshot replaces the previous one atomically;
   // date corrections drop obsolete date-scoped IDs with the prior snapshot.
   const id=`earnings-vendor-${item.ticker.toLowerCase()}-${day}`;
   if(seen.has(id))fail('R30_DUPLICATE_EVENT');
   seen.add(id);
   events.push({id,date:item.date,ticker:item.ticker,company:item.company,
    marketSession:item.marketSession,kind:'earnings',country:'US',
    priority:priority.has(item.ticker),verification:'VENDOR_UNVERIFIED',
    dateBasis:'America/New_York',time:null,source:'earnings-api',
    sourceUrl:item.sourceUrl});
   if(events.length>50000)fail('R30_PRIVATE_EVENT_LIMIT');
  }
 }
 if(events.length!==sourceState.recordCount)fail('R30_SOURCE_COUNT_MISMATCH');
 events.sort((a,b)=>a.date.localeCompare(b.date)||Number(b.priority)-Number(a.priority)||
  a.ticker.localeCompare(b.ticker));
 return {status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,
  redistribution:false,publicationStatus:'HELD_UNCONFIRMED',
  source:'earnings-api',sourceUrl:EARNINGS_API_ENDPOINT,
  checkedAt:sourceState.checkedAt,attemptedNyDay:sourceState.attemptedNyDay,
  coveredDays:days,recordCount:events.length,
  priorityCount:events.filter(event=>event.priority).length,events};
}
