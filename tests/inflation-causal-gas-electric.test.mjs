import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {collectGas,collectIndustrialElectricity,
  confirmEiaUsIndustrialFacet,normalizeFredGas,normalizeEiaIndustrial,
  GAS_FILE,ELECTRIC_FILE} from '../scripts/inflation-causal-gas-electric.mjs';

const temp=async f=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'gas-electric-test-'));
  const base=path.join(root,'pc-writer');fs.mkdirSync(base);
  try{await f({base,root})}finally{fs.rmSync(root,{recursive:true,force:true})}
};
const gasFixture=(n=40)=>({observations:Array.from({length:n},(_,i)=>{
  const date=new Date(Date.UTC(2026,8,1+i)).toISOString().slice(0,10);
  return {date,value:(3+(i%11)*.01).toFixed(2),realtime_start:'2026-09-01'};
})});
const electricFixture=(n=24)=>({response:{frequency:'monthly',total:String(n),
  data:Array.from({length:n},(_,i)=>({period:`${2024+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`,
    stateid:'US',sectorid:'IND',price:String(7.1+i*.04),'price-units':'cents per kilowatthour'}))}});
const facetFixture=()=>({response:{totalFacets:'3',facets:[
  {id:'CO',name:'Colorado'}, {id:'US',name:'United States'}, {id:'NY',name:'New York'}]}});

test('FRED DHHNGSP official-like daily rows and explicit monthly arithmetic aggregation',()=>{
  const fixture=gasFixture();fixture.observations[2].value='.';
  const parsed=normalizeFredGas(fixture);
  assert.equal(parsed.daily.length,39);
  assert.equal(parsed.missing.length,1);
  assert.equal(parsed.monthly[0].month,'2026-09');
  assert.equal(parsed.monthly[0].aggregation,'ARITHMETIC_MEAN_OF_REPORTED_DAYS');
});

test('gas requests only registered FRED and stores private raw+daily/monthly with readback',()=>temp(async ({base})=>{
  const calls=[];const quotaFetch=async url=>{
    calls.push(String(url));return Response.json(gasFixture());
  };
  const got=await collectGas({base,fredKey:'fixture-key-never-exposed',quotaFetch,
    now:new Date('2026-11-04T06:00:00.000Z')});
  assert.equal(got.status,'SAVED_READBACK');assert.equal(got.count,40);
  assert.equal(calls.length,1);assert.match(calls[0],/series_id=DHHNGSP/);
  const saved=JSON.parse(fs.readFileSync(path.join(base,GAS_FILE)));
  assert.equal(saved.observations.length,40);
  assert.equal(saved.providerRawObservations.length,40);
  assert.match(saved.rawArchive.sha256,/^[a-f0-9]{64}$/);
  const archived=fs.readFileSync(path.join(base,'inflation-causal-r1',saved.rawArchive.file));
  assert.equal(createHash('sha256').update(archived).digest('hex'),saved.rawArchive.sha256);
  assert.equal(JSON.parse(archived).length,40);
  assert.equal(JSON.stringify(got).includes('fixture-key'),false);
}));

test('identical gas snapshot preserves stored file modified date and values',()=>temp(async ({base})=>{
  const fetcher=async()=>Response.json(gasFixture());
  const opts={base,fredKey:'fixture',quotaFetch:fetcher,now:new Date('2026-11-04T06:00:00.000Z')};
  await collectGas(opts);
  const file=path.join(base,GAS_FILE),before=fs.readFileSync(file);
  const again=await collectGas({...opts,now:new Date('2026-11-04T07:00:00.000Z')});
  assert.equal(again.status,'UNCHANGED');
  assert.deepEqual(fs.readFileSync(file),before);
}));

test('wrong or missing EIA nationwide state facet stops before actual data request',()=>temp(async ({base})=>{
  const sent=[];const quotaFetch=async url=>{
    sent.push(String(url));return Response.json({response:{facets:[{id:'US',name:'Unknown Region'}]}});
  };
  await assert.rejects(collectIndustrialElectricity({base,eiaKey:'fixture',quotaFetch}),/EIA_US_NATIONAL_FACET_UNVERIFIED/);
  assert.equal(sent.length,1);
  assert.match(sent[0],/facet\/stateid/);
  assert.equal(fs.existsSync(path.join(base,ELECTRIC_FILE)),false);
}));

test('EIA IND nationwide monthly price exact facet and unit stored privately',()=>temp(async ({base})=>{
  const calls=[];const quotaFetch=async url=>{
    calls.push(String(url));
    return Response.json(calls.length===1?facetFixture():electricFixture());
  };
  const got=await collectIndustrialElectricity({base,eiaKey:'fixture',quotaFetch,
    now:new Date('2026-11-04T06:00:00.000Z')});
  assert.equal(got.status,'SAVED_READBACK');assert.equal(got.providerRequests,2);
  assert.equal(got.count,24);assert.equal(calls.length,2);
  assert.match(calls[1],/facets%5Bstateid%5D%5B%5D=US/);
  assert.match(calls[1],/facets%5Bsectorid%5D%5B%5D=IND/);
  const saved=JSON.parse(fs.readFileSync(path.join(base,ELECTRIC_FILE)));
  assert.equal(saved.unit,'CENTS_PER_KWH');assert.equal(saved.observations[0].month,'2024-01');
  assert.equal(saved.providerRawData.length,24);
  const archived=fs.readFileSync(path.join(base,'inflation-causal-r1',saved.rawArchive.file));
  assert.equal(createHash('sha256').update(archived).digest('hex'),saved.rawArchive.sha256);
  assert.equal(JSON.parse(archived).length,24);
}));

test('gas revised daily observation retains immutable raw vintages and recomputes merged monthly',()=>temp(async ({base})=>{
  const first=gasFixture(),revised=gasFixture();revised.observations[1].value='9.99';
  let runs=0;const quotaFetch=async()=>Response.json(++runs===1?first:revised);
  const opts={base,fredKey:'fixture',quotaFetch,now:new Date('2026-11-04T06:00:00.000Z')};
  await collectGas(opts);
  const old=JSON.parse(fs.readFileSync(path.join(base,GAS_FILE))),oldRaw=fs.readFileSync(path.join(base,'inflation-causal-r1',old.rawArchive.file));
  await collectGas({...opts,now:new Date('2026-11-04T07:00:00.000Z')});
  const next=JSON.parse(fs.readFileSync(path.join(base,GAS_FILE)));
  assert.notEqual(next.rawArchive.sha256,old.rawArchive.sha256);
  assert.equal(next.observations[1].value,9.99);
  assert.notEqual(next.monthlyAggregates[0].value,old.monthlyAggregates[0].value);
  assert.deepEqual(fs.readFileSync(path.join(base,'inflation-causal-r1',old.rawArchive.file)),oldRaw);
}));

test('damaged existing local result fails before quota-fetch and does not overwrite',()=>temp(async ({base})=>{
  fs.mkdirSync(path.join(base,'inflation-causal-r1'));
  const file=path.join(base,GAS_FILE);fs.writeFileSync(file,'{broken-json');
  let calls=0;const quotaFetch=async()=>{calls++;return Response.json(gasFixture())};
  await assert.rejects(collectGas({base,fredKey:'fixture',quotaFetch}),/EXISTING_FRED_DHHNGSP_JSON_INVALID/);
  assert.equal(calls,0);
  assert.equal(fs.readFileSync(file,'utf8'),'{broken-json');
}));

test('EIA incomplete pagination, mixed sector and unexpected unit all fail before writes',()=>temp(async ({base})=>{
  let raw=electricFixture();raw.response.total='200';
  assert.throws(()=>normalizeEiaIndustrial(raw),/PAGINATION_INCOMPLETE/);
  raw=electricFixture();raw.response.data[1].stateid='CA';
  assert.throws(()=>normalizeEiaIndustrial(raw),/MIXED_FACET/);
  raw=electricFixture();raw.response.data[1]['price-units']='dollars per kilowatt-hour';
  assert.throws(()=>normalizeEiaIndustrial(raw),/PRICE_UNITS_CHANGED/);
  const q=async url=>Response.json(String(url).includes('/facet/')?facetFixture():raw);
  await assert.rejects(collectIndustrialElectricity({base,eiaKey:'fixture',quotaFetch:q}),/PRICE_UNITS_CHANGED/);
  assert.equal(fs.existsSync(path.join(base,ELECTRIC_FILE)),false);
}));

test('EIA metadata accepts only explicit US geographic national aggregate',()=>{
  assert.equal(confirmEiaUsIndustrialFacet(facetFixture()),true);
  assert.equal(confirmEiaUsIndustrialFacet({response:{facets:[{id:'US',name:'U.S. Total'}]}}),true);
  assert.equal(confirmEiaUsIndustrialFacet({response:{facets:[{id:'US',name:'United States Total'}]}}),true);
  assert.throws(()=>confirmEiaUsIndustrialFacet({response:{facets:[{id:'US',name:'U.S. Virgin Islands'}]}}),/US_NATIONAL_FACET_UNVERIFIED/);
  assert.throws(()=>confirmEiaUsIndustrialFacet({response:{facets:[{id:'NY',name:'New York'}]}}),/US_NATIONAL_FACET_UNVERIFIED/);
});

test('missing key and wrong PC root prevent all provider requests',()=>temp(async ({base})=>{
  let count=0;const quotaFetch=async()=>{count++;return Response.json(gasFixture())};
  await assert.rejects(collectGas({base,fredKey:'',quotaFetch}),/FRED_KEY_MISSING/);
  await assert.rejects(collectIndustrialElectricity({base,eiaKey:'',quotaFetch}),/EIA_KEY_MISSING/);
  await assert.rejects(collectGas({base:path.dirname(base),fredKey:'x',quotaFetch}),/PC_WRITER_HOME_DENIED/);
  assert.equal(count,0);
}));

test('provider 503 refuses retry; no public/core/db output',()=>temp(async ({base})=>{
  let calls=0;const quotaFetch=async()=>{calls++;return new Response('service unavailable',{status:503})};
  await assert.rejects(collectGas({base,fredKey:'fixture',quotaFetch}),/PROVIDER_HTTP_503/);
  assert.equal(calls,1);
  assert.equal(fs.readdirSync(base).length,0);
}));

test('symlink private destination is denied and outside data stays intact',()=>temp(async ({base,root})=>{
  const elsewhere=path.join(root,'elsewhere');fs.mkdirSync(elsewhere);
  fs.symlinkSync(elsewhere,path.join(base,'inflation-causal-r1'),'dir');
  await assert.rejects(collectGas({base,fredKey:'fixture',quotaFetch:async()=>Response.json(gasFixture())}),/PRIVATE_OUTPUT_PATH_UNSAFE/);
  assert.equal(fs.readdirSync(elsewhere).length,0);
}));
