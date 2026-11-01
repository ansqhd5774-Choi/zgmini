import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spaceSatelliteApprovedSevenTokenR31} from
 '../scripts/pc-writer/theme-space-satellite-auth-r31.mjs';

function setup(){
 const dataRoot=fs.mkdtempSync(path.join(os.tmpdir(),'zg-space-seven-auth-'));
 const home=path.join(dataRoot,'theme-market-history-r131','marketparquet-r167');
 fs.mkdirSync(home,{recursive:true});
 fs.mkdirSync(path.join(dataRoot,'pc-writer'),{recursive:true});
 const coreBytes=Buffer.from('approved seven-theme fixture, no secrets');
 fs.writeFileSync(path.join(home,'r179-publish-core.mjs'),coreBytes);
 fs.writeFileSync(path.join(dataRoot,'pc-writer','config.json'),JSON.stringify({
  enabled:true,collectionTarget:'pc',source:'a'.repeat(40)}));
 return {dataRoot,home,expectedCoreSha256:createHash('sha256').update(coreBytes).digest('hex')};
}

test('R31 calls the pinned approved seven-theme source and existing d1.credential only',async()=>{
 const {dataRoot,home,expectedCoreSha256}=setup();
 const selectedRoot=path.join(dataRoot,'approved-existing-source');
 const paths=[],token='fixture-secret-not-for-logging';
 try{
  const got=await spaceSatelliteApprovedSevenTokenR31({dataRoot,expectedCoreSha256,
   importer:async url=>{
    paths.push(url);
    if(url===pathToFileURL(path.join(home,'r175-source.mjs')).href){
     return {resolvePublisherSource(cfg,{auditFile}){
      assert.equal(cfg.collectionTarget,'pc');
      assert.equal(auditFile,path.join(dataRoot,'themes','ai-semiconductor',
       'state','r1-seven-source-audit.json'));
      return {root:selectedRoot,head:'b'.repeat(40)};
     }};
    }
    assert.equal(url,pathToFileURL(path.join(selectedRoot,'scripts','pc-writer','d1.mjs')).href);
    return {credential(root){assert.equal(root,selectedRoot);return token;}};
   }});
  assert.equal(got,token);assert.equal(paths.length,2);
 }finally{fs.rmSync(dataRoot,{recursive:true,force:true});}
});

test('R31 stops on unknown source and never calls D1 credential',async()=>{
 const {dataRoot,expectedCoreSha256}=setup();
 let calls=0;
 try{
  await assert.rejects(spaceSatelliteApprovedSevenTokenR31({dataRoot,expectedCoreSha256,
   importer:async()=>{calls++;return {resolvePublisherSource:()=>null};}}),
  /SPACE_R31_APPROVED_SOURCE_NOT_VERIFIED/);
  assert.equal(calls,1);
 }finally{fs.rmSync(dataRoot,{recursive:true,force:true});}
});

test('R31 identifies existing approved credential failure without token disclosure',async()=>{
 const {dataRoot,expectedCoreSha256}=setup();
 try{
  await assert.rejects(spaceSatelliteApprovedSevenTokenR31({dataRoot,expectedCoreSha256,
   importer:async url=>url.includes('r175-source.mjs')?
    {resolvePublisherSource:()=>({root:dataRoot,head:'c'.repeat(40)})}:
    {credential(){throw Error('do not expose credential internals');}}}),
  /SPACE_R31_APPROVED_SEVEN_CREDENTIAL_FAILED/);
 }finally{fs.rmSync(dataRoot,{recursive:true,force:true});}
});

test('R31 rejects changed seven-theme core before loading code',async()=>{
 const {dataRoot}=setup();
 let imported=false;
 try{
  await assert.rejects(spaceSatelliteApprovedSevenTokenR31({dataRoot,
   importer:async()=>{imported=true;return {};}}),
  /SPACE_R31_APPROVED_SEVEN_CORE_CHANGED/);
  assert.equal(imported,false);
 }finally{fs.rmSync(dataRoot,{recursive:true,force:true});}
});
