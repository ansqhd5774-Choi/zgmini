import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {fetchSnapshot,filesForStage,sourceTreeRoot,stageOnPc,stageSnapshot} from '../scripts/pc-writer/theme-optional-stage.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'..');
const sha='a'.repeat(40);
const fixtureFetch=async url=>{
  if(url.endsWith('/commits/main'))return {ok:true,json:async()=>({sha})};
  const relative=filesForStage().find(file=>url.endsWith('/'+file));
  assert.ok(relative,`unexpected request: ${url}`);
  return {ok:true,arrayBuffer:async()=>fs.readFileSync(path.join(repo,relative))};
};

test('snapshot pins one GitHub commit and includes every imported dependency',async()=>{
  const snapshot=await fetchSnapshot({fetchImpl:fixtureFetch});
  assert.equal(snapshot.sha,sha);
  assert.equal(snapshot.assets.length,10);
  assert.ok(snapshot.assets.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
  assert.ok(snapshot.assets.some(x=>x.path==='worker/theme-history-reference.mjs'));
});

test('existing release is verified and never overwritten',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-theme-stage-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const snapshot=await fetchSnapshot({fetchImpl:fixtureFetch});
  assert.equal(stageSnapshot({projectsRoot:root,snapshot}).mode,'STAGED_NEW_RELEASE');
  assert.equal(stageSnapshot({projectsRoot:root,snapshot}).mode,'ALREADY_STAGED_VERIFIED');
  const file=path.join(sourceTreeRoot(root,sha),'scripts','pc-writer','theme-optional-cycle.cmd');
  fs.appendFileSync(file,'tampered');
  assert.throws(()=>stageSnapshot({projectsRoot:root,snapshot}),/EXISTING_RELEASE_HASH_MISMATCH/);
});

test('PC staging does not schedule, collect, or write D1 and records missing manifests',async t=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-stage-input-'));
  t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const projects=path.join(base,'projects'),data=path.join(base,'data'),node=path.join(base,'node.exe');
  fs.mkdirSync(projects);fs.mkdirSync(data);fs.writeFileSync(node,'node fixture');
  const result=await stageOnPc({projectsRoot:projects,dataRoot:data,nodeExecutable:node,fetchImpl:fixtureFetch});
  assert.equal(result.sourceSha,sha);
  assert.equal(result.aiRawManifest,'MANIFEST_MISSING');
  assert.equal(result.biotechRawManifest,'MANIFEST_MISSING');
  assert.equal(result.taskWrites,0);
  assert.equal(result.d1Writes,0);
  assert.equal(result.providerCalls,0);
  assert.ok(fs.existsSync(path.join(result.sourcePath,'source-manifest.json')));
});

test('only 40-character lowercase source SHA is accepted',()=>{
  assert.throws(()=>sourceTreeRoot('E:/ZGmini/projects','../../foo'),/SOURCE_SHA_INVALID/);
});
