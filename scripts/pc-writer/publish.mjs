import {liquidityHistoryRow} from '../../worker/market-score-response-store.mjs';
import {LIQUIDITY_ACTIVE_HISTORY_METHOD} from '../../worker/liquidity-active-history-reader.mjs';
import {hash,save} from './d1.mjs';

export function marketPlan(body,now,lease,previous){
 if(body?.status!=='SUCCESS'||body.domains?.length!==12||!Number.isSafeInteger(now)||!lease)throw Error('INVALID_MARKET_PUBLICATION');
 const encoded=JSON.stringify(body),plan=[];
 plan.push({sql:"SELECT CASE WHEN EXISTS(SELECT 1 FROM market_collection_jobs_v1 WHERE job='pipeline' AND lease_id=? AND lease_until>?) AND COALESCE((SELECT stored_at FROM market_public_snapshots_v1 WHERE snapshot_key='current'),-1)=? THEN 1 ELSE json('PC_SOURCE_OR_LEASE_CHANGED') END AS guarded",params:[lease,Date.now(),previous??-1]});
 const liquidity=liquidityHistoryRow(encoded,now);
 if(liquidity)plan.push({sql:'INSERT INTO market_liquidity_active_history_v1 VALUES(?,?,?,?) ON CONFLICT(as_of_date,methodology_version) DO UPDATE SET score=excluded.score,stored_at=excluded.stored_at',params:[liquidity.asOfDate,LIQUIDITY_ACTIVE_HISTORY_METHOD,liquidity.score,liquidity.storedAt]});
 for(const key of [new Date(now).toISOString().slice(0,10),'current'])plan.push({sql:'INSERT INTO market_public_snapshots_v1 VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at',params:[key,encoded,now]});
 return plan;
}

export async function claimMarket(client,db){
 const now=Date.now(),id=crypto.randomUUID();
 await client.request(db,[{sql:"INSERT INTO market_collection_jobs_v1(job,lease_id,lease_until,finished_at,status) VALUES('pipeline',?,?,?,'RUNNING') ON CONFLICT(job) DO UPDATE SET lease_id=excluded.lease_id,lease_until=excluded.lease_until,finished_at=excluded.finished_at,status=excluded.status WHERE market_collection_jobs_v1.lease_until<=?",params:[id,now+180000,now,now]}]);
 const row=(await client.query(db,"SELECT lease_id FROM market_collection_jobs_v1 WHERE job='pipeline'")).results?.[0];
 return row?.lease_id===id?id:null;
}
export async function releaseMarket(client,db,id){await client.request(db,[{sql:"UPDATE market_collection_jobs_v1 SET lease_id=NULL,lease_until=0,status='IDLE',finished_at=? WHERE job='pipeline' AND lease_id=?",params:[Date.now(),id]}]);}

export async function publishMarket(client,db,body,now,lease,previous,file){
 const pending={status:'SUBMITTING',storedAt:now,bodyHash:hash(body)};save(file,pending);
 let writeError;try{await client.request(db,marketPlan(body,now,lease,previous));}catch(error){writeError=error;}
 // A timeout is not permission to repeat a mutation: always read back first.
 const row=(await client.query(db,"SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key='current'")).results?.[0];
 if(row?.stored_at!==now||hash(JSON.parse(row.body))!==pending.bodyHash)throw Error(writeError?'MARKET_PUBLISH_OUTCOME_UNKNOWN':'MARKET_READBACK_MISMATCH');
 save(file,{...pending,status:'VERIFIED'});return {status:'VERIFIED',storedAt:now};
}
