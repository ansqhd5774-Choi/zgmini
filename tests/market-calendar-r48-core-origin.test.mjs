import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {resolveR48CoreOrigin} from '../scripts/pc-writer/market-calendar-r48-core-origin.mjs';
import {runR48PcApply} from '../scripts/pc-writer/market-calendar-r48-pc-apply.mjs';

const id=p=>createHash('sha256').update(path.normalize(p).replaceAll('\\','/').toLowerCase()).digest('hex').slice(0,12);
const setup=(style='direct')=>{
 const top=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r48-'));
 const base=path.join(top,'pc-home'),root=path.join(top,'pc-project');
 const script=path.join(root,'scripts','pc-writer','quota-runner.mjs');
 fs.mkdirSync(base);fs.mkdirSync(path.dirname(script),{recursive:true});
 fs.writeFileSync(script,'// real scheduled script fixture\n');
 const wrapper=path.join(top,'current-core-wrapper.vbs');
 const origin=path.join(top,'current-core-run.cmd');
 if(style==='cmd'){
  fs.writeFileSync(origin,`"node.exe" "${script}" --publish\n`);
  fs.writeFileSync(wrapper,`Set shell = CreateObject("WScript.Shell")\nWScript.Quit shell.Run("${origin}",0,True)\n`);
 }else fs.writeFileSync(wrapper,`Set shell = CreateObject("WScript.Shell")\nWScript.Quit shell.Run("node.exe ${script}",0,True)\n`);
 const xml=`<Task><Actions><Exec><Command>wscript.exe</Command><Arguments>"${wrapper}"</Arguments></Exec></Actions></Task>`;
 return {top,base,root,script,wrapper,origin,xml};
};

test('R48 resolves the scheduled direct-VBS Core origin without relying on R38 marker',()=>{
 const f=setup();
 try{
  const v=resolveR48CoreOrigin(f.xml);
  assert.equal(v.status,'R48_SCHEDULED_ORIGIN_RESOLVED');
  assert.equal(v.mode,'DIRECT_VBS');
  assert.equal(v.root,f.root);
  assert.equal(v.rootWorktreeId,id(f.root));
  assert.equal(JSON.stringify({...v,root:null}).includes(f.top),false);
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});

test('R48 safely resolves a VBS-to-CMD scheduled Core origin',()=>{
 const f=setup('cmd');
 try{
  const v=resolveR48CoreOrigin(f.xml);
  assert.equal(v.status,'R48_SCHEDULED_ORIGIN_RESOLVED');
  assert.equal(v.mode,'VBS_TO_CMD');
  assert.equal(v.rootWorktreeId,id(f.root));
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});

test('R48 refuses a missing script and ambiguous multiple Core script paths',()=>{
 const f=setup();
 try{
  fs.unlinkSync(f.script);
  assert.equal(resolveR48CoreOrigin(f.xml).status,'R48_REFERENCED_SCRIPT_MISSING');
  fs.writeFileSync(f.script,'// fixture restored\n');
  const second=path.join(f.root,'scripts','pc-writer','collect-local.mjs');
  fs.writeFileSync(second,'// different script\n');
  fs.appendFileSync(f.wrapper,`shell.Run("node.exe ${second}",0,True)\n`);
  assert.equal(resolveR48CoreOrigin(f.xml).status,'R48_SCRIPT_REFERENCE_AMBIGUOUS');
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});

test('R48 adapter preserves the R46 installer gates and checks the current root twice',()=>{
 const f=setup();
 try{
  let calls=0;
  const result=runR48PcApply({apply:true,base:f.base,getTaskXml:()=>f.xml,
   install:options=>{
    calls++;
    assert.equal(options.getRoot(options.getTaskXml()),f.root);
    assert.equal(options.expectedWorktreeId,id(f.root));
    assert.equal(options.apply,true);
    return {decision:'R46_PREFLIGHT_READY_NO_CHANGES',forcedCollection:false,gitPushed:false};
   }});
  assert.equal(calls,1);
  assert.equal(result.audit,'MARKET_CALENDAR_R48_PC_R45_INSTALL');
  assert.equal(result.originVerified,true);
  fs.writeFileSync(path.join(f.base,'quota-runner.lock'),'{}');
  const busy=runR48PcApply({apply:true,base:f.base,getTaskXml:()=>f.xml,install:()=>{throw Error('MUST_NOT_RUN');}});
  assert.equal(busy.decision,'R48_QUOTA_RUNNER_ACTIVE_STOP');
 }finally{fs.rmSync(f.top,{recursive:true,force:true});}
});
