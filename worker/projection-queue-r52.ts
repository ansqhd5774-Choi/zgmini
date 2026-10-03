import {PUBLIC_PROJECTION_KEYS,publicProjectionStore} from './market-public-projection-store.mjs';
import {createProjectionQueueConsumer,projectionQueueMessage,PROJECTION_IDS} from './market-projection-queue.mjs';
import {observedSourceEnv,readSourceCheckpoint} from './projection-checkpoint-r52.mjs';
import {builders} from './projection-builders.ts';
import {loadProjectionSource} from './projection-source-r52.mjs';
import {projectionWriter} from './projection-runtime-r52.mjs';
export async function enqueueAfterStoredSourceSuccess(native,{sourceSucceeded}){
 if(sourceSucceeded!==true)throw Error('SOURCE_SUCCESS_REQUIRED');
 if(!native.PUBLIC_PROJECTION_QUEUE?.sendBatch)throw Error('QUEUE_UNAVAILABLE');
 const observed=observedSourceEnv(native),checkpoint=await readSourceCheckpoint(observed.env);observed.assertHealthy();
 const jobs=PROJECTION_IDS.map(id=>projectionQueueMessage(id,checkpoint));
 return native.PUBLIC_PROJECTION_QUEUE.sendBatch(jobs.map(body=>({body})));
}
export async function consumeProjectionBatch(batch,native,ctx){
 const observed=observedSourceEnv(native),writer=projectionWriter(native.DB_CORE),jobs=new Map();
 const consume=createProjectionQueueConsumer({buildProjection:async(job)=>{
  const before=await readSourceCheckpoint(observed.env);
  if(job.sourceVersion!==before.sourceVersion||job.sourceStoredAt!==before.sourceStoredAt)throw Error('SOURCE_CHECKPOINT_CHANGED');
  jobs.set(job.id,job);
  const existing=await publicProjectionStore(observed.env.DB_CORE).read(PUBLIC_PROJECTION_KEYS[job.id]);
  const p=existing?.body?.projection;
  if(p?.status==='READY'&&p.sourceVersion===job.sourceVersion&&p.sourceStoredAt===job.sourceStoredAt&&existing.body.payload)return {body:existing.body.payload,storedAt:existing.storedAt};
  const phases:any[]=[];
  const tInvalidate=performance.now();await writer.invalidate(job.id,job);phases.push({phase:'invalidate',elapsedMs:performance.now()-tInvalidate});
  const tLoad=performance.now();const input=await loadProjectionSource(job.id,observed.env,{onPhase:(x:any)=>phases.push(x)});phases.push({phase:'load-total',elapsedMs:performance.now()-tLoad});observed.assertHealthy();
  const tBuild=performance.now();const body=await builders[job.id](input);phases.push({phase:'build',elapsedMs:performance.now()-tBuild});
  const tCheckpoint=performance.now();const after=await readSourceCheckpoint(observed.env);phases.push({phase:'checkpoint-after',elapsedMs:performance.now()-tCheckpoint});observed.assertHealthy();
  console.log('R53_PROJECTION_PROFILE',JSON.stringify({id:job.id,phases:phases.map(p=>({phase:p.phase,elapsedMs:Math.round(Number(p.elapsedMs)*100)/100}))}));
  if(after.sourceVersion!==before.sourceVersion)throw Error('SOURCE_CHECKPOINT_CHANGED');
  return {body,storedAt:Date.now()};
 },writeProjection:(id,body,storedAt)=>writer.write(id,body,storedAt,jobs.get(id))});
 return consume(batch,Object.freeze({}),ctx);
}
