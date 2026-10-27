import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {extractStaticEntrypoints,parseWorktreeRecords,runR14} from '../scripts/pc-writer/market-calendar-r14-targeted-runtime.mjs';

const approved='7ac573fcf977c5fab97f2aea44c12555fd86dd9f';
const old='3941d416310b1dd5fcc778c4df2b761a2a147a42';
const blob='f084e2a360b544257bb44a60b97875627c7ca371';
function fixture({dynamic=false,stale=false,duplicates=false}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r14-'));
 const dataRoot=path.join(root,'data'),projectRoot=path.join(root,'projects'),scheduledDir=path.join(root,'schedule');
 const checkout=path.join(root,'active'),second=path.join(root,'extra'),project=path.join(projectRoot,'repo');
 fs.mkdirSync(dataRoot);fs.mkdirSync(scheduledDir);fs.mkdirSync(path.join(project,'.git'),{recursive:true});
 const taskFile=path.join(scheduledDir,'run-local-core.vbs');
 const entrypoint=path.join(stale?second:checkout,'scripts','pc-writer','local-cycle.mjs');
 fs.writeFileSync(taskFile,dynamic?'WScript.Quit shell.Run(dynamicCommand, 0, True)':`WScript.Quit shell.Run("""node.exe"" ""${entrypoint}"" --publish",0,True)`);
 const put=(name,x)=>fs.writeFileSync(path.join(dataRoot,name),JSON.stringify(x));
 put('config.json',{source:approved,enabled:true,collectionTarget:'pc'});
 put('local-writer-last-run.json',{status:'VERIFIED',mode:'PUBLISH',source:approved,at:'2026-10-27T08:20:11Z'});
 put('local-publication-ledger.json',{status:'VERIFIED',source:approved});
 const getTaskXml=()=>`<Task><Arguments>&quot;${taskFile}&quot;</Arguments></Task>`;
 const gitCall=(cwd,args)=>{
  if(args[0]==='rev-parse'&&args[1]==='--git-common-dir')return path.join(root,'git-common');
  if(args[0]==='worktree')return `worktree ${checkout}\nHEAD ${approved}\n\nworktree ${second}\nHEAD ${duplicates?approved:old}\n\n`;
  if(args[0]==='rev-parse'&&args[1]==='HEAD')return cwd===checkout||cwd===second&&duplicates?approved:old;
  if(args[0]==='hash-object')return blob;
  if(args[0]==='diff')return '';
  return null;
 };
 return {root,run:()=>runR14({dataRoot,projectRoot,getTaskXml,gitCall})};
}
test('R14 recognizes flexible VBS quoting and parses Git HEAD metadata before probing worktrees',()=>{
 const win=String.raw`shell.Run("""C:\runtime\node.exe"" ""E:\Apps\work\scripts\pc-writer\local-cycle.mjs"" --publish",0,True)`;
 const actual=extractStaticEntrypoints(win);
 assert.equal(actual.length,1);
 assert.match(actual[0],/local-cycle\.mjs$/i);
 const records=parseWorktreeRecords(`worktree /tmp/one\nHEAD ${approved}\nbranch refs/heads/main\n\nworktree /tmp/two\nHEAD ${old}`);
 assert.equal(records.length,2);assert.equal(records[0].head,approved);
});
test('R14 resolves the actual registered launcher and a unique approved worktree',()=>{
 const f=fixture();
 try{
  const r=f.run();
  assert.equal(r.task.sameAsDefaultDataRoot,false);
  assert.equal(r.task.staticEntrypointCount,1);
  assert.equal(r.worktrees.approvedMatches.length,1);
  assert.equal(r.worktrees.registries,1);
  assert.equal(r.decision,'APPROVED_RUNTIME_UNIQUE_AND_SCHEDULED_SOURCE_MATCH_NO_CHANGES_MADE');
  assert.ok(!JSON.stringify(r).includes(f.root));
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
test('R14 stops on dynamically generated launch command or stale/multiple source',()=>{
 for(const [options,status] of [
  [{dynamic:true},'TASK_VBS_STATIC_ENTRYPOINT_AMBIGUOUS_OR_DYNAMIC_STOP'],
  [{stale:true},'SCHEDULED_SOURCE_DIFFERS_FROM_APPROVED_RUNTIME_STOP'],
  [{duplicates:true},'APPROVED_WORKTREE_NOT_UNIQUE_STOP']
 ]){
  const f=fixture(options);
  try{assert.equal(f.run().decision,status,JSON.stringify(options));}
  finally{fs.rmSync(f.root,{recursive:true,force:true});}
 }
});
