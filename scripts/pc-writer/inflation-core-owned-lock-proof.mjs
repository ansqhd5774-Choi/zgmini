// Current-process Core lock shape and PID candidate check only.
// It cannot establish WHICH executable originally created the lock;
// the trusted Core-acquisition evidence is a separate mandatory boundary.
// Read only; never creates, removes or reclaims the Core lock.
// The trusted Core bridge must pass its actual base and current process PID.
// The approved operational root must be read from the installed B contract,
// not from a request body, arbitrary environment variable or user input.
import fs from 'node:fs';
import path from 'node:path';

const fail=code=>{throw Object.assign(new Error(code),{code});};
const need=(yes,code)=>{if(!yes)fail(code);};
const canonical=x=>path.normalize(x).replace(/[\\/]+$/,'').toLowerCase();
const validPid=x=>Number.isSafeInteger(x)&&x>0;

export function assertCurrentCoreOwnedLock({base,approvedRoot,
 pid=process.pid,clock=Date.now(),fsImpl=fs}={}){
 need(typeof base==='string'&&path.isAbsolute(base)&&
  typeof approvedRoot==='string'&&path.isAbsolute(approvedRoot)&&
  validPid(pid)&&Number.isSafeInteger(clock)&&fsImpl&&
  typeof fsImpl.realpathSync==='function'&&
  typeof fsImpl.lstatSync==='function'&&
  typeof fsImpl.readFileSync==='function',
  'INFL_CORE_STATIC_LOCK_PROOF_CONTRACT_STOP');
 let root,approved,lock,first,second,stat;
 try{
  root=fsImpl.realpathSync(base);
  approved=fsImpl.realpathSync(approvedRoot);
  need(canonical(root)===canonical(approved),
   'INFL_CORE_STATIC_ROOT_MISMATCH_STOP');
  lock=path.join(root,'local-cycle.lock');
  stat=fsImpl.lstatSync(lock);
  need(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&
   stat.size>0&&stat.size<256,
   'INFL_CORE_STATIC_LOCK_SHAPE_STOP');
  first=fsImpl.readFileSync(lock,'utf8');
  const doc=JSON.parse(first);
  need(doc!==null&&typeof doc==='object'&&!Array.isArray(doc)&&
   Object.keys(doc).sort().join(',')==='at,pid'&&doc.pid===pid&&
   Number.isSafeInteger(doc.at)&&doc.at<=clock&&doc.at>0,
   'INFL_CORE_STATIC_LOCK_NOT_OWNED_STOP');
  // Recheck exact content and file identity immediately; later write stages
  // must re-prove the live Core lock before committing a candidate.
  second=fsImpl.readFileSync(lock,'utf8');
  const after=fsImpl.lstatSync(lock);
  need(first===second&&stat.dev===after.dev&&stat.ino===after.ino&&
   stat.nlink===after.nlink&&stat.size===after.size,
   'INFL_CORE_STATIC_LOCK_RACE_STOP');
  return Object.freeze({status:'CANDIDATE_ONLY',
   code:'INFL_CORE_STATIC_PID_AND_PATH_MATCH_UNATTESTED',
   authorizesExecution:false});
 }catch(e){
  if(typeof e?.code==='string'&&e.code.startsWith('INFL_CORE_STATIC_'))throw e;
  fail('INFL_CORE_STATIC_LOCK_PROOF_UNAVAILABLE_STOP');
 }
}
