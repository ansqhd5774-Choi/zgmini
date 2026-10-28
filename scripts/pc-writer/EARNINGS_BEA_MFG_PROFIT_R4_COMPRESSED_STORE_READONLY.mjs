// Narrow follow-up to R3: inspect known compressed PC operational input storage.
// Read-only SQLite SELECT; no collection, source file modification, D1 or deploy.
import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const CODE='N400RC';
const DBS=['storage/core.sqlite','storage/history.sqlite'];
const PREFIXES=['macro:%','bea:%','earnings:%','nipa:%','fred:%','projection-macro:%'];
const MAX_RECENT_PER_PREFIX=80,MAX_RECENT_GLOBAL=80,MAX_BODY_BYTES=32_000_000;

function decode(body){
  const raw=String(body??'');
  if(!raw.startsWith('gzip:'))return raw.slice(0,MAX_BODY_BYTES);
  const encoded=raw.slice(5);
  if(encoded.length>8_000_000)throw Error('COMPRESSED_BODY_TOO_LARGE');
  return gunzipSync(Buffer.from(encoded,'base64'),{maxOutputLength:MAX_BODY_BYTES}).toString('utf8');
}

function inspectDb({file,relative,DatabaseSync}){
  const out={database:relative,status:'NOT_PRESENT',knownBatchRowsChecked:0,
    latestRowsChecked:0,foundStores:[],incompleteReasons:[]};
  if(!fs.existsSync(file))return out;
  let db;
  try{
    db=new DatabaseSync(file,{readOnly:true,timeout:1000,allowExtension:false});
    db.exec('PRAGMA query_only=ON');
    const existing=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name));
    const findDataset=table=>{
      if(!existing.has(table))return;
      const row=db.prepare(`SELECT 1 AS match FROM "${table}" WHERE upper(CAST(dataset AS TEXT)) LIKE ? LIMIT 1`).get('%'+CODE+'%');
      if(row)out.foundStores.push(table+':DATASET');
    };
    findDataset('api_history_chunks_v1');
    findDataset('api_history_snapshots_v1');
    if(existing.has('market_input_batches_v1')){
      const seen=new Set();
      const check=rows=>{
        for(const row of rows){
          if(seen.has(row.batch_key))continue;
          seen.add(row.batch_key);out.knownBatchRowsChecked++;
          if(String(row.batch_key).toUpperCase().includes(CODE)){
            out.foundStores.push('market_input_batches_v1:BATCH_KEY');continue;
          }
          try{
            if(decode(row.body).toUpperCase().includes(CODE))
              out.foundStores.push('market_input_batches_v1:BODY');
          }catch{out.incompleteReasons.push('BATCH_DECODE_FAILED');}
        }
      };
      for(const prefix of PREFIXES){
        const rows=db.prepare('SELECT batch_key,body FROM market_input_batches_v1 WHERE batch_key LIKE ? ORDER BY stored_at DESC LIMIT ?')
          .all(prefix,MAX_RECENT_PER_PREFIX);
        check(rows);
        if(rows.length===MAX_RECENT_PER_PREFIX)out.incompleteReasons.push('PREFIX_SAMPLE_LIMIT');
      }
      const recent=db.prepare('SELECT batch_key,body FROM market_input_batches_v1 ORDER BY stored_at DESC LIMIT ?')
        .all(MAX_RECENT_GLOBAL);
      const before=out.knownBatchRowsChecked;
      check(recent);out.latestRowsChecked=out.knownBatchRowsChecked-before;
      if(recent.length===MAX_RECENT_GLOBAL)out.incompleteReasons.push('LATEST_SAMPLE_LIMIT');
    }
    out.status=out.foundStores.length?'CANDIDATE_FOUND':
      out.incompleteReasons.length?'NO_MATCH_SAMPLED_INCOMPLETE':'NO_MATCH_KNOWN_STORES';
  }catch(e){out.status='SQLITE_QUERY_FAILED';out.incompleteReasons.push(String(e?.code??'READ_FAILED'));}
  finally{try{db?.close();}catch{out.incompleteReasons.push('CLOSE_FAILED');}}
  out.foundStores=[...new Set(out.foundStores)];
  out.incompleteReasons=[...new Set(out.incompleteReasons)];
  return out;
}

export function inspectCompressedBeaStores({root,DatabaseSync:driver}={}){
  if(typeof root!=='string'||!path.isAbsolute(root)||!fs.existsSync(path.join(root,'storage')))
    throw Error('BEA_MFG_PC_ROOT_NOT_RECOGNIZED');
  let DatabaseSync=driver;
  if(!DatabaseSync){try{({DatabaseSync}=require('node:sqlite'));}
    catch{throw Error('NODE_SQLITE_UNAVAILABLE');}}
  const databases=DBS.map(relative=>inspectDb({
    file:path.join(root,...relative.split('/')),relative,DatabaseSync}));
  const found=databases.some(x=>x.foundStores.length);
  return {status:found?'CANDIDATE_EXISTING_COMPRESSED_SOURCE_FOUND':'NO_CONFIRMED_MATCH_IN_KNOWN_STORES',
    seriesId:CODE,databases,sourceAbsenceProven:false,safeToAutoCapture:false,
    sqlWrites:0,d1Writes:0};
}

const self=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===self){
  const args=process.argv.slice(2);
  if(args.length!==2||args[0]!=='--root'||!args[1]){
    console.error('ERROR=BEA_MFG_INVALID_ARGUMENT');process.exitCode=2;
  }else{
    try{console.log(JSON.stringify(inspectCompressedBeaStores({root:args[1]}),null,2));}
    catch(e){console.error('ERROR='+String(e?.message??'BEA_COMPRESSED_PREFLIGHT_FAILED'));process.exitCode=1;}
  }
}
