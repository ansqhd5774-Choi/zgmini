import {readOnlyDualEnv} from './candidate-2db-guard.mjs';

const PROJECTION_BUILD_VERSIONS=Object.freeze({earningsRecession:'earnings-e1-r5-detail-r1'});

function projectionCheckpointVersion(checkpoint,id){
 const buildVersion=PROJECTION_BUILD_VERSIONS[id];
 return buildVersion?{...checkpoint,sourceVersion:`${checkpoint.sourceVersion}:${buildVersion}`}:checkpoint;
}

export function observedSourceEnv(native){
 const safe=readOnlyDualEnv(native),failures=[];
 const failed=error=>{const message=String(error?.message??'')+' '+String(error?.cause?.message??'');const code=/quota|daily.*limit|row.*limit/i.test(message)?'D1_QUOTA':/different request|I\/O on behalf/i.test(message)?'SOURCE_REQUEST_SCOPE':/no such table/i.test(message)?'SOURCE_TABLE_MISSING':/CANDIDATE_WRITE_DISABLED/i.test(message)?'CANDIDATE_WRITE_DISABLED':/timeout|timed out/i.test(message)?'SOURCE_TIMEOUT':'STORED_SOURCE_READ_FAILED';failures.push(code);return Error(code);};
 const wrap=db=>!db?undefined:Object.freeze({prepare(sql){let statement;try{statement=db.prepare(sql);}catch(error){throw failed(error)}const bind=s=>Object.freeze({bind(...args){return bind(s.bind(...args))},async first(...args){try{return await s.first(...args)}catch(error){throw failed(error)}},async all(...args){try{return await s.all(...args)}catch(error){throw failed(error)}},run(){throw Error('CANDIDATE_WRITE_DISABLED')}});return bind(statement)},batch(){throw Error('CANDIDATE_WRITE_DISABLED')},exec(){throw Error('CANDIDATE_WRITE_DISABLED')},dump(){throw Error('CANDIDATE_WRITE_DISABLED')}});
 const core=wrap(safe.DB_CORE),history=wrap(safe.DB_HISTORY);
 return {env:Object.freeze({DB:core,DB_CORE:core,DB_HISTORY:history}),assertHealthy(){if(failures.length)throw Error(failures[0])}};
}

async function readCoreCheckpoint(env){
 const row=await env.DB_CORE.prepare('SELECT stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind('current').first();
 const storedAt=Number(row?.stored_at);
 if(!Number.isFinite(storedAt))throw Error('SOURCE_CHECKPOINT_MISSING');
 return {sourceVersion:`core:${storedAt}`,sourceStoredAt:storedAt};
}

async function readHistoryCheckpoint(env){
 const row=await env.DB_HISTORY.prepare('SELECT date,calculated_at FROM kfg_rev7_snapshots ORDER BY date DESC LIMIT 1').first();
 if(!row?.date)throw Error('SOURCE_CHECKPOINT_MISSING');
 const calculatedAt=Date.parse(row.calculated_at)||0;
 const sourceStoredAt=calculatedAt;
 return {sourceVersion:`kfg:${row.date}:${row.calculated_at??''}`,sourceStoredAt};
}

export async function readProjectionCheckpoint(env,id){
 const checkpoint=id==='koreaFearGreed'?await readHistoryCheckpoint(env):await readCoreCheckpoint(env);
 return projectionCheckpointVersion(checkpoint,id);
}

export async function readProjectionCheckpoints(env,ids){
 const needHistory=ids.includes('koreaFearGreed');
 const needCore=ids.some(id=>id!=='koreaFearGreed');
 const [core,history]=await Promise.all([
  needCore?readCoreCheckpoint(env):null,
  needHistory?readHistoryCheckpoint(env):null,
 ]);
 return Object.fromEntries(ids.map(id=>[id,projectionCheckpointVersion(id==='koreaFearGreed'?history:core,id)]));
}

// Backward-compatible combined checkpoint for tooling that still expects the old contract.
export async function readSourceCheckpoint(env){
 const points=await readProjectionCheckpoints(env,['recession','koreaFearGreed']);
 const core=points.recession,history=points.koreaFearGreed;
 return core.sourceStoredAt>=history.sourceStoredAt?core:history;
}
