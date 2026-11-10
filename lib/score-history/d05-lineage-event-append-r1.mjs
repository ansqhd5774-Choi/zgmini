import {constants} from 'node:fs';
import {open,lstat,unlink} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {decideD05LineageAppend} from './d05-lineage-event-contract-r1.mjs';

// Development-only adapter. An approved B deployment must explicitly supply
// the local path AND an independently owned exclusive Writer lease. No default
// PC path, scheduled task, database, publication, or lease acquisition exists.
const MAX_LEDGER_BYTES=64*1024*1024;
const NOFOLLOW=constants.O_NOFOLLOW??0;
const fail=code=>Object.freeze({status:'UNPROVEN',code});

async function hasExclusiveLease(writer){
 if(typeof writer?.ownerId!=='string'||!writer.ownerId.trim()||
    typeof writer.assertExclusive!=='function')return false;
 try{return await writer.assertExclusive()===true;}catch{return false;}
}

function sameFile(a,b){
 return a.isFile()&&b.isFile()&&a.dev===b.dev&&a.ino===b.ino;
}

async function readSameFile(filePath,handle){
 const stat=await handle.stat();
 const named=await lstat(filePath);
 if(!sameFile(stat,named)||stat.size>MAX_LEDGER_BYTES)return null;
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
  if(!(await hasExclusiveLease(writer)))return fail('LINEAGE_WRITER_LEASE_LOST');

  // On an interrupted write, never silently truncate/repair. A partial line
  // is rejected by the pure contract on the next invocation.
  await ledger.writeFile(decision.line,{encoding:'utf8'});
  await ledger.sync();

  const currentStat=await ledger.stat();
  let verify;
  try{
   verify=await open(filePath,constants.O_RDONLY|NOFOLLOW);
   const verifiedStat=await verify.stat();
   if(!sameFile(currentStat,verifiedStat)||
      !sameFile(verifiedStat,await lstat(filePath)))
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
  if(!sameFile(owned,await lstat(lockPath)))return false;
  await unlink(lockPath);
  return true;
 }catch{return false;}
}

// This function never claims FULL D05 lineage or public D1 verification.
// A stale .lock is refused, not auto-expired or stolen; external non-cooperating
// writers cannot be safely excluded without an approved system-wide lease.
export async function appendD05LineageEvent({ledgerPath,entry,exclusiveWriter}={}){
 if(typeof ledgerPath!=='string'||!isAbsolute(ledgerPath)||
    !ledgerPath.endsWith('.jsonl'))return fail('LINEAGE_LEDGER_PATH_REQUIRED');
 const prepared=decideD05LineageAppend('',entry);
 if(prepared.status!=='APPEND_READY')return prepared;
 if(!(await hasExclusiveLease(exclusiveWriter)))
  return fail('LINEAGE_WRITER_LEASE_REQUIRED');

 const lockPath=ledgerPath+'.lock';
 let lockHandle,owned;
 try{
  lockHandle=await open(lockPath,constants.O_WRONLY|constants.O_CREAT|
   constants.O_EXCL|NOFOLLOW,0o600);
  owned=await lockHandle.stat();
 }catch(error){
  if(!lockHandle)return fail(error?.code==='EEXIST'?
   'LINEAGE_LEDGER_LOCK_HELD':'LINEAGE_LOCK_IO_FAILED');
  const cleared=await releaseOwnLock(lockPath,lockHandle,owned??await lockHandle.stat());
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
