import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  INFLATION_CANDIDATE_BLS_IDS,
  INFLATION_CANDIDATE_BLS_FILE,
  collectInflationCandidateBls,
  normalizeInflationCandidateBls,
} from './inflation-causal-candidate-bls3.mjs';

const {rent,ownerEquivalentRent,finalDemandPpi}=INFLATION_CANDIDATE_BLS_IDS;
const makeSeries=(id,value,year='2026',month='M09')=>({seriesID:id,data:[
  {year,period:month,value:String(value),footnotes:[]},
  {year,period:'M13',value:String(value),footnotes:[]},
]});
const payload=(...items)=>({status:'REQUEST_SUCCEEDED',Results:{series:items}});
const response=body=>new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
const now=new Date('2026-11-08T00:00:00.000Z');
const fixtureBase=()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-candidate-bls3-'));
  const base=path.join(temp,'pc-writer');fs.mkdirSync(base);
  return {temp,base,clear:()=>fs.rmSync(temp,{recursive:true,force:true})};
};

test('distinct CPI and PPI series and periods are strict; M13 is not a month',()=>{
  const cpi=normalizeInflationCandidateBls(payload(makeSeries(ownerEquivalentRent,410),makeSeries(rent,350)),{group:'cpi'});
  assert.deepEqual(Object.keys(cpi).sort(),[ownerEquivalentRent,rent].sort());
  assert.deepEqual(cpi[rent].map(x=>x.date),['2026-09-01']);
  assert.deepEqual(normalizeInflationCandidateBls(payload(makeSeries(finalDemandPpi,270)),{group:'ppi'})[finalDemandPpi][0].value,270);
  assert.throws(()=>normalizeInflationCandidateBls(payload(makeSeries('WPSFD42',270)),{group:'ppi'}),/ID_OR_ROWS_INVALID/);
  assert.throws(()=>normalizeInflationCandidateBls(payload(makeSeries('CUSR0000SEHC',410),makeSeries(rent,350)),{group:'cpi'}),/ID_OR_ROWS_INVALID/);
  assert.throws(()=>normalizeInflationCandidateBls(payload(makeSeries(rent,350),makeSeries(rent,350)),{group:'cpi'}),/ID_OR_ROWS_INVALID/);
  assert.throws(()=>normalizeInflationCandidateBls(payload(makeSeries(finalDemandPpi,'.')),{group:'ppi'}),/VALUE_OR_DUPLICATE/);
});

test('CPI and PPI provider events save independently and preserve all three series',async t=>{
  const ctx=fixtureBase();t.after(ctx.clear);
  const requests=[];
  const quotaFetch=async (url,options)=>{
    assert.equal(url,'https://api.bls.gov/publicAPI/v2/timeseries/data/');
    assert.equal(options.redirect,'manual');
    const req=JSON.parse(options.body);requests.push(req);
    assert.equal(req.registrationkey,'private-test-key');
    return response(payload(...req.seriesid.map(id=>makeSeries(id,id===rent?350:id===ownerEquivalentRent?410:270))));
  };
  const first=await collectInflationCandidateBls({base:ctx.base,group:'cpi',blsKey:'private-test-key',quotaFetch,now});
  assert.equal(first.status,'SAVED_READBACK');
  const second=await collectInflationCandidateBls({base:ctx.base,group:'ppi',blsKey:'private-test-key',quotaFetch,now});
  assert.equal(second.status,'SAVED_READBACK');
  const output=JSON.parse(fs.readFileSync(path.join(ctx.base,INFLATION_CANDIDATE_BLS_FILE),'utf8'));
  assert.deepEqual(Object.keys(output.series).sort(),[rent,ownerEquivalentRent,finalDemandPpi].sort());
  assert.equal(output.series[finalDemandPpi][0].value,270);
  assert.equal(output.series[rent][0].value,350);
  assert.equal(output.series[ownerEquivalentRent][0].value,410);
  assert.equal(requests.length,2);
  assert.deepEqual(requests.map(x=>x.seriesid),[[rent,ownerEquivalentRent],[finalDemandPpi]]);
  const archived=path.join(ctx.base,'inflation-causal-candidates-r1',second.archive);
  assert.equal(fs.existsSync(archived),true);
  assert.equal(fs.readFileSync(archived,'utf8').includes('private-test-key'),false);
  const again=await collectInflationCandidateBls({base:ctx.base,group:'ppi',blsKey:'private-test-key',quotaFetch,now});
  assert.equal(again.status,'UNCHANGED');
});

test('revised month overwrites only its own series while older observations remain',async t=>{
  const ctx=fixtureBase();t.after(ctx.clear);
  let revision=false;
  const quotaFetch=async (_url,options)=>{
    const {seriesid}=JSON.parse(options.body);
    const items=seriesid.map(id=>({...makeSeries(id,id===rent?350:410),data:[
      {year:'2026',period:'M08',value:'300',footnotes:[]},
      {year:'2026',period:'M09',value:String(id===rent&&revision?351:id===rent?350:410),footnotes:[]},
    ]}));
    return response(payload(...items));
  };
  await collectInflationCandidateBls({base:ctx.base,group:'cpi',blsKey:'k',quotaFetch,now});
  revision=true;
  const updated=await collectInflationCandidateBls({base:ctx.base,group:'cpi',blsKey:'k',quotaFetch,now});
  assert.equal(updated.status,'SAVED_READBACK');
  const saved=JSON.parse(fs.readFileSync(path.join(ctx.base,INFLATION_CANDIDATE_BLS_FILE),'utf8'));
  assert.deepEqual(saved.series[rent].map(x=>x.value),[300,351]);
  assert.deepEqual(saved.series[ownerEquivalentRent].map(x=>x.value),[300,410]);
});

test('provider shape failure cannot replace a last known good snapshot',async t=>{
  const ctx=fixtureBase();t.after(ctx.clear);
  let wrong=false;
  const quotaFetch=async()=>response(wrong?payload(makeSeries('WPSFD42',2)):
    payload(makeSeries(finalDemandPpi,270)));
  await collectInflationCandidateBls({base:ctx.base,group:'ppi',blsKey:'k',quotaFetch,now});
  const file=path.join(ctx.base,INFLATION_CANDIDATE_BLS_FILE);
  const saved=fs.readFileSync(file);
  wrong=true;
  await assert.rejects(()=>collectInflationCandidateBls({base:ctx.base,group:'ppi',blsKey:'k',quotaFetch,now}),
    /BLS_CANDIDATE_ID_OR_ROWS_INVALID/);
  assert.deepEqual(fs.readFileSync(file),saved);
});

test('no approved key/quota, invalid group and unsafe PC base stop before network',async t=>{
  const ctx=fixtureBase();t.after(ctx.clear);
  let calls=0;const quotaFetch=()=>{calls++;throw Error('must not fetch');};
  const common={base:ctx.base,group:'cpi',now,quotaFetch};
  await assert.rejects(()=>collectInflationCandidateBls({...common,blsKey:''}),/KEY_MISSING/);
  await assert.rejects(()=>collectInflationCandidateBls({...common,blsKey:'k',quotaFetch:null}),/QUOTA_FETCH_REQUIRED/);
  await assert.rejects(()=>collectInflationCandidateBls({...common,group:'all',blsKey:'k'}),/GROUP_NOT_APPROVED/);
  await assert.rejects(()=>collectInflationCandidateBls({...common,base:ctx.temp,blsKey:'k'}),/PC_BASE_DENIED/);
  assert.equal(calls,0);
});


test('official BLS 2025-10 X gap is not fabricated as numeric CPI (both series)',()=>{
  // Official flatfile cu.data.12.USHousing: 2025 M10 "-" X for #22 and #23.
  // API-shaped fixture; not a claim that this exact API payload was saved on PC.
  const x={year:'2025',period:'M10',value:'-',footnotes:[{code:'X',text:'Data unavailable due to the 2025 lapse in appropriations.'}]};
  const sample=(id,sep,oct)=>({
    seriesID:id,data:[
      {year:'2026',period:'M10',value:oct,footnotes:[]},
      x,
      {year:'2025',period:'M09',value:sep,footnotes:[]},
    ],
  });
  const valid=normalizeInflationCandidateBls(payload(
    sample(rent,'438.237','451.337'),
    sample(ownerEquivalentRent,'431.134','446.588'),
  ),{group:'cpi'});
  assert.deepEqual(valid[rent].map(r=>r.date),['2025-09-01','2026-10-01']);
  assert.deepEqual(valid[ownerEquivalentRent].map(r=>r.date),['2025-09-01','2026-10-01']);
  assert.equal(valid[rent][1].value,451.337);
  assert.equal(valid[ownerEquivalentRent][1].value,446.588);
  // A lone '-' or an unrelated footnote is still an invalid provider value.
  for(const footnotes of [[],[{code:'P',text:'Preliminary'}]]){
    const bad=sample(rent,'438.237','451.337');
    bad.data[1]={...x,footnotes};
    assert.throws(()=>normalizeInflationCandidateBls(payload(bad,sample(ownerEquivalentRent,'431.134','446.588')),{group:'cpi'}),/VALUE_OR_DUPLICATE/);
  }
  // Even a missing-value row counts as the observed month for duplicate detection.
  const duplicate=sample(rent,'438.237','451.337');
  duplicate.data.push({year:'2025',period:'M10',value:'438.7',footnotes:[]});
  assert.throws(()=>normalizeInflationCandidateBls(payload(duplicate,sample(ownerEquivalentRent,'431.134','446.588')),{group:'cpi'}),/VALUE_OR_DUPLICATE/);
  const allMissing=sample(rent,'438.237','451.337');
  allMissing.data=[x];
  assert.throws(()=>normalizeInflationCandidateBls(payload(allMissing,sample(ownerEquivalentRent,'431.134','446.588')),{group:'cpi'}),/SERIES_EMPTY/);
});
