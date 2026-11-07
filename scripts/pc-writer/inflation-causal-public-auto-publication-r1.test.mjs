import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {publishInflation19Auto,stageAndVerify,INFL19_PUBLIC_KEY,INFL19_PC_HOME}
 from './inflation-causal-public-auto-publication-r1.mjs';

const IDS=['1','3','4','5','6','7','8','9','10','11','12','13','14','18','19','21','25','26','31'];
const NOW=Date.UTC(2026,10,4,14,0,0);
const T=ms=>new Date(ms).toISOString();
const validate=(p,{now}={})=>{
 if(p?.status!=='READY'||p.score!==null||p.indicators?.length!==19||
  p.sourceStoredAt>now||!/^INFL19_PRESENTATION_[a-f0-9]{64}$/.test(p.sourceVersion))
  throw Error('CONTRACT');
 return p;
};
function payload(version='a',stamp=NOW-1000){
 return {schemaVersion:'inflation-causal-public-19-r1-v1',status:'READY',score:null,
  sourceVersion:'INFL19_PRESENTATION_'+version.repeat(64),sourceStoredAt:stamp,
  indicators:IDS.map(id=>({id,series:'SERIES_'+id,unit:'index',status:'READY',
   value:10,previousValue:9,observationDate:'2026-09-01',
   previousObservationDate:'2026-08-01',availableAt:null,
   sourceStoredAt:T(stamp),history:[{date:'2026-08',value:9},{date:'2026-09',value:10}]}))};
}
const clone=v=>structuredClone(v);
function remoteRow(p,builtAt=NOW-100){
 return {body:JSON.stringify({payload:p,projection:{status:'READY',
  sourceVersion:p.sourceVersion,sourceStoredAt:p.sourceStoredAt,builtAt}}),
  stored_at:builtAt};
}
function fixture(t,{prior=payload('b',NOW-2000),current=payload(),previewReady=19}={}){
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'infl19-auto-'));
 fs.mkdirSync(path.join(home,'inflation-causal-r1'));
 t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
 let existing=prior?remoteRow(prior):null,writes=0,queries=0,stages=0;
 const remote={
  async query(db,sql,params){assert.equal(db,'core');assert.equal(params[0],INFL19_PUBLIC_KEY);
   queries++;return {results:existing?[existing]:[]}},
  adapter(db,o){assert.equal(db,'core');assert.deepEqual(o,{allowWrites:true});return {db}}
 };
 const writerFactory=()=>({async write(p,{storedAt}){
  writes++;existing=remoteRow(p,storedAt);
  return {status:'READBACK_VERIFIED'};
 }});
 const stageFn=async(root,p)=>{
  assert.equal(root,home);stages++;return clone(p);
 };
 const previewFn=()=>({status:'PASS_READONLY',ready:previewReady,
  payload:current,providerCalls:0,coreWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0});
 const run=()=>publishInflation19Auto({pcHome:home,remote,coreDb:'core',now:NOW,
  previewFn,validate,writerFactory,stageFn});
 return {run,counts:()=>({writes,queries,stages}),remote,current,home};
}

test('approved inflation-only auto integration is active in publication lane',()=>{
 const file=fs.readFileSync(new URL('./run-local.mjs',import.meta.url),'utf8');
 assert.match(file,/INFLATION_19_AUTO_PUBLICATION_APPROVED=true/);
 assert.match(file,/if\(INFLATION_19_AUTO_PUBLICATION_APPROVED\)/);
 assert.match(file,/attemptOutput\(report,'inflation-19-publication'/);
});

test('existing junction is resolved to canonical home before preview',async t=>{
 const f=fixture(t);
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'infl19-home-alias-'));
 t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
 const alias=path.join(parent,'compat-home');
 fs.symlinkSync(f.home,alias,'junction');
 let received=null;
 const result=await publishInflation19Auto({pcHome:alias,remote:f.remote,
  coreDb:'core',now:NOW,previewFn:canonical=>{
   received=canonical;
   return {status:'PASS_READONLY',ready:19,payload:f.current,
    providerCalls:0,coreWrites:0,dbWrites:0,d1Writes:0,schedulerWrites:0};
  },validate,writerFactory:()=>({write:()=>{throw Error('UNEXPECTED_WRITE')}})});
 assert.equal(received,process.platform==='win32'?INFL19_PC_HOME:fs.realpathSync.native(f.home));
 assert.equal(result.status,'SKIPPED_METADATA_ONLY');
});

test('incomplete PC source preserves remote without a write',async t=>{
 const f=fixture(t,{previewReady:18});
 assert.equal((await f.run()).status,'SKIPPED_INPUTS_NOT_READY');
 assert.deepEqual(f.counts(),{writes:0,queries:0,stages:0});
});

test('metadata-only stored-at drift does not refresh public content',async t=>{
 const next=payload('a',NOW-1000),old=clone(next);
 old.sourceVersion='INFL19_PRESENTATION_'+'b'.repeat(64);
 old.sourceStoredAt=NOW-2000;
 old.indicators[13].sourceStoredAt=T(NOW-2000);
 const f=fixture(t,{prior:old,current:next});
 assert.equal((await f.run()).status,'SKIPPED_METADATA_ONLY');
 assert.deepEqual(f.counts(),{writes:0,queries:1,stages:0});
});

test('new observed value/history stages once, writes one D1 key and verifies readback',async t=>{
 const next=payload('a',NOW-1000);
 next.indicators[12].value=11;next.indicators[12].history.at(-1).value=11;
 const f=fixture(t,{current:next});
 const r=await f.run();
 assert.equal(r.status,'READBACK_VERIFIED');
 assert.equal(r.d1Writes,1);assert.equal(r.providerCalls,0);
 assert.deepEqual(f.counts(),{writes:1,queries:2,stages:1});
});

test('new GSCPI observation period triggers publication even when value unchanged',async t=>{
 const next=payload();
 next.indicators[15].observationDate='2026-10-01';
 next.indicators[15].history.at(-1).date='2026-10';
 const f=fixture(t,{current:next});
 assert.equal((await f.run()).status,'READBACK_VERIFIED');
 assert.equal(f.counts().writes,1);
});

test('remote newer snapshot is preserved without local staging',async t=>{
 const f=fixture(t,{prior:payload('b',NOW-50),current:payload('a',NOW-1000)});
 assert.equal((await f.run()).status,'REMOTE_NEWER_PRESERVED');
 assert.deepEqual(f.counts(),{writes:0,queries:1,stages:0});
});

test('same sourceStoredAt but different research data is rejected before write',async t=>{
 const old=payload('b'),next=payload('a');
 next.indicators[12].value=123;
 const f=fixture(t,{prior:old,current:next});
 await assert.rejects(f.run(),/INFL19_AUTO_CHECKPOINT_CONFLICT/);
 assert.deepEqual(f.counts(),{writes:0,queries:1,stages:0});
});

test('invalid remote envelope fails closed without any mutation',async t=>{
 const f=fixture(t);f.remote.query=async()=>({results:[{body:'{}',stored_at:NOW}]});
 await assert.rejects(f.run(),/INFL19_AUTO_REMOTE_CONTRACT_DENIED/);
 assert.equal(f.counts().writes,0);
});

test('stage writes approved derived projection and reads the same bytes before D1',async t=>{
 const f=fixture(t);const next=payload();
 const file=path.join(f.home,'inflation-causal-r1','public-19-summary-projection-r1.json');
 const actual=await stageAndVerify(f.home,next,{now:NOW,validate,
  saveFn:(p,v)=>{assert.equal(p,file);fs.writeFileSync(p,JSON.stringify(v))},
  readFn:p=>JSON.parse(fs.readFileSync(p,'utf8'))});
 assert.deepEqual(actual,next);assert.equal(fs.existsSync(file),true);
 await assert.rejects(stageAndVerify(f.home,next,{now:NOW,validate,
  saveFn:(p,v)=>fs.writeFileSync(p,JSON.stringify(v)),readFn:()=>({})}),
  /INFL19_AUTO_STAGE_READBACK_MISMATCH/);
});
