import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runInflationEiaOnlyOnce,EIA_ID} from '../scripts/pc-writer/inflation-eia-only-once.mjs';
import {GAS_FILE,ELECTRIC_FILE} from '../scripts/inflation-causal-gas-electric.mjs';

const stamp=()=>new Date('2026-11-04T06:00:00.000Z');
const temp=async callback=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eia-private-one-shot-'));
  const writerHome=path.join(dir,'pc-writer');fs.mkdirSync(writerHome);
  try{await callback({dir,writerHome})}
  finally{fs.rmSync(dir,{recursive:true,force:true})}
};
const facet=()=>({response:{facets:[{id:'US',name:'United States'}]}});
const data=()=>({response:{frequency:'monthly',total:'24',
  data:Array.from({length:24},(_,i)=>({
    period:`${2024+Math.floor(i/12)}-${String(1+i%12).padStart(2,'0')}`,
    stateid:'US',sectorid:'IND',price:String(8+i*.04),
    'price-units':'cents per kilowatthour',
  }))}});
const key='test-secret-eia-key';
function fixture({providers={EIA_API_KEY:key},respond}={}){
  let calls=0;const urls=[];
  const quotaFactory=async({mode})=>{
    assert.equal(mode,'enforce');
    return {fetch:async url=>{
      calls++;urls.push(String(url));
      return respond?respond(String(url),calls):Response.json(String(url).includes('/facet/')?facet():data());
    }};
  };
  return {options:{providerReader:async()=>providers,quotaFactory,now:stamp},
    getCalls:()=>calls,urls:()=>urls};
}

test('EIA ONLY 2 calls (facet/data) store, re-read and never call FRED',()=>temp(async({writerHome})=>{
  const f=fixture(),output=await runInflationEiaOnlyOnce({writerHome,...f.options});
  assert.equal(output.status,'PASS');assert.equal(output.code,'EIA_ONLY_SAVED_READBACK');
  assert.equal(output.ids,1);assert.equal(output.providerCalls,2);assert.equal(f.getCalls(),2);
  assert.deepEqual(Object.keys(output.counts),[EIA_ID]);
  assert.equal(output.counts[EIA_ID],24);assert.equal(output.latest[EIA_ID],'2025-12');
  assert.match(output.fileSha256[EIA_ID],/^[a-f0-9]{64}$/);
  assert.deepEqual([output.coreWrites,output.dbWrites,output.d1Writes,output.schedulerWrites,output.publications],
    [0,0,0,0,0]);
  assert.equal(fs.existsSync(path.join(writerHome,ELECTRIC_FILE)),true);
  assert.equal(fs.existsSync(path.join(writerHome,GAS_FILE)),false);
  assert.equal(f.urls().filter(url=>url.includes('stlouisfed')).length,0);
  assert.equal(f.urls().filter(url=>url.includes('api.eia.gov')).length,2);
  assert.equal(JSON.stringify(output).includes(key),false);
}));

test('existing verified gas file is entirely untouched while EIA is captured',()=>temp(async({writerHome})=>{
  const gasFile=path.join(writerHome,GAS_FILE);
  fs.mkdirSync(path.dirname(gasFile));fs.writeFileSync(gasFile,'protected-user-fred-data');
  const before=fs.readFileSync(gasFile);
  const f=fixture(),output=await runInflationEiaOnlyOnce({writerHome,...f.options});
  assert.equal(output.status,'PASS');assert.deepEqual(fs.readFileSync(gasFile),before);
  assert.equal(f.getCalls(),2);
}));

test('previous EIA source unchanged, readback remains valid without rewrite',()=>temp(async({writerHome})=>{
  const f=fixture();await runInflationEiaOnlyOnce({writerHome,...f.options});
  const file=path.join(writerHome,ELECTRIC_FILE),previous=fs.readFileSync(file);
  const second=await runInflationEiaOnlyOnce({writerHome,...f.options});
  assert.equal(second.status,'PASS');assert.equal(second.code,'EIA_ONLY_PREVIOUS_VALID_UNCHANGED');
  assert.deepEqual(fs.readFileSync(file),previous);
  assert.equal(f.getCalls(),4);
}));

test('missing EIA key blocks with 0 requests and 0 source writes',()=>temp(async({writerHome})=>{
  const f=fixture({providers:{FRED_API_KEY:'fred-is-not-eia'}});
  const output=await runInflationEiaOnlyOnce({writerHome,...f.options});
  assert.equal(output.status,'BLOCKED');assert.equal(output.code,'EIA_ONLY_KEY_MISSING');
  assert.equal(output.providerCalls,0);assert.equal(f.getCalls(),0);
  assert.deepEqual(fs.readdirSync(writerHome),[]);
}));

test('bad US national facet blocks data call, no fake source file',()=>temp(async({writerHome})=>{
  const f=fixture({respond:()=>Response.json({response:{facets:[{id:'US',name:'Unknown Region'}]}})});
  const output=await runInflationEiaOnlyOnce({writerHome,...f.options});
  assert.equal(output.status,'RUNTIME_FAILED');assert.equal(output.code,'EIA_US_NATIONAL_FACET_UNVERIFIED');
  assert.equal(output.providerAttempts,1);assert.equal(f.getCalls(),1);
  assert.equal(fs.existsSync(path.join(writerHome,ELECTRIC_FILE)),false);
}));

test('incomplete EIA pagination fails before writes and makes only 2 calls',()=>temp(async({writerHome})=>{
  const partial=data();partial.response.total='25';
  const f=fixture({respond:url=>Response.json(url.includes('/facet/')?facet():partial)});
  const output=await runInflationEiaOnlyOnce({writerHome,...f.options});
  assert.equal(output.status,'RUNTIME_FAILED');assert.equal(output.code,'EIA_PAGINATION_INCOMPLETE');
  assert.equal(output.providerAttempts,2);assert.equal(f.getCalls(),2);
  assert.equal(fs.existsSync(path.join(writerHome,ELECTRIC_FILE)),false);
}));

test('EIA HTTP error does not retry and prior result is preserved',()=>temp(async({writerHome})=>{
  const setup=fixture();await runInflationEiaOnlyOnce({writerHome,...setup.options});
  const file=path.join(writerHome,ELECTRIC_FILE),prior=fs.readFileSync(file);
  const f=fixture({respond:url=>url.includes('/facet/')?Response.json(facet()):new Response('unavailable',{status:503})});
  const output=await runInflationEiaOnlyOnce({writerHome,...f.options});
  assert.equal(output.status,'RUNTIME_FAILED');assert.equal(output.code,'PROVIDER_HTTP_503');
  assert.equal(output.providerAttempts,2);assert.equal(f.getCalls(),2);
  assert.deepEqual(fs.readFileSync(file),prior);
}));

test('bad existing EIA input never overwritten',()=>temp(async({writerHome})=>{
  const file=path.join(writerHome,ELECTRIC_FILE);
  fs.mkdirSync(path.dirname(file));fs.writeFileSync(file,'{corrupt');
  const f=fixture(),output=await runInflationEiaOnlyOnce({writerHome,...f.options});
  assert.equal(output.status,'RUNTIME_FAILED');assert.equal(output.code,'EXISTING_EIA_INDUSTRIAL_ELECTRICITY_US_JSON_INVALID');
  assert.equal(output.providerAttempts,0);assert.equal(f.getCalls(),0);
  assert.equal(fs.readFileSync(file,'utf8'),'{corrupt');
}));

test('unapproved home and symlink output rejected before network',()=>temp(async({writerHome,dir})=>{
  const f=fixture();
  await assert.rejects(runInflationEiaOnlyOnce({writerHome:dir,...f.options}),/EIA_ONLY_WRITER_DENIED/);
  const outside=path.join(dir,'outside');fs.mkdirSync(outside);
  fs.symlinkSync(outside,path.join(writerHome,'inflation-causal-r1'),'dir');
  await assert.rejects(runInflationEiaOnlyOnce({writerHome,...f.options}),/EIA_ONLY_OUTPUT_ROOT_UNSAFE/);
  assert.equal(f.getCalls(),0);assert.deepEqual(fs.readdirSync(outside),[]);
}));
