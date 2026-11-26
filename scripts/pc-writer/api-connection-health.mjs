// Snapshot observed external host requests from the EXISTING PC collection log.
// No provider GET, SQLite schema change, credentials or arbitrary file traversal.
import fs from 'node:fs';
import path from 'node:path';
import {publicFeedStore} from '../../worker/public-feed-store.mjs';
import {API_CONNECTION_HEALTH_KEY,MONITORED_CALENDAR_SOURCES,MONITORED_DIRECT_ENDPOINTS} from '../../worker/api-connection-health.mjs';
import {readProviderEndpointEvents,providerEndpointFingerprint} from './provider-endpoint-fingerprint.mjs';

const WINDOW_MS=14*24*3600_000;
const MAX_LOG_BYTES=8*1024*1024;
const MAX_ROWS=16000;
const MAX_HOSTS=128;
const HOST=/^(?=.{4,180}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;
const PUBLIC_HOST=host=>HOST.test(host)&&!/(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)&&!/^\d+(?:\.\d+){3}$/.test(host);
const STATUSES=/^[1-5][0-9]{2}$/;
const DAY_MS=24*3600_000;
const kstDay=ms=>new Date(ms+9*3600_000).toISOString().slice(0,10);
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const median=values=>{const list=[...values].sort((a,b)=>a-b);return list.length?list[Math.floor(list.length/2)]:null;};

export function buildApiConnectionHealthFromLog(base,now=Date.now(),{fileSystem=fs}={}){
 const empty=reason=>({version:1,scope:'external-provider-hosts',source:'PC_COLLECTION_EVENTS_FETCH_WRAPPER',
  coverage:'PARTIAL',observedAt:new Date(now).toISOString(),windowHours:336,
  diagnostics:{reason,tailTruncated:false,invalidEvents:0,unverifiedCollectors:true},
  items:[]});
 if(!Number.isSafeInteger(now)||now<0)return empty('INVALID_CLOCK');
 const dir=path.join(base,'pc-writer');
 const baseDir=path.basename(base)==='pc-writer'?base:dir;
 const file=path.join(baseDir,'collection-events.jsonl');
 let fd,stat1,stat2,buffer,tailTruncated=false;
 try{
  const s=fileSystem.lstatSync(baseDir),f=fileSystem.lstatSync(file);
  if(!s.isDirectory()||s.isSymbolicLink()||!f.isFile()||f.isSymbolicLink()||!f.size)
   return empty('LOG_UNAVAILABLE');
  fd=fileSystem.openSync(file,'r');stat1=fileSystem.fstatSync(fd);
  const bytes=Math.min(MAX_LOG_BYTES,stat1.size),start=stat1.size-bytes;
  buffer=Buffer.alloc(bytes);let read=0;
  while(read<bytes){const n=fileSystem.readSync(fd,buffer,read,bytes-read,start+read);if(!n)throw Error('SHORT_READ');read+=n;}
  stat2=fileSystem.fstatSync(fd);
  if(stat1.size!==stat2.size||stat1.mtimeMs!==stat2.mtimeMs)return empty('LOG_CHANGED_DURING_READ');
  tailTruncated=start>0;
 }catch{return empty('LOG_UNAVAILABLE');}
 finally{if(fd!==undefined)try{fileSystem.closeSync(fd);}catch{}}
 const str=buffer.toString('utf8');
 let lines=str.split('\n');
 if(tailTruncated)lines.shift();
 lines.pop(); // incomplete last append, or final empty element
 const rowsTruncated=lines.length>MAX_ROWS;
 if(rowsTruncated)lines=lines.slice(-MAX_ROWS);
 const hosts=new Map();const seen=new Set(),hostEventRequests=new Map();
 let invalidEvents=0,duplicateEvents=0;
 for(const line of lines){
  if(!line)continue;
  if(seen.has(line)){duplicateEvents++;continue;}seen.add(line);
  let obj;try{obj=JSON.parse(line);}catch{invalidEvents++;continue;}
  const at=Date.parse(obj?.at??'');
  if(!Number.isFinite(at)||at>now+60_000||typeof obj.providers!=='object'||!obj.providers||Array.isArray(obj.providers)){
   invalidEvents++;continue;
  }
  if(now-at>WINDOW_MS)continue;
  for(const [host,request] of Object.entries(obj.providers)){
   if(!PUBLIC_HOST(host)||!request||!integer(request.requests)||request.requests<=0||
     !request.statuses||typeof request.statuses!=='object'||Array.isArray(request.statuses)){
    invalidEvents++;continue;
   }
   const codes=Object.entries(request.statuses);
   if(codes.some(([key,count])=>!(STATUSES.test(key)||key==='NETWORK_ERROR'||key==='PROVIDER_QUOTA_GUARD')||!integer(count))||
      codes.reduce((sum,[,count])=>sum+count,0)!==request.requests){
    invalidEvents++;continue;
   }
   const success=codes.reduce((sum,[key,count])=>sum+(key.startsWith('2')?count:0),0);
   const failures=request.requests-success;
   let h=hosts.get(host);
   if(!h){h={host,requests:0,days:new Set(),events:[],last:null,lastSuccessAt:null,endpointIds:new Set(),endpointDays:new Set()};hosts.set(host,h);}
   h.requests+=request.requests;h.days.add(kstDay(at));h.events.push(at);
   hostEventRequests.set(obj.at+'|'+host,request.requests);
   if(success)h.lastSuccessAt=Math.max(h.lastSuccessAt??0,at);
   if(!h.last||h.last.at<=at)h.last={at,outcome:success&&!failures?'success':failures&&!success?'failure':'mixed',statuses:Object.fromEntries(codes)};
  }
 }
 // A separate fixed-path append-only receipt avoids changing the existing
 // collection-events schema and preserves prior Collector R44 source overlays.
 const routeLog=readProviderEndpointEvents(baseDir,{fileSystem});
 const matched=new Set(),complete=new Set(),seenRouteLines=new Set();
 const independentIds=new Map(),independentCollectors=new Set();
 let independentEvidenceEvents=0;
 let endpointEvidenceEvents=0,invalidEndpointEvents=0;
 if(routeLog.status==='OBSERVED'){
  for(const line of routeLog.lines){
   if(!line||seenRouteLines.has(line))continue;
   seenRouteLines.add(line);
   let record;try{record=JSON.parse(line);}catch{invalidEndpointEvents++;continue;}
   const at=Date.parse(record?.at??'');
   if(!Number.isFinite(at)||at>now+60_000||!record?.endpointPaths||
      typeof record.endpointPaths!=='object'||Array.isArray(record.endpointPaths)){
    invalidEndpointEvents++;continue;
   }
   if(now-at>WINDOW_MS)continue;
   if(record.collector!==undefined){
    if(!['ALPACA_INCREMENTAL','SECTOR_PROVISIONAL'].includes(record.collector)){
     invalidEndpointEvents++;continue;
    }
    for(const [host,routes] of Object.entries(record.endpointPaths).slice(0,128)){
     if(!PUBLIC_HOST(host)||!routes||typeof routes!=='object'||Array.isArray(routes)){
      invalidEndpointEvents++;continue;
     }
     const entries=Object.entries(routes);
     if(entries.length>128){invalidEndpointEvents++;continue;}
     const accepted=[];
     for(const [id,entry] of entries){
      if(!/^[a-f0-9]{32}$/.test(id)||!entry||!integer(entry.requests)||entry.requests<1||
       !entry.statuses||typeof entry.statuses!=='object'||Array.isArray(entry.statuses)){
       invalidEndpointEvents++;continue;
      }
      const statuses=Object.entries(entry.statuses);
      if(statuses.some(([code,count])=>!(STATUSES.test(code)||code==='NETWORK_ERROR'||code==='PROVIDER_QUOTA_GUARD')||!integer(count))||
       statuses.reduce((sum,[,n])=>sum+n,0)!==entry.requests){
       invalidEndpointEvents++;continue;
      }
      // A quota guard can reject before any HTTP send: not evidence of a contacted endpoint.
      if(statuses.every(([code])=>code==='PROVIDER_QUOTA_GUARD'))continue;
      accepted.push(id);
     }
     if(!accepted.length)continue;
     let set=independentIds.get(host);
     if(!set){
      if(independentIds.size>=128){invalidEndpointEvents++;continue;}
      set=new Set();independentIds.set(host,set);
     }
     for(const id of accepted)set.add(id);
     independentEvidenceEvents++;
     independentCollectors.add(record.collector);
    }
    continue;
   }
   for(const [host,routes] of Object.entries(record.endpointPaths).slice(0,128)){
    const key=record.at+'|'+host;
    if(!hostEventRequests.has(key)||matched.has(key)||!routes||
       typeof routes!=='object'||Array.isArray(routes)){invalidEndpointEvents++;continue;}
    const ids=[],entries=Object.entries(routes);
    let accounted=0,invalid=entries.length>128;
    for(const [id,row] of entries.slice(0,128)){
     if(!/^[0-9a-f]{32}$/.test(id)||!row||!integer(row.requests)||row.requests<1||
       !row.statuses||typeof row.statuses!=='object'||Array.isArray(row.statuses)){
      invalid=true;continue;
     }
     const stats=Object.entries(row.statuses);
     if(stats.some(([k,n])=>!(STATUSES.test(k)||k==='NETWORK_ERROR'||k==='PROVIDER_QUOTA_GUARD')||!integer(n))||
        stats.reduce((sum,[,n])=>sum+n,0)!==row.requests){invalid=true;continue;}
     accounted+=row.requests;ids.push(id);
    }
    if(!ids.length||accounted>hostEventRequests.get(key)){invalidEndpointEvents++;continue;}
    const h=hosts.get(host);if(!h){invalidEndpointEvents++;continue;}
    for(const id of ids)h.endpointIds.add(id);
    h.endpointDays.add(kstDay(at));matched.add(key);endpointEvidenceEvents++;
    if(!invalid&&accounted===hostEventRequests.get(key)&&record.endpointTrackingOmitted===0)complete.add(key);
   }
  }
 }
 // An invalid route is already counted in the incomplete host event; avoid double count.
 const endpointIncompleteEvents=hostEventRequests.size-complete.size;
 const items=[...hosts.values()].sort((a,b)=>(b.last?.at??0)-(a.last?.at??0)||a.host.localeCompare(b.host))
  .slice(0,MAX_HOSTS).map(h=>{
   const times=[...new Set(h.events)].sort((a,b)=>a-b);
   const gaps=times.slice(1).map((t,i)=>t-times[i]).filter(v=>v>=5*60000&&v<=48*3600_000);
   // Infer a deadline only from enough repeated execution evidence.
   const cadence=times.length>=5&&h.days.size>=3&&gaps.length>=4?
    Math.min(48*3600_000,Math.max(5*60000,median(gaps))):null;
   return {host:h.host,requests:h.requests,observedDays:h.days.size,
    endpointFingerprints:h.endpointIds.size,endpointEvidenceDays:h.endpointDays.size,
    lastAttemptAt:h.last?.at??null,lastSuccessAt:h.lastSuccessAt,
    lastOutcome:h.last?.outcome??'unknown',expectedIntervalMs:cadence,
    // Previously scrubbed HTTP status counts from append-only PC event log.
    lastEventStatuses:h.last?.statuses??null};
  });
 const observedEndpointFingerprints=items.reduce((sum,item)=>sum+item.endpointFingerprints,0);
 const independentObservedFingerprintCount=[...independentIds.values()].reduce((n,ids)=>n+ids.size,0);
 const combined=new Map(items.map(item=>[item.host,new Set(hosts.get(item.host)?.endpointIds??[])]));
 for(const [host,ids] of independentIds){
  let saved=combined.get(host);
  if(!saved){if(combined.size>=256)continue;saved=new Set();combined.set(host,saved);}
  for(const id of ids)saved.add(id);
 }
 const combinedObservedFingerprintCount=[...combined.values()].reduce((n,ids)=>n+ids.size,0);
 return {version:1,scope:'external-provider-hosts',source:'PC_COLLECTION_EVENTS_FETCH_WRAPPER',
  coverage:'PARTIAL',observedAt:new Date(now).toISOString(),windowHours:336,
  endpointObservation:{type:'HTTP_METHOD_PATH_SHA256_PREFIX',coverage:'PARTIAL',
   observedFingerprintCount:observedEndpointFingerprints||null,
   observedHostCount:items.filter(item=>item.endpointFingerprints>0).length,
   endpointEvidenceEvents,endpointIncompleteEvents,
   independentObservedFingerprintCount:independentObservedFingerprintCount||null,
   independentObservedHostCount:independentIds.size,
   independentObservedCollectorCount:independentCollectors.size,
   independentEvidenceEvents,
   combinedObservedFingerprintCount:combinedObservedFingerprintCount||null,
   independentCollectorsCovered:false},
  diagnostics:{endpointLogStatus:routeLog.status,endpointLogTruncated:routeLog.tailTruncated||routeLog.rowsTruncated,
   invalidEndpointEvents,reason:tailTruncated||rowsTruncated||invalidEvents||duplicateEvents||hosts.size>MAX_HOSTS?
    'LOG_PARTIAL':'WRAPPER_ONLY',tailTruncated,rowsTruncated,invalidEvents,duplicateEvents,
    unverifiedCollectors:true},
  items};
}

// Only the explicitly monitored 14 calendar source groups + two exact HTTP paths.
// A calendar READY requires a recently parsed/stored official response.  The direct
// paths require exact METHOD/HOST/PATH receipts; other host traffic is never proof.
const MONITORED_URLS=Object.freeze({
 earnings_api:'https://api.earningsapi.com/v1/calendar/earnings',
 dol_eta539:'https://oui.doleta.gov/unemploy/csv/ar539.csv',
});
const MONITORED_AGE_MS=72*3600_000;
const recent=(iso,now)=>{
 if(typeof iso!=='string')return null;
 const t=Date.parse(iso);return Number.isFinite(t)&&t<=now+60_000&&now-t<=MONITORED_AGE_MS?new Date(t).toISOString():null;
};

export function buildMonitoredSourceHealth(calendar,endpointLog,now=Date.now()){
 const items=MONITORED_CALENDAR_SOURCES.map(id=>{
  const source=calendar?.sources?.[id];
  const successAt=recent(source?.checkedAt,now);
  const attemptedAt=recent(source?.attemptedAt,now);
  const success=source?.status==='READY'&&successAt!==null;
  const failed=source?.status==='SOURCE_FAILED'&&attemptedAt!==null;
  return {id,state:success?'normal':failed?'failed':'unknown',
   evidence:success||failed?'CALENDAR_PARSED':'NO_CURRENT_EVIDENCE',
   checkedAt:success?successAt:failed?attemptedAt:null};
 });
 const targets=new Map(MONITORED_DIRECT_ENDPOINTS.map(id=>{
  const fp=providerEndpointFingerprint(MONITORED_URLS[id]);
  return [id,fp];
 }));
 const last=new Map();
 if(endpointLog?.status==='OBSERVED'){
  for(const line of endpointLog.lines){
   let record;try{record=JSON.parse(line);}catch{continue;}
   const at=recent(record?.at,now);
   if(!at||!record?.endpointPaths||typeof record.endpointPaths!=='object')continue;
   for(const [id,fp] of targets){
    const row=record.endpointPaths?.[fp.host]?.[fp.id];
    if(!row||!Number.isSafeInteger(row.requests)||row.requests<1||
     !row.statuses||typeof row.statuses!=='object'||Array.isArray(row.statuses))continue;
    const entries=Object.entries(row.statuses);
    if(!entries.length||entries.some(([code,n])=>!(STATUSES.test(code)||
      code==='NETWORK_ERROR'||code==='PROVIDER_QUOTA_GUARD')||
      !integer(n))||entries.reduce((sum,[,n])=>sum+n,0)!==row.requests)continue;
    const old=last.get(id);if(!old||at>old.at)last.set(id,{at,statuses:row.statuses});
   }
  }
 }
 for(const id of MONITORED_DIRECT_ENDPOINTS){
  const hit=last.get(id);
  const codes=Object.entries(hit?.statuses??{}).filter(([,n])=>n>0);
  const ok=codes.length>0&&codes.every(([s])=>s.startsWith('2'));
  const error=codes.some(([s])=>s==='NETWORK_ERROR'||(
   STATUSES.test(s)&&(!s.startsWith('2')&&s!=='429')));
  const state=ok?'normal':error?'failed':'unknown';
  items.push({id,state,evidence:state==='unknown'?'NO_CURRENT_EVIDENCE':'EXACT_HTTP_RESPONSE',
   checkedAt:state==='unknown'?null:hit.at});
 }
 return {version:1,scope:'monitored-source-endpoints',
  source:'PC_MONITORED_SOURCE_EVIDENCE_V1',coverage:'PARTIAL',
  inventoryVerified:true,limitedCoverage:false,observedAt:new Date(now).toISOString(),
  items};
}

export async function storeLocalApiConnectionHealth(core,base,now=Date.now()){
 const calendar=(await publicFeedStore(core).readOutput('release-calendar'))?.body??null;
 const endpointLog=readProviderEndpointEvents(path.basename(base)==='pc-writer'?base:path.join(base,'pc-writer'));
 const snapshot=buildMonitoredSourceHealth(calendar,endpointLog,now);
 // Preserve HTTP host diagnostics only inside the private D1 snapshot.
 // The public projection releases aggregate counters only, never hostnames.
 snapshot.httpHosts=buildApiConnectionHealthFromLog(base,now);
 await publicFeedStore(core).writeOutput(API_CONNECTION_HEALTH_KEY,snapshot,now);
 const check=await publicFeedStore(core).readOutput(API_CONNECTION_HEALTH_KEY);
 if(JSON.stringify(check?.body)!==JSON.stringify(snapshot))throw Error('API_CONNECTION_HEALTH_READBACK_FAILED');
 return {coverage:snapshot.coverage,monitoredSources:snapshot.items.length,
  normal:snapshot.items.filter(item=>item.state==='normal').length,
  failed:snapshot.items.filter(item=>item.state==='failed').length,
  unknown:snapshot.items.filter(item=>item.state==='unknown').length};
}
