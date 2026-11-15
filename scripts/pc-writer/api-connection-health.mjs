// Snapshot observed external host requests from the EXISTING PC collection log.
// No provider GET, SQLite schema change, credentials or arbitrary file traversal.
import fs from 'node:fs';
import path from 'node:path';
import {publicFeedStore} from '../../worker/public-feed-store.mjs';
import {API_CONNECTION_HEALTH_KEY} from '../../worker/api-connection-health.mjs';

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
 const hosts=new Map();const seen=new Set();
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
   if(!h){h={host,requests:0,days:new Set(),events:[],last:null,lastSuccessAt:null};hosts.set(host,h);}
   h.requests+=request.requests;h.days.add(kstDay(at));h.events.push(at);
   if(success)h.lastSuccessAt=Math.max(h.lastSuccessAt??0,at);
   if(!h.last||h.last.at<=at)h.last={at,outcome:success&&!failures?'success':failures&&!success?'failure':'mixed'};
  }
 }
 const items=[...hosts.values()].sort((a,b)=>(b.last?.at??0)-(a.last?.at??0)||a.host.localeCompare(b.host))
  .slice(0,MAX_HOSTS).map(h=>{
   const times=[...new Set(h.events)].sort((a,b)=>a-b);
   const gaps=times.slice(1).map((t,i)=>t-times[i]).filter(v=>v>=5*60000&&v<=48*3600_000);
   // Infer a deadline only from enough repeated execution evidence.
   const cadence=times.length>=5&&h.days.size>=3&&gaps.length>=4?
    Math.min(48*3600_000,Math.max(5*60000,median(gaps))):null;
   return {host:h.host,requests:h.requests,observedDays:h.days.size,
    lastAttemptAt:h.last?.at??null,lastSuccessAt:h.lastSuccessAt,
    lastOutcome:h.last?.outcome??'unknown',expectedIntervalMs:cadence};
  });
 return {version:1,scope:'external-provider-hosts',source:'PC_COLLECTION_EVENTS_FETCH_WRAPPER',
  coverage:'PARTIAL',observedAt:new Date(now).toISOString(),windowHours:336,
  diagnostics:{reason:tailTruncated||rowsTruncated||invalidEvents||duplicateEvents||hosts.size>MAX_HOSTS?
    'LOG_PARTIAL':'WRAPPER_ONLY',tailTruncated,rowsTruncated,invalidEvents,duplicateEvents,
    unverifiedCollectors:true},
  items};
}

export async function storeLocalApiConnectionHealth(core,base,now=Date.now()){
 const snapshot=buildApiConnectionHealthFromLog(base,now);
 await publicFeedStore(core).writeOutput(API_CONNECTION_HEALTH_KEY,snapshot,now);
 const check=await publicFeedStore(core).readOutput(API_CONNECTION_HEALTH_KEY);
 if(JSON.stringify(check?.body)!==JSON.stringify(snapshot))throw Error('API_CONNECTION_HEALTH_READBACK_FAILED');
 return {coverage:snapshot.coverage,observedHosts:snapshot.items.length};
}
