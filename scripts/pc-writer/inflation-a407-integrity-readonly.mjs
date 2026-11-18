// W01 A4-07: private stored-source SHA/checkpoint audit, read-only.
// No raw observation values, provider calls or arbitrary paths in the output.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {runA401Baseline23,requireExistingWalSidecars} from './inflation-a401-baseline23-readonly.mjs';
import {INFLATION_CANDIDATES_7} from '../../lib/inflation-causal-candidates-public-7-catalog.mjs';
import {projectInflationCandidate7Row} from './inflation-causal-candidates-public-7-preview-r1.mjs';

const HOME='E:\\ZGmini\\data\\pc-writer';
const SHA64=/^[a-f0-9]{64}$/;
const IDS=['1','3','4','5','6','7','8','9','10','11','12','13','14','18','19','21','25','26','31'];
const PIT={1:'MCOILWTICO',12:'CES0500000003',13:'ECIALLCIV',14:'PRS85006111',19:'IREXFUELS'};
const SOURCE_FILES=[
 {ids:['5','6','7','8','9','10','11','25'],file:'inflation-causal-r1/bls-ppi8.json'},
 {ids:['3'],file:'inflation-causal-r1/gas-dhhngsp.json'},
 {ids:['4'],file:'inflation-causal-r1/electricity-industrial-eia.json'},
 {ids:['21'],file:'supply-r10/gscpi.json',archive:'supply-r10/gscpi.xlsx'},
 {ids:['26'],file:'supply-r10/DPCERA3M086SBEA.json',archive:'supply-r10/DPCERA3M086SBEA.csv'}
];
const CANDIDATE_FILES=[
 {ids:['22','23','24'],file:'inflation-causal-candidates-r1/bls-cpi-ppi3.json'},
 {ids:['16'],file:'inflation-causal-candidates-r1/treasury-mts-customs-duties.json'},
 {ids:['29'],file:'inflation-causal-candidates-r1/fed-g17-manufacturing-ip.json'},
 {ids:['2'],file:'inflation-causal-candidates-r1/eia-us-regular-gasoline-weekly.json'}
];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const failure=code=>Object.assign(new Error(code),{code});
const iso=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
const zero=()=>({providerCalls:0,d1Writes:0,sqliteWrites:0,sourceWrites:0,taskChanges:0,operationalWrites:0});
function fixedHome(home){
 if(typeof home!=='string'||!path.isAbsolute(home)||
   (process.platform==='win32'&&path.win32.normalize(home).toLowerCase()!==
     path.win32.normalize(HOME).toLowerCase()))
   throw failure('A407_HOME_DENIED');
 const stat=fs.lstatSync(home);
 if(!stat.isDirectory()||stat.isSymbolicLink())throw failure('A407_HOME_DENIED');
 return fs.realpathSync.native(home);
}
export function secureDigest(home,relative,limit=32_000_000){
 if(typeof relative!=='string'||relative.startsWith('/')||
    relative.split('/').some(x=>!x||x==='..'||x==='.')||
    !/^[a-zA-Z0-9_/.-]+$/.test(relative))throw failure('A407_PATH_DENIED');
 const root=fs.realpathSync.native(home);
 const file=path.join(home,...relative.split('/'));
 const st=fs.lstatSync(file),real=fs.realpathSync.native(file);
 const rel=path.relative(root,real);
 if(!rel||rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel)||
    !st.isFile()||st.isSymbolicLink()||st.size<1||st.size>limit)
   throw failure('A407_FILE_UNVERIFIED');
 const first=fs.readFileSync(file);
 if(first.length!==st.size)throw failure('A407_FILE_DRIFT');
 const firstHash=sha(first),second=fs.readFileSync(file);
 if(second.length!==first.length||sha(second)!==firstHash)throw failure('A407_FILE_DRIFT');
 return {digest:firstHash,json:relative.endsWith('.json')?JSON.parse(first.toString('utf8')):null};
}

// The existing history writer defines sha256(payload_json) for every chunk
// and sha256(JSON.stringify({schemaVersion,provider,dataset,provenance,chunks})).
export function verifyPitSnapshot(db,dataset,storedAt){
 if(!/^[A-Z0-9]{4,22}$/.test(dataset)||!iso(storedAt))
   throw failure('A407_PIT_INPUT_DENIED');
 const row=db.prepare("SELECT snapshot_sha256,retrieved_at,history_mode,row_count,chunk_hashes_json,provenance_json FROM api_history_snapshots_v1 WHERE provider='FRED' AND dataset=? AND history_mode='INITIAL_RELEASE_ONLY' ORDER BY retrieved_at DESC LIMIT 1").get(dataset);
 if(!row||row.retrieved_at!==storedAt||row.history_mode!=='INITIAL_RELEASE_ONLY'||
    !SHA64.test(row.snapshot_sha256??'')||!Number.isSafeInteger(row.row_count)||
    row.row_count<2||row.row_count>100_000)throw failure('A407_PIT_SNAPSHOT_UNVERIFIED');
 const hashes=JSON.parse(row.chunk_hashes_json),provenance=JSON.parse(row.provenance_json);
 if(!Array.isArray(hashes)||hashes.length<1||hashes.length>100||
   hashes.some(x=>!SHA64.test(x))||!provenance||typeof provenance!=='object'||
   Array.isArray(provenance))throw failure('A407_PIT_MANIFEST_UNVERIFIED');
 const expected=sha(JSON.stringify({schemaVersion:1,provider:'FRED',dataset,provenance,chunks:hashes}));
 if(expected!==row.snapshot_sha256)throw failure('A407_PIT_SNAPSHOT_HASH_MISMATCH');
 const q=db.prepare("SELECT payload_json,row_count FROM api_history_chunks_v1 WHERE provider='FRED' AND dataset=? AND chunk_sha256=?");
 let total=0;
 for(const h of hashes){
  const chunk=q.get(dataset,h);
  if(!chunk||typeof chunk.payload_json!=='string'||
     Buffer.byteLength(chunk.payload_json)>4_000_000||
     sha(chunk.payload_json)!==h)throw failure('A407_PIT_CHUNK_HASH_MISMATCH');
  const rows=JSON.parse(chunk.payload_json);
  if(!Array.isArray(rows)||rows.length<1||rows.length>10_000||
     rows.length!==chunk.row_count)throw failure('A407_PIT_ROWS_UNVERIFIED');
  total+=rows.length;
 }
 if(total!==row.row_count)throw failure('A407_PIT_ROW_COUNT_MISMATCH');
 return {sha256:row.snapshot_sha256,proof:'PIT_SNAPSHOT_AND_CHUNKS_HASH_MATCHED',chunkCount:hashes.length};
}
function macroDigest(db,storedAt){
 const query="SELECT body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE 'macro:%' ORDER BY stored_at DESC LIMIT 1";
 const a=db.prepare(query).get();
 if(typeof a?.body!=='string'||Buffer.byteLength(a.body)>16_000_000||
   !Number.isSafeInteger(Number(a.stored_at))||
   new Date(Number(a.stored_at)).toISOString()!==storedAt)
   throw failure('A407_MACRO_SOURCE_UNVERIFIED');
 const digest=sha(a.body),b=db.prepare(query).get();
 if(b?.stored_at!==a.stored_at||sha(b.body)!==digest)
   throw failure('A407_MACRO_SOURCE_DRIFT');
 return {sha256:digest,proof:'SQLITE_BODY_DOUBLE_READ_FINGERPRINT'};
}
function checkpoint(home,relative,schema){
 const v=secureDigest(home,relative,131072),d=v.json;
 if(d?.schema!==schema||!d.processed||typeof d.processed!=='object'||
   Array.isArray(d.processed)||(d.attempted!=null&&
    (typeof d.attempted!=='object'||Array.isArray(d.attempted))))
   throw failure('A407_CHECKPOINT_INVALID');
 return {sha256:v.digest,proof:'CHECKPOINT_FILE_DOUBLE_READ_FINGERPRINT'};
}

export function inspectA407(home=HOME){
 const result={status:'PARTIAL',code:'A407_INTEGRITY_READBACK_INCOMPLETE',
   originalVerified:0,candidateVerified:0,expectedOriginal:19,
   expectedCandidate:6,census:'MISSING',original:[],candidate:[],
   checkpoints:{},evidenceScope:'FIXED_PRIVATE_SOURCES_READONLY',...zero()};
 let db;
 try{
  const root=fixedHome(home),baseline=runA401Baseline23(home);
  if(baseline.status!=='PASS'||baseline.originalReady!==19||
     baseline.additionalReady!==4)throw failure('A407_BASELINE_NOT_READY');
  const observed=new Map(baseline.original.map(x=>[x.id,x.sourceStoredAt]));
  const byId=new Map();
  const add=(ids,proof)=>{for(const id of ids){
    if(byId.has(id))throw failure('A407_DUPLICATE_ID');
    byId.set(id,{id,...proof});
  }};
  for(const {ids,file,archive} of SOURCE_FILES){
    const f=secureDigest(root,file);
    const archiveDigest=archive?secureDigest(root,archive).digest:null;
    add(ids,{sha256:f.digest,...(archiveDigest?{archiveSha256:archiveDigest}:{}),
      proof:archive?'PARSED_AND_ARCHIVE_DOUBLE_READ_FINGERPRINT':
        'SOURCE_FILE_DOUBLE_READ_FINGERPRINT'});
  }
  const sceMeta=secureDigest(root,'inflation-causal/sce31/latest.json',65536);
  const meta=sceMeta.json;
  if(!SHA64.test(meta?.downloadSha256??''))throw failure('A407_SCE_REFERENCE_INVALID');
  const sce=secureDigest(root,'inflation-causal/sce31/'+meta.downloadSha256+'.json');
  add(['31'],{sha256:sce.digest,metadataSha256:sceMeta.digest,
    archiveRefSha256:meta.downloadSha256,proof:'SCE_PARSED_WITH_REFERENCE_FINGERPRINT'});
  const dbFile=path.join(root,'storage','core.sqlite');
  requireExistingWalSidecars(root,dbFile);
  db=new DatabaseSync(dbFile,{readOnly:true,timeout:1000});
  db.exec('PRAGMA query_only=ON');
  for(const id of ['1','12','13','14','19']){
    const pitPresent=db.prepare("SELECT 1 AS present FROM api_history_snapshots_v1 WHERE provider='FRED' AND dataset=? AND history_mode='INITIAL_RELEASE_ONLY' LIMIT 1").get(PIT[id]);
    const proof=id==='1'&&!pitPresent?macroDigest(db,observed.get(id)):
      verifyPitSnapshot(db,PIT[id],observed.get(id));
    add([id],proof);
  }
  add(['18'],macroDigest(db,observed.get('18')));
  result.original=IDS.map(id=>byId.get(id));
  if(result.original.some(x=>!x))throw failure('A407_INVENTORY_INCOMPLETE');
  result.originalVerified=19;
  // A shared file hash does not prove every expected indicator exists inside it.
  // Validate the exact bytes we hashed with the existing official-source parser.
  const candidateMeta=new Map(INFLATION_CANDIDATES_7.map(x=>[x.id,x]));
  for(const {ids,file} of CANDIDATE_FILES){
    const f=secureDigest(root,file);
    for(const id of ids){
      try{
        const meta=candidateMeta.get(id);
        if(!meta||projectInflationCandidate7Row(meta,f.json).status!=='READY')
          throw failure('A407_CANDIDATE_CONTENT_UNVERIFIED');
      }catch{throw failure('A407_CANDIDATE_CONTENT_UNVERIFIED');}
      result.candidate.push({id,sha256:f.digest,
        proof:'CANDIDATE_PARSED_AND_DOUBLE_READ_FINGERPRINT'});
    }
  }
  result.candidateVerified=result.candidate.length;
  result.checkpoints={
    inflation19:checkpoint(root,'inflation-causal-r1/recurring-checkpoint-r1.json',
      'ZGMINI_INFL19_RECURRING_R1'),
    candidates7:checkpoint(root,'inflation-causal-candidates-r1/core-attempts-r1.json',
      'ZGMINI_INFLATION_CANDIDATE_CORE_R1')
  };
  // Local fingerprints for files and macro DB are not provider-authenticated.
  result.status='PASS';result.code='A407_STORED_25_LOCAL_FINGERPRINTS_VERIFIED';
 }catch(e){result.code=/^A407_[A-Z0-9_]+$/.test(e?.code??'')?
   e.code:'A407_SOURCE_UNVERIFIED';}
 finally{try{db?.close();}catch{}}
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const out=process.argv.length===2?inspectA407():
   {status:'BLOCKED',code:'A407_ARGS_DENIED',...zero()};
 console.log(JSON.stringify(out));
 if(out.status!=='PASS')process.exitCode=1;
}
