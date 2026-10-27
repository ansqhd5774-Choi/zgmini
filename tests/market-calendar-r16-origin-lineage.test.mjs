import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {extractLiteralAssignment,pathIdentity,runR16} from '../scripts/pc-writer/market-calendar-r16-origin-lineage.mjs';

const approved='7ac573fcf977c5fab97f2aea44c12555fd86dd9f';
const old='3941d416310b1dd5fcc778c4df2b761a2a147a42';
const blob='f084e2a360b544257bb44a60b97875627c7ca371';
function fixture({stale=false,missingOrigin=false,dynamicOrigin=false,dirty=false}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r16-'));
 const dataRoot=path.join(root,'data'),schedule=path.join(root,'schedule'),checkout=path.join(root,'checkout');
 const local=path.join(checkout,'scripts','pc-writer','local-cycle.mjs');
 fs.mkdirSync(dataRoot);fs.mkdirSync(schedule);fs.mkdirSync(path.dirname(local),{recursive:true});
 const origin=path.join(root,'backup','run-local-core.vbs'),dispatcher=path.join(root,'dispatcher.mjs'),wrapper=path.join(schedule,'run-local-core.vbs');
 fs.mkdirSync(path.dirname(origin),{recursive:true});
 if(!missingOrigin)fs.writeFileSync(origin,`Set shell = CreateObject("WScript.Shell")\r\nrc = shell.Run("""node.exe"" ""${local}"" --publish", 0, True)`);
 fs.writeFileSync(dispatcher,'// synthetic dispatcher');
 fs.writeFileSync(wrapper,[
  "' ZGMINI_R38_WRAPPER_V1 | existing backup first",
  'Option Explicit',
  'Set sh = CreateObject("WScript.Shell")',
  dynamicOrigin?'origin = scriptBase & "run-local-core.vbs"':`origin = "${origin}"`,
  `dispatcher = "${dispatcher}"`,
  'coreRc = sh.Run(Chr(34) & executable & Chr(34) & " " & origin, 0, True)',
 ].join('\r\n'));
 const put=(name,value)=>fs.writeFileSync(path.join(dataRoot,name),JSON.stringify(value));
 put('config.json',{source:approved,enabled:true,collectionTarget:'pc'});
 put('local-writer-last-run.json',{source:approved,mode:'PUBLISH',status:'VERIFIED',at:'2026-10-27T09:00:00Z'});
 put('local-publication-ledger.json',{source:approved,status:'VERIFIED'});
 const getTaskXml=()=>`<Task><Arguments>&quot;${wrapper}&quot;</Arguments></Task>`;
 const gitCall=(_cwd,args)=>args[0]==='rev-parse'?stale?old:approved:args[0]==='hash-object'?blob:args[0]==='diff'?dirty?'lib/release-calendar.mjs':'':null;
 return {root,origin,run:()=>runR16({dataRoot,getTaskXml,gitCall,expectedWorktreeId:pathIdentity(checkout)})};
}

test('R16 reads literal origin path without echoing the PC path or wrapper source',()=>{
 const f=fixture();
 try{
  assert.equal(extractLiteralAssignment(`origin = "${f.origin}"`,'origin'),f.origin);
  const result=f.run();
  assert.equal(result.decision,'ORIGIN_RUNTIME_ALIGNED_BLS_NEXT_STAGE_READY_NO_CHANGES_MADE');
  assert.equal(result.origin.scriptCandidateCount,1);
  assert.equal(result.origin.matchesR14UniqueApprovedWorktree,true);
  assert.deepEqual(result.origin.candidateKinds,['local-cycle.mjs']);
  assert.equal(result.dispatcher.type,'MJS');
  assert.ok(!JSON.stringify(result).includes(f.root));
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('R16 fails closed on stale runner, missing backup, dynamic origin or dirty source',()=>{
 for(const [opts,status] of [
  [{stale:true},'ORIGIN_GIT_SOURCE_DIFFERS_FROM_APPROVED_STOP'],
  [{missingOrigin:true},'ORIGIN_FILE_NOT_FOUND_STOP'],
  [{dynamicOrigin:true},'ORIGIN_LITERAL_PATH_UNRESOLVED_STOP'],
  [{dirty:true},'ORIGIN_NOT_R14_CLEAN_APPROVED_WORKTREE_STOP'],
 ]){
  const f=fixture(opts);
  try{assert.equal(f.run().decision,status,JSON.stringify(opts));}
  finally{fs.rmSync(f.root,{recursive:true,force:true});}
 }
});
