import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyHook,updateSourceOnly,validateManifest,sha256,pinnedRuntimeRoute,assessSchedulerSafety,transientPreflightStop} from '../r10-ops.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const pkg=path.dirname(here);
const spec=JSON.parse(fs.readFileSync(path.join(pkg,'hook-spec.json'),'utf8'));
const base=fs.readFileSync(path.join(here,'fixtures','run-local-pr893-base.mjs'),'utf8');
const expected=fs.readFileSync(path.join(pkg,'payload','scripts','pc-writer','run-local.mjs'),'utf8');

test('Git-less package manifest validates without a repository',()=>{
 assert.doesNotThrow(()=>validateManifest(pkg));
 assert.equal(fs.existsSync(path.join(pkg,'.git')),false);
});
test('PR #893 hook inserts once, exactly matching pinned implementation',()=>{
 const first=applyHook(base,spec);
 assert.equal(first.status,'READY_TO_PATCH');
 assert.equal(first.content,expected);
 const second=applyHook(first.content,spec);
 assert.equal(second.status,'ALREADY_PRESENT');
 assert.equal(second.content,expected);
});
test('unknown Writer anchor or missing publication contract stops without mutation',()=>{
 const mutant=base.replace('  // Reuse the existing public snapshot table;','  // Unknown publication section');
 assert.throws(()=>applyHook(mutant,spec),/STOP_WRITER_ANCHOR_MISMATCH/);
 const noGuard=base.replace('publicationCompatibility(root,config.source,source,main)','changedGuard()');
 assert.throws(()=>applyHook(noGuard,spec),/STOP_WRITER_CONTRACT_MISMATCH/);
 const duplicate=expected.replace(spec.anchor,spec.hunk+spec.anchor);
 assert.throws(()=>applyHook(duplicate,spec),/STOP_HOOK_DUPLICATED/);
});
test('only config.source is altered in memory, with exact baseline match',()=>{
 const old=spec.approvedBaselineSha,newSha='f'.repeat(40);
 const input=JSON.stringify({config:{other:true},source:old,key:'KEEP_SECRET_UNPRINTED'},null,2);
 const changed=updateSourceOnly(input,old,newSha);
 assert.equal(JSON.parse(changed).source,newSha);
 assert.equal(JSON.parse(changed).key,'KEEP_SECRET_UNPRINTED');
 assert.throws(()=>updateSourceOnly(input,'0'.repeat(40),newSha),/STOP_CONFIG_SOURCE_FORMAT/);
});
test('SHA-256 fixture and missing/altered package file fail closed',()=>{
 assert.equal(sha256(Buffer.from('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r10-manifest-'));
 try{
  const original=JSON.parse(fs.readFileSync(path.join(pkg,'package-manifest.json'),'utf8'));
  // A verified file is required to exist and match the pinned digest.
  const copy={...original,files:[...original.files]};
  const sample=copy.files.find(x=>x.path==='hook-spec.json');
  fs.writeFileSync(path.join(tmp,'package-manifest.json'),JSON.stringify(copy));
  fs.writeFileSync(path.join(tmp,'hook-spec.json'),fs.readFileSync(path.join(pkg,'hook-spec.json')));
  assert.equal(sample.sha256.length,64);
  assert.throws(()=>validateManifest(tmp),/STOP_PACKAGE_HASH_MISMATCH/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
test('R5 observed Core VBS route is accepted only with pinned script SHA',()=>{
 const expected='E:\\ZGmini\\data\\pc-writer\\cutover-evidence\\inflation-r37-2026-10-20T19-39-19-549Z\\run-local-core.vbs';
 const xml=`<Task><Actions><Exec><Command>wscript.exe</Command><Arguments>"${expected}"</Arguments></Exec></Actions></Task>`;
 const sha='bb3e11c0b5c8da07162b1c824e7b52e7a7c2f987c079f29713211a2413932b01';
 assert.equal(pinnedRuntimeRoute(xml,()=>true,()=>sha),'VERIFIED_R5_PINNED_RUNTIME_ROUTE');
 assert.equal(pinnedRuntimeRoute(xml,()=>true,()=>"0".repeat(64)),'STOP_CORE_VBS_HASH_DRIFT');
 assert.equal(pinnedRuntimeRoute(xml.replace('wscript.exe','other.exe'),()=>true,()=>sha),'STOP_CORE_VBS_ROUTE_CHANGED');
});
test('R7 requires two idle scheduled tasks and adequate next-run margin',()=>{
 const time=Date.parse('2026-10-29T15:52:00Z');
 const core={Enabled:true,State:'Ready',NextMs:time+180000};
 const korea={Enabled:true,State:'Ready'};
 assert.equal(assessSchedulerSafety(core,korea,time),'CLEAR');
 assert.equal(assessSchedulerSafety({...core,State:'Running'},korea,time),'STOP_SCHEDULER_BUSY');
 assert.equal(assessSchedulerSafety({...core,NextMs:time+10000},korea,time),'STOP_CORE_NEXT_RUN_TOO_NEAR');
 assert.equal(assessSchedulerSafety(core,{...korea,Enabled:false},time),'STOP_SCHEDULER_DISABLED_OR_UNVERIFIED');
});
test('bounded PREFLIGHT wait retries only expected busy states',()=>{
 assert.equal(transientPreflightStop('STOP_SCHEDULER_BUSY'),true);
 assert.equal(transientPreflightStop('STOP_LOCK_PRESENT'),true);
 assert.equal(transientPreflightStop('STOP_CORE_NEXT_RUN_TOO_NEAR'),true);
 assert.equal(transientPreflightStop('STOP_SOURCE_CONFLICT'),false);
 assert.equal(transientPreflightStop('STOP_CORE_VBS_HASH_DRIFT'),false);
});
