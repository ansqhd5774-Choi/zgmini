import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {install,preflight} from './theme-biotech-r8-parquet-fix-apply.mjs';

const sum=value=>createHash('sha256').update(value).digest('hex');
const READER='scripts/pc-writer/theme-biotech-provisional-r8.mjs';
const AUTO='scripts/pc-writer/theme-biotech-auto-r8.mjs';
function fixture(){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'biotech-r8-parquet-fix-'));
 const bundle=path.join(base,'desktop'),source=path.join(base,'source-r8');
 const state=path.join(base,'state'),core=path.join(base,'r179-publish-core.mjs');
 for(const d of [state,path.dirname(path.join(bundle,READER)),path.dirname(path.join(source,READER))])
  fs.mkdirSync(d,{recursive:true});
 fs.writeFileSync(core,'approved-seven');
 fs.writeFileSync(path.join(source,AUTO),'auth-bridge');
 fs.writeFileSync(path.join(source,READER),'original-reader');
 fs.writeFileSync(path.join(bundle,READER),'repaired-reader');
 return {base,bundle,source,state,core,
  expectedCoreSha256:sum('approved-seven'),
  authBridgeSha256:sum('auth-bridge'),oldReaderSha256:sum('original-reader')};
}
test('R8 parquet patch is one-file, backed-up, and idempotent',()=>{
 const f=fixture();try{
  assert.equal(install(f).filesChanged,1);
  assert.equal(fs.readFileSync(path.join(f.bundle,'BIOTECH_R8_BEFORE_PARQUET_FIX.mjs'),'utf8'),
   'original-reader');
  assert.equal(fs.readFileSync(path.join(f.source,READER),'utf8'),'repaired-reader');
  assert.equal(fs.readFileSync(path.join(f.source,AUTO),'utf8'),'auth-bridge');
  assert.deepEqual(install(f),{status:'ALREADY_PATCHED',filesChanged:0});
 }finally{fs.rmSync(f.base,{recursive:true,force:true});}
});
test('R8 parquet patch refuses unexpected source, inactive auth bridge, or active task',()=>{
 const f=fixture();try{
  fs.writeFileSync(path.join(f.source,READER),'unknown-reader');
  assert.throws(()=>preflight(f),/R8_PARQUET_READER_SOURCE_DRIFT/);
  fs.writeFileSync(path.join(f.source,READER),'original-reader');
  fs.writeFileSync(path.join(f.source,AUTO),'unexpected-auth');
  assert.throws(()=>preflight(f),/R8_AUTH_BRIDGE_MISSING_OR_CHANGED/);
  fs.writeFileSync(path.join(f.source,AUTO),'auth-bridge');
  fs.writeFileSync(path.join(f.state,'biotech-auto-r8.lock'),'busy');
  assert.throws(()=>preflight(f),/R8_BIOTECH_R8_RUNNING/);
  assert.equal(fs.existsSync(path.join(f.bundle,'BIOTECH_R8_BEFORE_PARQUET_FIX.mjs')),false);
 }finally{fs.rmSync(f.base,{recursive:true,force:true});}
});
