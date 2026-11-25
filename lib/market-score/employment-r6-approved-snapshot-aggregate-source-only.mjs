// W04 opt-in adapter: consume an already-open, approved, query_only Core
// SQLite read transaction. This module never opens a path, owns a transaction,
// writes an output file, or authorizes PIT/history repair or publication.
import {EMPLOYMENT_R6_TABLES as T,EMPLOYMENT_R6_GROUPS as GROUPS}
 from './employment-r6-contract.mjs';
import {verifyAndAggregateStoredR6Snapshots} from './employment-r6-raw-aggregate-source-only.mjs';

const fail=code=>{throw Object.assign(Error(code),{code});};
const COLS=['snapshot_id','chunk_index','chunk_count','release_group','provider',
 'request_key','retrieved_at','created_at','body_sha256','detail_json','body_chunk'];
const RUNS=['provider','status','completed_at','detail_json'];
const MAX={snapshots:4000,rows:16000,bytes:64*1024*1024,runs:20000,refs:40000};
const stamp=d=>typeof d==='string'&&/^20\d{2}-(?:0[1-9]|1[0-2])-[0-3]\d$/.test(d)
 &&Number.isFinite(Date.parse(d+'T00:00:00Z'))
 &&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
function columns(db,table,required){
 if(!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))
  fail('R6_OPEN_SNAPSHOT_SCHEMA_UNAVAILABLE');
 const names=new Set(db.prepare('PRAGMA table_info('+table+')').all().map(x=>x.name));
 if(required.some(x=>!names.has(x)))fail('R6_OPEN_SNAPSHOT_SCHEMA_UNAVAILABLE');
}
function details(value){
 if(typeof value!=='string'||Buffer.byteLength(value)>262144)fail('R6_OPEN_SNAPSHOT_DETAIL_INVALID');
 let parsed;try{parsed=JSON.parse(value);}catch{fail('R6_OPEN_SNAPSHOT_DETAIL_INVALID');}
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))
  fail('R6_OPEN_SNAPSHOT_DETAIL_INVALID');
 return parsed;
}
/** Caller owns approval, read-only connection, BEGIN snapshot, and ROLLBACK.
 * No assertion of Windows inode binding, CAS/lease, or source completeness.
 */
export function aggregateR6FromApprovedOpenSnapshot({db,asOfDate}={}){
 if(!db||typeof db.prepare!=='function'||!stamp(asOfDate))
  fail('R6_OPEN_SNAPSHOT_INPUT_INVALID');
 // Ensure writer connections cannot silently enter through this opt-in API.
 try{
  if(db.prepare('PRAGMA query_only').get()?.query_only!==1)
   fail('R6_OPEN_SNAPSHOT_QUERY_ONLY_REQUIRED');
 }catch(e){
  if(e?.code==='R6_OPEN_SNAPSHOT_QUERY_ONLY_REQUIRED')throw e;
  fail('R6_OPEN_SNAPSHOT_QUERY_ONLY_REQUIRED');
 }
 columns(db,T.rawSnapshot,COLS);columns(db,T.runs,RUNS);
 const groups=Object.keys(GROUPS),cutoff=new Date(Math.min(Date.now(),
   Date.parse(asOfDate+'T23:59:59.999Z'))).toISOString();
 const raw=[],runs=[];let pending=null,rows=0,bytes=0;
 const flush=()=>{
  if(!pending)return;
  if(pending.parts.length!==pending.count)fail('R6_OPEN_SNAPSHOT_CHUNKS_INVALID');
  raw.push({snapshotId:pending.id,releaseGroup:pending.group,provider:pending.provider,
   requestKey:pending.key,retrievedAt:pending.retrieved,createdAt:pending.created,
   bodySha256:pending.sha,responseHash:pending.response,body:pending.parts.join('')});
  pending=null;
 };
 const sql='SELECT '+COLS.join(',')+' FROM '+T.rawSnapshot+
   ' WHERE retrieved_at<=? ORDER BY snapshot_id,chunk_index';
 for(const row of db.prepare(sql).iterate(cutoff)){
  if(++rows>MAX.rows)fail('R6_OPEN_SNAPSHOT_ROW_CAP');
  if(!groups.includes(row.release_group)||row.provider!==GROUPS[row.release_group].provider
    ||!Number.isSafeInteger(row.chunk_index)||!Number.isSafeInteger(row.chunk_count)
    ||row.chunk_count<1||row.chunk_count>4096||typeof row.body_chunk!=='string')
   fail('R6_OPEN_SNAPSHOT_ROW_INVALID');
  bytes+=Buffer.byteLength(row.body_chunk,'utf8');
  if(bytes>MAX.bytes)fail('R6_OPEN_SNAPSHOT_BYTE_CAP');
  if(!pending||pending.id!==row.snapshot_id){
   flush();
   if(raw.length>=MAX.snapshots)fail('R6_OPEN_SNAPSHOT_CAP');
   pending={id:row.snapshot_id,group:row.release_group,provider:row.provider,
    key:row.request_key,retrieved:row.retrieved_at,created:row.created_at,
    sha:row.body_sha256,response:details(row.detail_json).responseHash,
    detailJson:row.detail_json,count:row.chunk_count,parts:[]};
  }
  if(row.release_group!==pending.group||row.provider!==pending.provider
    ||row.request_key!==pending.key||row.retrieved_at!==pending.retrieved
    ||row.created_at!==pending.created||row.body_sha256!==pending.sha
    ||row.detail_json!==pending.detailJson||row.chunk_count!==pending.count
    ||row.chunk_index!==pending.parts.length)
   fail('R6_OPEN_SNAPSHOT_CHUNKS_INVALID');
  pending.parts.push(row.body_chunk);
 }
 flush();
 const providers=groups.map(g=>'EMPLOYMENT_R6_'+g);
 const runSql='SELECT '+RUNS.join(',')+' FROM '+T.runs+
   ' WHERE completed_at<=? AND provider IN ('+providers.map(()=>'?').join(',')+')'+
   " AND status IN ('SUCCESS','PARTIAL') ORDER BY completed_at";
 let refs=0;
 for(const row of db.prepare(runSql).iterate(cutoff,...providers)){
  if(runs.length>=MAX.runs)fail('R6_OPEN_SNAPSHOT_RUN_CAP');
  const detail=details(row.detail_json);
  if(!Array.isArray(detail.rawSnapshots)||detail.rawSnapshots.length>MAX.snapshots)
   fail('R6_OPEN_SNAPSHOT_RUN_INVALID');
  refs+=detail.rawSnapshots.length;
  if(refs>MAX.refs)fail('R6_OPEN_SNAPSHOT_REFERENCE_CAP');
  runs.push({provider:row.provider,status:row.status,completedAt:row.completed_at,
   rawSnapshots:detail.rawSnapshots});
 }
 const result=verifyAndAggregateStoredR6Snapshots({snapshots:raw,runs,allowedGroups:groups,
  asOfDate});
 return {...result,inputSnapshotIdentity:'CALLER_OWNED_QUERY_ONLY_CORE_TRANSACTION',
  transactionOwnershipVerified:false,runtimeAuthorizationVerified:false,
  historicalPitAttested:false,repairAuthorized:false};
}
