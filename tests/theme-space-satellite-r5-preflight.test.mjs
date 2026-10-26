import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {preflightSpacePc,stageSpaceSource,SOURCE_SHA} from
 '../scripts/pc-writer/theme-space-satellite-r5-preflight.mjs';

const ownDir=path.dirname(fileURLToPath(import.meta.url));

test('R5 stages only five immutable private modules and preflights absent PC prices without collection',async()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'space-r5-preflight-'));
 const projectsRoot=path.join(base,'projects'),dataRoot=path.join(base,'data');
 fs.mkdirSync(projectsRoot);fs.mkdirSync(dataRoot);
 const calls=[];
 const fetchImpl=async url=>{
  calls.push(url);
  assert.equal(url.includes(`/${SOURCE_SHA}/scripts/pc-writer/`),true);
  const filename=path.basename(new URL(url).pathname);
  const bytes=fs.readFileSync(path.join(ownDir,'..','scripts','pc-writer',filename));
  return new Response(bytes);
 };
 try{
  const first=await preflightSpacePc({projectsRoot,dataRoot,fetchImpl});
  assert.equal(first.stageMode,'STAGED_NEW_IMMUTABLE_SOURCE');
  assert.equal(first.dataStatus,'RAW_MANIFEST_NOT_FOUND');
  assert.equal(first.providerCalls,0);
  assert.equal(first.d1Writes,0);
  assert.equal(first.schedulerWrites,0);
  assert.equal(calls.length,5);
  assert.equal(fs.existsSync(path.join(dataRoot,'themes','space-satellite')),false);
  const second=await preflightSpacePc({projectsRoot,dataRoot,fetchImpl});
  assert.equal(second.stageMode,'EXISTING_IMMUTABLE_SOURCE_VERIFIED');
  assert.equal(calls.length,5);
  const target=path.join(first.releaseDir,'scripts','pc-writer',
   'theme-optional-adaptive-r2.mjs');
  fs.appendFileSync(target,'tampering');
  await assert.rejects(stageSpaceSource({projectsRoot,fetchImpl}),
   {code:'SPACE_R5_STAGED_SOURCE_HASH_MISMATCH'});
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});
