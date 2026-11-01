import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {extractR50RunLiterals,resolveR50CoreOrigin,tokenizeR50Command} from './market-calendar-r50-core-origin.mjs';
import {runR50PcApply} from './market-calendar-r50-pc-apply.mjs';

const sha=v=>createHash('sha256').update(v).digest('hex');
const id=p=>sha(path.normalize(p).replaceAll('\\','/').toLowerCase()).slice(0,12);
function fixture({command=null}={}){
 const top=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r50-'));
 const root=path.join(top,'current core checkout');
 const base=path.join(top,'home');
 const entry=path.join(root,'scripts','pc-writer','new-core-auxiliary.mjs');
 const wrapper=path.join(top,'core-current.vbs');
 fs.mkdirSync(path.dirname(entry),{recursive:true});fs.mkdirSync(base);
 fs.writeFileSync(entry,'// scheduled entry fixture\n');
 const commandText=command??`node.exe "${entry}" --cycle`;
 const q=s=>s.replaceAll('"','""');
 const source=`Set sh = CreateObject("WScript.Shell")\nrc = sh.Run("""wscript.exe"" ""${top}/guard.vbs""",0,True)\nIf rc <> 0 Then WScript.Quit rc\nrc = sh.Run("${q(commandText)}",0,True)\nWScript.Quit rc\n`;
 fs.writeFileSync(wrapper,source);
 const xml=`<Task><Actions><Exec><Command>wscript.exe</Command><Arguments>"${wrapper}"</Arguments></Exec></Actions></Task>`;
 return {top,root,base,entry,wrapper,source,sha:sha(source),xml};
}
const resolve=f=>resolveR50CoreOrigin(f.xml,{expectedWrapperSha256:f.sha});

test('R50 verifies pinned exact wrapper and resolves novel direct Node entry filename',()=>{
 const f=fixture();
 try{
  const r=resolve(f);
  assert.equal(r.status,'R50_SCHEDULED_ORIGIN_RESOLVED');
  assert.equal(r.root,f.root);
  assert.equal(r.rootWorktreeId,id(f.root));
  assert.equal(r.scheduledEntryName,'new-core-auxiliary.mjs');
  assert.equal(r.wrapperHashMatched,true);
  const external={...r,root:null};
  assert.equal(JSON.stringify(external).includes(f.top),false);
  assert.equal(extractR50RunLiterals(f.source).length,2);
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});

test('R50 rejects wrapper drift before reading an active entry',()=>{
 const f=fixture();
 try{
  assert.equal(resolveR50CoreOrigin(f.xml).status,'R50_WRAPPER_HASH_CHANGED');
  fs.appendFileSync(f.wrapper,"'an extra comment\n");
  const r=resolve(f);
  assert.equal(r.status,'R50_WRAPPER_HASH_CHANGED');
  assert.equal(r.root,null);
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});

test('R50 rejects shell commands and missing or ambiguous script origin',()=>{
 const f=fixture();
 try{
  assert.equal(tokenizeR50Command('cmd.exe /c node.exe source.mjs & del foo'),null);
  assert.equal(tokenizeR50Command('node.exe "unfinished'),null);
  fs.unlinkSync(f.entry);
  assert.equal(resolve(f).status,'R50_SCHEDULED_SCRIPT_UNREADABLE');
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
 const bad=fixture({command:'cmd.exe /c node.exe C:\\source\\scripts\\pc-writer\\qu.mjs'});
 try{assert.equal(resolve(bad).status,'R50_DIRECT_NODE_COMMAND_UNVERIFIED');}
 finally{fs.rmSync(bad.top,{recursive:true,force:true});}
});

test('R50 reports anonymized code outline when Node entry is outside project/scripts',()=>{
 const f=fixture();
 try{
  const outside=path.join(f.top,'data','pc-writer','task-entry.mjs');
  fs.mkdirSync(path.dirname(outside),{recursive:true});
  fs.writeFileSync(outside,`import fs from 'node:fs';\nconst secret = 'DO_NOT_LEAK_PRIVATE_VALUE';\nconst item = 'C:\\private\\person\\data';\n`);
  const updated=f.source.replace(`node.exe ""${f.entry}"" --cycle`,
   `node.exe ""${outside}"" --cycle`);
  fs.writeFileSync(f.wrapper,updated);
  const r=resolveR50CoreOrigin(f.xml,{expectedWrapperSha256:sha(updated)});
  assert.equal(r.status,'R50_NODE_ENTRY_OUTSIDE_REPO_SCRIPTS');
  assert.equal(r.root,null);
  assert.equal(r.scheduledEntryName,'task-entry.mjs');
  assert.equal(r.entryEvidence.entryUnderDataPcWriter,true);
  assert.equal(JSON.stringify({...r,entryEvidence:r.entryEvidence}).includes('DO_NOT_LEAK_PRIVATE_VALUE'),false);
  assert.equal(JSON.stringify(r).includes('C:\\private'),false);
  assert.equal(r.entryEvidence.codeOutline.length,3);
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});

test('R50 passes verified root and all R46 locks to installer, refuses busy quota-runner',()=>{
 const f=fixture();
 try{
  let calls=0;
  const args={apply:true,base:f.base,getTaskXml:()=>f.xml,
   resolveOrigin:xml=>resolveR50CoreOrigin(xml,{expectedWrapperSha256:f.sha}),
   install:options=>{
    calls++;
    assert.equal(options.getRoot(options.getTaskXml()),f.root);
    assert.equal(options.expectedWorktreeId,id(f.root));
    assert.equal(options.apply,true);
    return {decision:'R46_PREFLIGHT_READY_NO_CHANGES',forcedCollection:false};
   }};
  const out=runR50PcApply(args);
  assert.equal(calls,1);
  assert.equal(out.originVerified,true);
  assert.equal(out.scheduledEntryName,'new-core-auxiliary.mjs');
  fs.writeFileSync(path.join(f.base,'quota-runner.lock'),'busy');
  const stopped=runR50PcApply(args);
  assert.equal(stopped.decision,'R50_QUOTA_RUNNER_ACTIVE_STOP');
  assert.equal(calls,1);
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});
