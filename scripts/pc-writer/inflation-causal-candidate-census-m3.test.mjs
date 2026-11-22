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


test('W01 Census optional provider metadata never rejects valid required MTM/TI columns',()=>{
  const columns=[...HEADERS,'ERROR_DATA','',null];
  const original=row(2026,'09','900000');
  const data=[columns,
    [...original,'duplicate annotation','provider unused text','ignored null label'],
    [...row(2026,'08','850000'),'','',''],
  ];
  const items=normalizeCensusM3Inventories(data);
  assert.deepEqual(items.map(x=>[x.date,x.value]),[
    ['2026-08-01',850000],['2026-09-01',900000],
  ]);
  assert.equal(items.diagnostics.available,2);
  assert.equal(items.diagnostics.invalid,0);
  assert.equal(items.every(x=>x.selector==='MTM/TI'&&x.seasonallyAdjusted===true),true);
});

test('W01 Census still rejects ambiguous required/geography/date columns',()=>{
  const base=row(2026,'09','900000');
  for(const key of ['data_type_code','seasonally_adj','category_code',
    'cell_value','us','time_slot_date']){
    const duplicated=[...HEADERS,key.toUpperCase()];
    assert.throws(()=>normalizeCensusM3Inventories([duplicated,[...base,'alternate']]),
      {code:'CENSUS_M3_HEADERS_INVALID'},key);
  }
  for(const key of ['data_type_code','seasonally_adj','category_code',
    'cell_value','us','time_slot_date']){
    const keep=HEADERS.map((name,i)=>({name,value:base[i]}))
      .filter(item=>item.name!==key);
    assert.throws(()=>normalizeCensusM3Inventories([
      keep.map(x=>x.name),keep.map(x=>x.value)]),
      {code:'CENSUS_M3_HEADERS_INVALID'},key);
  }
  const valid=[...HEADERS,'error_data'];
  const wrongLength=[...base,'unused', 'extra'];
  const data=normalizeCensusM3Inventories([valid,wrongLength,[...base,'annotation']]);
  assert.equal(data.length,1,'wrong-length rows must remain excluded');
  assert.equal(data.diagnostics.invalid,1);
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


test('archived Census duplicate predicate headers are accepted only with agreement',()=>{
  const doubled=['data_type_code','time_slot_date','seasonally_adj','category_code',
    'cell_value','us','seasonally_adj','category_code'];
  const valid=['TI','2026-09-01','yes','MTM','900000','1','YES','mtm'];
  const second=['TI','2026-08-01','yes','MTM','850000','1','yes','MTM'];
  const result=normalizeCensusM3Inventories([doubled,valid,second]);
  assert.deepEqual(result.map(x=>[x.date,x.value]),[
    ['2026-08-01',850000],['2026-09-01',900000],
  ]);
  assert.equal(result.diagnostics.invalid,0);
  const conflict=['TI','2026-07-01','yes','MTM','800000','1','no','MTM'];
  const categoryConflict=['TI','2026-06-01','yes','MTM','750000','1','yes','OTHER'];
  const safe=normalizeCensusM3Inventories([doubled,valid,conflict,categoryConflict]);
  assert.deepEqual(safe.map(x=>x.date),['2026-09-01']);
  assert.equal(safe.diagnostics.invalid,2);
  for(const key of ['data_type_code','time_slot_date','cell_value','us']){
    const malformed=[...doubled,key];
    assert.throws(()=>normalizeCensusM3Inventories([malformed]),/CENSUS_M3_HEADERS_INVALID/);
  }
});

test('two-year Census raw archives remain intact when duplicate selectors agree',async t=>{
  const fixture=base();t.after(fixture.clear);
  const doubled=['data_type_code','time_slot_date','seasonally_adj','category_code',
    'cell_value','us','seasonally_adj','category_code'];
  const quotaFetch=async url=>{
    const year=Number(new URL(url).searchParams.get('time'));
    return response([doubled,['TI',year+'-09-01','yes','MTM',
      year===2025?'700000':'900000','1','yes','MTM']]);
  };
  const out=await collectCensusM3Inventories({
    base:fixture.writer,censusKey:'test-key',quotaFetch,now,
  });
  assert.equal(out.status,'SAVED_READBACK');
  assert.equal(out.providerRequests,2);
  assert.equal(out.count,2);
  assert.deepEqual(out.diagnostics.map(d=>d.available),[1,1]);
  for(const info of out.provenance){
    const original=fs.readFileSync(path.join(fixture.writer,
      'inflation-causal-candidates-r1',info.archive));
    assert.deepEqual(JSON.parse(original.toString('utf8'))[0],doubled);
  }
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

test('explicit invalid Census time_slot_date cannot be replaced by alternate time month',()=>{
  const headers=['data_type_code','seasonally_adj','category_code','cell_value',
    'time_slot_date','time','us'];
  const items=normalizeCensusM3Inventories([headers,
    ['TI','yes','MTM','900000','','2026-09','1'],
    ['TI','yes','MTM','901000','2026-02-30','2026-02','1'],
    ['TI','yes','MTM','902000','2026-10-01 12:00:00.0','2026-10','1'],
    ['TI','yes','MTM','904000','2026-12-15','2026-12','1'],
    ['TI','yes','MTM','905000','2026-08-15 00:00:00.0','2026-08','1'],
    ['TI','yes','MTM','906000','','2026-07-15','1'],
    ['TI','yes','MTM','903000','2026-11-01','2026-11','1'],
  ]);
  assert.deepEqual(items.map(x=>[x.date,x.value]),[
    ['2026-09-01',900000],['2026-11-01',903000],
  ]);
  assert.equal(items.diagnostics.invalid,5);
  assert.equal(items.diagnostics.available,2);
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
  await assert.rejects(()=>collectCensusM3Inventories({base:fixture.writer,censusKey:'k',
    quotaFetch:async url=>response(payload(row(Number(new URL(url).searchParams.get('time')),'09','NA'))),now}),
  {code:'CENSUS_M3_NO_USABLE_OBSERVATIONS'});
  assert.equal(fs.existsSync(path.join(fixture.writer,CENSUS_M3_INVENTORIES_FILE)),false);
  // The attempted responses are still retained by their verified SHA, even
  // though neither year produced a usable value or a successful source file.
  const raw=path.join(fixture.writer,'inflation-causal-candidates-r1','raw');
  const archives=fs.readdirSync(raw).filter(name=>
    /^census-m3-mtm-202[56]-[a-f0-9]{64}\.json$/.test(name));
  assert.equal(archives.length,2);
  assert.equal(archives.some(name=>name.startsWith('census-m3-mtm-2025-')),true);
  assert.equal(archives.some(name=>name.startsWith('census-m3-mtm-2026-')),true);
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


test('Census M3 rejects malformed thousands separators without inventing inventory values',()=>{
  const values=normalizeCensusM3Inventories(payload(
    row(2026,'01','12,34'),
    row(2026,'02','1,,234'),
    row(2026,'03','1,234,56'),
    row(2026,'04','01,234'),
    row(2026,'05','1,234'),
    row(2026,'06','12,345,678.50'),
    row(2026,'07','1,234.0'),
    row(2026,'08','12345678'),
  ));
  assert.deepEqual(values.map(x=>[x.date,x.value]),[
    ['2026-05-01',1234],
    ['2026-06-01',12345678.5],
    ['2026-07-01',1234],
    ['2026-08-01',12345678],
  ]);
  assert.equal(values.diagnostics.invalid,4);
});

test('malformed values in both official Census years fail the initial snapshot and retain raw archives',async t=>{
  const fixture=base();t.after(fixture.clear);
  let requests=0;
  await assert.rejects(()=>collectCensusM3Inventories({
    base:fixture.writer,censusKey:'fixture-key',now,
    quotaFetch:async url=>{
      requests++;
      const year=Number(new URL(url).searchParams.get('time'));
      return response(payload(row(year,'09','12,34')));
    },
  }),{code:'CENSUS_M3_NO_USABLE_OBSERVATIONS'});
  assert.equal(requests,2);
  assert.equal(fs.existsSync(path.join(fixture.writer,CENSUS_M3_INVENTORIES_FILE)),false);
  const archiveNames=fs.readdirSync(path.join(fixture.writer,'inflation-causal-candidates-r1','raw'));
  assert.equal(archiveNames.length,2);
  assert.equal(archiveNames.some(name=>name.startsWith('census-m3-mtm-2025-')),true);
  assert.equal(archiveNames.some(name=>name.startsWith('census-m3-mtm-2026-')),true);
});

test('invalid last-good Census file fails before network and preserves its exact bytes',async t=>{
  const fixture=base();t.after(fixture.clear);
  let providerCalls=0;
  const fetchYear=async url=>{
    providerCalls++;
    const year=Number(new URL(url).searchParams.get('time'));
    return response(payload(row(year,'09',year===2025?'700000':'900000')));
  };
  const first=await collectCensusM3Inventories({
    base:fixture.writer,censusKey:'fixture-key',quotaFetch:fetchYear,now});
  assert.equal(first.status,'SAVED_READBACK');
  assert.equal(providerCalls,2);
  const file=path.join(fixture.writer,CENSUS_M3_INVENTORIES_FILE);
  const doc=JSON.parse(fs.readFileSync(file,'utf8'));
  doc.observations.push({...doc.observations[0],value:888888});
  const conflicting=Buffer.from(JSON.stringify(doc));
  fs.writeFileSync(file,conflicting);
  const archiveDir=path.join(fixture.writer,'inflation-causal-candidates-r1','raw');
  const archivesBefore=fs.readdirSync(archiveDir).sort();
  await assert.rejects(()=>collectCensusM3Inventories({
    base:fixture.writer,censusKey:'fixture-key',quotaFetch:fetchYear,now}),
    {code:'CENSUS_M3_EXISTING_CONTRACT_INVALID'});
  assert.equal(providerCalls,2,'invalid prior cannot consume another two provider GETs');
  assert.deepEqual(fs.readFileSync(file),conflicting,'preserve original bytes for diagnosis');
  assert.deepEqual(fs.readdirSync(archiveDir).sort(),archivesBefore,'no attempted response archives');
});

test('Census last-good metadata must match public MTM/TI contract before any supplier GET',async t=>{
  const fixture=base();t.after(fixture.clear);
  let calls=0;
  const quotaFetch=async url=>{
    calls++;
    const year=Number(new URL(url).searchParams.get('time'));
    return response(payload(row(year,'09',year===2025?'700000':'900000')));
  };
  const first=await collectCensusM3Inventories({
    base:fixture.writer,censusKey:'fixture-key',quotaFetch,now});
  assert.equal(first.status,'SAVED_READBACK');
  assert.equal(calls,2);
  const file=path.join(fixture.writer,CENSUS_M3_INVENTORIES_FILE);
  const normal=JSON.parse(fs.readFileSync(file,'utf8'));
  const rawDir=path.join(fixture.writer,'inflation-causal-candidates-r1','raw');
  const beforeArchives=fs.readdirSync(rawDir).sort();
  const mutations=[
    doc=>{doc.selector='MTM/NO';},
    doc=>{doc.frequency='DAILY';},
    doc=>{doc.unit='USD';},
    doc=>{doc.observations[0].selector='MTM/NO';},
    doc=>{doc.observations[0].unit='USD';},
    doc=>{doc.observations[0].seasonallyAdjusted=false;},
    doc=>{delete doc.observations[0].seasonallyAdjusted;},
  ];
  for(const mutate of mutations){
    const bad=structuredClone(normal);mutate(bad);
    const badBytes=Buffer.from(JSON.stringify(bad));
    fs.writeFileSync(file,badBytes);
    await assert.rejects(()=>collectCensusM3Inventories({
      base:fixture.writer,censusKey:'fixture-key',quotaFetch,now}),
      {code:'CENSUS_M3_EXISTING_CONTRACT_INVALID'});
    assert.equal(calls,2,'bad last-good must never spend provider quota');
    assert.deepEqual(fs.readFileSync(file),badBytes,'retain exact damaged bytes for owner audit');
    assert.deepEqual(fs.readdirSync(rawDir).sort(),beforeArchives,
      'prior validation must stop before creating new provider archives');
  }
  fs.writeFileSync(file,JSON.stringify(normal));
  const unchanged=await collectCensusM3Inventories({
    base:fixture.writer,censusKey:'fixture-key',quotaFetch,now});
  assert.equal(unchanged.status,'UNCHANGED','existing correctly labeled last-good remains usable');
  assert.equal(calls,4,'the normal approved path still performs its two yearly GETs');
});
