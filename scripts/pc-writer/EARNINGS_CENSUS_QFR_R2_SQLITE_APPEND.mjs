// Census QFR manufacturing margin: separate, immutable raw-ZIP capture into existing PC ledger.
// Default is read-only. A future PC append requires explicit CLI confirmation; never touches D1.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {QFR_URL,analyzeQfrZip,fetchQfrZip} from './EARNINGS_CENSUS_QFR_R1_READONLY.mjs';

export const PROVIDER='CENSUS';
export const DATASET='QFR_MFG_US_NSA_AFTER_TAX_MARGIN';
export const CONTRACT='EARNINGS_CENSUS_QFR_MFG_RAW_ZIP_V1';
const CHUNKS='api_history_chunks_v1',SNAPSHOTS='api_history_snapshots_v1';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer');
const DB_PATH=path.join(ROOT,'storage','core.sqlite');
const SHA=/^[a-f0-9]{64}$/;
const fail=code=>{throw Error(code);};
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
const columns={
  [CHUNKS]:{
    provider:'TEXT',dataset:'TEXT',chunk_sha256:'TEXT',first_observation_date:'TEXT',
    last_observation_date:'TEXT',row_count:'INTEGER',payload_json:'TEXT',first_seen_at:'TEXT',
  },
  [SNAPSHOTS]:{
    provider:'TEXT',dataset:'TEXT',snapshot_sha256:'TEXT',as_of:'TEXT',retrieved_at:'TEXT',
    status:'TEXT',history_mode:'TEXT',row_count:'INTEGER',latest_observation_date:'TEXT',
    chunk_hashes_json:'TEXT',provenance_json:'TEXT',
  },
};
const pk={
  [CHUNKS]:['provider','dataset','chunk_sha256'],
  [SNAPSHOTS]:['provider','dataset','snapshot_sha256'],
};

function decodePayload(payloadJson){
  if(typeof payloadJson!=='string'||Buffer.byteLength(payloadJson)>6_000_000)
    fail('QFR_PRIOR_PAYLOAD_SIZE_INVALID_NO_WRITE');
  let payload;
  try{payload=JSON.parse(payloadJson);}catch{fail('QFR_PRIOR_PAYLOAD_JSON_INVALID_NO_WRITE');}
  if(payload?.contract!==CONTRACT||payload?.sourceURL!==QFR_URL
    ||!SHA.test(payload?.sourceSha256??'')
    ||typeof payload?.rawZipBase64!=='string'
    ||payload.rawZipBase64.length<1||payload.rawZipBase64.length>5_400_000
    ||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(payload.rawZipBase64))
    fail('QFR_PRIOR_PAYLOAD_CONTRACT_INVALID_NO_WRITE');
  const archive=Buffer.from(payload.rawZipBase64,'base64');
  if(archive.toString('base64')!==payload.rawZipBase64||hash(archive)!==payload.sourceSha256)
    fail('QFR_PRIOR_SOURCE_HASH_INVALID_NO_WRITE');
  const decoded=analyzeQfrZip(archive,{retrievedAt:'2026-10-27T00:00:00.000Z'});
  if(JSON.stringify(decoded.history)!==JSON.stringify(payload.history)
    ||payload.observedThrough!==decoded.observedThrough
    ||payload.adjustment!==decoded.adjustment)
    fail('QFR_PRIOR_EXTRACT_MISMATCH_NO_WRITE');
  return payload;
}

export function checkQfrSchema(db){
  const names=db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN (?,?)`)
    .all(CHUNKS,SNAPSHOTS).map(row=>row.name);
  if(names.length!==2)fail('QFR_EXISTING_TABLE_MISSING_NO_WRITE');
  if(db.prepare(`SELECT name FROM sqlite_master WHERE type='trigger' AND tbl_name IN (?,?)`)
    .all(CHUNKS,SNAPSHOTS).length)fail('QFR_EXISTING_TRIGGER_PRESENT_NO_WRITE');
  for(const table of [CHUNKS,SNAPSHOTS]){
    const actual=db.prepare(`PRAGMA table_info("${table}")`).all();
    for(const [name,type] of Object.entries(columns[table])){
      if(actual.find(c=>c.name===name)?.type?.toUpperCase()!==type)
        fail('QFR_EXISTING_SCHEMA_MISMATCH_NO_WRITE');
    }
    const actualPk=actual.filter(c=>c.pk>0).sort((a,b)=>a.pk-b.pk).map(c=>c.name);
    if(JSON.stringify(actualPk)!==JSON.stringify(pk[table]))
      fail('QFR_EXISTING_PRIMARY_KEY_MISMATCH_NO_WRITE');
  }
  const snapshots=db.prepare(`SELECT snapshot_sha256,chunk_hashes_json,provenance_json,
    row_count,latest_observation_date,status,history_mode FROM ${SNAPSHOTS}
    WHERE provider=? AND dataset=?`).all(PROVIDER,DATASET);
  const chunks=db.prepare(`SELECT chunk_sha256,payload_json,row_count,first_observation_date,
    last_observation_date FROM ${CHUNKS} WHERE provider=? AND dataset=?`).all(PROVIDER,DATASET);
  const known=new Map();
  for(const row of chunks){
    if(!SHA.test(row.chunk_sha256)||hash(row.payload_json)!==row.chunk_sha256)
      fail('QFR_PRIOR_CHUNK_HASH_INVALID_NO_WRITE');
    const payload=decodePayload(row.payload_json);
    if(row.row_count!==payload.history.length
      ||row.first_observation_date!==payload.history[0].period
      ||row.last_observation_date!==payload.history.at(-1).period)
      fail('QFR_PRIOR_CHUNK_METADATA_INVALID_NO_WRITE');
    known.set(row.chunk_sha256,payload);
  }
  const referenced=new Set();
  for(const row of snapshots){
    let hashes,meta;
    try{hashes=JSON.parse(row.chunk_hashes_json);meta=JSON.parse(row.provenance_json);}
    catch{fail('QFR_PRIOR_SNAPSHOT_JSON_INVALID_NO_WRITE');}
    if(!Array.isArray(hashes)||hashes.length!==1||!SHA.test(hashes[0])
      ||!known.has(hashes[0])||meta?.contract!==CONTRACT
      ||meta?.sourceSha256!==known.get(hashes[0]).sourceSha256
      ||row.row_count!==known.get(hashes[0]).history.length
      ||row.latest_observation_date!==known.get(hashes[0]).observedThrough
      ||row.status!=='READY_DIRECT_CENSUS_QFR'
      ||row.history_mode!=='CURRENT_RETRIEVAL_NOT_PIT'
      ||row.snapshot_sha256!==snapshotHashFor(hashes[0]))
      fail('QFR_PRIOR_SNAPSHOT_CONFLICT_NO_WRITE');
    referenced.add(hashes[0]);
  }
  if(referenced.size!==known.size)fail('QFR_PRIOR_ORPHAN_CHUNK_NO_WRITE');
  return {priorSnapshots:snapshots.length,priorChunks:chunks.length};
}

const snapshotHashFor=chunkHash=>hash(JSON.stringify({
  contract:CONTRACT,provider:PROVIDER,dataset:DATASET,chunkSha256:chunkHash,
}));

export function makeQfrPlan(rawZip,retrievedAt=new Date().toISOString()){
  const archive=Buffer.isBuffer(rawZip)?rawZip:Buffer.from(rawZip);
  const result=analyzeQfrZip(archive,{retrievedAt});
  const raw={contract:CONTRACT,sourceURL:QFR_URL,sourceSha256:result.sourceSha256,
    rawZipBase64:archive.toString('base64'),history:result.history,
    observedThrough:result.observedThrough,adjustment:result.adjustment};
  const payloadJson=JSON.stringify(raw);
  if(Buffer.byteLength(payloadJson)>6_000_000)fail('QFR_STORE_PAYLOAD_TOO_LARGE_NO_WRITE');
  const chunkHash=hash(payloadJson),snapshotHash=snapshotHashFor(chunkHash);
  const provenanceJson=JSON.stringify({
    contract:CONTRACT,authority:'U.S. Census Bureau',program:'Quarterly Financial Report',
    sourceURL:QFR_URL,sourceSha256:result.sourceSha256,archiveFormat:'OFFICIAL_ZIP_BASE64_IN_CHUNK',
    sourceDataUpdatedOn:result.dataUpdatedOn,sourceRetrievedAt:retrievedAt,
    dataTypes:{sales:'101',afterTaxProfit:'115'},category:'MFG',geo:'US',isAdj:'0',etIdx:'0',
    frequency:'QUARTERLY',unit:'MILLIONS_USD_RAW_AND_PERCENT_DERIVED',
    officialVintageId:null,derivedMarginMethod:result.method,
    independentSourceCount:1,scoreInput:false,sourceAttribution:'U.S. Census Bureau QFR',
  });
  return {result,payloadJson,provenanceJson,chunkHash,snapshotHash,
    firstDate:result.history[0].period,lastDate:result.observedThrough,
    rowCount:result.history.length,retrievedAt,asOf:retrievedAt.slice(0,10)};
}

export function parseQfrMode(args){
  if(args.length===0||(args.length===1&&args[0]==='--dry-run'))
    return {apply:false,expectedSha256:null};
  if(args.length===4&&args[0]==='--apply'
    &&args[1]==='--confirm-census-qfr-sqlite-append'
    &&args[2]==='--expected-source-sha256'
    &&SHA.test(args[3]))
    return {apply:true,expectedSha256:args[3]};
  fail('QFR_APPEND_CONFIRMATION_AND_SOURCE_SHA_REQUIRED');
}

export function verifyExpectedQfrSource(plan,expectedSha256){
  if(!SHA.test(expectedSha256??''))fail('QFR_EXPECTED_SOURCE_SHA_INVALID_NO_WRITE');
  if(plan?.result?.sourceSha256!==expectedSha256)
    fail('QFR_SOURCE_CHANGED_SINCE_PREFLIGHT_NO_WRITE');
}

export function appendQfrPlan(db,plan){
  if(!plan||!SHA.test(plan.chunkHash??'')||!SHA.test(plan.snapshotHash??'')
    ||hash(plan.payloadJson)!==plan.chunkHash
    ||snapshotHashFor(plan.chunkHash)!==plan.snapshotHash
    ||plan.rowCount!==5)fail('QFR_STORE_PLAN_INVALID_NO_WRITE');
  const decoded=decodePayload(plan.payloadJson);
  if(plan.firstDate!==decoded.history[0].period
    ||plan.lastDate!==decoded.observedThrough
    ||plan.result?.sourceSha256!==decoded.sourceSha256)
    fail('QFR_STORE_PLAN_METADATA_INVALID_NO_WRITE');
  let begun=false;
  try{
    db.exec('BEGIN IMMEDIATE');begun=true;
    checkQfrSchema(db);
    const stored=db.prepare(`INSERT INTO ${CHUNKS}(
      provider,dataset,chunk_sha256,first_observation_date,last_observation_date,
      row_count,payload_json,first_seen_at) VALUES(?,?,?,?,?,?,?,?)
      ON CONFLICT(provider,dataset,chunk_sha256) DO NOTHING`)
      .run(PROVIDER,DATASET,plan.chunkHash,plan.firstDate,plan.lastDate,
        plan.rowCount,plan.payloadJson,plan.retrievedAt);
    const snapshot=db.prepare(`INSERT INTO ${SNAPSHOTS}(
      provider,dataset,snapshot_sha256,as_of,retrieved_at,status,history_mode,
      row_count,latest_observation_date,chunk_hashes_json,provenance_json)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(provider,dataset,snapshot_sha256) DO NOTHING`)
      .run(PROVIDER,DATASET,plan.snapshotHash,plan.asOf,plan.retrievedAt,
        'READY_DIRECT_CENSUS_QFR','CURRENT_RETRIEVAL_NOT_PIT',plan.rowCount,
        plan.lastDate,JSON.stringify([plan.chunkHash]),plan.provenanceJson);
    const row=db.prepare(`SELECT payload_json,row_count FROM ${CHUNKS}
      WHERE provider=? AND dataset=? AND chunk_sha256=?`)
      .get(PROVIDER,DATASET,plan.chunkHash);
    const version=db.prepare(`SELECT chunk_hashes_json,row_count,provenance_json FROM ${SNAPSHOTS}
      WHERE provider=? AND dataset=? AND snapshot_sha256=?`)
      .get(PROVIDER,DATASET,plan.snapshotHash);
    if(!row||!version||row.payload_json!==plan.payloadJson||row.row_count!==plan.rowCount
      ||version.row_count!==plan.rowCount
      ||version.chunk_hashes_json!==JSON.stringify([plan.chunkHash]))
      fail('QFR_STORE_READBACK_MISMATCH_ROLLBACK');
    let p;
    try{p=JSON.parse(version.provenance_json);}catch{fail('QFR_STORE_PROVENANCE_INVALID_ROLLBACK');}
    if(p?.contract!==CONTRACT||p?.sourceSha256!==plan.result.sourceSha256)
      fail('QFR_STORE_PROVENANCE_CONFLICT_ROLLBACK');
    db.exec('COMMIT');begun=false;
    return {insertedChunks:Number(stored.changes),insertedSnapshots:Number(snapshot.changes),
      sourceSha256:plan.result.sourceSha256,observedThrough:plan.lastDate};
  }catch(e){if(begun)try{db.exec('ROLLBACK');}catch{}throw e;}
}

async function main(){
  const args=process.argv.slice(2);
  let mode;
  try{mode=parseQfrMode(args);}catch{
    console.error('QFR_APPEND_CONFIRMATION_AND_SOURCE_SHA_REQUIRED');process.exitCode=2;return;
  }
  const {apply,expectedSha256}=mode;
  const now=new Date().toISOString();
  const stamp=now.replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
  const logfile=path.join(HERE,`EARNINGS_CENSUS_QFR_R2_STORE_RESULT_${stamp}.txt`);
  const notes=['EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND',`UTC=${now}`,
    `MODE=${apply?'MANUALLY_CONFIRMED_APPEND_ONLY':'READ_ONLY_PREFLIGHT'}`,
    `PROVIDER=${PROVIDER}`,`DATASET=${DATASET}`,
    `EXPECTED_SOURCE_SHA256=${expectedSha256??'NOT_APPLICABLE'}`,
    'D1_WRITES=0','WEB_DEPLOYMENTS=0','SCORE_WRITES=0','BLS_ROWS_MODIFIED=0',
    'SCHEMA_MIGRATIONS=0','SQLITE_DELETIONS_OR_REPLACEMENTS=0'];
  let result='FAIL_NO_COMMIT',committed=false,archived=false;
  try{
    if(!fs.existsSync(DB_PATH))fail('QFR_PC_SQLITE_MISSING_NO_WRITE');
    let db;
    try{
      db=new DatabaseSync(DB_PATH,{readOnly:true,timeout:3000});
      db.exec('PRAGMA query_only=ON');
      const prior=checkQfrSchema(db);
      notes.push(`PRIOR_CENSUS_SNAPSHOTS=${prior.priorSnapshots}`);
      notes.push(`PRIOR_CENSUS_CHUNKS=${prior.priorChunks}`);
    }finally{try{db?.close();}catch{}}
    const archive=await fetchQfrZip(),plan=makeQfrPlan(archive,new Date().toISOString());
    notes.push(`SOURCE_SHA256=${plan.result.sourceSha256}`);
    notes.push(`OBSERVED_THROUGH=${plan.lastDate}`);
    notes.push(`MANUFACTURING_AFTER_TAX_MARGIN_PCT=${plan.result.value}`);
    notes.push(`ZIP_BYTES=${archive.length}`);
    if(!apply){result='PASS_QFR_STORAGE_PREFLIGHT_NO_WRITE';return;}
    verifyExpectedQfrSource(plan,expectedSha256);
    try{
      db=new DatabaseSync(DB_PATH,{timeout:5000});
      db.exec('PRAGMA foreign_keys=ON');
      const stored=appendQfrPlan(db,plan);
      committed=true;
      notes.push(`CHUNKS_INSERTED=${stored.insertedChunks}`);
      notes.push(`SNAPSHOTS_INSERTED=${stored.insertedSnapshots}`);
      archived=true;
      result='PASS_QFR_SQLITE_APPEND_READBACK';
    }finally{try{db?.close();}catch{}}
  }catch(e){
    notes.push(`ERROR=${typeof e?.message==='string'&&/^[A-Z0-9_]+$/.test(e.message)?e.message:'QFR_UNEXPECTED_ERROR'}`);
    result=committed?'QFR_POST_COMMIT_REVIEW_REQUIRED':'FAIL_NO_COMMIT';
    process.exitCode=2;
  }finally{
    notes.push(`SQLITE_COMMITTED=${committed?'YES':'NO'}`);
    notes.push(`RAW_ZIP_ARCHIVED_IN_EXISTING_SQLITE=${archived?'YES':'NO'}`);
    notes.push(`RESULT=${result}`);
    try{
      fs.writeFileSync(logfile,notes.join('\r\n')+'\r\n',{encoding:'utf8',flag:'wx'});
      console.log(`TXT_CREATED=${path.basename(logfile)}`);
      console.log(`RESULT=${result}`);
    }catch{console.error('QFR_STORE_RESULT_TXT_WRITE_FAILED');process.exitCode=2;}
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
