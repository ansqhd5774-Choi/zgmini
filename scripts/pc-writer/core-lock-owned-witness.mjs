// Source-only proof attached to a Core lock created by THIS process.
// This deliberately does NOT read and trust another process's pid JSON.
// Do not wire into the installed Core scheduler without an exact approved
// runtime-source update. Existing local-cycle.mjs is not modified here.
import fs from 'node:fs';
import path from 'node:path';
const issued=new WeakMap();
const fail=code=>{throw Object.assign(new Error(code),{code});};
const need=(v,code)=>{if(!v)fail(code);};
const equals=(a,b)=>path.normalize(a).toLowerCase()===path.normalize(b).toLowerCase();

export function acquireCoreLockWithWitness({
 file,fsImpl=fs,pid=process.pid,at=Date.now()
}={}){
 need(typeof file==='string'&&path.isAbsolute(file)&&
  path.basename(file)==='local-cycle.lock'&&pid===process.pid&&
  Number.isSafeInteger(at)&&at>0&&at<=Date.now()&&
  typeof fsImpl?.openSync==='function',
  'INFL_CORE_STATIC_LOCK_ACQUIRE_CONTRACT_STOP');
 const bytes=Buffer.from(JSON.stringify({pid,at}),'utf8');
 let fd;
 try{
  // Existing Core runs with the same wx exclusive-file semantics.
  fd=fsImpl.openSync(file,'wx');
  fsImpl.writeSync(fd,bytes,0,bytes.length,0);
  fsImpl.fsyncSync(fd);
 }catch(e){
  if(fd!==undefined)try{fsImpl.closeSync(fd);}catch{}
  fail(e?.code==='EEXIST'?
   'INFL_CORE_STATIC_LOCK_ALREADY_HELD_STOP':
   'INFL_CORE_STATIC_LOCK_ACQUIRE_FAILED_STOP');
 }
 const owner=Object.freeze({});
 let original;
 try{original=fsImpl.fstatSync(fd);}catch{
  try{fsImpl.closeSync(fd);}catch{}
  fail('INFL_CORE_STATIC_LOCK_ACQUIRE_FAILED_STOP');
 }
 const record={fd,file,pid,bytes,original,fsImpl,released:false};
 issued.set(owner,record);
 return Object.freeze({
  // This local token is NOT serialized, signed, sent via Issue, or provided
  // to the external B Controller. It remains within the lock-owning Core.
  owner,
  async witness({approvedRoot}={}){
   const entry=issued.get(owner);
   need(entry===record&&!record.released&&
    typeof approvedRoot==='string'&&path.isAbsolute(approvedRoot),
    'INFL_CORE_STATIC_ACQUISITION_WITNESS_STOP');
   let root,actual,current,stat,contents;
   try{
    root=fsImpl.realpathSync(approvedRoot);
    actual=fsImpl.realpathSync(path.dirname(file));
    stat=fsImpl.lstatSync(file);
    current=fsImpl.fstatSync(fd);
    contents=fsImpl.readFileSync(file);
   }catch{fail('INFL_CORE_STATIC_ACQUISITION_WITNESS_STOP');}
   need(equals(root,actual)&&
    stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&
    stat.dev===original.dev&&stat.ino===original.ino&&
    current.dev===original.dev&&current.ino===original.ino&&
    Buffer.isBuffer(contents)&&contents.equals(bytes)&&
    record.pid===process.pid,
    'INFL_CORE_STATIC_ACQUISITION_WITNESS_STOP');
   return Object.freeze({originAuthenticated:true,
    source:'CURRENT_CORE_ACQUISITION',pid:process.pid});
  },
  // Only the original Core holder may unlink the same exact file inode.
  // Never unlink a replaced/foreign lock after an interrupted execution.
  release(){
   const entry=issued.get(owner);
   need(entry===record&&!record.released,
    'INFL_CORE_STATIC_LOCK_RELEASE_OWNER_STOP');
   const current=fsImpl.fstatSync(fd);
   const stat=fsImpl.lstatSync(file);
   const currentBytes=fsImpl.readFileSync(file);
   need(current.dev===original.dev&&current.ino===original.ino&&
    stat.dev===original.dev&&stat.ino===original.ino&&
    stat.nlink===1&&Buffer.isBuffer(currentBytes)&&
    currentBytes.equals(bytes),
    'INFL_CORE_STATIC_LOCK_RELEASE_DRIFT_STOP');
   record.released=true;
   fsImpl.closeSync(fd);
   fsImpl.unlinkSync(file);
   return {status:'RELEASED'};
  }
 });
}
