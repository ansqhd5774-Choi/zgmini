// ER1 derived-score vintages only. Reuses the existing public snapshot table;
// never transfers EarningsAPI inputs, raw EPS/revenue, or local history tables.
import {isER1MonthlyFeedKey} from './independent-publication.mjs';
import {validateER1PublicDisplay} from '../../lib/market-calendar-er1-public-display.mjs';

const DATE=/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const validStamp=value=>Number.isSafeInteger(value)&&value>0;

export async function publishER1MonthlyVintages(local,remote,db,feedKey,{maxDaysPerRun=24,current=null}={}){
 if(!isER1MonthlyFeedKey(feedKey)||!Number.isInteger(maxDaysPerRun)||
  maxDaysPerRun<1||maxDaysPerRun>48)throw Error('ER1_VINTAGE_CONFIG_INVALID');
 // 97 is a sentinel to fail closed if the bounded month archive is unexpectedly
 // large. The required older snapshots must never be silently omitted.
 const rows=(await local.prepare("SELECT snapshot_key,body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key GLOB '????-??-??' ORDER BY stored_at DESC LIMIT 97")
  .bind(feedKey).all()).results??[];
 if(rows.length>96)throw Error('ER1_VINTAGE_LOCAL_BOUND_STOP');
 const byDay=new Map();
 for(const row of rows){
  if(typeof row.body!=='string'||!validStamp(row.stored_at))
   throw Error('ER1_VINTAGE_LOCAL_INVALID');
  let body;try{body=JSON.parse(row.body);}catch{throw Error('ER1_VINTAGE_LOCAL_INVALID');}
  // Older local releases used UTC snapshot keys, so accept a legacy row on
  // the next UTC date, but always publish under its true NY observation day.
  if(!DATE.test(row.snapshot_key)||!validateER1PublicDisplay(body,{now:row.stored_at})||
   ![body.asOf,new Date(Date.parse(body.asOf+'T00:00:00Z')+86400000).toISOString().slice(0,10)].includes(row.snapshot_key))
   throw Error('ER1_VINTAGE_LOCAL_INVALID');
  const prior=byDay.get(body.asOf);
  if(prior&&prior.stored_at===row.stored_at&&prior.body!==row.body)
   throw Error('ER1_VINTAGE_LOCAL_CONFLICT');
  if(!prior||prior.stored_at<row.stored_at)byDay.set(body.asOf,{...row,snapshot_key:body.asOf});
 }
 const archived=[...byDay.values()].sort((a,b)=>a.snapshot_key.localeCompare(b.snapshot_key));
 if(!archived.length)throw Error('ER1_VINTAGE_LOCAL_MISSING');
 if(current){
  let body;try{body=JSON.parse(current.body);}catch{throw Error('ER1_VINTAGE_CURRENT_UNARCHIVED');}
  const saved=byDay.get(body?.asOf);
  if(!saved||saved.stored_at!==current.stored_at||saved.body!==current.body)
   throw Error('ER1_VINTAGE_CURRENT_UNARCHIVED');
 }
 const existing=(await remote.query(db,"SELECT snapshot_key,body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key GLOB '????-??-??' ORDER BY snapshot_key DESC LIMIT 97",[feedKey])).results??[];
 if(existing.length>96)throw Error('ER1_VINTAGE_REMOTE_BOUND_STOP');
 const remoteDays=new Map(existing.map(row=>[row.snapshot_key,row]));
 const pending=[];
 for(const row of archived){
  const previous=remoteDays.get(row.snapshot_key);
  if(previous?.stored_at>=row.stored_at){
   let body;try{body=JSON.parse(previous.body);}catch{throw Error('ER1_VINTAGE_REMOTE_INVALID');}
   if(!validStamp(previous.stored_at)||!validateER1PublicDisplay(body,{now:previous.stored_at})||
    body.asOf!==row.snapshot_key)
    throw Error('ER1_VINTAGE_REMOTE_INVALID');
   if(previous.stored_at===row.stored_at&&previous.body!==row.body)
    throw Error('ER1_VINTAGE_REMOTE_CONFLICT');
  }else pending.push(row);
 }
 let publishedDays=0;
 for(const row of pending.slice(0,maxDaysPerRun)){
  let writeError;
  try{
   await remote.request(db,[{sql:"INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,?,?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at",
    params:[feedKey,row.snapshot_key,row.body,row.stored_at]}]);
  }catch(error){writeError=error;}
  // Unknown write outcome: read the exact D1 row, never retry blindly.
  const check=(await remote.query(db,"SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key=?",[feedKey,row.snapshot_key])).results?.[0];
  if(check?.stored_at!==row.stored_at||check?.body!==row.body)
   throw writeError??Error('ER1_VINTAGE_READBACK_MISMATCH');
  publishedDays++;
 }
 return {status:publishedDays<pending.length?'BACKLOG':'VERIFIED',
  storedDays:archived.length,publishedDays,deferredDays:pending.length-publishedDays};
}
