import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runInflationBls8Once} from '../scripts/pc-writer/inflation-bls8-once.mjs';
import {BLS8_IDS,BLS8_OUTPUT_RELATIVE} from '../scripts/inflation-causal-bls8.mjs';

function withHome(run){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-bls8-once-'));
  const home=path.join(root,'pc-writer');fs.mkdirSync(home);
  return Promise.resolve().then(()=>run({root,home})).finally(()=>fs.rmSync(root,{recursive:true,force:true}));
}
const payload=(ids=BLS8_IDS,value='100')=>({status:'REQUEST_SUCCEEDED',Results:{series:ids.map(id=>({
  seriesID:id,data:[{year:'2026',period:'M10',value,footnotes:[]},
    {year:'2026',period:'M09',value:'99.5',footnotes:[]}]
}))}});
const fakeFetch=(p=payload(),http=200)=>async()=>new Response(JSON.stringify(p),{
  status:http,headers:{'content-type':'application/json'}});
const quotaFactory=callback=>async ({base,mode})=>{
  assert.equal(path.basename(base),'pc-writer');assert.equal(mode,'enforce');
  return {fetch:async(...args)=>callback(...args)};
};
const providers=async()=>({BLS_REGISTRATION_KEY:'fixture-hidden-local-key'});
const now=()=>new Date('2026-11-04T12:00:00.000Z');

test('missing BLS key does not create a provider request or file',()=>withHome(async({home})=>{
  let transportUsed=false;
  const result=await runInflationBls8Once({writerHome:home,providerReader:async()=>({}),
    quotaFactory:async()=>{transportUsed=true;return{}},now});
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.code,'BLS8_REGISTRATION_KEY_MISSING');
  assert.equal(result.providerCalls,0);
  assert.equal(transportUsed,false);
  assert.equal(fs.existsSync(path.join(home,BLS8_OUTPUT_RELATIVE)),false);
}));

test('one protected BLS POST saves all eight locally and readbacks counts without secret',()=>withHome(async({home})=>{
  let requests=0;
  const quota=quotaFactory(async(url,init)=>{requests++;
    assert.match(url,/api\.bls\.gov/);assert.equal(init.method,'POST');
    assert.equal(JSON.parse(init.body).seriesid.length,8);
    return fakeFetch()();});
  const result=await runInflationBls8Once({writerHome:home,providerReader:providers,
    quotaFactory:quota,now});
  assert.equal(result.status,'PASS');
  assert.equal(result.code,'BLS8_SAVED_READBACK');
  assert.equal(result.ids,8);assert.equal(result.providerCalls,1);
  assert.equal(requests,1);
  assert.equal(result.counts.WPUID61,2);
  const stored=JSON.parse(fs.readFileSync(path.join(home,BLS8_OUTPUT_RELATIVE),'utf8'));
  assert.equal(stored.series.WPUID61.at(-1).date,'2026-10-01');
  assert.equal(stored.providerRawSeries.length,8);
  assert.equal(JSON.stringify(result).includes('fixture-hidden-local-key'),false);
  assert.equal(result.coreWrites,0);assert.equal(result.dbWrites,0);
  assert.equal(result.d1Writes,0);assert.equal(result.schedulerWrites,0);
}));

test('identical second capture preserves previous valid file, without extra writes',()=>withHome(async({home})=>{
  const options={writerHome:home,providerReader:providers,
    quotaFactory:quotaFactory(fakeFetch()),now};
  const first=await runInflationBls8Once(options);
  const file=path.join(home,BLS8_OUTPUT_RELATIVE);
  const firstBytes=fs.readFileSync(file);
  const second=await runInflationBls8Once(options);
  assert.equal(first.code,'BLS8_SAVED_READBACK');
  assert.equal(second.code,'BLS8_PREVIOUS_VALID_UNCHANGED');
  assert.deepEqual(fs.readFileSync(file),firstBytes);
}));

test('HTTP failure returns sanitized code and preserves existing valid archive',()=>withHome(async({home})=>{
  await runInflationBls8Once({writerHome:home,providerReader:providers,
    quotaFactory:quotaFactory(fakeFetch()),now});
  const file=path.join(home,BLS8_OUTPUT_RELATIVE),before=fs.readFileSync(file);
  let attempts=0;
  const result=await runInflationBls8Once({writerHome:home,providerReader:providers,
    quotaFactory:quotaFactory(async()=>{attempts++;return fakeFetch({error:'temporarily unavailable'},503)()}),now});
  assert.equal(result.status,'RUNTIME_FAILED');
  assert.equal(result.code,'BLS_HTTP_503');
  assert.equal(result.providerAttempts,1);assert.equal(attempts,1);
  assert.deepEqual(fs.readFileSync(file),before);
}));

test('partial seven-series response is rejected without changing valid archive',()=>withHome(async({home})=>{
  await runInflationBls8Once({writerHome:home,providerReader:providers,
    quotaFactory:quotaFactory(fakeFetch()),now});
  const file=path.join(home,BLS8_OUTPUT_RELATIVE),before=fs.readFileSync(file);
  const result=await runInflationBls8Once({writerHome:home,providerReader:providers,
    quotaFactory:quotaFactory(fakeFetch(payload(BLS8_IDS.slice(0,7)))),now});
  assert.equal(result.status,'RUNTIME_FAILED');
  assert.equal(result.code,'BLS_SERIES_COUNT');
  assert.deepEqual(fs.readFileSync(file),before);
}));

test('quota reservation failure is not retried and leaves prior archive unchanged',()=>withHome(async({home})=>{
  await runInflationBls8Once({writerHome:home,providerReader:providers,
    quotaFactory:quotaFactory(fakeFetch()),now});
  const file=path.join(home,BLS8_OUTPUT_RELATIVE),before=fs.readFileSync(file);
  let attempts=0;
  const result=await runInflationBls8Once({writerHome:home,providerReader:providers,
    quotaFactory:quotaFactory(async()=>{attempts++;throw Object.assign(Error('quota'),{code:'PROVIDER_QUOTA_GUARD'})}),now});
  assert.equal(result.status,'RUNTIME_FAILED');
  assert.equal(result.code,'PROVIDER_QUOTA_GUARD');
  assert.equal(attempts,1);assert.equal(result.providerCallsMax,1);
  assert.deepEqual(fs.readFileSync(file),before);
}));

test('unsafe writer symlink cannot redirect storage to an arbitrary folder',()=>withHome(async({root,home})=>{
  const target=path.join(root,'other');fs.mkdirSync(target);
  fs.rmSync(home,{recursive:true});fs.symlinkSync(target,home,'dir');
  await assert.rejects(()=>runInflationBls8Once({writerHome:home,providerReader:providers,
    quotaFactory:quotaFactory(fakeFetch()),now}),/BLS8_PC_HOME_NOT_APPROVED/);
  assert.deepEqual(fs.readdirSync(target),[]);
}));

test('unsafe output symlink is rejected before opening any provider connection',()=>withHome(async({home})=>{
  const target=path.join(home,'target');fs.mkdirSync(target);
  fs.symlinkSync(target,path.join(home,'inflation-causal-r1'),'dir');
  let called=0;
  await assert.rejects(()=>runInflationBls8Once({writerHome:home,providerReader:providers,
    quotaFactory:async()=>{called++;return{fetch:fakeFetch()}},now}),/BLS8_OUTPUT_FOLDER_UNSAFE/);
  assert.equal(called,0);
}));
