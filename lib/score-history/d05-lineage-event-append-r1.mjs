import {constants} from 'node:fs';
import fs from 'node:fs';
import {mkdir,open,lstat,unlink} from 'node:fs/promises';
import {basename,dirname,isAbsolute,join} from 'node:path';
import {decideD05LineageAppend} from './d05-lineage-event-contract-r1.mjs';

// Development-only adapter. An approved B deployment must explicitly supply
// the local path AND an independently owned exclusive Writer lease. No default
// PC path, scheduled task, database, publication, or lease acquisition exists.
const MAX_LEDGER_BYTES=64*1024*1024;
const NOFOLLOW=constants.O_NOFOLLOW??0;
const fail=code=>Object.freeze({status:'UNPROVEN',code});

// This read-only attestation is valid only for run-local.mjs invoked as the
// synchronous child of the existing local-cycle.mjs owner. It never creates,
// steals, renews, or removes the parent's lock. A direct run-local invocation
// must not obtain a Writer authority from a stale or unrelated lock file.
export function createD05LocalCycleExclusiveWriter({pcHome,
 getParentPid=()=>process.ppid,
 processAlive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}},
 fileSystem=fs,
}={}){
 if(typeof pcHome!=='string'||!isAbsolute(pcHome)||
  typeof getParentPid!=='function'||typeof processAlive!=='function')return null;
 const lockPath=join(pcHome,'local-cycle.lock');
 const witness=()=>{
  try{
   const parentPid=getParentPid();
   if(!Number.isSafeInteger(parentPid)||parentPid<1)return null;
   const before=fileSystem.lstatSync(lockPath,{bigint:true});
   if(!before.isFile()||before.isSymbolicLink()||before.size<2n||before.size>256n)
    return null;
   const body=fileSystem.readFileSync(lockPath,'utf8');
   if(Buffer.byteLength(body)>256)return null;
   const owner=JSON.parse(body);
   if(!owner||Array.isArray(owner)||typeof owner!=='object'||
     Object.keys(owner).sort().join('|')!=='at|pid'||
     owner.pid!==parentPid||!Number.isSafeInteger(owner.at)||owner.at<0||
     !processAlive(parentPid))return null;
   const after=fileSystem.lstatSync(lockPath,{bigint:true});
   if(!after.isFile()||after.isSymbolicLink()||
     before.dev!==after.dev||before.ino!==after.ino||
     before.mtimeNs!==after.mtimeNs||before.size!==after.size)return null;
   return Object.freeze({parentPid,at:owner.at,dev:before.dev,ino:before.ino,
    mtimeNs:before.mtimeNs});
  }catch{return null;}
 };
 const initial=witness();
 if(!initial)return null;
 return Object.freeze({ownerId:`local-cycle:${initial.parentPid}:${initial.at}`,
  assertExclusive:async()=>{
   const current=witness();
   return Boolean(current&&current.parentPid===initial.parentPid&&
    current.at===initial.at&&current.dev===initial.dev&&
    current.ino===initial.ino&&current.mtimeNs===initial.mtimeNs);
  }});
}

// This is a whole-ledger ceiling, not merely a pre-append read ceiling.
// Keep the production ceiling fixed; a smaller synthetic limit is used only
// by unit tests of the byte arithmetic.
export function d05AppendFitsCapacity(existingBytes,lineBytes,limit=MAX_LEDGER_BYTES){
 return Number.isSafeInteger(existingBytes)&&existingBytes>=0&&
  Number.isSafeInteger(lineBytes)&&lineBytes>=0&&
  Number.isSafeInteger(limit)&&limit>=0&&limit<=MAX_LEDGER_BYTES&&
  existingBytes<=limit&&lineBytes<=limit-existingBytes;
}

async function hasExclusiveLease(writer){
 if(typeof writer?.ownerId!=='string'||!writer.ownerId.trim()||
    typeof writer.assertExclusive!=='function')return false;
 try{return await writer.assertExclusive()===true;}catch{return false;}
}

// The live caller may opt into creating only the exact, approved private
// score-lineage leaf. No recursive parent creation, arbitrary path, symlink
// directory, existing-file repair, or Windows ACL mutation is permitted.
async function prepareApprovedLineageDirectory(ledgerPath){
 const directory=dirname(ledgerPath);
 if(basename(directory)!=='score-lineage'||
    basename(ledgerPath)!=='d05-composite-events-v1.jsonl')
  return fail('LINEAGE_DIRECTORY_SCOPE_UNAPPROVED');
 try{
  const base=await lstat(dirname(directory),{bigint:true});
  if(!base.isDirectory()||base.isSymbolicLink())
   return fail('LINEAGE_PARENT_UNSAFE');
  try{await mkdir(directory,{recursive:false,mode:0o700});}
  catch(error){if(error?.code!=='EEXIST')
   return fail('LINEAGE_DIRECTORY_CREATE_FAILED');}
  const leaf=await lstat(directory,{bigint:true});
  if(!leaf.isDirectory()||leaf.isSymbolicLink())
   return fail('LINEAGE_DIRECTORY_UNSAFE');
  return null;
 }catch{return fail('LINEAGE_DIRECTORY_STATE_UNKNOWN');}
}

function sameFile(a,b){
 return a.isFile()&&b.isFile()&&a.dev===b.dev&&a.ino===b.ino;
}

async function readSameFile(filePath,handle){
 const stat=await handle.stat({bigint:true});
 const named=await lstat(filePath,{bigint:true});
 if(!sameFile(stat,named)||stat.size>BigInt(MAX_LEDGER_BYTES))return null;
 return handle.readFile({encoding:'utf8'});
}

async function appendUnderLock(filePath,entry,writer){
 let ledger;
 try{
  // O_NOFOLLOW and inode comparison reject a replaced final pathname. The
  // exclusive .lock also guards cooperating processes against lost updates.
  try{ledger=await open(filePath,constants.O_RDWR|constants.O_APPEND|NOFOLLOW);}
  catch(error){
   if(error?.code!=='ENOENT')throw error;
   // O_EXCL avoids following a dangling symlink when first creating a file.
   ledger=await open(filePath,constants.O_RDWR|constants.O_APPEND|
    constants.O_CREAT|constants.O_EXCL|NOFOLLOW,0o600);
  }
  const existing=await readSameFile(filePath,ledger);
  if(existing===null)return fail('LINEAGE_LEDGER_UNSAFE_OR_TOO_LARGE');
  const decision=decideD05LineageAppend(existing,entry);
  if(decision.status==='NOOP_SAME_EVENT')return decision;
  if(decision.status!=='APPEND_READY')return decision;
  if(!d05AppendFitsCapacity(Buffer.byteLength(existing),Buffer.byteLength(decision.line)))
   return fail('LINEAGE_LEDGER_CAPACITY_EXCEEDED');
  if(!(await hasExclusiveLease(writer)))return fail('LINEAGE_WRITER_LEASE_LOST');

  // On an interrupted write, never silently truncate/repair. A partial line
  // is rejected by the pure contract on the next invocation.
  await ledger.writeFile(decision.line,{encoding:'utf8'});
  await ledger.sync();

  const currentStat=await ledger.stat({bigint:true});
  let verify;
  try{
   verify=await open(filePath,constants.O_RDONLY|NOFOLLOW);
   const verifiedStat=await verify.stat({bigint:true});
   if(!sameFile(currentStat,verifiedStat)||
      !sameFile(verifiedStat,await lstat(filePath,{bigint:true})))
    return fail('LINEAGE_APPEND_READBACK_MISMATCH');
   const readback=await readSameFile(filePath,verify);
   if(readback!==existing+decision.line||
      decideD05LineageAppend(readback,entry).status!=='NOOP_SAME_EVENT')
    return fail('LINEAGE_APPEND_READBACK_MISMATCH');
  }finally{await verify?.close();}
  return Object.freeze({status:'APPENDED_VERIFIED_LOCAL_ONLY',eventId:entry.eventId,
   eventCount:decision.existingEventCount+1});
 }catch{return fail('LINEAGE_LEDGER_IO_OR_STATE_UNKNOWN');}
 finally{await ledger?.close();}
}

async function releaseOwnLock(lockPath,lockHandle,owned){
 try{
  await lockHandle.close();
  if(!sameFile(owned,await lstat(lockPath,{bigint:true})))return false;
  await unlink(lockPath);
  return true;
 }catch{return false;}
}

// This function never claims FULL D05 lineage or public D1 verification.
// A stale .lock is refused, not auto-expired or stolen; external non-cooperating
// writers cannot be safely excluded without an approved system-wide lease.
export async function appendD05LineageEvent({ledgerPath,entry,exclusiveWriter,
 initializeApprovedDirectory=false}={}){
 if(typeof ledgerPath!=='string'||!isAbsolute(ledgerPath)||
    !ledgerPath.endsWith('.jsonl'))return fail('LINEAGE_LEDGER_PATH_REQUIRED');
 const prepared=decideD05LineageAppend('',entry);
 if(prepared.status!=='APPEND_READY')return prepared;
 if(!(await hasExclusiveLease(exclusiveWriter)))
  return fail('LINEAGE_WRITER_LEASE_REQUIRED');

 if(initializeApprovedDirectory){
  const preparedDirectory=await prepareApprovedLineageDirectory(ledgerPath);
  if(preparedDirectory)return preparedDirectory;
  if(!(await hasExclusiveLease(exclusiveWriter)))
   return fail('LINEAGE_WRITER_LEASE_LOST');
 }

 const lockPath=ledgerPath+'.lock';
 let lockHandle,owned;
 try{
  lockHandle=await open(lockPath,constants.O_WRONLY|constants.O_CREAT|
   constants.O_EXCL|NOFOLLOW,0o600);
  owned=await lockHandle.stat({bigint:true});
 }catch(error){
  if(!lockHandle)return fail(error?.code==='EEXIST'?
   'LINEAGE_LEDGER_LOCK_HELD':'LINEAGE_LOCK_IO_FAILED');
  const cleared=await releaseOwnLock(lockPath,lockHandle,owned??await lockHandle.stat({bigint:true}));
  return fail(cleared?'LINEAGE_LOCK_IO_FAILED':'LINEAGE_LOCK_RELEASE_UNVERIFIED');
 }

 let result;
 try{
  result=(await hasExclusiveLease(exclusiveWriter))?
   await appendUnderLock(ledgerPath,entry,exclusiveWriter):
   fail('LINEAGE_WRITER_LEASE_LOST');
 }catch{result=fail('LINEAGE_LEDGER_IO_OR_STATE_UNKNOWN');}
 if(!(await releaseOwnLock(lockPath,lockHandle,owned)))
  return fail('LINEAGE_LOCK_RELEASE_UNVERIFIED');
 return result;
}
