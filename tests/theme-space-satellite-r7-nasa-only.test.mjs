import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {collectNASA} from '../scripts/pc-writer/theme-space-satellite-r7-nasa-only.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'space-r7-'));
 const home=path.join(root,'themes','space-satellite');
 fs.mkdirSync(path.join(home,'raw'),{recursive:true});
 fs.mkdirSync(path.join(home,'state'),{recursive:true});
 const files=[];
 for(const symbol of ['UFO','ROKT','ARKX']){
  const bytes=Buffer.from(JSON.stringify({symbol,timestamp:'2026-10-23T19:00:00Z',close:100,is_gap:false})+'\n');
  const sha256=hash(bytes),relative='raw/'+symbol+'_'+sha256+'.jsonl';
  fs.writeFileSync(path.join(home,relative),bytes);
  files.push({path:relative,sha256,source:'https://getmarkethistory.com'});
 }
 const manifest={version:1,themeId:'space-satellite',files};
 fs.writeFileSync(path.join(home,'raw-manifest.json'),JSON.stringify(manifest));
 const old=path.join(home,'state','collection-fd8f6411c6dbaab6.json');
 fs.writeFileSync(old,'OLD_R1_CHECKPOINT_PRESERVE');
 return {root,home,old,manifest};
}
const input=f=>({dataRoot:f.root,start:'2026-03-30',end:'2026-10-23'});
const nasaBody=JSON.stringify({symbol:'NASA',timestamp:'2026-10-23T19:00:00Z',close:44.2,is_gap:false})+'\n';

test('R7 collects NASA only and preserves original UFO/ROKT/ARKX, checkpoints, SPY reuse',async()=>{
 const f=fixture(),seen=[];
 try{
  const result=await collectNASA({...input(f),fetchImpl:async url=>{
   seen.push(url.pathname);
   return new Response(nasaBody);
  }});
  assert.equal(result.status,'PRIVATE_NASA_RAW_COLLECTION_COMPLETE');
  assert.equal(result.providerCalls,1);
  assert.deepEqual(seen,['/api/v1/bars/stocks/NASA/1h']);
  const second=await collectNASA({...input(f),fetchImpl:async()=>{throw Error('NO_SECOND_REQUEST')}});
  assert.equal(second.providerCalls,0);
  const after=JSON.parse(fs.readFileSync(path.join(f.home,'raw-manifest.json'),'utf8'));
  assert.deepEqual(after.files.slice(0,3),f.manifest.files);
  assert.equal(after.files.length,4);
  assert.equal(after.files[3].observationThrough,'2026-10-23');
  assert.equal(fs.readFileSync(f.old,'utf8'),'OLD_R1_CHECKPOINT_PRESERVE');
  for(const file of f.manifest.files){assert.equal(hash(fs.readFileSync(path.join(f.home,file.path))),file.sha256);}
  assert.equal(result.publicWrites,0);assert.equal(result.d1Writes,0);assert.equal(result.schedulerWrites,0);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('R7 preserves failed free-API response and prevents a blind second request',async()=>{
 const f=fixture();let calls=0;
 try{
  const request=async()=>{calls++;return new Response('payment needed',{status:402});};
  const first=await collectNASA({...input(f),fetchImpl:request});
  assert.equal(first.status,'STOP_HTTP_402');
  const second=await collectNASA({...input(f),fetchImpl:request});
  assert.equal(second.status,'STOP_PREVIOUS_FAILURE_REVIEW_REQUIRED');
  assert.equal(calls,1);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.home,'raw-manifest.json'),'utf8')),f.manifest);
  assert.equal(fs.readFileSync(f.old,'utf8'),'OLD_R1_CHECKPOINT_PRESERVE');
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('R7 stops without any call when an earlier NASA raw file exists in manifest',async()=>{
 const f=fixture();let calls=0;
 try{
  const digest=hash(nasaBody),relative='raw/NASA_'+digest+'.jsonl';
  fs.writeFileSync(path.join(f.home,relative),nasaBody);
  const manifest=JSON.parse(fs.readFileSync(path.join(f.home,'raw-manifest.json'),'utf8'));
  manifest.files.push({path:relative,sha256:digest});
  fs.writeFileSync(path.join(f.home,'raw-manifest.json'),JSON.stringify(manifest));
  const result=await collectNASA({...input(f),fetchImpl:async()=>{calls++;throw Error('NO_CALL')}});
  assert.equal(result.status,'STOP_NASA_RAW_ALREADY_PRESENT_REVIEW');
  assert.equal(calls,0);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});

test('R7 bounds requests to a maximum of four and resumes cursor without restart',async()=>{
 const f=fixture();const seen=[];
 try{
  const request=async url=>{
   const cursor=url.searchParams.get('cursor');seen.push(cursor);
   const n=seen.length;
   return new Response(JSON.stringify({symbol:'NASA',timestamp:'2026-10-23T'+String(8+n).padStart(2,'0')+':00:00Z',close:44+n,is_gap:false})+'\n',{headers:{'x-next-cursor':n<5?'page-'+n:''}});
  };
  const first=await collectNASA({...input(f),maxRequests:4,fetchImpl:request});
  assert.equal(first.providerCalls,4);
  assert.equal(first.status,'CHECKPOINT_READY_TO_RESUME');
  const second=await collectNASA({...input(f),maxRequests:4,fetchImpl:request});
  assert.equal(second.providerCalls,1);
  assert.equal(second.status,'PRIVATE_NASA_RAW_COLLECTION_COMPLETE');
  assert.deepEqual(seen,[null,'page-1','page-2','page-3','page-4']);
 }finally{fs.rmSync(f.root,{recursive:true,force:true});}
});
