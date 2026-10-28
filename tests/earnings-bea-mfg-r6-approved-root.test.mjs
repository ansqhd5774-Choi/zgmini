import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {discoverOperationalRoot} from '../scripts/pc-writer/BEA_MFG_R6_FIND_OPERATIONAL.mjs';

const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'bea-mfg-root-'));
 const projectRoot=path.join(root,'projects');
 const pcHome=path.join(root,'pc');
 fs.mkdirSync(projectRoot);fs.mkdirSync(pcHome);
 const good=path.join(projectRoot,'approved');
 fs.mkdirSync(good);
 git('init','-b','main',good);
 git('-C',good,'remote','add','origin','https://github.com/ansqhd5774-Choi/zgmini.git');
 fs.mkdirSync(path.join(good,'worker'));
 fs.writeFileSync(path.join(good,'worker','example.mjs'),'export const ok=true;\n');
 git('-C',good,'add','.');
 git('-C',good,'-c','user.email=test@example.com','-c','user.name=Test','commit','-m','baseline');
 const source=git('-C',good,'rev-parse','HEAD');
 fs.writeFileSync(path.join(pcHome,'config.json'),JSON.stringify({collectionTarget:'pc',enabled:true,source}));
 return {root,projectRoot,pcHome,good,source};
}

test('discover exact clean approved SHA without touching source',()=>{
 const f=fixture();try{
  assert.equal(discoverOperationalRoot(f),f.good);
  assert.equal(discoverOperationalRoot({...f,explicitRoot:f.good}),f.good);
  assert.equal(git('-C',f.good,'status','--porcelain'),'');
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('missing, mismatched or dirty operational source fails closed',()=>{
 const f=fixture();try{
  fs.writeFileSync(path.join(f.pcHome,'config.json'),JSON.stringify({collectionTarget:'pc',enabled:true,source:'a'.repeat(40)}));
  assert.throws(()=>discoverOperationalRoot(f),/APPROVED_OPERATIONAL_ROOT_NOT_FOUND/);
  fs.writeFileSync(path.join(f.pcHome,'config.json'),JSON.stringify({collectionTarget:'pc',enabled:true,source:f.source}));
  fs.writeFileSync(path.join(f.good,'worker','example.mjs'),'export const changed=true;\n');
  assert.throws(()=>discoverOperationalRoot(f),/APPROVED_OPERATIONAL_ROOT_NOT_FOUND/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('ambiguous matching operational roots are never guessed',()=>{
 const f=fixture();try{
  const other=path.join(f.projectRoot,'approved-copy');
  fs.cpSync(f.good,other,{recursive:true});
  assert.throws(()=>discoverOperationalRoot(f),/AMBIGUOUS_APPROVED_OPERATIONAL_ROOT/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
