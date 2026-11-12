import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runInflationGasElectricOnce} from '../scripts/pc-writer/inflation-gas-electric-once.mjs';
import {GAS_FILE,ELECTRIC_FILE} from '../scripts/inflation-causal-gas-electric.mjs';

const moment=()=>new Date('2026-11-04T06:00:00.000Z');
const temp=async f=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'gas-electric-wrapper-'));
  const writerHome=path.join(root,'pc-writer');fs.mkdirSync(writerHome);
  try{await f({writerHome,root})}finally{fs.rmSync(root,{recursive:true,force:true})}
};
const gas=()=>({observations:Array.from({length:40},(_,i)=>({
  date:new Date(Date.UTC(2026,8,1+i)).toISOString().slice(0,10),value:(2.5+i*.01).toFixed(2),
}))});
const facet=()=>({response:{facets:[{id:'US',name:'United States'}]}});
const electric=()=>({response:{frequency:'monthly',total:'24',data:Array.from({length:24},(_,i)=>({
  period:`${2024+Math.floor(i/12)}-${String(1+i%12).padStart(2,'0')}`,
  stateid:'US',sectorid:'IND',price:String(7+i*.02),'price-units':'cents per kilowatthour',
}))}});
const keys={FRED_API_KEY:'mock-secret-fred-key',EIA_API_KEY:'mock-secret-eia-key'};
function fixture({providers=keys,respond}={}){
  let calls=0;const urls=[];
  const quotaFactory=async({mode})=>{
    assert.equal(mode,'enforce');return {fetch:async url=>{
      calls++;urls.push(String(url));
      return respond?respond(String(url),calls):Response.json(String(url).includes('stlouisfed')?
        gas():String(url).includes('/facet/')?facet():electric());
    }};
  };
  return {options:{providerReader:async()=>providers,quotaFactory,now:moment},
    getCalls:()=>calls,getUrls:()=>urls};
}

test('one FRED GET plus EIA metadata/data 2 GET, saved/readback private 2 series',()=>temp(async({writerHome})=>{
  const f=fixture();const result=await runInflationGasElectricOnce({writerHome,...f.options});
  assert.equal(result.status,'PASS');assert.equal(result.code,'GAS_ELECTRIC_SAVED_READBACK');
  assert.equal(result.ids,2);assert.equal(result.providerCalls,3);assert.equal(f.getCalls(),3);
  assert.equal(result.counts.DHHNGSP,40);assert.equal(result.counts.EIA_INDUSTRIAL_US,24);
  assert.equal(result.latest.DHHNGSP,'2026-10-10');
  assert.equal(result.latest.EIA_INDUSTRIAL_US,'2025-12');
  assert.match(result.fileSha256.DHHNGSP,/^[a-f0-9]{64}$/);
  assert.match(result.fileSha256.EIA_INDUSTRIAL_US,/^[a-f0-9]{64}$/);
  assert.equal(fs.existsSync(path.join(writerHome,GAS_FILE)),true);
  assert.equal(fs.existsSync(path.join(writerHome,ELECTRIC_FILE)),true);
  assert.deepEqual([result.coreWrites,result.dbWrites,result.d1Writes,result.schedulerWrites,result.publications],[0,0,0,0,0]);
  assert.equal(JSON.stringify(result).includes('mock-secret'),false);
  assert.equal(f.getUrls().filter(x=>x.includes('stlouisfed')).length,1);
  assert.equal(f.getUrls().filter(x=>x.includes('api.eia.gov')).length,2);
}));

test('existing fully matching provider data preserves files while both pass',()=>temp(async({writerHome})=>{
  const f=fixture();await runInflationGasElectricOnce({writerHome,...f.options});
  const before=[GAS_FILE,ELECTRIC_FILE].map(rel=>fs.readFileSync(path.join(writerHome,rel)));
  const second=await runInflationGasElectricOnce({writerHome,...f.options});
  assert.equal(second.status,'PASS');assert.equal(second.code,'GAS_ELECTRIC_PREVIOUS_VALID_UNCHANGED');
  assert.equal(second.providerCalls,3);assert.equal(f.getCalls(),6);
  for(const [i,rel] of [GAS_FILE,ELECTRIC_FILE].entries())
    assert.deepEqual(fs.readFileSync(path.join(writerHome,rel)),before[i]);
}));

test('no configured keys means zero provider requests and no output',()=>temp(async({writerHome})=>{
  const f=fixture({providers:{}});
  const result=await runInflationGasElectricOnce({writerHome,...f.options});
  assert.equal(result.status,'BLOCKED');assert.equal(result.code,'GAS_ELECTRIC_BOTH_KEYS_UNAVAILABLE');
  assert.equal(result.providerCalls,0);assert.equal(f.getCalls(),0);
  assert.equal(fs.readdirSync(writerHome).length,0);
}));

test('missing EIA key still stores gas exactly once and reports PARTIAL',()=>temp(async({writerHome})=>{
  const f=fixture({providers:{FRED_API_KEY:keys.FRED_API_KEY}});
  const result=await runInflationGasElectricOnce({writerHome,...f.options});
  assert.equal(result.status,'PARTIAL');assert.equal(result.ids,1);
  assert.equal(result.providerCalls,1);assert.equal(f.getCalls(),1);
  assert.equal(result.failures.EIA_INDUSTRIAL_US,'EIA_KEY_MISSING');
  assert.equal(fs.existsSync(path.join(writerHome,GAS_FILE)),true);
  assert.equal(fs.existsSync(path.join(writerHome,ELECTRIC_FILE)),false);
}));

test('unverified EIA US facet stops before EIA data call, gas stays valid',()=>temp(async({writerHome})=>{
  const f=fixture({respond:url=>Response.json(url.includes('stlouisfed')?gas():
    {response:{facets:[{id:'US',name:'Unknown Province'}]}})});
  const result=await runInflationGasElectricOnce({writerHome,...f.options});
  assert.equal(result.status,'PARTIAL');assert.equal(result.providerCalls,2);
  assert.equal(result.failures.EIA_INDUSTRIAL_US,'EIA_US_NATIONAL_FACET_UNVERIFIED');
  assert.equal(fs.existsSync(path.join(writerHome,GAS_FILE)),true);
  assert.equal(fs.existsSync(path.join(writerHome,ELECTRIC_FILE)),false);
}));

test('EIA HTTP 503 does not retry; existing gas retained and EIA uncreated',()=>temp(async({writerHome})=>{
  const f=fixture({respond:url=>url.includes('stlouisfed')?Response.json(gas()):
    url.includes('/facet/')?Response.json(facet()):new Response('Unavailable',{status:503})});
  const result=await runInflationGasElectricOnce({writerHome,...f.options});
  assert.equal(result.status,'PARTIAL');assert.equal(result.providerCalls,3);
  assert.equal(result.failures.EIA_INDUSTRIAL_US,'PROVIDER_HTTP_503');
  assert.equal(f.getCalls(),3);
  assert.equal(fs.existsSync(path.join(writerHome,ELECTRIC_FILE)),false);
}));

test('quota failure has no retries and no fabricated collection result',()=>temp(async({writerHome})=>{
  const f=fixture({respond:()=>{throw Object.assign(Error('quota'),{code:'PROVIDER_QUOTA_GUARD'})}});
  const result=await runInflationGasElectricOnce({writerHome,...f.options});
  assert.equal(result.status,'RUNTIME_FAILED');
  assert.equal(result.failures.DHHNGSP,'PROVIDER_QUOTA_GUARD');
  assert.equal(result.failures.EIA_INDUSTRIAL_US,'PROVIDER_QUOTA_GUARD');
  assert.equal(result.providerCalls,2);assert.equal(f.getCalls(),2);
}));

test('unapproved writer or redirected private destination denied before any provider calls',()=>temp(async({writerHome,root})=>{
  const f=fixture();
  await assert.rejects(runInflationGasElectricOnce({writerHome:root,...f.options}),/PC_WRITER_DENIED/);
  const outside=path.join(root,'outside');fs.mkdirSync(outside);
  fs.symlinkSync(outside,path.join(writerHome,'inflation-causal-r1'),'dir');
  await assert.rejects(runInflationGasElectricOnce({writerHome,...f.options}),/OUTPUT_ROOT_UNSAFE/);
  assert.equal(f.getCalls(),0);assert.equal(fs.readdirSync(outside).length,0);
}));

test('pre-existing corrupt gas document preserved, EIA still saved independently',()=>temp(async({writerHome})=>{
  fs.mkdirSync(path.join(writerHome,'inflation-causal-r1'));
  fs.writeFileSync(path.join(writerHome,GAS_FILE),'{bad');
  const f=fixture();const result=await runInflationGasElectricOnce({writerHome,...f.options});
  assert.equal(result.status,'PARTIAL');assert.equal(result.failures.DHHNGSP,'EXISTING_FRED_DHHNGSP_JSON_INVALID');
  assert.equal(result.providerCalls,2);assert.equal(f.getCalls(),2);
  assert.equal(fs.readFileSync(path.join(writerHome,GAS_FILE),'utf8'),'{bad');
  assert.equal(fs.existsSync(path.join(writerHome,ELECTRIC_FILE)),true);
}));
