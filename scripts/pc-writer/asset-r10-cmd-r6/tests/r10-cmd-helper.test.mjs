import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyHook,updateSourceOnly,validateManifest,sha256} from '../r10-ops.mjs';

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
