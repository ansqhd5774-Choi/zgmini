import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
 BLS8_IDS,BLS8_ENDPOINT,BLS8_OUTPUT_RELATIVE,collectInflationCausalBls8,
 normalizeBls8Response,mergeBls8,
} from '../scripts/inflation-causal-bls8.mjs';

const sample=(period='M09')=>({status:'REQUEST_SUCCEEDED',Results:{series:BLS8_IDS.map((id,i)=>({
 seriesID:id,data:[{year:'2026',period,value:String(100+i),footnotes:[{code:'P',text:'Preliminary'}]},
  {year:'2026',period:'M08',value:String(90+i)},
  {year:'2026',period:'M13',value:String(95+i)}],
}))}});
const response=(payload,status=200)=>({ok:status===200,status,text:async()=>JSON.stringify(payload)});
const fixture=()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'inflation-bls8-fixture-'));
 const file=path.join(base,BLS8_OUTPUT_RELATIVE);
 return {base,file,cleanup:()=>fs.rmSync(base,{recursive:true,force:true})};
};
const opts=(base,quotaFetch)=>({base,blsKey:'NON_SECRET_TEST_KEY',quotaFetch,now:new Date('2026-11-04T06:00:00.000Z')});

test('BLS PPI eight series 1 POST, 20 years, sorted monthly, M13 excluded, PC file readback',async t=>{
 const f=fixture();t.after(f.cleanup);
 let calls=0;
 const result=await collectInflationCausalBls8(opts(f.base,async(url,init)=>{
  calls++;
  assert.equal(url,BLS8_ENDPOINT);
  assert.equal(init.method,'POST');
  const req=JSON.parse(init.body);
  assert.deepEqual(req.seriesid,BLS8_IDS);
  assert.equal(req.startyear,'2007');assert.equal(req.endyear,'2026');
  assert.equal(req.registrationkey,'NON_SECRET_TEST_KEY');
  return response(sample());
 }));
 assert.equal(calls,1);
 assert.equal(result.status,'SAVED_READBACK');assert.equal(result.stored,true);
 assert.equal(result.ids,8);assert.match(result.fileSha256,/^[a-f0-9]{64}$/);
 const stored=JSON.parse(fs.readFileSync(f.file,'utf8'));
 assert.equal(stored.sourceVersion,'BLS_API_V2_PPI_BATCH8_R1');
 assert.equal(stored.providerRawSeries.length,8); // Original BLS observation envelopes remain PC-local.
 assert.deepEqual(stored.series.WPU1017.map(row=>row.date),['2026-08-01','2026-09-01']);
 assert.equal(stored.series.WPU1017.at(-1).footnotes[0].code,'P');
 assert.equal(fs.readFileSync(f.file,'utf8').includes('NON_SECRET_TEST_KEY'),false);
});

test('unchanged provider output causes no second storage write',async t=>{
 const f=fixture();t.after(f.cleanup);
 await collectInflationCausalBls8(opts(f.base,async()=>response(sample())));
 const before=fs.readFileSync(f.file,'utf8');
 const result=await collectInflationCausalBls8(opts(f.base,async()=>response(sample())));
 assert.equal(result.status,'UNCHANGED_VALID_INPUT_PRESERVED');assert.equal(result.stored,false);
 assert.equal(fs.readFileSync(f.file,'utf8'),before);
});

test('partial 7 of 8 does not overwrite previous valid storage',async t=>{
 const f=fixture();t.after(f.cleanup);
 await collectInflationCausalBls8(opts(f.base,async()=>response(sample())));
 const before=fs.readFileSync(f.file,'utf8');
 const payload=sample();payload.Results.series.pop();
 await assert.rejects(collectInflationCausalBls8(opts(f.base,async()=>response(payload))),{code:'BLS_SERIES_COUNT'});
 assert.equal(fs.readFileSync(f.file,'utf8'),before);
});

test('HTTP 503 does not retry and preserves previous valid input',async t=>{
 const f=fixture();t.after(f.cleanup);
 await collectInflationCausalBls8(opts(f.base,async()=>response(sample())));
 const before=fs.readFileSync(f.file,'utf8');
 let calls=0;
 await assert.rejects(collectInflationCausalBls8(opts(f.base,async()=>{calls++;return response(null,503);})),{code:'BLS_HTTP_503'});
 assert.equal(calls,1);assert.equal(fs.readFileSync(f.file,'utf8'),before);
});

test('quota guard rejects, no retry and prior input preserved',async t=>{
 const f=fixture();t.after(f.cleanup);
 await collectInflationCausalBls8(opts(f.base,async()=>response(sample())));
 const before=fs.readFileSync(f.file,'utf8');
 let calls=0;
 await assert.rejects(collectInflationCausalBls8(opts(f.base,async()=>{calls++;throw Object.assign(Error('QUOTA'),{code:'PROVIDER_QUOTA_GUARD'});})),{code:'PROVIDER_QUOTA_GUARD'});
 assert.equal(calls,1);assert.equal(fs.readFileSync(f.file,'utf8'),before);
});

test('invalid ID/duplicated series rejected',()=>{
 const p=sample();p.Results.series[0].seriesID=p.Results.series[1].seriesID;
 assert.throws(()=>normalizeBls8Response(p),{code:'BLS_ID_INVALID_OR_DUPLICATE'});
});

test('missing, NaN, or blank values fail closed; numeric 0 is not missing',()=>{
 for(const value of ['','.','NaN']){
  const p=sample();p.Results.series[0].data[0].value=value;
  assert.throws(()=>normalizeBls8Response(p),{code:'BLS_VALUE_INVALID'});
 }
 const p=sample();p.Results.series[0].data[0].value='0';
 assert.equal(normalizeBls8Response(p).WPU1017.at(-1).value,0);
});

test('bad period or duplicated month rejected',()=>{
 const p=sample();p.Results.series[0].data[0].period='X09';
 assert.throws(()=>normalizeBls8Response(p),{code:'BLS_MONTH_INVALID'});
 const q=sample();q.Results.series[0].data[1].period='M09';
 assert.throws(()=>normalizeBls8Response(q),{code:'BLS_MONTH_DUPLICATE'});
});

test('provider correction supersedes overlapping month but never discards older history',()=>{
 const initial=normalizeBls8Response(sample());
 const prior={schemaVersion:1,provider:'BLS',ids:[...BLS8_IDS],series:initial};
 const updated=sample();updated.Results.series[0].data[0].value='777';
 const merged=mergeBls8(prior,normalizeBls8Response(updated));
 assert.equal(merged.WPU1017.length,2);
 assert.equal(merged.WPU1017.at(-1).value,777);
});

test('missing registration key or quota-injected function results in zero requests',async t=>{
 const f=fixture();t.after(f.cleanup);
 let calls=0;const quotaFetch=async()=>{calls++;return response(sample());};
 await assert.rejects(collectInflationCausalBls8({...opts(f.base,quotaFetch),blsKey:''}),{code:'BLS_REGISTRATION_KEY_MISSING'});
 await assert.rejects(collectInflationCausalBls8({...opts(f.base,quotaFetch),quotaFetch:null}),{code:'APPROVED_QUOTA_FETCH_REQUIRED'});
 assert.equal(calls,0);assert.equal(fs.existsSync(f.file),false);
});

test('missing E: equivalent base never silently creates fallback storage',async()=>{
 const missing=path.join(os.tmpdir(),`bls8-missing-${process.pid}-${Date.now()}`);
 await assert.rejects(collectInflationCausalBls8(opts(missing,async()=>response(sample()))),{code:'PC_DATA_BASE_UNAVAILABLE'});
 assert.equal(fs.existsSync(missing),false);
});

test('a newer source month merges with existing history without reinitializing',async t=>{
 const f=fixture();t.after(f.cleanup);
 await collectInflationCausalBls8(opts(f.base,async()=>response(sample())));
 const next=sample('M10');
 const result=await collectInflationCausalBls8(opts(f.base,async()=>response(next)));
 assert.equal(result.status,'SAVED_READBACK');
 assert.equal(result.latest.WPU1017,'2026-10-01');
 const rows=JSON.parse(fs.readFileSync(f.file,'utf8')).series.WPU1017;
 assert.deepEqual(rows.map(x=>x.date),['2026-08-01','2026-09-01','2026-10-01']);
});
