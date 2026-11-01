// Independent PC -> Cloudflare D1 publication for evidence-bound, provisional
// Korean article commentary. R41 metadata, reviewed R1 news and R5 scores are
// neither read nor written by this publisher.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {IRAN_NEWS_ANALYSIS_PUBLIC_KEY_R1,validIranNewsAnalysisSnapshotR1}
 from '../../lib/iran-progress/news-analysis-public-r1.mjs';

const SELECT='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
const UPSERT=`INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at)
 VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET
 body=excluded.body,stored_at=excluded.stored_at
 WHERE excluded.stored_at>market_public_snapshots_v1.stored_at`;
const MAX_STAGED_BYTES=4*1024*1024;

export function readStagedIranNewsAnalysisR1(file){
 if(typeof file!=='string'||!path.isAbsolute(file))throw Error('ANALYSIS_STAGE_PATH_NOT_ABSOLUTE');
 let stat;
 try{stat=fs.lstatSync(file);}catch{throw Error('ANALYSIS_STAGE_FILE_UNAVAILABLE');}
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<=0||stat.size>MAX_STAGED_BYTES)
  throw Error('ANALYSIS_STAGE_FILE_UNSAFE');
 try{return JSON.parse(fs.readFileSync(file,'utf8'));}
 catch{throw Error('ANALYSIS_STAGE_JSON_INVALID');}
}

/**
 * One canonical snapshot key only. D1 writes are never blindly repeated after
 * ambiguous network failures: read-back identifies whether the write landed.
 */
export async function publishIranNewsAnalysisR1(remote,db,snapshot,{now=Date.now()}={}){
 if(!await validIranNewsAnalysisSnapshotR1(snapshot,{now}))
  throw Error('ANALYSIS_PUBLICATION_PAYLOAD_INVALID');
 if(!remote||typeof remote.query!=='function'||typeof remote.request!=='function'||!db)
  throw Error('ANALYSIS_PUBLICATION_CLIENT_MISSING');
 const key=IRAN_NEWS_ANALYSIS_PUBLIC_KEY_R1;
 const encoded=JSON.stringify(snapshot);
 const before=(await remote.query(db,SELECT,[key])).results?.[0]??null;
 if(before&&Number(before.stored_at)>snapshot.publishedAt)
  return {status:'REMOTE_NEWER_PRESERVED',publishedAt:Number(before.stored_at)};
 if(before&&Number(before.stored_at)===snapshot.publishedAt){
  if(before.body===encoded)return {status:'UNCHANGED',itemCount:snapshot.items.length,
   pendingCount:snapshot.pending.length,publishedAt:snapshot.publishedAt};
  throw Error('ANALYSIS_PUBLICATION_SAME_TIME_CONFLICT');
 }
 let writeError;
 try{
  await remote.request(db,[{sql:UPSERT,params:[key,encoded,snapshot.publishedAt]}]);
 }catch(error){writeError=error;}
 const after=(await remote.query(db,SELECT,[key])).results?.[0]??null;
 if(after?.body!==encoded||Number(after?.stored_at)!==snapshot.publishedAt){
  if(after&&Number(after.stored_at)>snapshot.publishedAt)
   return {status:'REMOTE_NEWER_PRESERVED',publishedAt:Number(after.stored_at)};
  throw Object.assign(Error(writeError?'ANALYSIS_PUBLICATION_OUTCOME_UNKNOWN':
   'ANALYSIS_PUBLICATION_READBACK_MISMATCH'),{cause:writeError});
 }
 return {status:'VERIFIED',itemCount:snapshot.items.length,
  pendingCount:snapshot.pending.length,publishedAt:snapshot.publishedAt};
}

export async function runIranNewsAnalysisPublicationR1({file,mode='dry-run',
 now=Date.now(),getRemote}={}){
 if(!['dry-run','publish'].includes(mode))throw Error('ANALYSIS_PUBLICATION_MODE_INVALID');
 const snapshot=readStagedIranNewsAnalysisR1(file);
 if(!await validIranNewsAnalysisSnapshotR1(snapshot,{now}))
  throw Error('ANALYSIS_PUBLICATION_PAYLOAD_INVALID');
 const report={version:snapshot.version,mode,itemCount:snapshot.items.length,
  pendingCount:snapshot.pending.length,publishedAt:snapshot.publishedAt};
 if(mode==='dry-run')return {...report,status:'DRY_RUN_VALIDATED',d1WriteAttempted:false};
 if(typeof getRemote!=='function')throw Error('ANALYSIS_PUBLICATION_CLIENT_MISSING');
 const {remote,db}=await getRemote();
 const published=await publishIranNewsAnalysisR1(remote,db,snapshot,{now});
 return {...report,...published,d1WriteAttempted:true};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const flags={};
 for(const arg of process.argv.slice(2)){
  const index=arg.indexOf('=');
  if(index<3||!arg.startsWith('--'))throw Error('ANALYSIS_PUBLICATION_CLI_INVALID');
  const key=arg.slice(2,index);
  if(key in flags||!['input','mode'].includes(key))throw Error('ANALYSIS_PUBLICATION_CLI_INVALID');
  flags[key]=arg.slice(index+1);
 }
 if(!flags.input||!['dry-run','publish'].includes(flags.mode))
  throw Error('ANALYSIS_PUBLICATION_CLI_INVALID');
 try{
  const report=await runIranNewsAnalysisPublicationR1({file:flags.input,mode:flags.mode,
   getRemote:async()=>{
    const repoRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
    const configFile=path.join(os.homedir(),'.zgmini','pc-writer','config.json');
    const config=JSON.parse(fs.readFileSync(configFile,'utf8'));
    const {client,credential}=await import('../pc-writer/d1.mjs');
    // Existing configured CORE D1 and credential; no secret in stdout/logs.
    return {remote:client(config,credential(repoRoot)),db:config.core};
   }});
  console.log(JSON.stringify(report));
 }catch(error){
  console.error(JSON.stringify({status:'ANALYSIS_PUBLICATION_FAILED',reason:error.message}));
  process.exitCode=1;
 }
}
