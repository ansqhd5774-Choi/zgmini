// ZGMINI R9 — archived successful PC CNN feed checks, not new CNN observations.
// Reads verified stored output; never calls CNN or reclassifies its sourceObservedAt.
export const CHECK_KEY='fear-greed-verified-checks';
export const CHECK_VERSION='CNN_VERIFIED_CHECKS_R1';
const FIFTEEN=15*60000;
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const finiteScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const exactIso=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&new Date(Date.parse(s)).toISOString()===s;
const get=(db,sql,params=[])=>db.prepare(sql).get(...params)??null;
const all=(db,sql,params=[])=>db.prepare(sql).all(...params);
const safeAt=t=>Number.isSafeInteger(t)&&t>0;
const iso=t=>new Date(t).toISOString();
export function validatedCheck(body,storedAt,now=Date.now()){
 if(body?.status!=='verified'||!finiteScore(body?.score)||!safeAt(storedAt)||storedAt>now+300000||now-storedAt>45*60000)return null;
 const sourceTime=Date.parse(body?.observedAt??'');
 if(!Number.isFinite(sourceTime)||sourceTime>storedAt+300000)return null;
 return {checkedAt:iso(storedAt),sourceObservedAt:iso(sourceTime),score:body.score,sourceStoredAt:storedAt};
}
export function mergeCheckDay(previous,date,sample){
 if(!DAY.test(date)||sample?.checkedAt?.slice(0,10)!==date||!exactIso(sample.checkedAt)||!exactIso(sample.sourceObservedAt)||!finiteScore(sample.score)||!safeAt(sample.sourceStoredAt)||Date.parse(sample.checkedAt)!==sample.sourceStoredAt)throw Error('CNN_R9_CHECK_INVALID');
 if(previous&&(previous.version!==CHECK_VERSION||previous.date!==date||!Array.isArray(previous.checks)))throw Error('CNN_R9_DAY_INVALID');
 const checks=previous?.checks??[];
 for(const entry of checks){
  if(!exactIso(entry.checkedAt)||!exactIso(entry.sourceObservedAt)||!finiteScore(entry.score)||!safeAt(entry.sourceStoredAt)||Date.parse(entry.checkedAt)!==entry.sourceStoredAt||entry.checkedAt.slice(0,10)!==date)throw Error('CNN_R9_PREVIOUS_INVALID');
 }
 if(checks.length>96)throw Error('CNN_R9_DAY_CAP');
 const last=checks.at(-1),delta=last?sample.sourceStoredAt-last.sourceStoredAt:Infinity;
 if(last&&delta<=0)return {changed:false,reason:'UNCHANGED_OR_OLDER_STORED_SNAPSHOT',body:previous};
 if(last&&delta<FIFTEEN)return {changed:false,reason:'BELOW_APPROVED_15M_CADENCE',body:previous};
 if(checks.length>=96)throw Error('CNN_R9_DAY_CAP');
 return {changed:true,reason:null,body:{version:CHECK_VERSION,date,checks:[...checks,sample]}};
}
export function captureVerifiedCheck(db,cnnRow,now=Date.now(),{dryRun=false}={}){
 if(!cnnRow)return {status:'NO_CURRENT'};
 let source;
 try{source=JSON.parse(cnnRow.body)}catch{return {status:'INVALID_CURRENT'}}
 const sample=validatedCheck(source,cnnRow.stored_at,now);
 if(!sample)return {status:'NO_FRESH_VERIFIED_SNAPSHOT'};
 const date=sample.checkedAt.slice(0,10);
 const row=get(db,"SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key=?",[CHECK_KEY,date]);
 const prior=row?JSON.parse(row.body):null;
 const merged=mergeCheckDay(prior,date,sample);
 if(!merged.changed)return {status:'UNCHANGED',reason:merged.reason,date,points:prior.checks.length,checkedAt:sample.checkedAt};
 if(dryRun)return {status:'DRY_RUN',date,points:merged.body.checks.length,checkedAt:sample.checkedAt};
 const encoded=JSON.stringify(merged.body);
 if(Buffer.byteLength(encoded)>1800000)throw Error('CNN_R9_DAY_SIZE_LIMIT');
 db.prepare("INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,?,?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at")
   .run(CHECK_KEY,date,encoded,sample.sourceStoredAt);
 const checked=get(db,"SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key=?",[CHECK_KEY,date]);
 if(checked?.body!==encoded||checked.stored_at!==sample.sourceStoredAt)throw Error('CNN_R9_LOCAL_READBACK_FAILED');
 return {status:'LOCAL_STORED',date,points:merged.body.checks.length,checkedAt:sample.checkedAt};
}
export async function publishVerifiedChecks(db,remote,coreDb,{maxDaysPerRun=24}={}){
 const rows=all(db,"SELECT snapshot_key,body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? ORDER BY snapshot_key ASC",[CHECK_KEY]);
 if(!rows.length)return {status:'PENDING',publishedDays:0,totalDays:0};
 const current=(await remote.query(coreDb,"SELECT stored_at,body FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key='fear-greed' AND snapshot_key='current'")).results?.[0];
 if(!safeAt(current?.stored_at))return {status:'WAIT_CURRENT_FEED_PUBLICATION',publishedDays:0,totalDays:rows.length};
 const prev=(await remote.query(coreDb,"SELECT snapshot_key,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=?",[CHECK_KEY])).results??[];
 const saved=new Map(prev.map(row=>[row.snapshot_key,row.stored_at]));
 const pending=rows.filter(row=>row.stored_at<=current.stored_at&&(!saved.has(row.snapshot_key)||saved.get(row.snapshot_key)<row.stored_at));
 let published=0;
 for(const row of pending.slice(0,maxDaysPerRun)){
  const body=JSON.parse(row.body),last=body?.checks?.at(-1);
  if(body?.version!==CHECK_VERSION||body?.date!==row.snapshot_key||!DAY.test(row.snapshot_key)||!Array.isArray(body.checks)||!last||last.sourceStoredAt!==row.stored_at)throw Error('CNN_R9_LOCAL_PUBLISH_INVALID');
  let error;
  try{await remote.request(coreDb,[{sql:"INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,?,?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at",params:[CHECK_KEY,row.snapshot_key,row.body,row.stored_at]}]);}catch(e){error=e}
  const checked=(await remote.query(coreDb,"SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key=?",[CHECK_KEY,row.snapshot_key])).results?.[0];
  if(checked?.body!==row.body||checked.stored_at!==row.stored_at)throw error??Error('CNN_R9_D1_READBACK_FAILED');
  published++;
 }
 return {status:pending.length>published?'BACKLOG':'VERIFIED',publishedDays:published,totalDays:rows.length};
}
