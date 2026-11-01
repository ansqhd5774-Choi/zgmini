import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {resolveR51CoreOrigin} from './market-calendar-r51-core-origin.mjs';
import {runR51PcApply} from './market-calendar-r51-pc-apply.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const wid=p=>sha(path.normalize(p).replaceAll('\\','/').toLowerCase()).slice(0,12);
const quoted=x=>x.replaceAll('"','""');
function createFixture({indirect=false,directVbs=false}={}){
 const top=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r51-'));
 const root=path.join(top,'core-project'),base=path.join(top,'data','pc-writer');
 const js=path.join(root,'scripts','pc-writer','new-core-entry.mjs');
 const outer=path.join(top,'active-task.vbs'),first=path.join(top,'core-launch.vbs');
 const second=path.join(top,'second-core.vbs');
 fs.mkdirSync(path.dirname(js),{recursive:true});fs.mkdirSync(base,{recursive:true});
 fs.writeFileSync(js,'// approved fixture\n');
 const vbsNode=`Set sh = CreateObject("WScript.Shell")\nrc = sh.Run("${quoted(`node.exe "${js}" --cycle`)}",0,True)\nWScript.Quit rc\n`;
 fs.writeFileSync(second,vbsNode);
 if(indirect)fs.writeFileSync(first,`Set sh = CreateObject("WScript.Shell")\nrc = sh.Run("${quoted(`wscript.exe "${second}"`)}",0,True)\nWScript.Quit rc\n`);
 else fs.writeFileSync(first,vbsNode);
 const source=`Set sh = CreateObject("WScript.Shell")\nrc = sh.Run("${quoted(directVbs?`"${first}"`:`wscript.exe "${first}"`)}",0,True)\nIf rc <> 0 Then WScript.Quit rc\nrc = sh.Run("${quoted(`node.exe "${path.join(base,'archive-run.mjs')}"`)}",0,True)\nWScript.Quit rc\n`;
 fs.writeFileSync(outer,source);
 const xml=`<Task><Actions><Exec><Command>wscript.exe</Command><Arguments>"${outer}"</Arguments></Exec></Actions></Task>`;
 return {top,root,base,js,outer,first,second,source,xml,sha:sha(source)};
}
const resolver=f=>xml=>resolveR51CoreOrigin(xml,{expectedOuterHash:f.sha});

test('R51 traces FIRST VBS to Core; ignores second archive-run Node script',()=>{
 const f=createFixture();
 try{
  const r=resolver(f)(f.xml);
  assert.equal(r.status,'R51_SCHEDULED_CORE_ORIGIN_RESOLVED');
  assert.equal(r.root,f.root);
  assert.equal(r.rootWorktreeId,wid(f.root));
  assert.equal(r.coreVbsCount,1);
  assert.equal(r.archiveEntrypointRecognized,true);
  assert.equal(r.mode,'NESTED_VBS_DIRECT_NODE');
  assert.equal(JSON.stringify({...r,root:null}).includes(f.top),false);
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});

test('R51 accepts a direct absolute .vbs path as the first Run command',()=>{
 const f=createFixture({directVbs:true});
 try{
  const r=resolver(f)(f.xml);
  assert.equal(r.status,'R51_SCHEDULED_CORE_ORIGIN_RESOLVED');
  assert.equal(r.root,f.root);
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});

test('R51 follows two nested VBS links and detects wrapper drift',()=>{
 const f=createFixture({indirect:true});
 try{
  const r=resolver(f)(f.xml);
  assert.equal(r.status,'R51_SCHEDULED_CORE_ORIGIN_RESOLVED');
  assert.equal(r.coreVbsCount,2);
  fs.appendFileSync(f.outer,"' changed\n");
  const stopped=resolver(f)(f.xml);
  assert.equal(stopped.status,'R51_OUTER_WRAPPER_CHANGED');
  assert.equal(stopped.root,null);
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});

test('R51 returns anonymized child syntax when the real Core launcher cannot be resolved',()=>{
 const f=createFixture();
 try{
  fs.writeFileSync(f.first,`Set shell = CreateObject("WScript.Shell")\nsecret = "CONFIDENTIAL_PC_FILE"\nWScript.Quit 1\n`);
  const r=resolver(f)(f.xml);
  assert.equal(r.status,'R51_NESTED_CORE_ORIGIN_UNVERIFIED');
  assert.equal(r.coreVbsCount,1);
  assert.equal(JSON.stringify(r).includes('CONFIDENTIAL_PC_FILE'),false);
  assert.equal(JSON.stringify(r).includes(f.root),false);
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});

test('R51 adapter passes verified Core root and preserves existing quota lock',()=>{
 const f=createFixture();
 try{
  let calls=0;
  const opts={apply:true,base:f.base,getTaskXml:()=>f.xml,resolveOrigin:resolver(f),
   install:injected=>{
    calls++;
    assert.equal(injected.getRoot(injected.getTaskXml()),f.root);
    assert.equal(injected.expectedWorktreeId,wid(f.root));
    return {decision:'R46_PREFLIGHT_READY_NO_CHANGES',changedFiles:[]};
   }};
  const r=runR51PcApply(opts);
  assert.equal(r.sourceChainVerified,true);
  assert.equal(calls,1);
  fs.writeFileSync(path.join(f.base,'quota-runner.lock'),'busy');
  const stopped=runR51PcApply(opts);
  assert.equal(stopped.decision,'R51_QUOTA_RUNNER_ACTIVE_STOP');
  assert.equal(calls,1);
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});
