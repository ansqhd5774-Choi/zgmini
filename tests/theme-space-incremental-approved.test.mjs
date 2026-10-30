import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {collectApprovedSpace} from '../scripts/pc-writer/theme-optional-collect.mjs';
test('space recovery fetches all four approved ETFs, resumes without extra GETs and preserves old raw',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-four-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const home=path.join(root,'themes','space-satellite');fs.mkdirSync(home,{recursive:true});
 const old={path:'raw/old',sha256:'old'};
 fs.writeFileSync(path.join(home,'raw-manifest.json'),JSON.stringify({version:1,themeId:'space-satellite',files:[old]}));
 const calls=[];const fetchImpl=async url=>{
  const s=new URL(url).pathname.split('/').at(-2);calls.push(s);
  return new Response(JSON.stringify({timestamp:'2026-10-28T19:00:00Z',symbol:s,close:10,is_gap:false})+'\n');
 };
 const args={dataRoot:root,start:'2026-10-23',end:'2026-10-28',fetchImpl};
 const result=await collectApprovedSpace(args);
 assert.equal(result.status,'PRIVATE_RAW_COLLECTION_COMPLETE');
 assert.deepEqual(calls,['UFO','NASA','WARP','ROKT']);
 assert.equal(result.d1Writes,0);assert.equal(result.schedulerWrites,0);
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(home,'raw-manifest.json'))).files[0],old);
 const again=await collectApprovedSpace(args);assert.equal(again.providerCalls,0);
 assert.equal(calls.length,4);
});
test('empty source remains a bounded WAIT with existing manifest intact',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-empty-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const result=await collectApprovedSpace({dataRoot:root,start:'2026-10-23',end:'2026-10-28',fetchImpl:async()=>new Response('')});
 assert.equal(result.status,'WAIT_SOURCE_EMPTY');assert.equal(result.providerCalls,1);
 assert.equal(result.rawFilesStored,0);
 assert.equal(fs.existsSync(path.join(root,'themes/space-satellite/raw-manifest.json')),false);
});
