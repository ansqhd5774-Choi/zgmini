import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {assertCurrentCoreOwnedLock}
 from './inflation-core-owned-lock-proof.mjs';

function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'w01-core-lock-'));
 const lock=path.join(root,'local-cycle.lock');
 const write=(pid=process.pid,at=Date.now())=>
  fs.writeFileSync(lock,JSON.stringify({pid,at}),{flag:'wx'});
 return {root,lock,write,cleanup:()=>fs.rmSync(root,{force:true,recursive:true})};
}
test('only same canonical Core root and current PID can pass',()=>{
 const f=fixture();try{
  f.write();
  const result=assertCurrentCoreOwnedLock({base:f.root,approvedRoot:f.root});
  assert.equal(result.status,'CANDIDATE_ONLY');
  assert.equal(result.authorizesExecution,false);
 }finally{f.cleanup();}
});
test('different root fails rather than accepting a second Core lock',()=>{
 const f=fixture(),other=fixture();try{
  f.write();
  assert.throws(()=>assertCurrentCoreOwnedLock({base:f.root,approvedRoot:other.root}),
   {code:'INFL_CORE_STATIC_ROOT_MISMATCH_STOP'});
 }finally{f.cleanup();other.cleanup();}
});
test('foreign live PID cannot authorize current Core',()=>{
 const f=fixture();try{
  f.write(process.pid+100);
  assert.throws(()=>assertCurrentCoreOwnedLock({base:f.root,approvedRoot:f.root}),
   {code:'INFL_CORE_STATIC_LOCK_NOT_OWNED_STOP'});
 }finally{f.cleanup();}
});
test('missing lock is a hard stop, never a reason to create one',()=>{
 const f=fixture();try{
  assert.throws(()=>assertCurrentCoreOwnedLock({base:f.root,approvedRoot:f.root}),
   {code:'INFL_CORE_STATIC_LOCK_PROOF_UNAVAILABLE_STOP'});
  assert.equal(fs.existsSync(f.lock),false);
 }finally{f.cleanup();}
});
test('future-dated lock never passes',()=>{
 const f=fixture();try{
  const now=Date.now();f.write(process.pid,now+10_000);
  assert.throws(()=>assertCurrentCoreOwnedLock({
   base:f.root,approvedRoot:f.root,clock:now}),
   {code:'INFL_CORE_STATIC_LOCK_NOT_OWNED_STOP'});
 }finally{f.cleanup();}
});
test('hard-linked file rejected to avoid identity alias',()=>{
 const f=fixture();try{
  f.write();
  fs.linkSync(f.lock,path.join(f.root,'second-link'));
  assert.throws(()=>assertCurrentCoreOwnedLock({base:f.root,approvedRoot:f.root}),
   {code:'INFL_CORE_STATIC_LOCK_SHAPE_STOP'});
 }finally{f.cleanup();}
});

test('PID/path match by itself never grants operating permission',()=>{
 const f=fixture();try{
  f.write();
  const result=assertCurrentCoreOwnedLock({base:f.root,approvedRoot:f.root});
  assert.equal(result.authorizesExecution,false);
  assert.equal(result.code,'INFL_CORE_STATIC_PID_AND_PATH_MATCH_UNATTESTED');
 }finally{f.cleanup();}
});
