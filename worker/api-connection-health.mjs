// Public, stored-only representation of observed external-provider requests.
// Unlike /api/collection-health this is NOT a collection-job inventory.
export const API_CONNECTION_HEALTH_KEY='api-connection-health';
export const API_CONNECTION_SNAPSHOT_MAX_AGE_MS=2*60*60*1000;
const WINDOW_MS=14*24*60*60*1000;
const HOST=/^(?=.{4,180}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;
const PUBLIC_HOST=host=>HOST.test(host)&&!/(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)&&!/^\d+(?:\.\d+){3}$/.test(host);
const time=(x,now)=>Number.isSafeInteger(x)&&x>0&&x<=now+60_000?x:null;
const nonnegative=x=>Number.isSafeInteger(x)&&x>=0;
const UNKNOWN={status:'unknown',scope:'external-provider-hosts',coverage:'UNVERIFIED',normal:null,failed:null,unknown:null,total:null,items:[]};

export function summarizeApiConnectionHealth(snapshot,now=Date.now()){
 if(!Number.isFinite(now)||snapshot?.version!==1||snapshot.scope!=='external-provider-hosts'||
   snapshot.source!=='PC_COLLECTION_EVENTS_FETCH_WRAPPER'||snapshot.coverage!=='PARTIAL'||
   !Array.isArray(snapshot.items)||snapshot.items.length>128||
   !Number.isFinite(Date.parse(snapshot.observedAt??'')))return {...UNKNOWN,reason:'SOURCE_UNAVAILABLE'};
 const captured=Date.parse(snapshot.observedAt);
 if(captured>now+60_000||now-captured>API_CONNECTION_SNAPSHOT_MAX_AGE_MS)
  return {...UNKNOWN,checkedAt:snapshot.observedAt,reason:'SOURCE_STALE'};
 const seen=new Set(),items=[];
 for(const raw of snapshot.items){
  if(typeof raw?.host!=='string'||!PUBLIC_HOST(raw.host)||seen.has(raw.host)||
    !nonnegative(raw.requests)||!nonnegative(raw.observedDays)||raw.observedDays>15||
    !['success','failure','mixed','unknown'].includes(raw.lastOutcome)||
    (raw.lastAttemptAt!==null&&!time(raw.lastAttemptAt,now))||
    (raw.lastSuccessAt!==null&&!time(raw.lastSuccessAt,now))||
    (raw.expectedIntervalMs!==null&&(!nonnegative(raw.expectedIntervalMs)||raw.expectedIntervalMs<5*60_000||raw.expectedIntervalMs>48*3600_000))){
   return {...UNKNOWN,checkedAt:snapshot.observedAt,reason:'INVALID_OBSERVATION'};
  }
  seen.add(raw.host);
  const repeated=raw.observedDays>=2&&raw.requests>=2;
  const age=raw.lastAttemptAt===null?Infinity:now-raw.lastAttemptAt;
  // Three isolated collection days can include an intraday burst; the median
  // of that burst is not reliable evidence of an hourly recurring schedule.
  const cadenceSupported=raw.observedDays>=7&&raw.expectedIntervalMs!==null;
  const overdue=repeated&&cadenceSupported&&age>Math.max(30*60_000,Math.round(raw.expectedIntervalMs*2.5));
  const lastFailure=raw.lastOutcome==='failure'||raw.lastOutcome==='mixed';
  const tooOldWithoutCadence=repeated&&!cadenceSupported&&age>36*3600_000;
  const state=!repeated?'unknown':overdue?'stale':tooOldWithoutCadence?'unknown':lastFailure?'failed':raw.lastOutcome==='success'?'normal':'unknown';
  items.push({host:raw.host,requests:raw.requests,observedDays:raw.observedDays,
    repeated,lastAttemptAt:raw.lastAttemptAt,lastSuccessAt:raw.lastSuccessAt,
    lastOutcome:raw.lastOutcome,expectedIntervalMs:raw.expectedIntervalMs,state});
 }
 const monitored=items.filter(x=>x.repeated);
 const normal=monitored.filter(x=>x.state==='normal').length;
 const failed=monitored.filter(x=>x.state==='failed'||x.state==='stale').length;
 const unknown=monitored.length-normal-failed;
 return {version:1,scope:'external-provider-hosts',coverage:'PARTIAL',checkedAt:snapshot.observedAt,
  status:!monitored.length?'unknown':failed?'partial':unknown?'unknown':'partial',
  normal,failed,unknown,total:monitored.length,unverifiedSingles:items.length-monitored.length,
  limitedCoverage:true,reason:!monitored.length?'NO_REPEATED_REQUESTS':null,
  items:items.slice(0,128)};
}

export async function readApiConnectionHealth(db,now=Date.now()){
 const headers={'cache-control':'no-store','x-data-source':'STORED','x-content-type-options':'nosniff'};
 try{
  if(!db?.prepare)throw Error('NO_DB');
  const row=await db.prepare("SELECT body FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'")
    .bind(API_CONNECTION_HEALTH_KEY).first();
  const summary=summarizeApiConnectionHealth(row?JSON.parse(row.body):null,now);
  return Response.json(summary,{status:summary.reason==='SOURCE_UNAVAILABLE'||summary.reason==='INVALID_OBSERVATION'?503:200,headers});
 }catch{return Response.json({...UNKNOWN,reason:'SOURCE_UNAVAILABLE'},{status:503,headers});}
}
