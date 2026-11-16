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
// Census EITS returns a `time` result column for its year predicate even
// though the metadata marks it predicate-only; Growth G016 uses this contract.
// `time_slot_id` is an internal integer, never the observation month.
const row=(year,month,value='900000')=>['TI','1329',`${year}-${month}-01`,'yes','MTM',value,'','1'];
const payload=(...rows)=>[HEADERS,...rows];
const TIME_HEADERS=['data_type_code','time_slot_id','seasonally_adj','category_code','cell_value','error_data','time','us'];
const timeRow=(year,month,value='900000')=>['TI','1329','yes','MTM',value,'',`${year}-${month}`,'1'];
const timePayload=(...rows)=>[TIME_HEADERS,...rows];
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
  const actualEitsShape=normalizeCensusM3Inventories(timePayload(
    timeRow(2026,'09','900000'),timeRow(2026,'08','850000')));
  assert.deepEqual(actualEitsShape.map(x=>[x.date,x.value]),[['2026-08-01',850000],['2026-09-01',900000]]);
  // An annual `time` filter must not override the explicit monthly date.
  const twoDates=[...HEADERS.slice(0,-1),'time','us'];
  const twoDateRow=[...row(2026,'09','900000').slice(0,-1),'2026','1'];
  assert.deepEqual(normalizeCensusM3Inventories([twoDates,twoDateRow])
    .map(x=>[x.date,x.value]),[['2026-09-01',900000]]);
  const yearOnly=timeRow(2026,'09');yearOnly[6]='2026';
  assert.deepEqual(normalizeCensusM3Inventories(timePayload(yearOnly)),[]);
  // Census official EITS examples emit time_slot_date as a midnight timestamp.
  const stamped=row(2026,'07','800000');stamped[2]='2026-07-01 00:00:00.0';
  assert.deepEqual(normalizeCensusM3Inventories(payload(stamped)).map(x=>[x.date,x.value]),
    [['2026-07-01',800000]]);
  const nonMidnight=row(2026,'07');nonMidnight[2]='2026-07-01 12:00:00.0';
  assert.deepEqual(normalizeCensusM3Inventories(payload(nonMidnight)),[]);
  const invalidStamped=row(2026,'02');invalidStamped[2]='2026-02-30 00:00:00.0';
  assert.deepEqual(normalizeCensusM3Inventories(payload(invalidStamped)),[]);
  assert.equal(normalizeCensusM3Inventories(payload(row(2026,'09'),row(2026,'09'))).length,1);
  assert.deepEqual(normalizeCensusM3Inventories(payload(row(2026,'09','NA'))),[]);
  const invalidDate=row(2026,'02','500000');invalidDate[2]='2026-02-30';
  assert.deepEqual(normalizeCensusM3Inventories(payload(invalidDate)),[]);
  const missingDate=HEADERS.filter(x=>x!=='time_slot_date');
  assert.throws(()=>normalizeCensusM3Inventories([missingDate]),/SHAPE_INVALID|HEADERS_INVALID/);
  assert.deepEqual(normalizeCensusM3Inventories(payload(['NO','1329','2026-09-01','yes','MTM','5','','1'])),[]);
});


test('Census EITS supplier uppercase headers, official missing and conflicting months are isolated',()=>{
  const caps=HEADERS.map(h=>h.toUpperCase());
  const items=normalizeCensusM3Inventories([caps,
    row(2026,'07','800000'),
    row(2026,'08','NA'),
    row(2026,'09','900000'),
    row(2026,'09','900000.0'),
    row(2026,'10','910000'),
    row(2026,'10','920000'),
  ]);
  assert.deepEqual(items.map(x=>x.date),['2026-07-01','2026-09-01']);
  assert.equal(items.diagnostics.missing,1);
  assert.equal(items.diagnostics.duplicate,1);
  assert.equal(items.diagnostics.conflict,1);
  assert.equal(items.diagnostics.available,2);
});

test('Census partial official year preserves usable month and archives all response years',async t=>{
  const fixture=base();t.after(fixture.clear);
  const quotaFetch=async url=>{
    const year=Number(new URL(url).searchParams.get('time'));
    return response(payload(row(year,'07',year===2025?'NA':'800000'),
      row(year,'09',year===2025?'NA':'900000')));
  };
  const result=await collectCensusM3Inventories({base:fixture.writer,censusKey:'k',quotaFetch,now});
  assert.equal(result.status,'SAVED_READBACK');
  assert.equal(result.count,2);
  assert.equal(result.providerRequests,2);
  assert.equal(result.diagnostics[0].missing,2);
  assert.equal(result.diagnostics[1].available,2);
  const doc=JSON.parse(fs.readFileSync(path.join(fixture.writer,CENSUS_M3_INVENTORIES_FILE),'utf8'));
  assert.deepEqual(doc.observations.map(x=>x.value),[800000,900000]);
  for(const item of result.sourceHashes)assert.match(item,/^[0-9a-f]{64}$/);
});

test('Census month criterion accepts official time if time_slot_date is blank',()=>{
  const headers=['data_type_code','seasonally_adj','category_code','cell_value','time_slot_date','time','us'];
  const rows=normalizeCensusM3Inventories([headers,
    ['TI','yes','MTM','900000','','2026-09','1'],
    ['TI','yes','MTM','901000','2026-10-01','2026-09','1'],
    ['TI','yes','MTM','902000','2026-11-01','2026','1'],
  ]);
  assert.deepEqual(rows.map(x=>x.date),['2026-09-01','2026-11-01']);
  assert.equal(rows.diagnostics.invalid,1); // Conflicting official dates are quarantined.
});

test('Census bad schema in one year does not discard valid observations from other year',async t=>{
  const fixture=base();t.after(fixture.clear);
  const fetchYear=async url=>{
    const year=Number(new URL(url).searchParams.get('time'));
    return response(year===2025?
      [['field_not_in_our_contract'],['x']]:
      payload(row(2026,'09','900000')));
  };
  const result=await collectCensusM3Inventories({base:fixture.writer,censusKey:'k',quotaFetch:fetchYear,now});
  assert.equal(result.status,'SAVED_READBACK');
  assert.equal(result.coverage,'PARTIAL_SCHEMA_UNAVAILABLE');
  assert.equal(result.count,1);
  assert.equal(result.diagnostics[0].sourceShape,'CENSUS_M3_HEADERS_INVALID');
  assert.equal(result.diagnostics[1].available,1);
  const saved=JSON.parse(fs.readFileSync(path.join(fixture.writer,CENSUS_M3_INVENTORIES_FILE),'utf8'));
  assert.deepEqual(saved.observations.map(x=>x.date),['2026-09-01']);
  assert.equal(saved.provenance.length,2);
});

test('Census no usable monthly values remains explicitly unavailable, without numeric fallback',async t=>{
  const fixture=base();t.after(fixture.clear);
  const result=await collectCensusM3Inventories({base:fixture.writer,censusKey:'k',
    quotaFetch:async url=>response(payload(row(Number(new URL(url).searchParams.get('time')),'09','NA'))),now});
  assert.equal(result.status,'UNCHANGED');
  assert.equal(result.coverage,'NO_USABLE_OBSERVATIONS');
  assert.equal(result.count,0);
  assert.equal(fs.existsSync(path.join(fixture.writer,CENSUS_M3_INVENTORIES_FILE)),false);
  for(const p of result.provenance)
    assert.equal(fs.existsSync(path.join(fixture.writer,'inflation-causal-candidates-r1',p.archive)),true);
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
  const absent=await collectCensusM3Inventories({base:fixture.writer,censusKey:'k',quotaFetch,now});
  assert.equal(absent.status,'UNCHANGED');
  assert.equal(absent.diagnostics.every(x=>x.missing===1),true);
  assert.deepEqual(before,fs.readFileSync(file));
  const earlier=calls;
  await assert.rejects(()=>collectCensusM3Inventories({base:fixture.writer,censusKey:'',quotaFetch,now}),/KEY_MISSING/);
  assert.equal(calls,earlier);
});

