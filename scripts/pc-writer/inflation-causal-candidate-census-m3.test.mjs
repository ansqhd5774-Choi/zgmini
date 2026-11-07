import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  CENSUS_M3_INVENTORIES_FILE,
  collectCensusM3Inventories,
  normalizeCensusM3Inventories,
} from './inflation-causal-candidate-census-m3.mjs';

const HEADERS=['data_type_code','time_slot_id','time_slot_date','seasonally_adj','category_code','cell_value','error_data','us'];
// Official Census metadata marks `time` as predicate-only; request the explicit
// `time_slot_date` output column. `time_slot_id` is an internal integer.
const row=(year,month,value='900000')=>['TI','1329',`${year}-${month}-01`,'yes','MTM',value,'','1'];
const payload=(...rows)=>[HEADERS,...rows];
const response=x=>new Response(JSON.stringify(x),{status:200});
const base=()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-census-m3-'));
  const writer=path.join(temp,'pc-writer');fs.mkdirSync(writer);
  return {writer,clear:()=>fs.rmSync(temp,{recursive:true,force:true})};
};
const now=new Date('2026-11-08T00:00:00.000Z');

test('official Census M3 MTM/TI uses only U.S. total manufacturer SA inventory levels',()=>{
  const items=normalizeCensusM3Inventories(payload(
    ['NO','1329','2026-09-01','yes','MTM','50000','','1'],
    ['TI','1329','2026-09-01','no','MTM','300000','','1'],
    row(2026,'09','900000.00'),row(2026,'08','850000'),
  ));
  assert.deepEqual(items.map(x=>[x.date,x.value]),[['2026-08-01',850000],['2026-09-01',900000]]);
  assert.equal(items[1].unit,'USD_MILLION_SA_NOMINAL');
  assert.throws(()=>normalizeCensusM3Inventories(payload(row(2026,'09'),row(2026,'09'))),/VALUE_OR_DUPLICATE/);
  assert.throws(()=>normalizeCensusM3Inventories(payload(row(2026,'09','NA'))),/VALUE_OR_DUPLICATE/);
  const invalidDate=row(2026,'02','500000');invalidDate[2]='2026-02-30';
  assert.throws(()=>normalizeCensusM3Inventories(payload(invalidDate)),/VALUE_OR_DUPLICATE/);
  const missingDate=HEADERS.filter(x=>x!=='time_slot_date');
  assert.throws(()=>normalizeCensusM3Inventories([missingDate]),/SHAPE_INVALID|HEADERS_INVALID/);
  assert.throws(()=>normalizeCensusM3Inventories(payload(['NO','1329','2026-09-01','yes','MTM','5','','1'])),/NOT_FOUND/);
});

test('collects two source years and archives private provider snapshots without key leakage',async t=>{
  const fixture=base();t.after(fixture.clear);
  const calls=[],quotaFetch=async (url,options)=>{
    const params=new URL(url).searchParams;
    const year=Number(params.get('time'));calls.push(year);
    assert.equal(params.get('key'),'private-census-key');
    assert.ok(params.get('get').split(',').includes('time_slot_date'));
    assert.ok(!params.get('get').split(',').includes('time'));
    assert.equal(params.get('category_code'),'MTM');
    assert.equal(params.get('seasonally_adj'),'yes');
    assert.equal(params.get('for'),'us:*');
    assert.equal(options.redirect,'manual');
    return response(payload(row(year,'09',year===2025?'700000':'900000')));
  };
  const first=await collectCensusM3Inventories({base:fixture.writer,censusKey:'private-census-key',quotaFetch,now});
  assert.equal(first.status,'SAVED_READBACK');
  assert.deepEqual(calls,[2025,2026]);
  const saved=JSON.parse(fs.readFileSync(path.join(fixture.writer,CENSUS_M3_INVENTORIES_FILE),'utf8'));
  assert.deepEqual(saved.observations.map(x=>x.value),[700000,900000]);
  assert.equal(saved.provenance.length,2);
  for(const item of saved.provenance){
    const file=path.join(fixture.writer,'inflation-causal-candidates-r1',item.archive);
    assert.equal(fs.existsSync(file),true);
    assert.equal(fs.readFileSync(file,'utf8').includes('private-census-key'),false);
  }
  const unchanged=await collectCensusM3Inventories({base:fixture.writer,censusKey:'private-census-key',quotaFetch,now});
  assert.equal(unchanged.status,'UNCHANGED');
});

test('revised year data supersedes exact month without losing prior year history',async t=>{
  const fixture=base();t.after(fixture.clear);
  let changed=false;
  const quotaFetch=async url=>{
    const year=Number(new URL(url).searchParams.get('time'));
    return response(payload(row(year,'09',year===2026&&changed?'990000':'900000')));
  };
  await collectCensusM3Inventories({base:fixture.writer,censusKey:'k',quotaFetch,now});
  changed=true;
  const revised=await collectCensusM3Inventories({base:fixture.writer,censusKey:'k',quotaFetch,now});
  assert.equal(revised.status,'SAVED_READBACK');
  const saved=JSON.parse(fs.readFileSync(path.join(fixture.writer,CENSUS_M3_INVENTORIES_FILE),'utf8'));
  assert.deepEqual(saved.observations.map(x=>x.value),[900000,990000]);
});

test('invalid provider row cannot overwrite stored data and missing key blocks network',async t=>{
  const fixture=base();t.after(fixture.clear);
  let invalid=false,calls=0;
  const quotaFetch=async url=>{
    calls++;
    const year=Number(new URL(url).searchParams.get('time'));
    return response(payload(row(year,'09',invalid?'NA':'900000')));
  };
  await collectCensusM3Inventories({base:fixture.writer,censusKey:'k',quotaFetch,now});
  const file=path.join(fixture.writer,CENSUS_M3_INVENTORIES_FILE),before=fs.readFileSync(file);
  invalid=true;
  await assert.rejects(()=>collectCensusM3Inventories({base:fixture.writer,censusKey:'k',quotaFetch,now}),/VALUE_OR_DUPLICATE/);
  assert.deepEqual(before,fs.readFileSync(file));
  const earlier=calls;
  await assert.rejects(()=>collectCensusM3Inventories({base:fixture.writer,censusKey:'',quotaFetch,now}),/KEY_MISSING/);
  assert.equal(calls,earlier);
});
