import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {INFLATION_CANDIDATES_7,INFLATION_CANDIDATES_7_IDS}
  from '../lib/inflation-causal-candidates-public-7-catalog.mjs';
import {INFLATION_CANDIDATES_7_PUBLIC_KEY,INFLATION_CANDIDATES_7_PUBLIC_ROUTE,
  INFLATION_CANDIDATES_7_PUBLIC_SCHEMA,validateInflationCandidates7Public,
  readInflationCandidates7PublicResponse}
  from '../worker/inflation-causal-candidates-public-7-r1.mjs';
import {projectInflationCandidate7Row,previewInflationCandidates7}
  from '../scripts/pc-writer/inflation-causal-candidates-public-7-preview-r1.mjs';

const NOW=Date.parse('2026-11-08T12:00:00.000Z');
const STORED='2026-11-07T10:20:30.000Z';
const FOLDER='inflation-causal-candidates-r1';
const meta=id=>INFLATION_CANDIDATES_7.find(row=>row.id===id);
const rows=(count=15,startYear=2025)=>Array.from({length:count},(_,i)=>({
  date:new Date(Date.UTC(startYear,0+i,1)).toISOString().slice(0,10),value:i===0?0:i+0.5,
}));
const docs=()=>({
  'eia-us-regular-gasoline-weekly.json':{
    schemaVersion:1,provider:'EIA',sourceVersion:'INFLATION_CAUSAL_CANDIDATE_EIA_REGULAR_R1',
    sourceStoredAt:STORED,selector:'EMM_EPMR_PTE_NUS_DPG',frequency:'WEEKLY',
    unit:'USD_PER_GALLON',observations:[
      {date:'2026-10-26',value:2.99,unit:'USD_PER_GALLON'},
      {date:'2026-11-02',value:3.01,unit:'USD_PER_GALLON'},
    ],
  },
  'treasury-mts-customs-duties.json':{
    schemaVersion:1,provider:'US_TREASURY_MTS',
    sourceVersion:'INFLATION_CAUSAL_CANDIDATE_TREASURY_MTS_R1',
    sourceStoredAt:STORED,lineCode:'405',classification:'Customs Duties',frequency:'MONTHLY',
    observations:[
      {date:'2026-08-31',period:'2026-08',netUsdDecimal:'13000000000.00',unit:'USD',
        valueKind:'MONTHLY_NET_CASH_RECEIPTS'},
      {date:'2026-09-30',period:'2026-09',netUsdDecimal:'-1200000.25',unit:'USD',
        valueKind:'MONTHLY_NET_CASH_RECEIPTS'},
      {date:'2026-10-31',period:'2026-10',netUsdDecimal:'0.00',unit:'USD',
        valueKind:'MONTHLY_NET_CASH_RECEIPTS'},
    ],
  },
  'bls-cpi-ppi3.json':{
    schemaVersion:1,provider:'BLS',sourceVersion:'INFLATION_CAUSAL_CANDIDATE_BLS3_R1',
    sourceStoredAt:STORED,frequency:'MONTHLY',series:{
      CUSR0000SEHA:rows(),CUSR0000SEHC01:rows(),WPSFD4:rows(),
    },
  },
  'census-m3-manufacturing-inventories.json':{
    schemaVersion:1,provider:'US_CENSUS_M3',
    sourceVersion:'INFLATION_CAUSAL_CANDIDATE_CENSUS_M3_R1',
    sourceStoredAt:STORED,selector:'MTM/TI',frequency:'MONTHLY',
    unit:'USD_MILLION_SA_NOMINAL',observations:[
      {date:'2026-08-01',value:100,unit:'USD_MILLION_SA_NOMINAL',
        selector:'MTM/TI',seasonallyAdjusted:true},
      {date:'2026-09-01',value:105,unit:'USD_MILLION_SA_NOMINAL',
        selector:'MTM/TI',seasonallyAdjusted:true},
    ],
  },
  'fed-g17-manufacturing-ip.json':{
    schemaVersion:1,provider:'FEDERAL_RESERVE_G17',
    sourceVersion:'INFLATION_CAUSAL_CANDIDATE_FED_G17_R1',
    sourceStoredAt:STORED,selector:'GMF',frequency:'MONTHLY',
    unit:'CURRENT_G17_INDEX_SA',observations:[
      {date:'1972-01-01',value:33.4},
      {date:'2026-09-01',value:100.1},
    ],
  },
});
const makeHome=(t,selected=docs())=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-infl7-readonly-'));
  t.after(()=>fs.rmSync(home,{recursive:true,force:true}));
  const directory=path.join(home,FOLDER);
  fs.mkdirSync(directory);
  for(const [file,content] of Object.entries(selected))
    fs.writeFileSync(path.join(directory,file),JSON.stringify(content));
  return {home,directory};
};

test('seven and only seven original candidate numbers and independent public key/route',()=>{
  assert.deepEqual(INFLATION_CANDIDATES_7_IDS,['2','16','22','23','24','28','29']);
  assert.equal(INFLATION_CANDIDATES_7_PUBLIC_KEY,'detail:inflation-causal-candidates-7:r1');
  assert.equal(INFLATION_CANDIDATES_7_PUBLIC_ROUTE,'/api/inflation-candidate-inputs');
  assert.notEqual(INFLATION_CANDIDATES_7_PUBLIC_KEY,'detail:inflation-causal-public-19:r1');
});

test('full seven-row preview is ready and strictly read-only',t=>{
  const {home}=makeHome(t);
  const result=previewInflationCandidates7(home,{now:NOW});
  assert.equal(result.status,'PASS_READONLY');
  assert.equal(result.ready,7);
  assert.equal(result.payload.status,'READY');
  assert.equal(result.payload.score,null);
  assert.equal(result.payload.schemaVersion,INFLATION_CANDIDATES_7_PUBLIC_SCHEMA);
  assert.deepEqual(Object.keys(result.missing),[]);
  for(const key of ['providerCalls','dbWrites','d1Writes','coreWrites','schedulerWrites'])
    assert.equal(result[key],0);
  validateInflationCandidates7Public(result.payload,{now:NOW});
  assert.equal(result.payload.indicators[0].value,3.01);
  assert.equal(result.payload.indicators[1].value,0);
  assert.equal(result.payload.indicators[1].previousValue,-1200000.25);
  assert.equal(result.payload.indicators[6].previousObservationDate,'1972-01-01');
  assert.ok(result.payload.indicators.every(row=>!('raw' in row)));
  assert.ok(result.payload.indicators.every(row=>row.availableAt===null));
});

test('four ready, three pending: no 0-as-missing or CPI/stock fabricated values',t=>{
  const selected=docs();
  selected['bls-cpi-ppi3.json'].series={WPSFD4:rows()};
  delete selected['census-m3-manufacturing-inventories.json'];
  const {home}=makeHome(t,selected),result=previewInflationCandidates7(home,{now:NOW});
  assert.equal(result.status,'PASS_READONLY');
  assert.equal(result.ready,4);
  assert.equal(result.payload.status,'PARTIAL');
  assert.deepEqual(Object.keys(result.missing),['22','23','28']);
  assert.deepEqual(result.payload.indicators.filter(row=>row.status==='PENDING').map(row=>row.id),
    ['22','23','28']);
  assert.equal(result.payload.indicators[1].value,0);
  for(const row of result.payload.indicators.filter(row=>row.status==='PENDING')){
    assert.equal(row.value,null);
    assert.equal(row.sourceStoredAt,null);
    assert.deepEqual(row.history,[]);
  }
});

test('one source with 15 points publishes only 13 latest points',()=>{
  const item=projectInflationCandidate7Row(meta('22'),docs()['bls-cpi-ppi3.json'],{now:NOW});
  assert.equal(item.history.length,13);
  assert.equal(item.history[0].date,'2025-03-01');
  assert.equal(item.history.at(-1).date,'2026-03-01');
  assert.equal(item.previousObservationDate,'2026-02-01');
  assert.equal(item.availableAt,null);
});

test('Treasury numeric source is netUsdDecimal, including an actual negative cash receipt',()=>{
  const source=docs()['treasury-mts-customs-duties.json'];
  source.observations.pop();
  const item=projectInflationCandidate7Row(meta('16'),source,{now:NOW});
  assert.equal(item.value,-1200000.25);
  assert.equal(item.previousValue,13000000000);
  const bad=docs()['treasury-mts-customs-duties.json'];
  bad.observations[1].netUsdDecimal='1e7';
  assert.throws(()=>projectInflationCandidate7Row(meta('16'),bad,{now:NOW}),
    /INFL7_TREASURY_MONEY_INVALID/);
});

test('old 1972 Fed history remains a valid observation, not a false future date',()=>{
  const item=projectInflationCandidate7Row(meta('29'),docs()['fed-g17-manufacturing-ip.json'],{now:NOW});
  assert.equal(item.previousObservationDate,'1972-01-01');
});

test('invalid source never turns into a scored or READY row',t=>{
  const selected=docs();
  selected['census-m3-manufacturing-inventories.json'].observations[0].seasonallyAdjusted=false;
  const {home}=makeHome(t,selected),result=previewInflationCandidates7(home,{now:NOW});
  assert.equal(result.ready,6);
  assert.equal(result.missing['28'],'INFL7_CENSUS_ROW_INVALID');
  assert.equal(result.payload.indicators[5].status,'PENDING');
  assert.equal(result.payload.score,null);
});

test('all source files absent returns PENDING without any synthetic payload',t=>{
  const {home}=makeHome(t,{}),result=previewInflationCandidates7(home,{now:NOW});
  assert.equal(result.status,'PENDING');
  assert.equal(result.ready,0);
  assert.equal(result.payload,null);
  assert.equal(Object.keys(result.missing).length,7);
});

test('symlink source file and wrong home are denied',t=>{
  const {home,directory}=makeHome(t,{});
  assert.throws(()=>previewInflationCandidates7('relative/path',{now:NOW}),/INFL7_PC_HOME_DENIED/);
  if(process.platform!=='win32'){
    const outside=path.join(home,'outside.json');
    fs.writeFileSync(outside,JSON.stringify(docs()['eia-us-regular-gasoline-weekly.json']));
    fs.symlinkSync(outside,path.join(directory,'eia-us-regular-gasoline-weekly.json'));
    const result=previewInflationCandidates7(home,{now:NOW});
    assert.equal(result.missing['2'],'INFL7_SOURCE_FILE_DENIED');
  }
});

test('unapproved stale/future sourceStoredAt is not relabeled as current',t=>{
  const selected=docs();
  selected['eia-us-regular-gasoline-weekly.json'].sourceStoredAt='2030-01-01T00:00:00.000Z';
  const {home}=makeHome(t,selected),result=previewInflationCandidates7(home,{now:NOW});
  assert.equal(result.missing['2'],'INFL7_SOURCE_PROVENANCE_INVALID');
  assert.equal(result.payload.indicators[0].status,'PENDING');
});

test('public validator rejects private/raw keys, invalid 0/NaN, and leakage in pending',t=>{
  const {home}=makeHome(t),payload=previewInflationCandidates7(home,{now:NOW}).payload;
  const altered=()=>structuredClone(payload);
  let bad=altered();bad.indicators[0].raw={providerKey:'secret'};
  assert.throws(()=>validateInflationCandidates7Public(bad,{now:NOW}),/INFL7_PUBLIC_ROW_INVALID/);
  bad=altered();bad.indicators[0].value=Number.NaN;
  assert.throws(()=>validateInflationCandidates7Public(bad,{now:NOW}),/INFL7_PUBLIC_READY_INVALID/);
  bad=altered();bad.indicators[0].status='PENDING';
  assert.throws(()=>validateInflationCandidates7Public(bad,{now:NOW}),/INFL7_PUBLIC_NONREADY_LEAK/);
  bad=altered();bad.rawHistory=['secret'];
  assert.throws(()=>validateInflationCandidates7Public(bad,{now:NOW}),/INFL7_PUBLIC_ENVELOPE_INVALID/);
  bad=altered();bad.indicators[0].history=rows(15,2024);
  assert.throws(()=>validateInflationCandidates7Public(bad,{now:NOW}),/INFL7_PUBLIC_ROW_INVALID/);
});

function readDb(record){
  return {prepare(sql){
    assert.match(sql,/^SELECT body,stored_at FROM market_public_snapshots_v1/);
    return {bind(key){assert.equal(key,INFLATION_CANDIDATES_7_PUBLIC_KEY);
      return {async first(){return record;}};}};
  }};
}
const savedRecord=(payload,at=NOW)=>({
  body:JSON.stringify({payload,projection:{status:'READY',sourceVersion:payload.sourceVersion,
    sourceStoredAt:payload.sourceStoredAt,builtAt:at}}),stored_at:at,
});

test('visitor GET reads only an existing D1 projection; HEAD is bodyless',async t=>{
  const {home}=makeHome(t),payload=previewInflationCandidates7(home,{now:NOW}).payload;
  const db=readDb(savedRecord(payload));
  const response=await readInflationCandidates7PublicResponse(
    new Request('https://zgmini.kr/api/inflation-candidate-inputs'),db,{now:NOW});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('x-robots-tag'),'noindex');
  assert.deepEqual(await response.json(),payload);
  const head=await readInflationCandidates7PublicResponse(
    new Request('https://zgmini.kr/api/inflation-candidate-inputs',{method:'HEAD'}),db,{now:NOW});
  assert.equal(head.status,200);
  assert.equal(await head.text(),'');
});

test('visitor query, write method, absent or corrupt snapshots are safely rejected',async t=>{
  const {home}=makeHome(t),payload=previewInflationCandidates7(home,{now:NOW}).payload;
  const url='https://zgmini.kr/api/inflation-candidate-inputs';
  const cases=[
    [new Request(url+'?provider=1'),readDb(null),400],
    [new Request(url,{method:'POST'}),readDb(null),405],
    [new Request(url),readDb(null),200],
    [new Request(url),readDb({...savedRecord(payload),stored_at:NOW-1}),503],
    [new Request(url),null,503],
  ];
  for(const [request,db,status] of cases){
    const response=await readInflationCandidates7PublicResponse(request,db,{now:NOW});
    assert.equal(response.status,status);
  }
});
