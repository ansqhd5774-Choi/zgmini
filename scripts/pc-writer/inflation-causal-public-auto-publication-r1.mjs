// Candidate only, OFF by default in run-local.mjs.
// Uses the existing PC Writer --publish lane and its approved D1 client.
// No new provider calls, score writes, SQLite writes, or scheduling.
import fs from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';

export const INFL19_PUBLIC_KEY='detail:inflation-causal-public-19:r1';
export const INFL19_PC_HOME='E:\\ZGmini\\data\\pc-writer';
export const INFL19_STAGE_NAME='public-19-summary-projection-r1.json';
const STAGE_SCHEMA='ZGMINI_INFL19_PC_STAGED_PUBLIC_V1';
const fail=code=>{throw Error(code)};

function approvedHome(home){
 if(typeof home!=='string'||!path.isAbsolute(home))
  fail('INFL19_AUTO_PC_HOME_DENIED');
 let actual,approved;
 try{
  actual=fs.realpathSync.native(home);
  if(process.platform==='win32')approved=fs.realpathSync.native(INFL19_PC_HOME);
 }catch{fail('INFL19_AUTO_PC_HOME_DENIED')}
 // An established C: junction is allowed only when its real target is the
 // exact approved E: data directory. Missing E: never creates a replacement.
 if(process.platform==='win32'&&
  path.win32.normalize(actual).toLowerCase()!==path.win32.normalize(approved).toLowerCase())
  fail('INFL19_AUTO_PC_HOME_DENIED');
 if(!fs.statSync(actual).isDirectory())fail('INFL19_AUTO_PC_HOME_DENIED');
 return actual;
}

function stagePath(home){
 const directory=path.join(approvedHome(home),'inflation-causal-r1');
 const stat=fs.lstatSync(directory);
 if(!stat.isDirectory()||stat.isSymbolicLink())fail('INFL19_AUTO_STAGE_DIR_DENIED');
 const file=path.join(directory,INFL19_STAGE_NAME);
 for(const candidate of [file,file+'.tmp']){
  if(fs.existsSync(candidate)){
   const old=fs.lstatSync(candidate);
   if(!old.isFile()||old.isSymbolicLink())
    fail('INFL19_AUTO_STAGE_FILE_DENIED');
  }
 }
 return file;
}

export function comparableResearchContent(payload){
 if(!payload||!Array.isArray(payload.indicators)||payload.indicators.length!==19)
  fail('INFL19_AUTO_RESEARCH_CONTRACT_DENIED');
 // Storage provenance does not alter the observed values/history. An official
 // availableAt change is retained, since it may be meaningful release metadata.
 const {sourceVersion,sourceStoredAt,...rest}=payload;
 return {...rest,indicators:payload.indicators.map(({sourceStoredAt,...item})=>item)};
}

export function validateRemoteSnapshot(row,validate,now=Date.now()){
 if(!row)return null;
 let saved,payload;
 try{
  saved=JSON.parse(row.body);
  payload=validate(saved.payload,{now});
  if(saved.projection?.status!=='READY'||
   saved.projection?.sourceVersion!==payload.sourceVersion||
   saved.projection?.sourceStoredAt!==payload.sourceStoredAt||
   !Number.isSafeInteger(saved.projection?.builtAt)||
   saved.projection.builtAt>now||
   Number(row.stored_at)!==saved.projection.builtAt)
   throw Error('BAD_ENVELOPE');
 }catch{fail('INFL19_AUTO_REMOTE_CONTRACT_DENIED')}
 return payload;
}

export async function stageAndVerify(pcHome,payload,{
 now=Date.now(),saveFn,readFn,validate
}={}){
 if(typeof validate!=='function')fail('INFL19_AUTO_VALIDATOR_MISSING');
 validate(payload,{now});
 const file=stagePath(pcHome);
 if(!saveFn||!readFn){
  const local=await import('./d1.mjs');
  saveFn??=local.save;readFn??=local.read;
 }
 const staged={schema:STAGE_SCHEMA,sourceVersion:payload.sourceVersion,
  sourceStoredAt:payload.sourceStoredAt,payload};
 saveFn(file,staged);
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||stat.size>50000)
  fail('INFL19_AUTO_STAGE_READBACK_DENIED');
 let got;
 try{got=readFn(file)}catch{fail('INFL19_AUTO_STAGE_READBACK_DENIED')}
 if(!isDeepStrictEqual(got,staged))fail('INFL19_AUTO_STAGE_READBACK_MISMATCH');
 validate(got.payload,{now});
 return got.payload;
}

export async function publishInflation19Auto({
 pcHome,remote,coreDb,now=Date.now(),previewFn,validate,writerFactory,
 stageFn=stageAndVerify,
}={}){
 approvedHome(pcHome);
 if(!remote?.query||!remote?.adapter||!coreDb||!Number.isSafeInteger(now))
  fail('INFL19_AUTO_ARGUMENTS_DENIED');
 if(!previewFn){
  const source=await import('./inflation-causal-public-preview-r1.mjs');
  previewFn=source.previewInflation19;
 }
 if(!validate||!writerFactory){
  const publicModule=await import('../../worker/inflation-causal-public-r1.mjs');
  validate??=publicModule.validateInflationCausalPublic;
  writerFactory??=publicModule.inflationCausalPublicWriter;
 }
 const preview=await previewFn(pcHome);
 if(preview?.status!=='PASS_READONLY'||preview.ready!==19||
  preview.payload?.status!=='READY')
  return {status:'SKIPPED_INPUTS_NOT_READY',ready:preview?.ready??0,
   providerCalls:0,coreWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0};
 if(preview.providerCalls!==0||preview.coreWrites!==0||
  preview.dbWrites!==0||preview.d1Writes!==0||preview.schedulerWrites!==0)
  fail('INFL19_AUTO_PC_PREVIEW_SIDE_EFFECT_DENIED');
 const payload=validate(preview.payload,{now});
 if(payload.status!=='READY'||payload.score!==null||
  payload.indicators?.length!==19||
  !/^INFL19_PRESENTATION_[a-f0-9]{64}$/.test(payload.sourceVersion)||
  !Number.isSafeInteger(payload.sourceStoredAt))
  fail('INFL19_AUTO_RESEARCH_CONTRACT_DENIED');
 const rows=(await remote.query(coreDb,
  'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',
  [INFL19_PUBLIC_KEY])).results;
 if(!Array.isArray(rows)||rows.length>1)fail('INFL19_AUTO_REMOTE_QUERY_DENIED');
 const previous=validateRemoteSnapshot(rows[0],validate,now);
 if(previous?.sourceStoredAt>payload.sourceStoredAt)
  return {status:'REMOTE_NEWER_PRESERVED',ready:19,
   providerCalls:0,coreWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0};
 if(previous&&isDeepStrictEqual(comparableResearchContent(previous),
                               comparableResearchContent(payload)))
  return {status:previous.sourceVersion===payload.sourceVersion?
   'UNCHANGED_VERIFIED':'SKIPPED_METADATA_ONLY',ready:19,
   providerCalls:0,coreWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0};
 if(previous?.sourceVersion===payload.sourceVersion)
  fail('INFL19_AUTO_VERSION_COLLISION');
 if(previous?.sourceStoredAt===payload.sourceStoredAt)
  fail('INFL19_AUTO_CHECKPOINT_CONFLICT');
 // Only this derived, bounded public projection is written on the PC.
 // Provider files, SQLite and all four original scored series remain untouched.
 const ready=await stageFn(pcHome,payload,{now,validate});
 if(!isDeepStrictEqual(ready,payload))
  fail('INFL19_AUTO_STAGE_PAYLOAD_MISMATCH');
 const db=remote.adapter(coreDb,{allowWrites:true});
 const result=await writerFactory(db).write(ready,{storedAt:now});
 if(!['READBACK_VERIFIED','ALREADY_STORED'].includes(result?.status))
  fail('INFL19_AUTO_WRITER_READBACK_UNVERIFIED');
 const after=(await remote.query(coreDb,
  'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',
  [INFL19_PUBLIC_KEY])).results;
 if(!Array.isArray(after)||after.length!==1||
  !isDeepStrictEqual(validateRemoteSnapshot(after[0],validate,now),ready))
  fail('INFL19_AUTO_D1_READBACK_MISMATCH');
 return {status:result.status,ready:19,key:INFL19_PUBLIC_KEY,
  sourceVersion:ready.sourceVersion,sourceStoredAt:ready.sourceStoredAt,
  providerCalls:0,coreWrites:0,dbWrites:0,
  d1Writes:result.status==='READBACK_VERIFIED'?1:0,schedulerWrites:0};
}
