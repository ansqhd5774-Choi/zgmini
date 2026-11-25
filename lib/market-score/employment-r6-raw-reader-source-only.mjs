// Detached W04 source-only adapter. Not wired into the PC Runner or scheduled work.
// The caller supplies an already-authorized exact Core DB path; no Issue/user input.
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {EMPLOYMENT_R6_TABLES,EMPLOYMENT_R6_GROUPS} from './employment-r6-contract.mjs';
import {verifyAndAggregateStoredR6Snapshots} from './employment-r6-raw-aggregate-source-only.mjs';

const fail=code=>{const e=Error(code);e.code=code;throw e;};
const COLS={
 raw:['snapshot_id','chunk_index','chunk_count','release_group','provider','request_key',
  'retrieved_at','created_at','body_sha256','detail_json','body_chunk'],
 run:['provider','status','completed_at','detail_json'],
};
const LIMIT={snapshots:4000,rows:16000,runs:20000,bytes:64*1024*1024,refs:40000};
function parseDetails(s){
 if(typeof s!=='string'||Buffer.byteLength(s)>256*1024)fail('R6_READER_DETAIL_INVALID');
 let value;try{value=JSON.parse(s);}catch{fail('R6_READER_DETAIL_INVALID');}
 if(!value||typeof value!=='object'||Array.isArray(value))fail('R6_READER_DETAIL_INVALID');
 return value;
}
function hasTable(db,table,cols){
 const present=db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
 if(!present)return false;
 const actual=new Set(db.prepare('PRAGMA table_info('+table+')').all().map(c=>c.name));
 return cols.every(x=>actual.has(x));
}
/**
 * Read one bounded SQLite snapshot, then release read locks before hashing.
 * Only a caller pre-approved, realpath-equal physical DB is accepted.
 * This is not a source installation/lease/authorization attestation.
 */
export function readAndAggregateR6RawSourceOnly({
 dbPath,approvedDbRealpath,asOfDate,beforeReadOnlyOpen=null,
}={}){
 if(typeof dbPath!=='string'||!path.isAbsolute(dbPath)
   ||typeof approvedDbRealpath!=='string'||!path.isAbsolute(approvedDbRealpath)
   ||!fs.existsSync(dbPath)||!fs.statSync(dbPath).isFile()
   ||fs.realpathSync(dbPath)!==approvedDbRealpath)
  fail('R6_READER_PATH_UNVERIFIED');
 if(typeof asOfDate!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(asOfDate)
   ||!Number.isFinite(Date.parse(asOfDate+'T00:00:00Z'))
   ||new Date(asOfDate+'T00:00:00Z').toISOString().slice(0,10)!==asOfDate)
  fail('R6_READER_DATE_INVALID');
 const cutoff=new Date(Math.min(Date.now(),Date.parse(asOfDate+'T23:59:59.999Z'))).toISOString();
 const groups=Object.keys(EMPLOYMENT_R6_GROUPS);
 let db=null,active=false;
 const raw=[],runs=[],rawTable=EMPLOYMENT_R6_TABLES.rawSnapshot,runTable=EMPLOYMENT_R6_TABLES.runs;
 try{
  beforeReadOnlyOpen?.(dbPath);
  db=new DatabaseSync(dbPath,{readOnly:true});
  db.exec('PRAGMA query_only=ON');
  db.exec('BEGIN');active=true;
  if(!hasTable(db,rawTable,COLS.raw)||!hasTable(db,runTable,COLS.run))
   fail('R6_READER_SCHEMA_UNAVAILABLE');
  const sql='SELECT '+COLS.raw.join(',')+' FROM '+rawTable+
    ' WHERE retrieved_at<=? ORDER BY snapshot_id,chunk_index';
  let pending=null,rowCount=0,bytes=0;
  const flush=()=>{
   if(!pending)return;
   if(pending.parts.length!==pending.chunkCount)fail('R6_READER_CHUNKS_INVALID');
   raw.push({snapshotId:pending.id,releaseGroup:pending.group,provider:pending.provider,
    requestKey:pending.requestKey,retrievedAt:pending.retrievedAt,
    createdAt:pending.createdAt,bodySha256:pending.sha,
    responseHash:pending.responseHash,body:pending.parts.join('')});
   pending=null;
  };
  for(const row of db.prepare(sql).iterate(cutoff)){
   if(++rowCount>LIMIT.rows)fail('R6_READER_ROW_CAP');
   if(!groups.includes(row.release_group)||typeof row.body_chunk!=='string'
     ||!Number.isSafeInteger(row.chunk_index)||!Number.isSafeInteger(row.chunk_count)
     ||row.chunk_count<1||row.chunk_count>4096)fail('R6_READER_ROW_INVALID');
   bytes+=Buffer.byteLength(row.body_chunk,'utf8');
   if(bytes>LIMIT.bytes)fail('R6_READER_BYTE_CAP');
   if(!pending||pending.id!==row.snapshot_id){
    flush();
    if(raw.length>=LIMIT.snapshots)fail('R6_READER_SNAPSHOT_CAP');
    const details=parseDetails(row.detail_json);
    pending={id:row.snapshot_id,group:row.release_group,provider:row.provider,
     requestKey:row.request_key,retrievedAt:row.retrieved_at,createdAt:row.created_at,
     sha:row.body_sha256,responseHash:details.responseHash,detailJson:row.detail_json,
     chunkCount:row.chunk_count,parts:[]};
   }
   if(pending.group!==row.release_group||pending.provider!==row.provider
     ||pending.requestKey!==row.request_key||pending.retrievedAt!==row.retrieved_at
     ||pending.createdAt!==row.created_at||pending.sha!==row.body_sha256
     ||pending.detailJson!==row.detail_json||row.chunk_count!==pending.chunkCount
     ||row.chunk_index!==pending.parts.length)
    fail('R6_READER_CHUNKS_INVALID');
   pending.parts.push(row.body_chunk);
  }
  flush();
  const approvedRunProviders=groups.map(g=>'EMPLOYMENT_R6_'+g);
  const slots=approvedRunProviders.map(()=>'?').join(',');
  const runSql='SELECT '+COLS.run.join(',')+' FROM '+runTable+
    ' WHERE completed_at<=? AND provider IN ('+slots+')'+
    " AND status IN ('SUCCESS','PARTIAL') ORDER BY completed_at";
  let refs=0;
  for(const row of db.prepare(runSql).iterate(cutoff,...approvedRunProviders)){
   if(runs.length>=LIMIT.runs)fail('R6_READER_RUN_CAP');
   const details=parseDetails(row.detail_json);
   if(!Array.isArray(details.rawSnapshots)||details.rawSnapshots.length>LIMIT.snapshots)
    fail('R6_READER_RUN_INVALID');
   refs+=details.rawSnapshots.length;
   if(refs>LIMIT.refs)fail('R6_READER_REFERENCE_CAP');
   runs.push({provider:row.provider,status:row.status,completedAt:row.completed_at,
    rawSnapshots:details.rawSnapshots});
  }
  db.exec('ROLLBACK');active=false;
 }finally{
  if(db){try{if(active)db.exec('ROLLBACK');}finally{db.close();}}
 }
 // No transaction is retained during CPU-heavy cryptographic verification.
 const result=verifyAndAggregateStoredR6Snapshots({snapshots:raw,runs,
  allowedGroups:groups,asOfDate});
 return {...result,inputSnapshotIdentity:'CALLER_APPROVED_READONLY_SINGLE_CORE_TRANSACTION',
  runtimeAuthorizationVerified:false,historicalPitAttested:false,
  repairAuthorized:false};
}
