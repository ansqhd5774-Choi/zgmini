import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseScheduledLauncher,parseWorktrees,runR13} from '../scripts/pc-writer/market-calendar-r13-runtime-lineage.mjs';

const approved='7ac573fcf977c5fab97f2aea44c12555fd86dd9f';
const old='3941d416310b1dd5fcc778c4df2b761a2a147a42';
const blob='f084e2a360b544257bb44a60b97875627c7ca371';
function fixture({approvedVisible=true,multiple=false,realTask=true,dirty=false,alternateTask=false}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r13-'));
 const dataRoot=path.join(root,'data'),projectRoot=path.join(root,'projects');
 const oldRoot=path.join(root,'old'),currentRoot=path.join(root,'latest');
 fs.mkdirSync(dataRoot);fs.mkdirSync(projectRoot);
 const project=path.join(projectRoot,'git-root');fs.mkdirSync(path.join(project,'.git'),{recursive:true});
 const runner=path.join(oldRoot,'scripts','pc-writer','local-cycle.mjs');
 fs.mkdirSync(path.dirname(runner),{recursive:true});
 fs.writeFileSync(path.join(dataRoot,'run-local-core.vbs'),`shell.Run("""node.exe"" ""${runner}"" --publish",0,True)`);
 const taskFile=alternateTask?path.join(root,'other-task-root','run-local-core.vbs'):path.join(dataRoot,'run-local-core.vbs');
 if(alternateTask){
  fs.mkdirSync(path.dirname(taskFile),{recursive:true});
  const activeRunner=path.join(currentRoot,'scripts','pc-writer','local-cycle.mjs');
  fs.writeFileSync(taskFile,`shell.Run("""node.exe"" ""${activeRunner}"" --publish",0,True)`);
 }
 const put=(name,obj)=>fs.writeFileSync(path.join(dataRoot,name),JSON.stringify(obj));
 put('config.json',{enabled:true,collectionTarget:'pc',source:approved});
 put('local-writer-last-run.json',{status:'VERIFIED',mode:'PUBLISH',source:approved,at:'2026-10-27T08:10:05Z'});
 put('local-publication-ledger.json',{status:'VERIFIED',source:approved});
 const getTaskXml=()=>realTask?`<Task><Arguments>&quot;${taskFile}&quot;</Arguments></Task>`:'<Task/>';
 const gitCall=(cwd,args)=>{
  if(args[0]==='worktree')return `worktree ${project}\nHEAD ${old}\n\nworktree ${oldRoot}\nHEAD ${old}\n\n${approvedVisible?`worktree ${currentRoot}\nHEAD ${approved}\n\n`:''}${multiple?`worktree ${path.join(root,'second')}\nHEAD ${approved}\n\n`:''}`;
  if(args[0]==='rev-parse')return cwd===oldRoot?old:cwd===currentRoot||cwd===path.join(root,'second')?approved:old;
  if(args[0]==='hash-object')return blob;
  if(args[0]==='diff')return dirty?'lib/release-calendar.mjs':'';
  return null;
 };
 return {root,dataRoot,projectRoot,run:()=>runR13({dataRoot,projectRoot,getTaskXml,gitCall})};
}

test('R13 parses exact Core task launcher and worktree registry, no path disclosure',()=>{
 const f=fixture();
 try{
  const result=f.run();
  assert.equal(result.scheduled.head,old);
  assert.equal(result.registry.approvedMatches.length,1);
  assert.equal(result.registry.approvedMatches[0].head,approved);
  assert.equal(result.decision,'APPROVED_WORKTREE_UNIQUE_SCHEDULER_STALE_NO_CHANGES_MADE');
  assert.ok(!JSON.stringify(result).includes(f.root));
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('R13 fails closed on absent/ambiguous/dirty worktree or task mismatch',()=>{
 for(const [opts,decision] of [
  [{approvedVisible:false},'APPROVED_WORKTREE_NOT_FOUND_STOP'],
  [{multiple:true},'APPROVED_WORKTREE_AMBIGUOUS_STOP'],
  [{dirty:true},'APPROVED_WORKTREE_UNCLEAN_STOP'],
  [{realTask:false},'EXACT_CORE_TASK_TARGET_UNVERIFIED_STOP']
 ]){
  const f=fixture(opts);
  try{assert.equal(f.run().decision,decision);}finally{fs.rmSync(f.root,{recursive:true,force:true});}
 }
 assert.equal(parseScheduledLauncher('<Arguments>&quot;run-local-core.vbs&quot;</Arguments>'),null);
 assert.deepEqual(parseWorktrees('worktree /tmp/a\nHEAD abc\n\nworktree /tmp/b\nHEAD def'),[path.resolve('/tmp/a'),path.resolve('/tmp/b')]);
});

test('R13 uses the exact scheduled VBS, even when the data directory contains a stale launcher',()=>{
 const f=fixture({alternateTask:true});
 try{
  const result=f.run();
  assert.equal(result.scheduled.sameAsConfiguredDataRoot,false);
  assert.equal(result.scheduled.head,approved);
  assert.equal(result.decision,'SCHEDULER_AND_APPROVED_WORKTREE_ALIGNED_NO_CHANGES_MADE');
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
