import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {collectOptional} from '../scripts/pc-writer/theme-optional-collect.mjs';

test('priority UFO+NASA+SPY collector checkpoints bounded mock API, stores SHA originals, never publishes',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-collector-r4-'));
 const symbols=[];
 try{
  const fetchImpl=async url=>{
   const symbol=url.pathname.split('/').at(-2);
   symbols.push(symbol);
   return new Response(JSON.stringify({symbol,timestamp:'2026-10-22T19:00:00Z',
    close:100,is_gap:false})+'\n');
  };
  const input={dataRoot:root,themeId:'space-satellite',start:'2026-03-01',
   end:'2026-10-23',fetchImpl};
  const first=await collectOptional({...input,maxRequests:2});
  assert.equal(first.status,'CHECKPOINT_READY_TO_RESUME');
  assert.equal(first.providerCalls,2);
  assert.deepEqual(symbols,['UFO','NASA']);
  const second=await collectOptional({...input,maxRequests:2});
  assert.equal(second.status,'PRIVATE_RAW_COLLECTION_COMPLETE');
  assert.equal(second.providerCalls,1);
  assert.deepEqual(symbols,['UFO','NASA','SPY']);
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'themes','space-satellite','raw-manifest.json')));
  assert.equal(manifest.files.length,3);
  assert.equal(manifest.files.every(entry=>/^(raw\/)(UFO|NASA|SPY)_/.test(entry.path)),true);
  const again=await collectOptional({...input,maxRequests:2});
  assert.equal(again.providerCalls,0);
  assert.equal(again.status,'PRIVATE_RAW_COLLECTION_COMPLETE');
  for(const report of [first,second,again]){
   assert.equal(report.publicWrites,0);
   assert.equal(report.d1Writes,0);
   assert.equal(report.schedulerWrites,0);
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
