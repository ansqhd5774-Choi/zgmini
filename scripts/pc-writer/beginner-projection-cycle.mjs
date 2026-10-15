import {hash} from './d1.mjs';
import {buildBeginnerInput,enrichBeginnerPayload,resolveLocalOllamaDigest,validPublicBeginnerCopy} from './beginner-projection-copy.mjs';
import {PUBLIC_PROJECTION_KEYS} from '../../worker/market-public-projection-store.mjs';

const IDS=Object.freeze(['inflation','recession','liquidityCrisis','creditRisk','debtRisk','assetBubble','supplyShock','earningsRecession']);
const safeReason=error=>/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'BEGINNER_COPY_FAILED';

export async function enrichLocalBeginnerProjections({core,fetcher,now=Date.now(),model='gemma3:4b'}={}){
 if(!core||typeof fetcher!=='function')throw Error('BEGINNER_CYCLE_INPUT_INVALID');
 let modelDigest=null,ollamaCalls=0;
 const items=[];
 const localFetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input?.url);
  if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||url.port!=='11434')throw Error('BEGINNER_OLLAMA_LOCAL_ONLY');
  ollamaCalls++;
  return fetcher(input,init);
 };
 const digest=async()=>modelDigest??=(await resolveLocalOllamaDigest(localFetch,model));
 for(const id of IDS){
  const key=PUBLIC_PROJECTION_KEYS[id];
  const row=await core.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(key).first();
  if(!row){items.push({id,status:'SKIPPED',reason:'LOCAL_PROJECTION_MISSING'});continue;}
  let envelope;try{envelope=JSON.parse(row.body);}catch{items.push({id,status:'FALLBACK',reason:'LOCAL_PROJECTION_JSON_INVALID'});continue;}
  if(envelope?.projection?.status!=='READY'||!envelope?.payload){items.push({id,status:'SKIPPED',reason:'LOCAL_PROJECTION_NOT_READY'});continue;}
  const checkpoint={sourceVersion:envelope.projection.sourceVersion,sourceStoredAt:envelope.projection.sourceStoredAt};
  const input=buildBeginnerInput(id,envelope.payload);
  if(!input){
   if(envelope.payload.beginnerCopy){
    const next={...envelope,payload:{...envelope.payload}};delete next.payload.beginnerCopy;
    await core.prepare('UPDATE market_public_snapshots_v1 SET body=?,stored_at=? WHERE snapshot_key=?').bind(JSON.stringify(next),Math.max(Number(row.stored_at)||0,now),key).run();
   }
   items.push({id,status:'FALLBACK',reason:'BEGINNER_INPUT_UNAVAILABLE'});continue;
  }
  const sourceHash=hash(input),existingCopy=envelope.payload.beginnerCopy;
  try{
   const result=await enrichBeginnerPayload(id,envelope.payload,{checkpoint,existingCopy,fetcher:localFetch,model,modelDigest:validPublicBeginnerCopy(existingCopy)&&existingCopy.sourceHash===sourceHash?undefined:await digest(),now});
   const next={...envelope,payload:result.payload};
   if(hash(next)!==hash(envelope))await core.prepare('UPDATE market_public_snapshots_v1 SET body=?,stored_at=? WHERE snapshot_key=?').bind(JSON.stringify(next),Math.max(Number(row.stored_at)||0,now),key).run();
   items.push({id,status:result.status,sourceHash});
  }catch(error){
   if(existingCopy){
    const next={...envelope,payload:{...envelope.payload}};delete next.payload.beginnerCopy;
    await core.prepare('UPDATE market_public_snapshots_v1 SET body=?,stored_at=? WHERE snapshot_key=?').bind(JSON.stringify(next),Math.max(Number(row.stored_at)||0,now),key).run();
   }
   items.push({id,status:'FALLBACK',reason:safeReason(error),sourceHash});
  }
 }
 return {status:items.every(item=>['GENERATED','REUSED'].includes(item.status))?'READY':'PARTIAL',ollamaCalls,items};
}
