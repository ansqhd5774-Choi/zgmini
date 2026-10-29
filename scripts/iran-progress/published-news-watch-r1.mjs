// PC-only public-news change detector. No provider collection or remote compute.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readPublishedNews} from './published-news-score-input-r1.mjs';
export async function publishedNewsWatchTick(state,{read=readPublishedNews,runScore,now=Date.now()}={}){
 const input=await read({now});
 if(!input?.selected?.items?.length||!/^[a-f0-9]{64}$/.test(input.snapshotHash??''))throw Error('WATCH_INPUT_INVALID');
 if(input.snapshotHash===state?.lastHandledHash)return {status:'UNCHANGED',state,items:input.selected.items.length};
 const result=await runScore();
 if(result?.status!=='PASS'||result.publication!=='D1_AND_API_VERIFIED'||
  result.scoreNewsInput?.status!=='PUBLISHED_NEWS_SYNCED'||
  !/^[a-f0-9]{64}$/.test(result.scoreNewsInput.snapshotHash??''))throw Error('WATCH_SCORE_NOT_VERIFIED');
 return {status:'HANDLED',items:input.selected.items.length,state:{version:'IRAN_PUBLISHED_NEWS_WATCH_R1',
  lastHandledHash:result.scoreNewsInput.snapshotHash,handledAt:now,score:result.score,events:result.events}};
}
export async function runPublishedNewsWatcher({home,once=false,intervalMs=15000}={}){
 if(!path.isAbsolute(home??'')||intervalMs<15000)throw Error('WATCH_OPTIONS_INVALID');
 const stateFile=path.join(home,'published-news-watch-state-r1.json');
 const healthFile=path.join(home,'published-news-watch-health-r1.json');
 const wrapper=path.join(home,'run-r5-provisional-scheduled.mjs');
 const resultFile=path.join(home,'local-r5-scheduled-last-run.json');
 if(!fs.existsSync(wrapper))throw Error('WATCH_SCORER_MISSING');
 const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
 const save=(file,value)=>{fs.writeFileSync(file+'.next',JSON.stringify(value));fs.renameSync(file+'.next',file);};
 let state=fs.existsSync(stateFile)?read(stateFile):null;
 if(state&&state.version!=='IRAN_PUBLISHED_NEWS_WATCH_R1')throw Error('WATCH_STATE_INVALID');
 if(!state&&fs.existsSync(resultFile)){
  const prior=read(resultFile);
  if(prior.status==='PASS'&&prior.publication==='D1_AND_API_VERIFIED'&&prior.scoreNewsInput?.status==='PUBLISHED_NEWS_SYNCED')
   state={version:'IRAN_PUBLISHED_NEWS_WATCH_R1',lastHandledHash:prior.scoreNewsInput.snapshotHash,handledAt:Date.parse(prior.finishedAt)};
 }
 let stopping=false,failures=0,lastHealthAt=0;
 const stop=()=>{stopping=true;};process.once('SIGTERM',stop);process.once('SIGINT',stop);
 try{do{
  let delay=intervalMs;
  try{
   const outcome=await publishedNewsWatchTick(state,{runScore:async()=>{
    const start=Date.now();
    try{await promisify(execFile)(process.execPath,[wrapper],{windowsHide:true,maxBuffer:65536});}
    catch(error){
     const failed=fs.existsSync(resultFile)?read(resultFile):null;
     if(Date.parse(failed?.executedAt)>=start-1000&&/^[A-Z0-9_]+$/.test(failed?.errorCode??''))
      throw Error('WATCH_SCORER_'+failed.errorCode);
     throw Error('WATCH_SCORER_PROCESS_FAILED');
    }
    const result=read(resultFile);
    if(Date.parse(result.executedAt)<start-1000)throw Error('WATCH_SCORE_RESULT_STALE');
    return result;
   }});
   failures=0;
   if(outcome.status==='HANDLED'){state=outcome.state;save(stateFile,state);}
   if(outcome.status==='HANDLED'||Date.now()-lastHealthAt>=60000){
    save(healthFile,{status:'RUNNING',pid:process.pid,checkedAt:Date.now(),intervalMs,
     lastAction:outcome.status,items:outcome.items,lastHandledHash:state?.lastHandledHash??null});lastHealthAt=Date.now();
   }
  }catch(error){
   failures++;delay=Math.min(300000,15000*2**Math.min(failures,5));
   save(healthFile,{status:'RETRY_PENDING',pid:process.pid,checkedAt:Date.now(),failures,nextRetryMs:delay,
    reason:/^[A-Z0-9_]+$/.test(error.message)?error.message:'WATCH_PUBLICATION_OR_NETWORK_FAILURE',lastHandledHash:state?.lastHandledHash??null});
   // No popup, no cache fallback, no handled marker on failed publication.
   if(once)throw error;
  }
  if(!once&&!stopping)await new Promise(resolve=>setTimeout(resolve,delay));
 }while(!once&&!stopping);
 }finally{process.removeListener('SIGTERM',stop);process.removeListener('SIGINT',stop);}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!['--watch','--once'].includes(process.argv[2])||!process.argv[3]||process.argv.length!==4)throw Error('WATCH_MODE_REQUIRED');
 await runPublishedNewsWatcher({home:process.argv[3],once:process.argv[2]==='--once'});
}
