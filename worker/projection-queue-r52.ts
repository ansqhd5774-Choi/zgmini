import {PUBLIC_PROJECTION_KEYS,publicProjectionStore} from './market-public-projection-store.mjs';
import {createProjectionQueueConsumer,projectionQueueMessage,PROJECTION_IDS} from './market-projection-queue.mjs';
import {observedSourceEnv,readProjectionCheckpoint,readProjectionCheckpoints} from './projection-checkpoint-r52.mjs';
import {builders} from './projection-builders.ts';
import {loadProjectionSource} from './projection-source-r52.mjs';
import {projectionWriter} from './projection-runtime-r52.mjs';
export async function enqueueProjectionIds(native,ids,{sourceSucceeded,skipReady=true}={}){
 if(sourceSucceeded!==true)throw Error('SOURCE_SUCCESS_REQUIRED');
 if(!native.PUBLIC_PROJECTION_QUEUE?.sendBatch)throw Error('QUEUE_UNAVAILABLE');
 const selected=[...new Set(ids??[])];
 if(!selected.length)return {sent:0,skipped:0};
 for(const id of selected)if(!PROJECTION_IDS.includes(id))throw Error('INVALID_PROJECTION_ID');
 const observed=observedSourceEnv(native),checkpoints=await readProjectionCheckpoints(observed.env,selected);observed.assertHealthy();
 const store=publicProjectionStore(observed.env.DB_CORE),jobs=[];let skipped=0;
 for(const id of selected){
  const checkpoint=checkpoints[id];
  if(skipReady){
   const existing=await store.read(PUBLIC_PROJECTION_KEYS[id]);
   const p=existing?.body?.projection;
   if(p?.status==='READY'&&p.sourceVersion===checkpoint.sourceVersion&&p.sourceStoredAt===checkpoint.sourceStoredAt&&existing?.body?.payload){skipped++;continue;}
  }
  jobs.push(projectionQueueMessage(id,checkpoint));
 }
 if(!jobs.length)return {sent:0,skipped};
 await native.PUBLIC_PROJECTION_QUEUE.sendBatch(jobs.map(body=>({body})));
 return {sent:jobs.length,skipped};
}
export async function enqueueAfterStoredSourceSuccess(native,{sourceSucceeded}){
 return enqueueProjectionIds(native,PROJECTION_IDS,{sourceSucceeded,skipReady:true});
}
export async function consumeProjectionBatch(batch,native,ctx){
 const observed=observedSourceEnv(native),writer=projectionWriter(native.DB_CORE),jobs=new Map();
 const consume=createProjectionQueueConsumer({buildProjection:async(job)=>{
  jobs.set(job.id,job);
  const phases:any[]=[];
  const tLoad=performance.now();const input=await loadProjectionSource(job.id,observed.env,{onPhase:(x:any)=>phases.push(x)});phases.push({phase:'load-total',elapsedMs:performance.now()-tLoad});observed.assertHealthy();
  const tBuild=performance.now();const body=await builders[job.id](input);phases.push({phase:'build',elapsedMs:performance.now()-tBuild});
  const tCheckpoint=performance.now();const after=await readProjectionCheckpoint(observed.env,job.id);phases.push({phase:'checkpoint-final',elapsedMs:performance.now()-tCheckpoint});observed.assertHealthy();
  console.log('R55_PROJECTION_PROFILE',JSON.stringify({id:job.id,phases:phases.map(p=>({phase:p.phase,elapsedMs:Math.round(Number(p.elapsedMs)*100)/100}))}));
  if(job.sourceVersion!==after.sourceVersion||job.sourceStoredAt!==after.sourceStoredAt)throw Error('SOURCE_CHECKPOINT_CHANGED');
  return {body,storedAt:Date.now()};
 },writeProjection:(id,body,storedAt)=>writer.write(id,body,storedAt,jobs.get(id))});
 return consume(batch,Object.freeze({}),ctx);
}
