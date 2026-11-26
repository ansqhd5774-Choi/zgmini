// Public, stored-only representation of observed external-provider requests.
// Unlike /api/collection-health this is NOT a collection-job inventory.
export const API_CONNECTION_HEALTH_KEY='api-connection-health';
export const API_CONNECTION_SNAPSHOT_MAX_AGE_MS=2*60*60*1000;
const WINDOW_MS=14*24*60*60*1000;
const HOST=/^(?=.{4,180}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;
const PUBLIC_HOST=host=>HOST.test(host)&&!/(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)&&!/^\d+(?:\.\d+){3}$/.test(host);
const time=(x,now)=>Number.isSafeInteger(x)&&x>0&&x<=now+60_000?x:null;
const nonnegative=x=>Number.isSafeInteger(x)&&x>=0;
const SAFE_STATUS=/^(?:[1-5][0-9]{2}|NETWORK_ERROR|PROVIDER_QUOTA_GUARD)$/;
const validStatusCounts=(value,requests)=>value===undefined||value===null||
 (typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length<=16&&
  Object.entries(value).every(([k,n])=>SAFE_STATUS.test(k)&&nonnegative(n))&&
  Object.values(value).reduce((n,x)=>n+x,0)<=requests);
// The fixed monitored source registry is distinct from historical HTTP hosts.
// Calendar source groups include official downloads; this is a monitored-source
// count, not an assertion about all configured API keys or URLs.
export const MONITORED_CALENDAR_SOURCES=Object.freeze([
 'bls','bea','fed','fed_calendar','fed_fomc','census','eia','usda',
 'usda_nass','cftc','treasury','tic','eia_epm','nyfed'
]);
export const MONITORED_DIRECT_ENDPOINTS=Object.freeze(['earnings_api','dol_eta539']);
export const MONITORED_SOURCE_IDS=Object.freeze([...MONITORED_CALENDAR_SOURCES,...MONITORED_DIRECT_ENDPOINTS]);

function summarizeMonitoredSourceSnapshot(snapshot,now){
 const unavailable=reason=>({...UNKNOWN,checkedAt:snapshot?.observedAt??null,reason});
 const observed=Date.parse(snapshot?.observedAt??'');
 if(snapshot?.version!==1||snapshot?.source!=='PC_MONITORED_SOURCE_EVIDENCE_V1'||
   snapshot?.coverage!=='PARTIAL'||snapshot?.scope!=='monitored-source-endpoints'||
   snapshot?.inventoryVerified!==true||snapshot?.limitedCoverage!==false||
   !Number.isFinite(observed)||observed>now+60_000||now-observed>API_CONNECTION_SNAPSHOT_MAX_AGE_MS||
   !Array.isArray(snapshot?.items)||snapshot.items.length!==MONITORED_SOURCE_IDS.length)
  return unavailable('MONITORED_INVENTORY_UNVERIFIED');
 const allowed=new Set(MONITORED_SOURCE_IDS),ids=new Set();let normal=0,failed=0,unknown=0;
 for(const item of snapshot.items){
  const seenAt=item?.checkedAt===null?null:Date.parse(item?.checkedAt??'');
  if(!allowed.has(item?.id)||ids.has(item.id)||
    !['normal','failed','unknown'].includes(item?.state)||
    (seenAt!==null&&(!Number.isFinite(seenAt)||seenAt>now+60_000||now-seenAt>72*3600_000))||
    (item.state!=='unknown'&&seenAt===null)||
    !['CALENDAR_PARSED','EXACT_HTTP_RESPONSE','NO_CURRENT_EVIDENCE'].includes(item?.evidence)||
    (item.state==='normal'&&item.evidence==='NO_CURRENT_EVIDENCE')||
    (item.state==='failed'&&item.evidence==='NO_CURRENT_EVIDENCE'))
   return unavailable('INVALID_MONITORED_EVIDENCE');
  ids.add(item.id);
  if(item.state==='normal')normal++;
  else if(item.state==='failed')failed++;
  else unknown++;
 }
 if(ids.size!==MONITORED_SOURCE_IDS.length)return unavailable('MONITORED_INVENTORY_INCOMPLETE');
 // API counts the 14 official calendar source groups; HTTP counts recurring
 // hosts in observed PC requests. A failed response is not a missing record.
 const calendar=snapshot.items.filter(item=>MONITORED_CALENDAR_SOURCES.includes(item.id));
 const api={
  normal:calendar.filter(item=>item.state==='normal').length,
  failed:calendar.filter(item=>item.state==='failed').length,
  unknown:calendar.filter(item=>item.state==='unknown').length,
  total:calendar.length
 };
 let http=null;
 if(snapshot.httpHosts?.scope==='external-provider-hosts'){
  const observed=summarizeApiConnectionHealth(snapshot.httpHosts,now);
  if(observed.coverage==='PARTIAL'&&observed.reason===null&&
    Number.isSafeInteger(observed.total)&&observed.total>0){
   const repeated=observed.items.filter(item=>item.repeated);
   // HTTP measures host connectivity, not the availability of every resource.
   // A 2xx in the last batch proves reachability despite another optional
   // path's 404. A missing required resource remains a collector/source error.
   // 404-only, 429-only and local quota deferrals cannot establish health.
   const codes=item=>Object.entries(item.lastEventStatuses??{})
    .filter(([,count])=>count>0).map(([status])=>status);
   const hardFailure=status=>status==='NETWORK_ERROR'||
    (/^[45][0-9]{2}$/.test(status)&&status!=='404'&&status!=='429');
   // Inferred inter-request gaps are not a verified provider schedule.
   // Only a real 2xx in the last 24 hours can neutralize an inferred
   // cadence-overdue flag; all actual hard transport errors still fail.
   const provenConnected=item=>{
    const at=item.lastAttemptAt;
    const freshObserved=Number.isSafeInteger(at)&&at<=now&&
     now-at>=0&&now-at<=24*3600_000;
    // The Census BFS CSV is a monthly, on-demand chart-history resource.
    // Its proven 2xx in the existing 14-day observed-host cohort should
    // not be marked unverified by the generic 36-hour daily-source rule.
    // This is connectivity only, NOT proof of a refreshed D1 chart.
    const monthlyBfsEvidence=item.host==='cdn.www.census.gov'&&
     Number.isSafeInteger(at)&&at<=now&&now-at>=0&&
     now-at<=15*86400_000&&item.lastOutcome==='success';
    const eligible=item.state==='normal'||
     (item.state==='failed'&&item.reasonCode==='LAST_EVENT_HAS_FAILURE')||
     (item.state==='stale'&&item.reasonCode==='CADENCE_OVERDUE'&&freshObserved)||
     monthlyBfsEvidence;
    return eligible&&codes(item).some(s=>/^2[0-9]{2}$/.test(s))&&
     !codes(item).some(hardFailure);
   };
   const normalHosts=repeated.filter(provenConnected).length;
   const failedHosts=repeated.filter(item=>{
    const at=item.lastAttemptAt;
    const lastFresh=Number.isSafeInteger(at)&&at<=now&&
     now-at>=0&&now-at<=24*3600_000;
    // A verified fresh 503/network error outranks inferred cadence too;
    // an ancient failed last contact remains unverified, not current red.
    const monthlyBfsWindow=item.host==='cdn.www.census.gov'&&
     Number.isSafeInteger(at)&&at<=now&&now-at>=0&&
     now-at<=15*86400_000;
    // A latest real 503/network failure remains red for the same monthly
    // observation window; do not use schedule inference to hide an error.
    return (item.state==='failed'||(item.state==='stale'&&lastFresh)||
     monthlyBfsWindow)&&codes(item).some(hardFailure);
   }).length;
   http={normal:normalHosts,failed:failedHosts,
    unknown:repeated.length-normalHosts-failedHosts,total:repeated.length};
  }
 }
 const hasFailure=failed>0||api.failed>0||(http?.failed??0)>0;
 const hasUnknown=api.unknown>0||!http||http.unknown>0;
 return {version:1,scope:'monitored-source-endpoints',source:snapshot.source,
  activeInventoryVerified:true,limitedCoverage:false,coverage:'PARTIAL',
  checkedAt:snapshot.observedAt,status:hasFailure?'partial':hasUnknown?'unknown':'healthy',
  normal,failed,unknown,total:MONITORED_SOURCE_IDS.length,api,http,items:[]};
}

const UNKNOWN={status:'unknown',scope:'external-provider-hosts',coverage:'UNVERIFIED',normal:null,failed:null,unknown:null,total:null,items:[]};

export function summarizeApiConnectionHealth(snapshot,now=Date.now()){
 if(snapshot?.scope==='monitored-source-endpoints')return summarizeMonitoredSourceSnapshot(snapshot,now);
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
    (raw.endpointFingerprints!==undefined&&(!nonnegative(raw.endpointFingerprints)||raw.endpointFingerprints>128))||
    (raw.endpointEvidenceDays!==undefined&&(!nonnegative(raw.endpointEvidenceDays)||raw.endpointEvidenceDays>15))||
    !['success','failure','mixed','unknown'].includes(raw.lastOutcome)||
     !validStatusCounts(raw.lastEventStatuses,raw.requests)||
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
  const reasonCode=!repeated?'INSUFFICIENT_REPEATED_REQUESTS':
   overdue?'CADENCE_OVERDUE':
   tooOldWithoutCadence?'NONPERIODIC_CADENCE_UNVERIFIED':
   lastFailure?'LAST_EVENT_HAS_FAILURE':
   state==='unknown'?'OUTCOME_UNVERIFIED':null;
  items.push({host:raw.host,requests:raw.requests,observedDays:raw.observedDays,
    repeated,lastAttemptAt:raw.lastAttemptAt,lastSuccessAt:raw.lastSuccessAt,
    lastOutcome:raw.lastOutcome,expectedIntervalMs:raw.expectedIntervalMs,
    endpointFingerprints:raw.endpointFingerprints??null,endpointEvidenceDays:raw.endpointEvidenceDays??null,
     lastEventStatuses:raw.lastEventStatuses??null,cadenceSupported,reasonCode,state});
 }
 const e=snapshot.endpointObservation;
 const endpointEvidence=e&&e.type==='HTTP_METHOD_PATH_SHA256_PREFIX'&&e.coverage==='PARTIAL'&&
  e.independentCollectorsCovered===false&&
  (e.observedFingerprintCount===null||nonnegative(e.observedFingerprintCount))&&
  nonnegative(e.observedHostCount)&&e.observedHostCount<=items.length&&
  nonnegative(e.endpointEvidenceEvents)&&nonnegative(e.endpointIncompleteEvents)&&
  (e.independentObservedFingerprintCount===undefined||e.independentObservedFingerprintCount===null||nonnegative(e.independentObservedFingerprintCount))&&
  (e.combinedObservedFingerprintCount===undefined||e.combinedObservedFingerprintCount===null||nonnegative(e.combinedObservedFingerprintCount))&&
  (e.independentObservedHostCount===undefined||(nonnegative(e.independentObservedHostCount)&&e.independentObservedHostCount<=128))&&
  (e.independentObservedCollectorCount===undefined||(nonnegative(e.independentObservedCollectorCount)&&e.independentObservedCollectorCount<=2))&&
  (e.independentEvidenceEvents===undefined&&e.independentObservedCollectorCount===undefined||nonnegative(e.independentEvidenceEvents))&&
  items.every(item=>item.endpointFingerprints!==null)
  ?{coverage:'PARTIAL',observedFingerprintCount:e.observedFingerprintCount,
    observedHostCount:e.observedHostCount,endpointIncompleteEvents:e.endpointIncompleteEvents,
    independentObservedFingerprintCount:e.independentObservedFingerprintCount??null,
    independentObservedHostCount:e.independentObservedHostCount??0,
    independentObservedCollectorCount:e.independentObservedCollectorCount??0,
    independentEvidenceEvents:e.independentEvidenceEvents??0,
    combinedObservedFingerprintCount:e.combinedObservedFingerprintCount??e.observedFingerprintCount,
    independentCollectorsCovered:false}:null;
 if(e&&!endpointEvidence)return {...UNKNOWN,checkedAt:snapshot.observedAt,reason:'INVALID_ENDPOINT_EVIDENCE'};
 if(endpointEvidence&&
    (endpointEvidence.observedFingerprintCount??0)!==items.reduce((sum,item)=>sum+item.endpointFingerprints,0))
  return {...UNKNOWN,checkedAt:snapshot.observedAt,reason:'ENDPOINT_EVIDENCE_MISMATCH'};
 if(endpointEvidence){
  const base=endpointEvidence.observedFingerprintCount??0,additional=endpointEvidence.independentObservedFingerprintCount??0;
  const combined=endpointEvidence.combinedObservedFingerprintCount??0;
  if(combined<base||combined<additional||combined>base+additional||
     (additional===0&&endpointEvidence.independentObservedHostCount>0)||
     (additional===0&&endpointEvidence.independentObservedCollectorCount>0)||
     (additional>0&&(!endpointEvidence.independentObservedHostCount||!endpointEvidence.independentObservedCollectorCount)))
   return {...UNKNOWN,checkedAt:snapshot.observedAt,reason:'ENDPOINT_EVIDENCE_MISMATCH'};
 }
 const monitored=items.filter(x=>x.repeated);
 const normal=monitored.filter(x=>x.state==='normal').length;
 const failed=monitored.filter(x=>x.state==='failed'||x.state==='stale').length;
 const unknown=monitored.length-normal-failed;
 return {version:1,scope:'external-provider-hosts',coverage:'PARTIAL',checkedAt:snapshot.observedAt,
  status:!monitored.length?'unknown':failed?'partial':unknown?'unknown':'partial',
  normal,failed,unknown,total:monitored.length,unverifiedSingles:items.length-monitored.length,
  limitedCoverage:true,endpointEvidence,reason:!monitored.length?'NO_REPEATED_REQUESTS':null,
  items:items.slice(0,128)};
}

export async function readApiConnectionHealth(db,now=Date.now()){
 const headers={'cache-control':'no-store','x-data-source':'STORED','x-content-type-options':'nosniff'};
 try{
  if(!db?.prepare)throw Error('NO_DB');
  const row=await db.prepare("SELECT body FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'")
    .bind(API_CONNECTION_HEALTH_KEY).first();
  const summary=summarizeApiConnectionHealth(row?JSON.parse(row.body):null,now);
  return Response.json(summary,{status:['SOURCE_UNAVAILABLE','INVALID_OBSERVATION','INVALID_ENDPOINT_EVIDENCE','ENDPOINT_EVIDENCE_MISMATCH','MONITORED_INVENTORY_UNVERIFIED','INVALID_MONITORED_EVIDENCE','MONITORED_INVENTORY_INCOMPLETE'].includes(summary.reason)?503:200,headers});
 }catch{return Response.json({...UNKNOWN,reason:'SOURCE_UNAVAILABLE'},{status:503,headers});}
}


// Public projection: explicit allowlist ONLY. Never serialize raw collector items,
// provider names, endpoint fingerprints, schedules, errors or request-level times.
export function publicApiConnectionSummary(internal){
 const integerOrNull=value=>Number.isSafeInteger(value)&&value>=0&&value<=128?value:null;
 // Historical HTTP host observations are not a verified roster of active API connections.
 // Do not show their warning/unknown counts as current API connection failures.
 const trusted=['active-api-endpoints','monitored-source-endpoints'].includes(internal?.scope)&&
  internal?.activeInventoryVerified===true&&internal?.limitedCoverage===false;
 const status=trusted&&['partial','unknown','healthy','stale'].includes(internal?.status)?internal.status:'unknown';
 const safeCounts=value=>{
  const n=integerOrNull(value?.normal),f=integerOrNull(value?.failed);
  const u=integerOrNull(value?.unknown),t=integerOrNull(value?.total);
  return n!==null&&f!==null&&u!==null&&t!==null&&t>0&&n+f+u===t
   ?{normal:n,failed:f,unknown:u,total:t}:null;
 };
 const api=trusted&&internal?.scope==='monitored-source-endpoints'?safeCounts(internal.api):null;
 const http=trusted&&internal?.scope==='monitored-source-endpoints'?safeCounts(internal.http):null;
 const checked=typeof internal?.checkedAt==='string'?Date.parse(internal.checkedAt):NaN;
 return {
  version:1,
  status,
  coverage:trusted&&internal?.coverage==='PARTIAL'?'PARTIAL':'UNVERIFIED',
  normal:trusted?integerOrNull(internal?.normal):null,
  failed:trusted?integerOrNull(internal?.failed):null,
  unknown:trusted?integerOrNull(internal?.unknown):null,
  total:trusted?integerOrNull(internal?.total):null,
  api,http,
  checkedAt:Number.isFinite(checked)?new Date(checked).toISOString():null,
 };
}

export async function readPublicApiConnectionHealth(db,now=Date.now()){
 const headers={'cache-control':'no-store, private','x-content-type-options':'nosniff','x-robots-tag':'noindex'};
 try{
  const internal=await readApiConnectionHealth(db,now);
  const value=await internal.json();
  return Response.json(publicApiConnectionSummary(value),{status:internal.status,headers});
 }catch{
  return Response.json(publicApiConnectionSummary(null),{status:503,headers});
 }
}
