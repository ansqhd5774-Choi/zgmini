// One-way identity of an HTTP METHOD + hostname + pathname.
// No URL, query parameters, credentials or raw paths are persisted.
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const METHODS=new Set(['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']);
const HOST=/^(?=.{4,180}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;
export const PROVIDER_ENDPOINTS_PER_HOST_MAX=128;
export function providerEndpointFingerprint(input,init){
 try{
  const raw=typeof input==='string'||input instanceof URL?input:input?.url;
  if(typeof raw!=='string'&&!(raw instanceof URL))return null;
  const u=new URL(raw);
  if(!['http:','https:'].includes(u.protocol)||!HOST.test(u.hostname)||u.pathname.length>1500)return null;
  const m=String(init?.method??(typeof input==='object'?input?.method:null)??'GET').toUpperCase();
  if(!METHODS.has(m))return null;
  // Query strings distinguish SERIES/RESOURCES, not HTTP endpoint method+path.
  // Path secrets are never returned, only a bounded one-way digest.
  const id=createHash('sha256').update(m+'\0'+u.hostname+'\0'+u.pathname).digest('hex').slice(0,32);
  return {host:u.hostname,id};
 }catch{return null;}
}

export const PROVIDER_ENDPOINT_LOG='provider-endpoint-events.jsonl';
export const INDEPENDENT_COLLECTORS=new Set(['ALPACA_INCREMENTAL','SECTOR_PROVISIONAL']);
const HOST_SAFE=/^(?=.{4,180}$)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/;
const CODE=/^[1-5][0-9]{2}$/;
const numeric=n=>Number.isSafeInteger(n)&&n>=0;

export function appendProviderEndpointEvent(base,report,{fileSystem=fs}={}){
 const at=typeof report.at==='string'&&Number.isFinite(Date.parse(report.at))?report.at:null;
 if(!at)throw Error('ENDPOINT_EVENT_TIME_INVALID');
 const endpoints={};
 for(const [host,routes] of Object.entries(report.endpointPaths??{}).slice(0,128)){
  if(!HOST_SAFE.test(host)||!routes||typeof routes!=='object'||Array.isArray(routes))continue;
  const safe={};
  for(const [id,row] of Object.entries(routes).slice(0,PROVIDER_ENDPOINTS_PER_HOST_MAX)){
   if(!/^[0-9a-f]{32}$/.test(id)||!numeric(row?.requests)||row.requests<1||
      !row.statuses||typeof row.statuses!=='object'||Array.isArray(row.statuses))continue;
   const statuses=Object.fromEntries(Object.entries(row.statuses).filter(([k,n])=>
    (CODE.test(k)||k==='NETWORK_ERROR'||k==='PROVIDER_QUOTA_GUARD')&&numeric(n)));
   if(Object.values(statuses).reduce((n,x)=>n+x,0)!==row.requests)continue;
   safe[id]={requests:row.requests,statuses};
  }
  if(Object.keys(safe).length)endpoints[host]=safe;
 }
 const omitted=numeric(report.endpointTrackingOmitted)?report.endpointTrackingOmitted:0;
 const collector=INDEPENDENT_COLLECTORS.has(report.collector)?report.collector:null;
 const record={at,...(collector?{collector}:{}),endpointPaths:endpoints,endpointTrackingOmitted:omitted};
 fileSystem.appendFileSync(path.join(base,PROVIDER_ENDPOINT_LOG),JSON.stringify(record)+'\n');
 return {observedHosts:Object.keys(endpoints).length,omitted};
}

export function readProviderEndpointEvents(base,{fileSystem=fs}={}){
 const log=path.join(base,PROVIDER_ENDPOINT_LOG);
 let fd,statStart,statEnd,buffer,start=0;
 try{
  const a=fileSystem.lstatSync(base),b=fileSystem.lstatSync(log);
  if(!a.isDirectory()||a.isSymbolicLink()||!b.isFile()||b.isSymbolicLink()||!b.size)
   return {status:'LOG_UNAVAILABLE',lines:[],tailTruncated:false,rowsTruncated:false};
  fd=fileSystem.openSync(log,'r');statStart=fileSystem.fstatSync(fd);
  const size=Math.min(statStart.size,8*1024*1024);start=statStart.size-size;
  buffer=Buffer.alloc(size);let used=0;
  while(used<size){const n=fileSystem.readSync(fd,buffer,used,size-used,start+used);if(!n)throw Error('READ_INCOMPLETE');used+=n;}
  statEnd=fileSystem.fstatSync(fd);
  if(statStart.size!==statEnd.size||statStart.mtimeMs!==statEnd.mtimeMs)
   return {status:'LOG_CHANGED',lines:[],tailTruncated:false,rowsTruncated:false};
 }catch{return {status:'LOG_UNAVAILABLE',lines:[],tailTruncated:false,rowsTruncated:false};}
 finally{if(fd!==undefined)try{fileSystem.closeSync(fd);}catch{}}
 const tailTruncated=start>0;
 let lines=buffer.toString('utf8').split('\n');
 if(tailTruncated)lines.shift();
 lines.pop();
 const rowsTruncated=lines.length>16000;
 if(rowsTruncated)lines=lines.slice(-16000);
 return {status:'OBSERVED',lines,tailTruncated,rowsTruncated};
}

// Passive observer for independently executing collectors outside collect-local.
// The original fetch (including provider quota guards) always determines success
// and failure; the optional receipt must never change collector behavior.
export function observeIndependentProviderFetch(base,collector,originalFetch,{
 append=appendProviderEndpointEvent,now=Date.now
}={}){
 if(!INDEPENDENT_COLLECTORS.has(collector)||typeof originalFetch!=='function')
  throw Error('UNAPPROVED_INDEPENDENT_COLLECTOR');
 return async(input,init)=>{
  const identity=providerEndpointFingerprint(input,init);
  const record=status=>{
   if(!identity)return;
   try{
    append(base,{at:new Date(now()).toISOString(),collector,
     endpointPaths:{[identity.host]:{[identity.id]:{
      requests:1,statuses:{[String(status)]:1}
     }}},endpointTrackingOmitted:0});
   }catch{/* Telemetry must never interrupt approved raw collection. */}
  };
  try{
   const response=await originalFetch(input,init);
   record(response.status);
   return response;
  }catch(error){
   record(error?.code==='PROVIDER_QUOTA_GUARD'?'PROVIDER_QUOTA_GUARD':'NETWORK_ERROR');
   throw error;
  }
 };
}
