// R1.4: original GDELT 2.0 Events archive backfill, explicitly invoked PC research lane.
// Never upgrades discovered articles/events to VERIFIED, or edits the approved scoring inputs.
import {fileURLToPath} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
import {openStore} from './store.mjs';
import {parseVerifiedGdeltExport} from './gdelt-events-archive.mjs';
import os from 'node:os';
import path from 'node:path';

const ROOT='https://data.gdeltproject.org/gdeltv2/';
const INDEX=ROOT+'masterfilelist.txt';
const DAY=86400000, SLOT=900000, MAX_INDEX=16*1024*1024, MAX_ZIP=16*1024*1024;
const VERSION='GDELT_EVENTS_BACKFILL_R14';
const finiteTime=n=>Number.isSafeInteger(n)&&n>=Date.parse('2015-02-19')&&n<Date.parse('2100-01-01');
const floor=n=>Math.floor(n/SLOT)*SLOT;
const stamp=n=>new Date(n).toISOString().replace(/[-:TZ.]/g,'').slice(0,14);
const blank=()=>({attackCount:null,eventVerified:false,coverageVerified:false,productionEligible:false});
const fail=(reason,extra={})=>({status:'SOURCE_FAILED',reason,...extra,...blank()});

export function masterWindowRows(raw,{startAt,targetAt,tail=true}={}){
 if(typeof raw!=='string'||Buffer.byteLength(raw)>MAX_INDEX||!finiteTime(startAt)||!finiteTime(targetAt)||targetAt<startAt)throw Error('GDELT_MASTER_WINDOW_INVALID');
 const lines=raw.split(/\r?\n/);
 if(tail)lines.shift(); // A suffix HTTP range begins inside an unknown line.
 const entries=new Map();let earliest=Infinity,examined=0;
 for(const line of lines){
  if(!line.trim())continue;
  const m=line.trim().match(/^([1-9]\d{0,11}) ([a-f0-9]{31,32}) (https?:\/\/data\.gdeltproject\.org\/gdeltv2\/(\d{14})\.export\.CSV\.zip)$/);
  if(!m)continue; // Master list also contains Mentions/GKG and older categories.
  const iso=m[4].slice(0,4)+'-'+m[4].slice(4,6)+'-'+m[4].slice(6,8)+'T'+m[4].slice(8,10)+':'+m[4].slice(10,12)+':'+m[4].slice(12,14)+'.000Z';
  const at=Date.parse(iso);
  if(!Number.isSafeInteger(at)||new Date(at).toISOString()!==iso||at%SLOT!==0)throw Error('GDELT_MASTER_TIMESTAMP_INVALID');
  earliest=Math.min(earliest,at);examined++;
  if(at<startAt||at>targetAt)continue;
  const row={at,archive:{type:'export.CSV.zip',url:m[3]},expectedBytes:Number(m[1]),reportedMd5:m[2]};
  if(row.expectedBytes>MAX_ZIP)throw Error('GDELT_ARCHIVE_EXCEEDS_LIMIT');
  const prev=entries.get(at);
  if(prev&&JSON.stringify(prev)!==JSON.stringify(row))throw Error('GDELT_MASTER_CONFLICTING_RECORD');
  entries.set(at,row);
 }
 if(!examined||earliest>startAt)throw Error('GDELT_MASTER_TAIL_INCOMPLETE');
 const sorted=[...entries.values()].sort((a,b)=>a.at-b.at);
 return {status:'INDEXED',startAt,targetAt,earliestIndexedAt:earliest,entries:sorted,...blank()};
}

export async function readBoundedBytes(response,maxBytes){
 if(!response?.body?.getReader||!Number.isSafeInteger(maxBytes)||maxBytes<1)throw Error('GDELT_BODY_MISSING');
 const reader=response.body.getReader();let n=0;const chunks=[];
 try{
  for(;;){
   const {value,done}=await reader.read();if(done)break;
   n+=value.byteLength;if(n>maxBytes)throw Error('GDELT_RESPONSE_TOO_LARGE');
   chunks.push(value);
  }
 }finally{await reader.cancel().catch(()=>{});}
 const result=Buffer.allocUnsafe(n);let p=0;
 for(const chunk of chunks){result.set(chunk,p);p+=chunk.length;}
 return result;
}

export async function fetchMasterWindow({startAt,targetAt,fetcher=fetch,rangeBytes=MAX_INDEX}={}){
 if(!Number.isSafeInteger(rangeBytes)||rangeBytes<1024*1024||rangeBytes>MAX_INDEX)throw Error('GDELT_RANGE_INVALID');
 // Range is essential: masterfilelist.txt exceeds 100 MB. Do not download the whole catalogue.
 let response;
 try{response=await fetcher(INDEX,{headers:{Range:'bytes=-'+rangeBytes,Accept:'text/plain'},signal:AbortSignal.timeout(45000)});}
 catch{return fail('GDELT_MASTER_FETCH_FAILED');}
 if(response.status===429)return fail('GDELT_MASTER_RATE_LIMITED',{httpStatus:429,retryAfter:response.headers?.get?.('retry-after')??null});
 if(response.status!==206)return fail(response.status===200?'GDELT_MASTER_RANGE_UNSUPPORTED':'GDELT_MASTER_HTTP_'+response.status,{httpStatus:response.status});
 const range=response.headers?.get?.('content-range')??'';
 if(!/^bytes \d+-\d+\/\d+$/.test(range))return fail('GDELT_MASTER_RANGE_INVALID');
 try{
  const bytes=await readBoundedBytes(response,rangeBytes);
  const parsed=masterWindowRows(bytes.toString('utf8'),{startAt,targetAt,tail:true});
  return {...parsed,checkedAt:Date.now(),indexUrl:INDEX,indexRange:range};
 }catch(error){return fail(/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'GDELT_MASTER_PARSE_FAILED');}
}

function checkpointOk(cp){
 return cp?.version===VERSION&&finiteTime(cp.startAt)&&finiteTime(cp.nextAt)&&finiteTime(cp.targetAt)
  &&cp.nextAt>=cp.startAt&&cp.nextAt<=cp.targetAt+SLOT
  &&cp.startAt%SLOT===0&&cp.nextAt%SLOT===0&&cp.targetAt%SLOT===0
  &&Number.isSafeInteger(cp.archivesSaved)&&cp.archivesSaved>=0
  &&(cp.retryAt==null||Number.isSafeInteger(cp.retryAt));
}
function original(now){const targetAt=floor(now-2*SLOT);return {version:VERSION,startAt:floor(now-28*DAY),nextAt:floor(now-28*DAY),targetAt,archivesSaved:0};}
function retryDelay(header,now){
 const seconds=typeof header==='string'&&/^\d{1,8}$/.test(header)?Number(header):null;
 const parsed=seconds!==null?now+1000*seconds:Date.parse(header??'');
 return Math.max(now+6*3600000,Number.isSafeInteger(parsed)?parsed:0);
}

export async function collectGdeltArchiveChunk({store,now=Date.now(),fetcher=fetch,maxArchives=48,
  throttle=()=>Promise.resolve()}={}){
 if(!store||!finiteTime(now)||!Number.isSafeInteger(maxArchives)||maxArchives<1||maxArchives>96)throw Error('GDELT_BACKFILL_ARGS_INVALID');
 let cp=store.getCheckpoint('gdelt-events-r14')??original(now);
 if(!checkpointOk(cp))throw Error('GDELT_BACKFILL_CHECKPOINT_INVALID');
 if(cp.retryAt>now)return {status:'DEFERRED',reason:'RATE_LIMIT_COOLDOWN',retryAt:cp.retryAt,nextAt:cp.nextAt,...blank()};
 if(cp.nextAt>cp.targetAt){
  const target=floor(now-2*SLOT);
  if(target<=cp.targetAt)return {status:'CAUGHT_UP',nextAt:cp.nextAt,targetAt:cp.targetAt,archivesSaved:cp.archivesSaved,...blank()};
  cp={...cp,targetAt:target};
 }
 const newestNeeded=cp.targetAt;
 const cache=store.getCheckpoint('gdelt-events-index-r14');
 let index=cache?.status==='INDEXED'&&cache.startAt<=cp.nextAt&&cache.targetAt>=newestNeeded
  &&Number.isSafeInteger(cache.checkedAt)&&now-cache.checkedAt<24*3600000?cache:null;
 if(!index){
  index=await fetchMasterWindow({startAt:cp.nextAt,targetAt:newestNeeded,fetcher});
  if(index.status!=='INDEXED'){
   if(index.httpStatus===429)cp.retryAt=retryDelay(index.retryAfter,now);
   store.checkpoint('gdelt-events-r14',cp);
   return {...index,nextAt:cp.nextAt,retryAt:cp.retryAt??null};
  }
  store.checkpoint('gdelt-events-index-r14',index);
 }
 const entries=new Map(index.entries.map(e=>[e.at,e]));
 let processed=0,candidatesStored=0,rowsRead=0;
 for(;cp.nextAt<=cp.targetAt&&processed<maxArchives;){
  const e=entries.get(cp.nextAt);
  if(!e)return {status:'BACKLOG_BLOCKED',reason:'GDELT_ARCHIVE_MISSING_IN_INDEX',nextAt:cp.nextAt,
   targetAt:cp.targetAt,processed,archivesSaved:cp.archivesSaved,...blank()};
  let response;
  try{response=await fetcher(e.archive.url.replace('http://','https://'),
   {headers:{Accept:'application/zip'},signal:AbortSignal.timeout(45000)});}
  catch{return {status:'SOURCE_FAILED',reason:'GDELT_ARCHIVE_FETCH_FAILED',nextAt:cp.nextAt,processed,...blank()};}
  if(response.status!==200){
   if(response.status===429){cp.retryAt=retryDelay(response.headers?.get?.('retry-after'),now);store.checkpoint('gdelt-events-r14',cp);}
   return {status:'SOURCE_FAILED',reason:'GDELT_ARCHIVE_HTTP_'+response.status,httpStatus:response.status,
    retryAt:cp.retryAt??null,nextAt:cp.nextAt,processed,...blank()};
  }
  let extracted,bytes;
  try{bytes=await readBoundedBytes(response,Math.min(MAX_ZIP,e.expectedBytes));
   extracted=parseVerifiedGdeltExport(bytes,e);
  }catch(error){return {status:'SOURCE_FAILED',reason:/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'GDELT_ARCHIVE_INVALID',
   nextAt:cp.nextAt,processed,...blank()};}
  // Idempotent checkpoint contract: persist source and all candidates BEFORE cursor advances.
  for(const candidate of extracted.candidates)store.putCandidate(candidate,now);
  const archiveId=stamp(e.at);
  store.putSource('gdelt-export:'+archiveId,{
   status:'CANDIDATES_ONLY',archiveUrl:e.archive.url,archiveBytes:bytes.length,
   sha256:createHash('sha256').update(bytes).digest('hex'),rowsRead:extracted.rowsRead,
   relatedRows:extracted.relatedRows,candidateCount:extracted.candidates.length,
   checksumVerified:true,coverageVerified:false,attackCount:null
  },now);
  candidatesStored+=extracted.candidates.length;rowsRead+=extracted.rowsRead;
  cp={...cp,nextAt:cp.nextAt+SLOT,archivesSaved:cp.archivesSaved+1};
  delete cp.retryAt;store.checkpoint('gdelt-events-r14',cp);
  processed++;
  if(processed<maxArchives&&cp.nextAt<=cp.targetAt)await throttle();
 }
 return {status:cp.nextAt>cp.targetAt?'CAUGHT_UP':'RUNNING',processed,rowsRead,
  candidatesStored,nextAt:cp.nextAt,targetAt:cp.targetAt,
  archivesSaved:cp.archivesSaved,...blank()};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),max=(args.find(x=>/^--max=\d+$/.test(x))??'--max=48').split('=')[1];
 if(args.some(x=>!/^--max=\d+$/.test(x))){console.error('GDELT_BACKFILL_INVALID_ARGS');process.exitCode=2;}
 else{
  const file=path.join(process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13'),'iran.sqlite');
  const store=openStore(file),owner=randomUUID(),now=Date.now();
  try{
   if(!store.claim(owner,now))console.log(JSON.stringify({status:'RUNNING',reason:'LEASE_HELD'}));
   else {
    const result=await collectGdeltArchiveChunk({store,now,maxArchives:Number(max),
     throttle:()=>new Promise(r=>setTimeout(r,500))});
    console.log(JSON.stringify(result));
    if(result.status==='SOURCE_FAILED'||result.status==='BACKLOG_BLOCKED')process.exitCode=2;
   }
  }catch(error){console.error(/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'GDELT_BACKFILL_FAILED');process.exitCode=2;}
  finally{store.release(owner);store.close();}
 }
}
