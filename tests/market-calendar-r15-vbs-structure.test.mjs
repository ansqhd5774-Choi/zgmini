import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {redactVbsStructure,runR15} from '../scripts/pc-writer/market-calendar-r15-vbs-structure.mjs';

const approved='7ac573fcf977c5fab97f2aea44c12555fd86dd9f';
function fixture({writerApproved=true,missingTask=false}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r15-'));
 const dataRoot=path.join(root,'data'),scheduledRoot=path.join(root,'exact-schedule');
 fs.mkdirSync(dataRoot);fs.mkdirSync(scheduledRoot);
 const taskFile=path.join(scheduledRoot,'run-local-core.vbs');
 fs.writeFileSync(taskFile,[
  'Set obj = CreateObject("WScript.Shell")',
  'Set disk = CreateObject("Scripting.FileSystemObject")',
  'base = disk.GetParentFolderName(WScript.ScriptFullName)',
  'nodeBinary = "C:\\sensitive\\runtime\\node.exe"',
  'entry = base & "\\scripts\\pc-writer\\local-cycle.mjs"',
  'obj.Run Chr(34) & nodeBinary & Chr(34) & " " & entry, 0, True',
  'api_key = "NEVER_EXPOSE_12345"',
 ].join('\r\n'));
 const put=(name,value)=>fs.writeFileSync(path.join(dataRoot,name),JSON.stringify(value));
 put('config.json',{source:approved,enabled:true,collectionTarget:'pc'});
 put('local-writer-last-run.json',{source:writerApproved?approved:'3941d416310b1dd5fcc778c4df2b761a2a147a42',status:'VERIFIED',mode:'PUBLISH',at:'2026-10-27T08:40:00Z'});
 put('local-publication-ledger.json',{source:approved,status:'VERIFIED'});
 const getTaskXml=()=>missingTask?'<Task/>':`<Task><Arguments>&quot;${taskFile}&quot;</Arguments></Task>`;
 return {root,run:()=>runR15({dataRoot,getTaskXml})};
}

test('R15 redacts quoted strings and unquoted sensitive lines while retaining control syntax',()=>{
 const source=[
  'Set obj = CreateObject("WScript.Shell")',
  'node = "C:\\sensitive\\node.exe"',
  'cmd = node & " " & "E:\\private\\scripts\\pc-writer\\local-cycle.mjs"',
  'api_key = "PRIVATE-TOKEN-ABCD"',
  'site = "contact@example.com"',
 ].join('\n');
 const result=JSON.stringify(redactVbsStructure(source));
 assert.match(result,/CreateObject\(<STR:PROGID_SHELL>\)/);
 assert.match(result,/ENTRY_LOCAL_CYCLE/);
 assert.match(result,/SENSITIVE_LINE_REDACTED/);
 for(const value of ['C:\\sensitive','E:\\private','PRIVATE-TOKEN-ABCD','contact@example.com'])assert.ok(!result.includes(value));
});

test('R15 reads only the registered VBS and outputs a redacted dynamic-launch structure',()=>{
 const f=fixture();
 try{
  const result=f.run();
  assert.equal(result.decision,'REDACTED_TASK_VBS_STRUCTURE_READY_NO_CHANGES_MADE');
  assert.equal(result.task.exactVbsPathParsed,true);
  assert.equal(result.task.categories.concatOperator,true);
  assert.equal(result.task.categories.chrQuote,true);
  assert.equal(result.task.categories.createObject,true);
  assert.equal(result.task.categories.runMember,true);
  assert.equal(result.task.categories.parenthesizedCall,false); // VBScript permits .Run without parenthesis
  const publicResult=JSON.stringify(result);
  assert.ok(!publicResult.includes(f.root));
  assert.ok(!publicResult.includes('NEVER_EXPOSE_12345'));
  assert.ok(!publicResult.includes('C:\\sensitive'));
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('R15 fails closed when the verified publisher or exact task is absent',()=>{
 for(const [options,decision] of [
  [{writerApproved:false},'APPROVED_PUBLISHER_NOT_VERIFIED_STOP'],
  [{missingTask:true},'EXACT_TASK_VBS_MISSING_STOP'],
 ]){
  const f=fixture(options);
  try{assert.equal(f.run().decision,decision);}
  finally{fs.rmSync(f.root,{recursive:true,force:true});}
 }
});
