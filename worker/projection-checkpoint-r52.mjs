import {readOnlyDualEnv} from './candidate-2db-guard.mjs';
export function observedSourceEnv(native){
 const safe=readOnlyDualEnv(native),failures=[];
 const failed=error=>{const message=String(error?.message??'')+' '+String(error?.cause?.message??'');const code=/quota|daily.*limit|row.*limit/i.test(message)?'D1_QUOTA':/different request|I\/O on behalf/i.test(message)?'SOURCE_REQUEST_SCOPE':/no such table/i.test(message)?'SOURCE_TABLE_MISSING':/CANDIDATE_WRITE_DISABLED/i.test(message)?'CANDIDATE_WRITE_DISABLED':/timeout|timed out/i.test(message)?'SOURCE_TIMEOUT':'STORED_SOURCE_READ_FAILED';failures.push(code);return Error(code);};
 const wrap=db=>!db?undefined:Object.freeze({prepare(sql){let statement;try{statement=db.prepare(sql);}catch(error){throw failed(error)}const bind=s=>Object.freeze({bind(...args){return bind(s.bind(...args))},async first(...args){try{return await s.first(...args)}catch(error){throw failed(error)}},async all(...args){try{return await s.all(...args)}catch(error){throw failed(error)}},run(){throw Error('CANDIDATE_WRITE_DISABLED')}});return bind(statement)},batch(){throw Error('CANDIDATE_WRITE_DISABLED')},exec(){throw Error('CANDIDATE_WRITE_DISABLED')},dump(){throw Error('CANDIDATE_WRITE_DISABLED')}});
 const core=wrap(safe.DB_CORE),history=wrap(safe.DB_HISTORY);
 return {env:Object.freeze({DB:core,DB_CORE:core,DB_HISTORY:history}),assertHealthy(){if(failures.length)throw Error(failures[0])}};
}
export async function readSourceCheckpoint(env){
 const [core,history]=await Promise.all([
 env.DB_CORE.prepare('SELECT stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind('current').first(),
 env.DB_HISTORY.prepare('SELECT date,calculated_at FROM kfg_rev7_snapshots ORDER BY date DESC LIMIT 1').first()
 ]);
 if(!Number.isFinite(Number(core?.stored_at))||!history?.date)throw Error('SOURCE_CHECKPOINT_MISSING');
 const sourceStoredAt=Math.max(Number(core.stored_at),Date.parse(history.calculated_at)||0);
 const bytes=new TextEncoder().encode(JSON.stringify({core:core.stored_at,history:history.date,calculatedAt:history.calculated_at}));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 const sourceVersion=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
 return {sourceVersion,sourceStoredAt};
}
