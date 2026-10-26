import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {collectOptional} from '../scripts/pc-writer/theme-space-satellite-r6-collect.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-r6-'));
 const home=path.join(root,'themes','space-satellite');
 fs.mkdirSync(path.join(home,'raw'),{recursive:true});
 fs.mkdirSync(path.join(home,'state'),{recursive:true});
 const bytes=Buffer.from(JSON.stringify({symbol:'UFO',timestamp:'2026-10-23T19:00:00Z',
  close:50,is_gap:false})+'\n');
 const sha256=hash(bytes),filename='raw/UFO_'+sha256+'.jsonl';
 fs.writeFileSync(path.join(home,filename),bytes);
 const manifest={version:1,themeId:'space-satellite',files:[{path:filename,
  sha256,source:'https://getmarkethistory.com',collectedAt:'2026-10-25T00:00:00Z',
  observationThrough:'2026-10-23',priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'}]};
 fs.writeFileSync(path.join(home,'raw-manifest.json'),JSON.stringify(manifest));
 const old=path.join(home,'state','collection-fd8f6411c6dbaab6.json');
 fs.writeFileSync(old,'OLD_R1_CHECKPOINT_PRESERVE');
 return {root,home,old,filename,bytes};
}

test('R6 reuses UFO as-is and collects ONLY missing NASA/SPY with bounded resume',async()=>{
 const f=fixture(),seen=[];
 const input={dataRoot:f.root,themeId:'space-satellite',start:'2024-01-01',
  end:'2026-10-23',fetchImpl:async url=>{
   const s=url.pathname.split('/').at(-2);seen.push(s);
   return new Response(JSON.stringify({symbol:s,timestamp:'2026-10-23T19:00:00Z',
    close:100,is_gap:false})+'\n');
  }};
 try{
  const first=await collectOptional({...input,maxRequests:1});
  assert.equal(first.status,'CHECKPOINT_READY_TO_RESUME');
  assert.deepEqual(seen,['NASA']);
  const second=await collectOptional({...input,maxRequests:1});
  assert.equal(second.status,'PRIVATE_RAW_COLLECTION_COMPLETE');
  assert.deepEqual(seen,['NASA','SPY']);
  const third=await collectOptional({...input,maxRequests:1});
  assert.equal(third.providerCalls,0);
  assert.deepEqual(seen,['NASA','SPY']);
  assert.deepEqual(fs.readFileSync(path.join(f.home,f.filename)),f.bytes);
  assert.equal(fs.readFileSync(f.old,'utf8'),'OLD_R1_CHECKPOINT_PRESERVE');
  const m=JSON.parse(fs.readFileSync(path.join(f.home,'raw-manifest.json'),'utf8'));
  assert.equal(m.files.length,3);
  assert.deepEqual(m.files.map(e=>e.path.split('/')[1].split('_')[0]),['UFO','NASA','SPY']);
  for(const report of [first,second,third]){
   assert.equal(report.d1Writes,0);assert.equal(report.publicWrites,0);
   assert.equal(report.schedulerWrites,0);
  }
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('R6 HTTP failure stops once and preserves checkpoint without blind retry',async()=>{
 const f=fixture();let calls=0;
 const input={dataRoot:f.root,themeId:'space-satellite',start:'2024-01-01',
  end:'2026-10-23',maxRequests:1,fetchImpl:async()=>{
   calls++;return new Response('temporary error',{status:503});
  }};
 try{
  const first=await collectOptional(input);
  assert.equal(first.status,'STOP_HTTP_503');
  const second=await collectOptional(input);
  assert.equal(second.status,'STOP_PREVIOUS_FAILURE_REVIEW_REQUIRED');
  assert.equal(calls,1);
  assert.equal(fs.readFileSync(f.old,'utf8'),'OLD_R1_CHECKPOINT_PRESERVE');
  assert.deepEqual(fs.readFileSync(path.join(f.home,f.filename)),f.bytes);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
