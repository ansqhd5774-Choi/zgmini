import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
 BLS8_IDS,BLS8_OUTPUT_RELATIVE,normalizeBls8Response,normalizeBls8WithLastGood,
 collectInflationCausalBls8,
} from '../scripts/pc-writer/inflation-causal-bls8.mjs';

const data=(id,value='100')=>({seriesID:id,data:[
 {year:'2026',period:'M01',value:'90',footnotes:[]},
 {year:'2026',period:'M02',value,footnotes:[]},
]});
const payload=()=>({status:'REQUEST_SUCCEEDED',Results:{series:BLS8_IDS.map(id=>data(id))}});
const send=body=>new Response(JSON.stringify(body),{status:200});

function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'w01-bls8-partial-'));
 const base=path.join(root,'pc-writer');fs.mkdirSync(base);
 return {base,file:path.join(base,BLS8_OUTPUT_RELATIVE),
  close:()=>fs.rmSync(root,{recursive:true,force:true})};
}

test('W01: initial BLS8 import remains eight-series strict, no synthetic last-good',()=>{
 const x=payload();
 x.Results.series[0].data[1].value='bad';
 assert.throws(()=>normalizeBls8Response(x),/BLS_VALUE_INVALID/);
 assert.throws(()=>normalizeBls8WithLastGood(x,null),/EXISTING_BLS_INPUT_INVALID_PRESERVED/);
});

test('W01: valid prior permits healthy siblings while malformed and missing series retain original months',async t=>{
 const f=fixture();t.after(f.close);
 let response=payload(),calls=0;
 const quotaFetch=async(url,opts)=>{
  calls++;assert.match(String(url),/api\.bls\.gov/);
  assert.equal(opts.method,'POST');assert.equal(opts.redirect,'manual');
  return send(response);
 };
 const opts={base:f.base,blsKey:'fixture-private-key',quotaFetch,now:new Date('2026-11-18T00:00:00.000Z')};
 const first=await collectInflationCausalBls8(opts);
 assert.equal(first.status,'SAVED_READBACK');assert.equal(first.providerCalls,1);
 const initial=JSON.parse(fs.readFileSync(f.file,'utf8'));
 assert.equal(BLS8_IDS.every(id=>initial.series[id].length===2),true);
 // Two failures are independently isolated. The remaining six series may
 // update within the same approved one-BLS-request scope.
 response=payload();
 response.Results.series.find(s=>s.seriesID==='WPU102502').data[1].value='not-a-number';
 response.Results.series=response.Results.series.filter(s=>s.seriesID!=='WPU029');
 response.Results.series.find(s=>s.seriesID==='WPU1017').data[1].value='150';
 const second=await collectInflationCausalBls8({...opts,now:new Date('2026-11-18T01:00:00.000Z')});
 assert.equal(second.status,'PARTIAL_SAVED_LAST_GOOD');
 assert.deepEqual(second.quarantinedSeries,['WPU102502','WPU029']);
 const saved=JSON.parse(fs.readFileSync(f.file,'utf8'));
 assert.equal(saved.ids.length,8);
 assert.equal(saved.series.WPU1017.at(-1).value,150);
 assert.deepEqual(saved.series.WPU102502,initial.series.WPU102502);
 assert.deepEqual(saved.series.WPU029,initial.series.WPU029);
 assert.equal(saved.series.WPU061.at(-1).value,100);
 assert.equal(saved.sourceVersion,initial.sourceVersion);
 assert.equal(saved.requestYears[0],initial.requestYears[0]);
 assert.equal(calls,2);
 // A fully unavailable response must not rewrite the previous good snapshot.
 const before=fs.readFileSync(f.file);
 response=payload();
 for(const series of response.Results.series)series.data[1].value='bad';
 const third=await collectInflationCausalBls8({...opts,now:new Date('2026-11-18T02:00:00.000Z')});
 assert.equal(third.status,'UNCHANGED_VALID_INPUT_PRESERVED');
 assert.equal(third.quarantinedSeries.length,8);
 assert.deepEqual(fs.readFileSync(f.file),before);
 assert.equal(calls,3);
});

test('W01: duplicate monthly row or duplicate provider series never overwrites prior good data',()=>{
 const old={schemaVersion:1,provider:'BLS',ids:[...BLS8_IDS],
  sourceStoredAt:'2026-11-18T00:00:00.000Z',
  series:Object.fromEntries(BLS8_IDS.map(id=>[id,[{date:'2026-01-01',value:70}]]))};
 const x=payload();
 const duplicated=x.Results.series.find(s=>s.seriesID==='WPU1017');
 duplicated.data.push({...duplicated.data[1],value:'110'});
 const quarantined=normalizeBls8WithLastGood(x,old);
 assert.equal(quarantined.WPU1017.length,0);
 assert.ok(quarantined.quarantinedSeries.includes('WPU1017'));
 assert.equal(quarantined.WPU061.length,2);
 const other=payload();
 other.Results.series[1]={...other.Results.series[0]};
 const q=normalizeBls8WithLastGood(other,old);
 assert.equal(q.WPU1017.length,0);assert.equal(q.WPU102502.length,0);
 assert.deepEqual(q.quarantinedSeries,['WPU1017','WPU102502']);
 assert.throws(()=>normalizeBls8WithLastGood(
  {...other,status:'REQUEST_FAILED'},old),/BLS_STATUS_FAILED/);
});

test('W01: initial corrupt response does not write any BLS8 file',async t=>{
 const f=fixture();t.after(f.close);
 const x=payload();x.Results.series[0].data[0].period='M99';
 let calls=0;
 await assert.rejects(()=>collectInflationCausalBls8({base:f.base,blsKey:'key',
  quotaFetch:async()=>{calls++;return send(x);},now:new Date('2026-11-18T00:00:00.000Z')}),
 /BLS_MONTH_INVALID/);
 assert.equal(calls,1);
 assert.equal(fs.existsSync(f.file),false);
});
