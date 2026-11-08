import {PUBLIC_DISPLAY_MAX_AGE_MS} from './public-display-freshness.mjs';
import {assertFeedInput,assertFeedOutput} from './public-feed-input-safety.mjs';
import {CNN_OBSERVED_ARCHIVE_KEY,mergeCnnArchivedDay,groupVerifiedCnnObservations} from '../lib/cnn-observed-archive-r1.mjs';
import {er1MonthlyPublicKey} from '../lib/market-calendar-er1-month-key.mjs';
import {validateER1PublicDisplay} from '../lib/market-calendar-er1-public-display.mjs';
// Public reads have no collector dependency and never initialize or write tables.
export const FEED_POLICY=Object.freeze({
 'fear-greed':{intervalMs:15*60000,maxAgeMs:PUBLIC_DISPLAY_MAX_AGE_MS},
 'market-data':{intervalMs:6*3600000,maxAgeMs:PUBLIC_DISPLAY_MAX_AGE_MS},
 'core-pce':{intervalMs:6*3600000,maxAgeMs:PUBLIC_DISPLAY_MAX_AGE_MS},
});
export function publicFeedStore(db){
 const read=async(kind,key)=>{
  const row=await db.prepare('SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind=? AND feed_key=? AND snapshot_key=?').bind(kind,key,'current').first();
  return row?{body:JSON.parse(row.body),storedAt:row.stored_at}:null;
 };
 const write=async(kind,key,body,now)=>{
  if(kind==='input')assertFeedInput(key,body,now);
  if(kind==='output')assertFeedOutput(key,body);
  const encoded=JSON.stringify(body);if(new TextEncoder().encode(encoded).length>1800000)throw Error('FEED_STORAGE_LIMIT');
  // ER1 monthly observations use the New York asOf day, not the UTC write day.
  // Two NY observations may occur during one UTC date; never collapse them.
  const month=/^market-calendar:earnings-er1-score-(20\d\d-\d\d)-public$/.exec(key)?.[1];
  const er1=kind==='output'&&er1MonthlyPublicKey(month)===key;
  if(er1&&!validateER1PublicDisplay(body,{now}))throw Error('ER1_MONTHLY_PUBLIC_VINTAGE_INVALID');
  const vintage=er1?body.asOf:new Date(now).toISOString().slice(0,10);
  const onConflict=er1?' WHERE excluded.stored_at>=public_feed_snapshots_v1.stored_at':'';
  const insert='INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES(?,?,?,?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at'+onConflict;
  const statements=[];
  if(er1){
   // Old UTC-keyed days can form a *chain* of one-day-shifted rows. Migrate
   // oldest-first within one batch; moving only the newest loses earlier PIT.
   const displaced=[];
   let cursor=vintage;
   while(displaced.length<96){
    const old=await db.prepare("SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key=?").bind(key,cursor).first();
    if(!old)break;
    let prior;try{prior=JSON.parse(old.body);}catch{throw Error('ER1_VINTAGE_COLLISION_INVALID');}
    if(prior?.asOf===cursor)break;
    if(!validateER1PublicDisplay(prior,{now:old.stored_at}))
     throw Error('ER1_VINTAGE_COLLISION_INVALID');
    const next=new Date(Date.parse(prior.asOf+'T00:00:00Z')+86400000).toISOString().slice(0,10);
    if(next!==cursor)throw Error('ER1_VINTAGE_COLLISION_INVALID');
    displaced.push({snapshot:prior.asOf,body:old.body,storedAt:old.stored_at});
    cursor=prior.asOf;
   }
   if(displaced.length===96)throw Error('ER1_VINTAGE_COLLISION_BOUND_STOP');
   for(const old of displaced.reverse())
    statements.push(db.prepare(insert).bind(kind,key,old.snapshot,old.body,old.storedAt));
  }
  statements.push(...[vintage,'current'].map(snapshot=>db.prepare(insert).bind(kind,key,snapshot,encoded,now)));
  await db.batch(statements);
 };
 return {
  async initialize(){await db.prepare('CREATE TABLE IF NOT EXISTS public_feed_snapshots_v1(kind TEXT NOT NULL,feed_key TEXT NOT NULL,snapshot_key TEXT NOT NULL,body TEXT NOT NULL,stored_at INTEGER NOT NULL,PRIMARY KEY(kind,feed_key,snapshot_key))').run()},
  readInput:key=>read('input',key), readOutput:key=>read('output',key),
  // Fixed feed_key supplied by the stored calendar projection, never by GET
  // parameters. Date rows contain only sanitized public derived scores.
  async readOutputVintages(key,{days=[],limit=80}={}){
   if(!Number.isInteger(limit)||limit<1||limit>80)throw Error('FEED_VINTAGE_LIMIT_INVALID');
   if(!Array.isArray(days)||days.length<1||days.length>40||
    days.some(day=>typeof day!=='string'||!/^20\d\d-\d\d-\d\d$/.test(day)||
     !Number.isFinite(Date.parse(day+'T00:00:00Z'))||
     new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day))
    throw Error('FEED_VINTAGE_DAYS_INVALID');
   const unique=[...new Set(days)];
   // Two indexed lookups per actual event day: the nearest NY observation
   // on/before the date (forecast) and strictly before it (actual-only).
   // DISTINCT keys avoid fetching every full monthly JSON on every visitor GET.
   const values=unique.map(()=>'(?)').join(',');
   const sql=`WITH visible_days(day) AS (VALUES ${values}), vintage_keys(snapshot_key) AS (
    SELECT (SELECT MAX(snapshot_key) FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key GLOB '????-??-??' AND snapshot_key<=day) FROM visible_days
    UNION
    SELECT (SELECT MAX(snapshot_key) FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key GLOB '????-??-??' AND snapshot_key<day) FROM visible_days
   ) SELECT body,stored_at,snapshot_key FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=?
    AND snapshot_key IN (SELECT snapshot_key FROM vintage_keys WHERE snapshot_key IS NOT NULL)
    ORDER BY snapshot_key DESC LIMIT ?`;
   const rows=(await db.prepare(sql).bind(...unique,key,key,key,limit).all()).results??[];
   return rows.map(row=>({body:JSON.parse(row.body),storedAt:row.stored_at,snapshotKey:row.snapshot_key}));
  },
  readAttempt:key=>read('attempt',key),writeAttempt:(key,now)=>write('attempt',key,{status:'ATTEMPTED'},now),
  writeInput:(key,body,now)=>write('input',key,body,now),writeOutput:(key,body,now)=>write('output',key,body,now),
  // Uses the already-existing table in PC core.sqlite; no new DB schema or
  // additional provider request. Only observed public scores enter this lane.
  async appendVerifiedObservations(body,now){
   const groups=groupVerifiedCnnObservations(body,now);
   let appended=0;
   for(const [date,points] of groups){
    const row=await db.prepare("SELECT body FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key=?")
      .bind(CNN_OBSERVED_ARCHIVE_KEY,date).first();
    const merged=mergeCnnArchivedDay(row?JSON.parse(row.body):null,date,points,now);
    if(!merged.changed)continue;
    const encoded=JSON.stringify(merged.body);
    if(new TextEncoder().encode(encoded).length>1800000)throw Error('CNN_ARCHIVE_STORAGE_LIMIT');
    await db.prepare("INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,?,?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>=public_feed_snapshots_v1.stored_at")
      .bind(CNN_OBSERVED_ARCHIVE_KEY,date,encoded,now).run();
    appended+=1;
   }
   return {updatedDays:appended};
  },
 };
}
export async function readPublicFeedHealth(db){
 const store=publicFeedStore(db),feeds=[];
 for(const key of Object.keys(FEED_POLICY)){
  let row;try{row=await store.readOutput(key)}catch{}
  feeds.push({key,storedAt:row?new Date(row.storedAt).toISOString():null,status:!row?'PENDING':Date.now()-row.storedAt>=FEED_POLICY[key].maxAgeMs?'STALE':'STORED'});
 }
 return Response.json({status:feeds.every(x=>x.status==='STORED')?'STORED':'PARTIAL',providerCalls:0,feeds},{headers:{'cache-control':'no-store','x-data-source':'STORED'}});
}
export async function savedJson(response,store,key,now){
 const data=await response.json();await store.writeInput(key,data,now);
 const saved=await store.readInput(key);if(!saved||saved.storedAt!==now)throw Error('INPUT_READBACK_FAILED');return saved.body;
}
export async function readPublicFeed(db,key,{now=Date.now(),store}={}){
 const headers={'cache-control':'no-store','x-data-source':'STORED','x-robots-tag':'noindex','x-content-type-options':'nosniff'};
 let row;try{row=await(store??publicFeedStore(db)).readOutput(key)}catch{}
 if(!FEED_POLICY[key]||!row||row.storedAt>now||now-row.storedAt>=FEED_POLICY[key].maxAgeMs){
  return Response.json({status:'unavailable',reason:row?'STORED_DATA_STALE':'STORED_DATA_PENDING',score:null,rows:[],actual:[],indicators:{},summary:[]},{status:503,headers});
 }
 return Response.json(row.body,{headers:{...headers,'cache-control':'public, max-age=60, must-revalidate','x-data-snapshot-at':new Date(row.storedAt).toISOString()}});
}
