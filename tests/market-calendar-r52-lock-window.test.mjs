import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectR52CoreLock,runR52WaitApply} from './market-calendar-r52-lock-window.mjs';

const make=()=>fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r52-'));

test('R52 classifies a genuinely held Core lock without mutating the file',()=>{
 const base=make();
 try{
  const file=path.join(base,'local-cycle.lock');
  const b=JSON.stringify({pid:12345,at:Date.now()});fs.writeFileSync(file,b);
  const x=inspectR52CoreLock({base,probePid:()=>undefined});
  assert.equal(x.state,'OWNER_ALIVE');
  assert.equal(fs.readFileSync(file,'utf8'),b);
  assert.equal(JSON.stringify(x).includes('12345'),false);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test('R52 refuses orphan lock and leaves it untouched for existing Core recovery',async()=>{
 const base=make();
 try{
  const file=path.join(base,'local-cycle.lock');
  const b=JSON.stringify({pid:9999,at:Date.now()});fs.writeFileSync(file,b);
  const r=await runR52WaitApply({base,waitMs:0,
   inspect:options=>inspectR52CoreLock({...options,probePid:()=>{throw Object.assign(Error('gone'),{code:'ESRCH'});}}),
   install:()=>{throw Error('MUST_NOT_INSTALL');}});
  assert.equal(r.decision,'R52_ORPHANED_CORE_LOCK_PRESERVED_STOP');
  assert.equal(fs.readFileSync(file,'utf8'),b);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test('R52 applies only on a free window, retrying R46 EEXIST races',async()=>{
 const base=make();
 try{
  const statuses=['OWNER_ALIVE','FREE','FREE'];let visits=0,attempts=0,t=0;
  const result=await runR52WaitApply({base,waitMs:300,pollMs:250,
   clock:()=>t,inspect:()=>({state:statuses[Math.min(visits++,2)]}),
   wait:async ms=>{t+=ms;},install:opts=>{
    assert.equal(opts.apply,true);attempts++;
    return attempts===1?{decision:'R46_CORE_LOCK_BUSY_STOP'}:
     {decision:'R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION',changedFiles:['approved']};
   }});
  assert.equal(result.decision,'R46_R45_PC_INSTALLED_NO_FORCED_COLLECTION');
  assert.equal(result.lockChecks,3);
  assert.equal(attempts,2);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test('R52 never invokes installer while lock owner remains alive',async()=>{
 const base=make();
 try{
  let t=0;
  const r=await runR52WaitApply({base,waitMs:500,pollMs:250,
   clock:()=>t,inspect:()=>({state:'OWNER_ALIVE',ageSeconds:14}),
   wait:async ms=>{t+=ms;},install:()=>{throw Error('MUST_NOT_INSTALL');}});
  assert.equal(r.decision,'R52_NATURAL_UNLOCK_WAIT_EXPIRED_NO_CHANGES');
  assert.equal(r.installAttempts,0);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});
