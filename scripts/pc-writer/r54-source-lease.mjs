// R54 source-use exclusivity: a single atomic NTFS directory creation.
// Every ordinary R54 publisher and source mutator must use this exact lease;
// the independent B maintainer must acquire the SAME directory before swap.
// A crashed/stale lease is intentionally never stolen or auto-cleared.
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export const R54_SOURCE_LEASE_DIR =
 'E:/ZGmini/data/pc-writer/theme-nine-r54/R54_B_SOURCE_EXCLUSIVE.lock';
const fail=(code,cause)=>Object.assign(new Error(code,{cause}),{code});

export function acquireR54SourceLease({
 lockDir=R54_SOURCE_LEASE_DIR,fsImpl=fs,pid=process.pid,
 nonce=randomUUID(),now=new Date().toISOString(),
}={}){
 if(typeof lockDir!=='string'||!path.isAbsolute(lockDir)||
  typeof nonce!=='string'||!/^[\da-f-]{36}$/i.test(nonce))
  throw fail('R54_SOURCE_LEASE_ARGUMENT_INVALID');
 const parent=path.dirname(lockDir);
 if(!fsImpl.statSync(parent).isDirectory()||
  fsImpl.lstatSync(parent).isSymbolicLink())
  throw fail('R54_SOURCE_LEASE_PARENT_UNSAFE');

 // No check-then-create gap: mkdir on one local filesystem is the arbiter.
 try{fsImpl.mkdirSync(lockDir,{recursive:false});}
 catch(error){
  if(error?.code==='EEXIST')throw fail('R54_SOURCE_LEASE_HELD',error);
  throw fail('R54_SOURCE_LEASE_ACQUIRE_UNKNOWN',error);
 }
 const record={schema:'ZGMINI_R54_SOURCE_EXCLUSIVE_V1',pid,nonce,at:now};
 const bytes=JSON.stringify(record)+'\n';
 const owner=path.join(lockDir,'OWNER.json');
 let fd;
 try{
  fd=fsImpl.openSync(owner,'wx',0o600);
  fsImpl.writeFileSync(fd,bytes);
  fsImpl.fsyncSync(fd);
 }catch(error){
  // Do not remove an ownerless lock after uncertain persistence. Manual
  // reconciliation is required; other workers will continue to fail closed.
  throw fail('R54_SOURCE_LEASE_OWNER_UNKNOWN',error);
 }finally{if(fd!==undefined)fsImpl.closeSync(fd);}

 let released=false;
 return Object.freeze({
  lockDir,owner,pid,nonce,
  release(){
   if(released)throw fail('R54_SOURCE_LEASE_DOUBLE_RELEASE');
   try{
    if(fsImpl.readFileSync(owner,'utf8')!==bytes)
     throw fail('R54_SOURCE_LEASE_OWNER_CHANGED');
    fsImpl.unlinkSync(owner);
    // Nonrecursive rmdir guarantees unexpected extra files remain protected.
    fsImpl.rmdirSync(lockDir);
    released=true;
   }catch(error){throw fail('R54_SOURCE_LEASE_RELEASE_UNCERTAIN',error);}
  },
 });
}

export function withR54SourceLeaseSync(operation,options){
 if(typeof operation!=='function')throw fail('R54_SOURCE_LEASE_CALLBACK_REQUIRED');
 const lease=acquireR54SourceLease(options);
 try{return operation();}
 finally{lease.release();}
}

export async function withR54SourceLease(operation,options){
 if(typeof operation!=='function')throw fail('R54_SOURCE_LEASE_CALLBACK_REQUIRED');
 const lease=acquireR54SourceLease(options);
 try{return await operation();}
 finally{lease.release();}
}
