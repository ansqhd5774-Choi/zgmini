import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {install,preflight} from './theme-biotech-r8-auth-bridge-apply.mjs';

const sum=v=>createHash('sha256').update(v).digest('hex');
function fixture(){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'r8-bridge-install-'));
 const bundle=path.join(base,'desktop'),source=path.join(base,'source-r8');
 const state=path.join(base,'state'),core=path.join(base,'r179-publish-core.mjs');
 const relAuto='scripts/pc-writer/theme-biotech-auto-r8.mjs';
 const relAuth='scripts/pc-writer/theme-biotech-seven-auth-r8.mjs';
 for(const d of [state,path.dirname(path.join(bundle,relAuto)),path.dirname(path.join(source,relAuto))])
  fs.mkdirSync(d,{recursive:true});
 fs.writeFileSync(core,'seven-core');
 fs.writeFileSync(path.join(source,relAuto),'previous-r8-auto');
 fs.writeFileSync(path.join(bundle,relAuto),'safe-r8-auto');
 fs.writeFileSync(path.join(bundle,relAuth),'safe-r8-auth');
 return {base,bundle,source,state,core,relAuto,relAuth,
  expectedCoreSha256:sum('seven-core'),oldAutoSha256:sum('previous-r8-auto')};
}
test('bridge replaces only two R8 files, preserves rollback source, and is repeatable',()=>{
 const f=fixture();
 try{
  const x=install(f);
  assert.equal(x.status,'R8_AUTH_BRIDGE_INSTALLED');
  assert.equal(x.filesChanged,2);
  assert.equal(fs.readFileSync(path.join(f.bundle,'BIOTECH_R8_BEFORE_AUTH_BRIDGE.mjs'),'utf8'),
   'previous-r8-auto');
  assert.equal(fs.readFileSync(path.join(f.source,f.relAuto),'utf8'),'safe-r8-auto');
  assert.equal(fs.readFileSync(path.join(f.source,f.relAuth),'utf8'),'safe-r8-auth');
  assert.deepEqual(install(f),{status:'ALREADY_PATCHED',filesChanged:0});
 }finally{fs.rmSync(f.base,{recursive:true,force:true});}
});
test('bridge refuses changed original, foreign publisher and active R7 lock',()=>{
 const f=fixture();
 try{
  fs.writeFileSync(path.join(f.source,f.relAuto),'unexpected-old');
  assert.throws(()=>preflight(f),/R8_ORIGINAL_AUTO_CHANGED/);
  fs.writeFileSync(path.join(f.source,f.relAuto),'previous-r8-auto');
  assert.throws(()=>preflight({...f,expectedCoreSha256:sum('wrong')}),
   /R8_APPROVED_SEVEN_CORE_MISMATCH/);
  fs.writeFileSync(path.join(f.state,'biotech-auto-r7.lock'),'busy');
  assert.throws(()=>preflight(f),/R8_BIOTECH_CYCLE_RUNNING/);
  assert.equal(fs.existsSync(path.join(f.bundle,'BIOTECH_R8_BEFORE_AUTH_BRIDGE.mjs')),false);
 }finally{fs.rmSync(f.base,{recursive:true,force:true});}
});
