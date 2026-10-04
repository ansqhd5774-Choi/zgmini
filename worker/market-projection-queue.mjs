import {PUBLIC_PROJECTION_KEYS} from './market-public-projection-store.mjs';

export const PROJECTION_QUEUE_VERSION='PUBLIC_PROJECTION_QUEUE_R1';
export const PROJECTION_IDS=Object.freeze(Object.keys(PUBLIC_PROJECTION_KEYS));
const ID_SET=new Set(PROJECTION_IDS);

export function normalizeProjectionJob(message){
  const body=message?.body??message;
  if(!body||typeof body!=='object'||Object.keys(body).some(key=>!['id','sourceVersion','sourceStoredAt'].includes(key)))throw Error('INVALID_MESSAGE_FIELDS');
  const id=body?.id;
  const sourceVersion=body?.sourceVersion??null;
  const sourceStoredAt=body?.sourceStoredAt;
  if(!ID_SET.has(id))throw Error('INVALID_PROJECTION_ID');
  if(sourceVersion!==null && (typeof sourceVersion!=='string'||sourceVersion.length>128))throw Error('INVALID_SOURCE_VERSION');
  if(!Number.isFinite(sourceStoredAt)||sourceStoredAt<0)throw Error('INVALID_SOURCE_STORED_AT');
  return Object.freeze({id,sourceVersion,sourceStoredAt});
}

export function createProjectionQueueConsumer({buildProjection,writeProjection,now=Date.now}={}){
  if(typeof buildProjection!=='function'||typeof writeProjection!=='function')throw Error('INVALID_QUEUE_CONFIGURATION');
  return async function consume(batch,env,ctx){
    const messages=Array.isArray(batch?.messages)?batch.messages:[];
    const results=[];
    for(const message of messages){
      try{
        const job=normalizeProjectionJob(message);
        const built=await buildProjection(job,env);
        if(!built||!built.body||typeof built.body!=='object'||Array.isArray(built.body))throw Error('PROJECTION_BUILD_FAILED');
        const storedAt=Number.isFinite(built.storedAt)?built.storedAt:now();
        await writeProjection(job.id,built.body,storedAt,env);
        message?.ack?.();
        results.push({id:job.id,status:'ACK',storedAt});
      }catch(error){
        message?.retry?.();
        results.push({id:ID_SET.has(message?.body?.id)?message.body.id:null,status:'RETRY',reason:/^[A-Z][A-Z0-9_]{0,63}$/.test(error?.message??'')?error.message:'PROJECTION_QUEUE_FAILED'});
      }
    }
    return {version:PROJECTION_QUEUE_VERSION,processed:results.length,results};
  };
}

export function projectionQueueMessage(id,{sourceVersion=null,sourceStoredAt=Date.now()}={}){
  if(!ID_SET.has(id))throw Error('INVALID_PROJECTION_ID');
  if(sourceVersion!==null && (typeof sourceVersion!=='string'||sourceVersion.length>128))throw Error('INVALID_SOURCE_VERSION');
  if(!Number.isFinite(sourceStoredAt)||sourceStoredAt<0)throw Error('INVALID_SOURCE_STORED_AT');
  return {id,sourceVersion,sourceStoredAt};
}
