// One-time initial catch-up. Each bounded child owns the existing SQLite lease.
// No schedule, scoring, verified input, or public publication changes.
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const SLOT=900000;
export async function runContinuousBackfill({runChunk,readCheckpoint,onProgress=()=>{},clock=Date.now,maxChunks=32,maxMinutes=60}={}){
 if(typeof runChunk!=='function'||typeof readCheckpoint!=='function'||!Number.isInteger(maxChunks)||maxChunks<1||maxChunks>64||!Number.isInteger(maxMinutes)||maxMinutes<1||maxMinutes>120)throw Error('CONTINUOUS_BACKFILL_ARGS_INVALID');
 const startedAt=clock();let chunks=0,processed=0;
 const start=readCheckpoint();
 if(!start)throw Error('CONTINUOUS_BACKFILL_EXISTING_CHECKPOINT_REQUIRED');
 while(chunks<maxChunks&&clock()-startedAt<maxMinutes*60000){
  const before=readCheckpoint();
  if(before.retryAt>clock())return {status:'DEFERRED',reason:'RATE_LIMIT_COOLDOWN',retryAt:before.retryAt,chunks,processed};
  const result=await runChunk();chunks++;
  const after=readCheckpoint();
  if(!['RUNNING','CAUGHT_UP'].includes(result.status)||result.reason==='LEASE_HELD')return {...result,chunks,processed};
  if(after.nextAt<before.nextAt||after.archivesSaved<before.archivesSaved)throw Error('CONTINUOUS_BACKFILL_CHECKPOINT_REGRESSED');
  if(result.nextAt!==after.nextAt||result.archivesSaved!==after.archivesSaved)throw Error('CONTINUOUS_BACKFILL_READBACK_MISMATCH');
  processed+=result.processed??0;
  const latestTarget=Math.floor((clock()-2*SLOT)/SLOT)*SLOT;
  const report={status:after.nextAt>latestTarget?'CAUGHT_UP':'RUNNING',startedAt,updatedAt:clock(),chunks,processed,
   initialArchivesSaved:start.archivesSaved,archivesSaved:after.archivesSaved,nextAt:after.nextAt,targetAt:latestTarget,
   remainingSlices:Math.max(0,Math.floor((latestTarget-after.nextAt)/SLOT)+1),coverageVerified:false,eventVerified:false,publication:'NOT_REQUESTED'};
  await onProgress(report);
  if(report.status==='CAUGHT_UP')return report;
  if(after.nextAt===before.nextAt)throw Error('CONTINUOUS_BACKFILL_NO_PROGRESS');
 }
 return {status:'RUNNING',reason:'BOUNDED_RUN_LIMIT_REACHED',startedAt,chunks,processed,checkpoint:readCheckpoint()};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args.some(a=>!/^--max-(chunks|minutes)=\d+$/.test(a)))throw Error('CONTINUOUS_BACKFILL_ARGS_INVALID');
 const maxChunks=Number((args.find(a=>a.startsWith('--max-chunks='))??'--max-chunks=32').split('=')[1]);
 const maxMinutes=Number((args.find(a=>a.startsWith('--max-minutes='))??'--max-minutes=60').split('=')[1]);
 const base=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13');
 const script=path.join(path.dirname(fileURLToPath(import.meta.url)),'gdelt-backfill-r14.mjs');
 const readCheckpoint=()=>{const db=new DatabaseSync(path.join(base,'iran.sqlite'),{readOnly:true});try{
  const row=db.prepare("SELECT body FROM checkpoints WHERE name='gdelt-events-r14'").get();return row?JSON.parse(row.body):null;
 }finally{db.close();}};
 const runChunk=()=>new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[script,'--max=96'],{windowsHide:true,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';
  child.stdout.on('data',b=>{stdout+=b;if(stdout.length>65536)child.kill();});
  child.stderr.on('data',b=>{stderr+=b;if(stderr.length>65536)child.kill();});
  child.on('error',()=>reject(Error('CONTINUOUS_BACKFILL_CHILD_START_FAILED')));
  child.on('close',code=>{try{const result=JSON.parse(stdout.trim());if(code!==0&&result.status!=='SOURCE_FAILED'&&result.status!=='BACKLOG_BLOCKED')throw Error();resolve(result);}catch{reject(Error('CONTINUOUS_BACKFILL_CHILD_RESULT_INVALID'));}});
 });
 try{
  const result=await runContinuousBackfill({runChunk,readCheckpoint,maxChunks,maxMinutes,onProgress:report=>{
   fs.writeFileSync(path.join(base,'backfill-continuous-last-run.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  }});
  fs.writeFileSync(path.join(base,'backfill-continuous-last-run.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  if(['SOURCE_FAILED','BACKLOG_BLOCKED'].includes(result.status))process.exitCode=2;
 }catch(error){console.error(/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'CONTINUOUS_BACKFILL_FAILED');process.exitCode=2;}
}
