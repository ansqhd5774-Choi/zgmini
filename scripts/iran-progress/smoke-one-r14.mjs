// Explicit one-off PC smoke test: ONE GDELT Events file, no scheduled/backfill
// cursor mutation, no publish, no AI and no VERIFIED event promotion.
import {createHash,randomUUID} from 'node:crypto';
import {openStore} from './store.mjs';
import {parseGdeltArchiveManifest} from './source-recovery.mjs';
import {parseVerifiedGdeltExport} from './gdelt-events-archive.mjs';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const LASTUPDATE='https://data.gdeltproject.org/gdeltv2/lastupdate.txt';
const DEFAULT_BASE=path.join(os.homedir(),'.zgmini','iran-progress-r13');
const noResults={attackCount:null,eventVerified:false,coverageVerified:false,productionEligible:false};

async function cappedGet(url,max,fetcher){
 const r=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(30000),
  headers:{Accept:'text/plain,application/zip'}});
 if(r.status!==200)throw Error('GDELT_HTTP_'+r.status);
 if(!r.body?.getReader)throw Error('GDELT_EMPTY_RESPONSE');
 const reader=r.body.getReader(),parts=[];let length=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;
  length+=value.byteLength;if(length>max)throw Error('GDELT_RESPONSE_TOO_LARGE');parts.push(value);}}
 finally{await reader.cancel().catch(()=>{});}
 return Buffer.concat(parts,length);
}
function responseError(error){
 const message=String(error?.message??'');
 return /^[A-Z][A-Z0-9_]+$/.test(message)?message:'GDELT_ONE_FILE_FAILED';
}
export async function collectOneGdeltFile({store,fetcher=fetch,now=Date.now()}={}){
 if(!store?.putCandidate||!store?.putSource||!store?.db||!Number.isSafeInteger(now))throw Error('GDELT_SMOKE_INPUT_INVALID');
 let index;
 try{index=await cappedGet(LASTUPDATE,4096,fetcher);}
 catch(e){return {status:'SOURCE_FAILED',reason:responseError(e),...noResults};}
 let exportRecord;
 try{exportRecord=parseGdeltArchiveManifest(index.toString('utf8')).archives[0];}
 catch(e){return {status:'SOURCE_FAILED',reason:responseError(e),...noResults};}
 if(exportRecord.bytes>16*1024*1024)return {status:'SOURCE_FAILED',reason:'GDELT_ARCHIVE_TOO_LARGE',...noResults};
 const timestamp=exportRecord.url.match(/\/(\d{14})\.export\.CSV\.zip$/)?.[1];
 if(!timestamp)return {status:'SOURCE_FAILED',reason:'GDELT_EXPORT_SOURCE_INVALID',...noResults};
 const stamp=timestamp.slice(0,4)+'-'+timestamp.slice(4,6)+'-'+timestamp.slice(6,8)+'T'+timestamp.slice(8,10)+':'+timestamp.slice(10,12)+':'+timestamp.slice(12,14)+'Z';
 const publishedAt=Date.parse(stamp);
 if(!Number.isSafeInteger(publishedAt)||publishedAt>now||now-publishedAt>24*3600000)
  return {status:'SOURCE_FAILED',reason:'GDELT_LASTUPDATE_STALE_OR_FUTURE',...noResults};
 let zip,parsed;
 try{
  zip=await cappedGet(exportRecord.url.replace('http://','https://'),exportRecord.bytes,fetcher);
  parsed=parseVerifiedGdeltExport(zip,{archive:exportRecord,expectedBytes:exportRecord.bytes,reportedMd5:exportRecord.reportedMd5});
 }catch(e){return {status:'SOURCE_FAILED',reason:responseError(e),...noResults};}
 const id='gdelt-export:'+timestamp;
 const source={status:'CANDIDATES_ONLY',archiveUrl:exportRecord.url,archiveBytes:zip.length,
  sha256:createHash('sha256').update(zip).digest('hex'),rowsRead:parsed.rowsRead,
  relatedRows:parsed.relatedRows,candidateCount:parsed.candidates.length,
  checksumVerified:true,coverageVerified:false,attackCount:null};
 // Write candidates and immutable source metadata; NEVER move the 28-day cursor.
 for(const candidate of parsed.candidates)store.putCandidate(candidate,now);
 store.putSource(id,source,now);
 const stored=store.db.prepare('SELECT body FROM sources WHERE id=?').get(id);
 if(!stored||JSON.stringify(JSON.parse(stored.body))!==JSON.stringify(source))throw Error('GDELT_SMOKE_SOURCE_READBACK_FAILED');
 const count=store.db.prepare("SELECT count(*) AS n FROM discovery_candidates WHERE id LIKE 'GDELT:%'").get().n;
 return {status:'ONE_FILE_STORED',timestamp,bytes:zip.length,rowsRead:parsed.rowsRead,
  relatedRows:parsed.relatedRows,candidatesInArchive:parsed.candidates.length,
  candidatesInDatabase:count,checksumVerified:true,sourceReadbackVerified:true,
  actualArchiveFetched:true,...noResults};
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const base=process.env.ZGMINI_IRAN_HOME??DEFAULT_BASE;
 if(process.argv.length!==2){console.error('GDELT_SMOKE_NO_ARGS_ALLOWED');process.exitCode=2;}
 else{
  const dbFile=path.join(base,'iran.sqlite');
  if(!fs.existsSync(dbFile)){console.error('IRAN_SQLITE_NOT_FOUND');process.exitCode=2;}
  else{
   const store=openStore(dbFile),owner=randomUUID(),now=Date.now();
   try{
    if(!store.claim(owner,now)){console.log(JSON.stringify({status:'RUNNING',reason:'LEASE_HELD'}));process.exitCode=2;}
    else{
     const r=await collectOneGdeltFile({store,now});
     console.log(JSON.stringify(r,null,2));
     if(r.status!=='ONE_FILE_STORED')process.exitCode=2;
    }
   }catch(e){console.error(responseError(e));process.exitCode=2;}
   finally{store.release(owner);store.close();}
  }
 }
}
