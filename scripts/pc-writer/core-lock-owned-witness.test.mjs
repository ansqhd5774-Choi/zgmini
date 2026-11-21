import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {acquireCoreLockWithWitness} from './core-lock-owned-witness.mjs';

function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'w01-owned-fd-'));
 return {root,file:path.join(root,'local-cycle.lock'),
  cleanup:()=>fs.rmSync(root,{force:true,recursive:true})};
}
test('Core-owned live descriptor attests exact current lock and releases it',async()=>{
 const f=fixture();try{
  const lease=acquireCoreLockWithWitness({file:f.file});
  const proof=await lease.witness({approvedRoot:f.root});
  assert.equal(proof.originAuthenticated,true);
  assert.equal(proof.pid,process.pid);
  assert.deepEqual(lease.release(),{status:'RELEASED'});
  assert.equal(fs.existsSync(f.file),false);
  await assert.rejects(()=>lease.witness({approvedRoot:f.root}),
   {code:'INFL_CORE_STATIC_ACQUISITION_WITNESS_STOP'});
 }finally{f.cleanup();}
});
test('unrelated existing lock cannot be claimed or deleted',()=>{
 const f=fixture();try{
  fs.writeFileSync(f.file,JSON.stringify({pid:123,at:Date.now()}),{flag:'wx'});
  assert.throws(()=>acquireCoreLockWithWitness({file:f.file}),
   {code:'INFL_CORE_STATIC_LOCK_ALREADY_HELD_STOP'});
  assert.equal(fs.existsSync(f.file),true);
 }finally{f.cleanup();}
});
test('a forged PID-only lock cannot replace the original fd-witness',async()=>{
 const f=fixture();try{
  const lease=acquireCoreLockWithWitness({file:f.file});
  fs.writeFileSync(f.file,JSON.stringify({pid:process.pid,at:1}));
  await assert.rejects(()=>lease.witness({approvedRoot:f.root}),
   {code:'INFL_CORE_STATIC_ACQUISITION_WITNESS_STOP'});
  assert.throws(()=>lease.release(),
   {code:'INFL_CORE_STATIC_LOCK_RELEASE_DRIFT_STOP'});
  assert.equal(fs.existsSync(f.file),true);
 }finally{f.cleanup();}
});
test('approved root mismatch stops before accepting owner witness',async()=>{
 const f=fixture(),other=fixture();try{
  const lease=acquireCoreLockWithWitness({file:f.file});
  await assert.rejects(()=>lease.witness({approvedRoot:other.root}),
   {code:'INFL_CORE_STATIC_ACQUISITION_WITNESS_STOP'});
  lease.release();
 }finally{f.cleanup();other.cleanup();}
});
test('replaced lock inode cannot be removed by prior owner release',()=>{
 const f=fixture();try{
  const lease=acquireCoreLockWithWitness({file:f.file});
  fs.renameSync(f.file,f.file+'.old');
  fs.writeFileSync(f.file,JSON.stringify({pid:process.pid,at:Date.now()}),{flag:'wx'});
  assert.throws(()=>lease.release(),{code:'INFL_CORE_STATIC_LOCK_RELEASE_DRIFT_STOP'});
  assert.equal(fs.existsSync(f.file),true);
 }finally{f.cleanup();}
});
