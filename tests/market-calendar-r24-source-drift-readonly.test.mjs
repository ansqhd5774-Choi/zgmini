import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {worktreeIdentity} from '../scripts/pc-writer/market-calendar-r19-bea-apply.mjs';
import {runR24SourceDriftReadOnly} from '../scripts/pc-writer/market-calendar-r24-source-drift-readonly.mjs';

function setup(){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r24-drift-'));
 const root=path.join(base,'core'),dataRoot=path.join(base,'data');
 fs.mkdirSync(path.join(root,'lib'),{recursive:true});fs.mkdirSync(dataRoot);
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git(['init','-q']);git(['config','user.name','Forensic Test']);git(['config','user.email','test@example.invalid']);
 fs.writeFileSync(path.join(root,'lib','release-calendar.mjs'),'// current source\n');
 fs.writeFileSync(path.join(root,'lib','eia-calendar.mjs'),'// unchanged EIA\n');
 git(['add','lib']);git(['commit','-qm','new source after R23']);
 const head=git(['rev-parse','HEAD']);
 fs.writeFileSync(path.join(dataRoot,'config.json'),JSON.stringify({source:head,enabled:true,collectionTarget:'pc',secret:'NEVER_LOG'}));
 const run=(options={})=>runR24SourceDriftReadOnly({
  now:Date.parse('2026-10-28T06:00:00Z'),dataRoot,getCoreRoot:()=>root,getTaskXml:()=>'<Task/>',
  gitCall:(_,args)=>git(args),expectedWorktreeId:worktreeIdentity(root),...options,
 });
 return {base,root,dataRoot,head,run};
}

test('R24 drift report shows actual head, protected file hashes and config-source match without writes',()=>{
 const f=setup();
 try{
  const src=fs.readFileSync(path.join(f.root,'lib','release-calendar.mjs'));
  const cfg=fs.readFileSync(path.join(f.dataRoot,'config.json'));
  const result=f.run();
  assert.equal(result.decision,'R24_SOURCE_DRIFT_READONLY_COMPLETE');
  assert.equal(result.observedHead,f.head);
  assert.equal(result.headMatchesR23,false);
  assert.equal(result.r23ObjectAvailable,false);
  assert.equal(result.r23IsAncestor,null);
  assert.equal(result.configSourceMatchesHead,true);
  assert.equal(result.protectedTrackedDirty,false);
  assert.ok(result.installedFileSha256['lib/release-calendar.mjs']);
  assert.equal(result.installedFileSha256['lib/usda-calendar.mjs'],null);
  for(const key of ['coreSourceChanged','configChanged','schedulerChanged','dbChanged','publisherExecuted','collectionExecuted','gitPushed','lockTaken'])assert.equal(result[key],false,key);
  assert.deepEqual(fs.readFileSync(path.join(f.root,'lib','release-calendar.mjs')),src);
  assert.deepEqual(fs.readFileSync(path.join(f.dataRoot,'config.json')),cfg);
  assert.ok(!JSON.stringify(result).includes('NEVER_LOG'));
  assert.ok(!JSON.stringify(result).includes(f.base));
 }finally{fs.rmSync(f.base,{recursive:true,force:true});}
});

test('R24 drift detects protected source edits and config desynchronization',()=>{
 const f=setup();
 try{
  fs.appendFileSync(path.join(f.root,'lib','release-calendar.mjs'),'// another worker\n');
  fs.writeFileSync(path.join(f.dataRoot,'config.json'),JSON.stringify({source:'0'.repeat(40),enabled:false,collectionTarget:'cloud'}));
  const result=f.run();
  assert.equal(result.decision,'R24_SOURCE_DRIFT_READONLY_COMPLETE');
  assert.equal(result.protectedTrackedDirty,true);
  assert.deepEqual(result.dirtyTrackedPaths,['lib/release-calendar.mjs']);
  assert.equal(result.configSourceMatchesHead,false);
  assert.equal(result.configEnabled,false);
  assert.equal(result.collectionTarget,'OTHER');
 }finally{fs.rmSync(f.base,{recursive:true,force:true});}
});

test('R24 drift refuses the wrong Core identity',()=>{
 const f=setup();
 try{
  const result=f.run({expectedWorktreeId:'wrong-core'});
  assert.equal(result.decision,'PC_CORE_IDENTITY_CHANGED_STOP');
  assert.equal(result.observedHead,undefined);
 }finally{fs.rmSync(f.base,{recursive:true,force:true});}
});
