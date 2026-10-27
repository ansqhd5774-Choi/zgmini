import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {identifyLauncher,runR12} from '../scripts/pc-writer/market-calendar-r12-launcher-source.mjs';

const source='e95805a368a6d0c4461f6de9410df4b8e59ea011';
const blob='f084e2a360b544257bb44a60b97875627c7ca371';

function fixture({head=source,xml=true,launcher=true,dirty='',writerStatus='VERIFIED'}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r12-'));
 const dataRoot=path.join(root,'data');fs.mkdirSync(dataRoot);
 const checkout=path.join(root,'source');
 const script=path.join(checkout,'scripts','pc-writer','local-cycle.mjs');
 fs.mkdirSync(path.dirname(script),{recursive:true});
 fs.writeFileSync(script,'// fixture');
 const put=(file,body)=>fs.writeFileSync(path.join(dataRoot,file),JSON.stringify(body));
 put('config.json',{enabled:true,collectionTarget:'pc',source});
 put('local-writer-last-run.json',{mode:'PUBLISH',status:writerStatus,source,at:'2026-10-27T07:55:09Z'});
 put('local-publication-ledger.json',{status:'VERIFIED',source});
 if(launcher)fs.writeFileSync(path.join(dataRoot,'run-local-core.vbs'),`Set shell = CreateObject("WScript.Shell")\nWScript.Quit shell.Run("""node.exe"" ""${script}"" --publish", 0, True)`);
 const gitCall=(_root,args)=>args[0]==='rev-parse'?head:args[0]==='hash-object'?blob:args[0]==='diff'?dirty:null;
 const run=()=>runR12({dataRoot,getTaskXml:()=>xml?'<Arguments>&quot;run-local-core.vbs&quot;</Arguments>':null,gitCall});
 return{root,checkout,run};
}

test('R12 follows the VBS launcher instead of scanning unrelated E: projects',()=>{
 const f=fixture();
 try{
  const sourceScript=path.join(f.checkout,'scripts','pc-writer','local-cycle.mjs');
  assert.equal(identifyLauncher(`shell.Run("""node"" ""${sourceScript}"" --publish",0,True)`),f.checkout);
  const result=f.run();
  assert.equal(result.decision,'READY_FOR_SINGLE_FILE_SOURCE_COMMIT_NO_CHANGES_MADE');
  assert.equal(result.launcher.head,source);
  assert.equal(result.launcher.parserBlob,blob);
  assert.equal(result.launcher.protectedClean,true);
  assert.ok(!JSON.stringify(result).includes(f.root));
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('R12 stops safely on launcher drift, missing task, or unverified publisher',()=>{
 for(const opts of [{head:'ee41bb295200d248efc683841e0f1ba0bc4779ee'},{xml:false},{launcher:false},{dirty:'lib/release-calendar.mjs'},{writerStatus:'ERROR'}]){
  const f=fixture(opts);
  try{assert.match(f.run().decision,/_STOP$/,JSON.stringify(opts));}finally{fs.rmSync(f.root,{recursive:true,force:true});}
 }
});
