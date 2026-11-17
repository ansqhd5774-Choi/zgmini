import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {INFLATION_CAUSAL_19_IDS} from '../lib/inflation-causal-public-catalog.mjs';
import {INFLATION_CANDIDATES_7_IDS} from '../lib/inflation-causal-candidates-public-7-catalog.mjs';
import {A401_EXPECTED_COUNT,A401_EXISTING_FOUR,evaluateA401Baseline23,
  requireExistingWalSidecars,runA401Baseline23}
  from '../scripts/pc-writer/inflation-a401-baseline23-readonly.mjs';

const valid=(id)=>({id,status:'READY',observationDate:'2026-09-01',
  sourceStoredAt:'2026-11-16T10:00:00.000Z',value:0});
const fixtures=()=>({
  original:{status:'PASS_READONLY',payload:{indicators:INFLATION_CAUSAL_19_IDS.map(valid)}},
  additional:{status:'PASS_READONLY',payload:{indicators:INFLATION_CANDIDATES_7_IDS.map(id=>
    ['22','23','28'].includes(id)?{id,status:'PENDING'}:valid(id))}}
});

test('A4-01: fixed 19 originals + exactly four pre-existing candidates are 23 distinct inputs',()=>{
 const args=fixtures(),result=evaluateA401Baseline23(args);
 assert.equal(INFLATION_CAUSAL_19_IDS.length,19);
 assert.deepEqual(A401_EXISTING_FOUR,['2','16','24','29']);
 assert.equal(A401_EXPECTED_COUNT,23);
 assert.equal(result.status,'PASS');
 assert.equal(result.code,'W01_A401_PRIVATE_SOURCE_23_VALID');
 assert.equal(result.verified,23);
 assert.equal(result.originalReady,19);
 assert.equal(result.additionalReady,4);
 assert.deepEqual(result.additional.map(x=>x.id),['2','16','24','29']);
 assert.deepEqual([...new Set([...result.original.map(x=>x.id),
   ...result.additional.map(x=>x.id)])].length,23);
 assert.equal(result.providerCalls,0);
 assert.equal(result.sqliteWrites,0);
 assert.equal(result.d1Writes,0);
 assert.equal(result.sourceWrites,0);
 assert.equal(result.taskChanges,0);
 assert.equal(Object.hasOwn(result,'raw'),false);
});

test('A4-01: missing raw-backed original is PARTIAL, not fake pass',()=>{
 const args=fixtures();
 args.original.payload.indicators[7].status='PENDING';
 const result=evaluateA401Baseline23(args);
 assert.equal(result.status,'PARTIAL');assert.equal(result.verified,22);
 assert.equal(result.original[7].status,'UNVERIFIED');
});

test('A4-01: four pre-existing source entries all required, excluded #22/#23/#28 stay irrelevant',()=>{
 const args=fixtures();
 args.additional.payload.indicators.find(x=>x.id==='29').status='PENDING';
 assert.equal(evaluateA401Baseline23(args).status,'PARTIAL');
 args.additional.payload.indicators.find(x=>x.id==='29').status='READY';
 assert.equal(evaluateA401Baseline23(args).status,'PASS');
});

test('A4-01: duplicated, missing, or foreign catalog rows are STOP',()=>{
 const args=fixtures();
 args.original.payload.indicators[0].id='3';
 assert.equal(evaluateA401Baseline23(args).code,'W01_A401_SOURCE_CATALOG_MISMATCH');
 const b=fixtures();
 b.additional.payload.indicators[0].id='999';
 assert.equal(evaluateA401Baseline23(b).status,'STOP');
 const c=fixtures();
 c.original.payload.indicators.pop();
 assert.equal(evaluateA401Baseline23(c).status,'STOP');
});

test('A4-01: zero is a valid observed value but invalid date or missing stored timestamp is not',()=>{
 const args=fixtures();
 assert.equal(evaluateA401Baseline23(args).status,'PASS');
 args.original.payload.indicators[0].sourceStoredAt=null;
 assert.equal(evaluateA401Baseline23(args).status,'PARTIAL');
 args.original.payload.indicators[0].sourceStoredAt='2026-11-16T10:00:00.000Z';
 args.original.payload.indicators[0].value=null;
 assert.equal(evaluateA401Baseline23(args).status,'PARTIAL');
 args.original.payload.indicators[0].value=0;
 args.original.payload.indicators[0].observationDate='UNVERIFIED';
 assert.equal(evaluateA401Baseline23(args).status,'PARTIAL');
});

test('A4-01: existing SQLite WAL+SHM required before readOnly open',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'a401-sidecars-'));
 try {
  const storage=path.join(dir,'storage');fs.mkdirSync(storage);
  const file=path.join(storage,'core.sqlite');
  fs.writeFileSync(file,Buffer.concat([Buffer.from('SQLite format 3\0'),Buffer.alloc(180)]));
  assert.throws(()=>requireExistingWalSidecars(dir,file),/W01_A401_DB_SIDECAR_UNVERIFIED/);
  fs.writeFileSync(file+'-wal',Buffer.alloc(0));
  fs.writeFileSync(file+'-shm',Buffer.alloc(0));
  assert.equal(requireExistingWalSidecars(dir,file),true);
  assert.throws(()=>requireExistingWalSidecars(dir,path.join(storage,'other.sqlite')),
    /W01_A401_DB_PATH_DENIED/);
  fs.rmSync(file+'-shm');
  assert.throws(()=>requireExistingWalSidecars(dir,file),/W01_A401_DB_SIDECAR_UNVERIFIED/);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('A4-01: no private PC data produces no false PASS, without opening a DB',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'a401-no-raw-'));
 try {
  const report=runA401Baseline23(dir);
  assert.notEqual(report.status,'PASS');
  assert.equal(report.verified,0);
  assert.equal(report.providerCalls,0);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});


test('A4-01: full private-source parser reads 19 stored inputs and four existing snapshots',async()=>{
 // REAL reader functions, isolated fixture files, actual SQLite WAL tables.
 const {DatabaseSync}=await import('node:sqlite');
 const {createHash}=await import('node:crypto');
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'a401-private-end-to-end-'));
 const at='2026-11-01T00:00:00.000Z';
 const rows=[{date:'2026-08-01',value:100},{date:'2026-09-01',value:101}];
 const sha=value=>createHash('sha256').update(value).digest('hex');
 const save=(relative,value)=>{
  const file=path.join(home,relative);
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value));
  return file;
 };
 let db=null;
 try {
  const bls=['WPU1017','WPU102502','WPU081','WPU061',
   'WPU012','WPU0221','WPU029','WPUID61'];
  save('inflation-causal-r1/bls-ppi8.json',{
   schemaVersion:1,provider:'BLS',sourceVersion:'BLS_API_V2_PPI_BATCH8_R1',
   sourceStoredAt:at,ids:bls,series:Object.fromEntries(bls.map(id=>[id,rows]))
  });
  save('inflation-causal-r1/gas-dhhngsp.json',{
   schemaVersion:1,sourceVersion:'INFLATION_CAUSAL_GAS_ELECTRIC_R1',
   source:'FRED_DHHNGSP',sourceStoredAt:at,observations:rows
  });
  save('inflation-causal-r1/electricity-industrial-eia.json',{
   schemaVersion:1,sourceVersion:'INFLATION_CAUSAL_GAS_ELECTRIC_R1',
   source:'EIA_INDUSTRIAL_ELECTRICITY_US',facets:{stateid:'US',sectorid:'IND'},
   sourceStoredAt:at,observations:[{month:'2026-08',value:15},{month:'2026-09',value:16}]
  });
  const sceHash='a'.repeat(64);
  save('inflation-causal/sce31/latest.json',{
   status:'STORED',source:'NY_FED_SCE_ONE_YEAR_MEDIAN',
   downloadSha256:sceHash,fetchedAt:at,count:2,
   attributionRequired:true,disclaimerRequired:true
  });
  save('inflation-causal/sce31/'+sceHash+'.json',{
   source:'NY_FED_SCE_ONE_YEAR_MEDIAN',observations:rows,historyMode:'LATEST'
  });
  save('supply-r10/gscpi.json',{source:'NY_FED_GSCPI',
   rows:[{observationDate:'2026-08-01',value:1},
    {observationDate:'2026-09-01',value:2}]});
  save('supply-r10/gscpi.xlsx','isolated GSCPI archived bytes');
  save('supply-r10/DPCERA3M086SBEA.json',rows);
  save('supply-r10/DPCERA3M086SBEA.csv','isolated PCE archived bytes');
  save('supply-r10/extra-manifest.json',[
   {id:'gscpi',status:'STORED',storedAt:at},
   {id:'DPCERA3M086SBEA',status:'STORED',storedAt:at}
  ]);
  const storage=path.join(home,'storage');
  fs.mkdirSync(storage);
  const dbPath=path.join(storage,'core.sqlite');
  db=new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode=WAL');
  db.exec('PRAGMA wal_autocheckpoint=0');
  db.exec('CREATE TABLE market_input_batches_v1 (batch_key TEXT,body TEXT,stored_at INTEGER);'+
    'CREATE TABLE api_history_snapshots_v1 (provider TEXT,dataset TEXT,history_mode TEXT,'+
    'retrieved_at TEXT,chunk_hashes_json TEXT,row_count INTEGER);'+
    'CREATE TABLE api_history_chunks_v1 (provider TEXT,dataset TEXT,chunk_sha256 TEXT,'+
    'payload_json TEXT,row_count INTEGER);');
  db.prepare('INSERT INTO market_input_batches_v1 VALUES (?,?,?)').run(
   'macro:fixture',JSON.stringify({series:{MCOILWTICO:rows,DTWEXBGS:rows}}),
   Date.parse(at));
  for(const dataset of ['MCOILWTICO','CES0500000003','ECIALLCIV',
   'PRS85006111','IREXFUELS']){
   const chunk=sha(dataset);
   db.prepare('INSERT INTO api_history_snapshots_v1 VALUES (?,?,?,?,?,?)').run(
    'FRED',dataset,'INITIAL_RELEASE_ONLY',at,JSON.stringify([chunk]),2);
   const pit=rows.map(row=>({...row,availableAt:'2026-10-01T00:00:00.000Z'}));
   db.prepare('INSERT INTO api_history_chunks_v1 VALUES (?,?,?,?,?)').run(
    'FRED',dataset,chunk,JSON.stringify(pit),2);
  }
  // Keep writer connection alive so -wal/-shm already exist on readOnly open.
  assert.equal(requireExistingWalSidecars(home,dbPath),true);

  save('inflation-causal-candidates-r1/eia-us-regular-gasoline-weekly.json',{
   schemaVersion:1,provider:'EIA',
   sourceVersion:'INFLATION_CAUSAL_CANDIDATE_EIA_REGULAR_R1',
   sourceStoredAt:at,selector:'EMM_EPMR_PTE_NUS_DPG',unit:'USD_PER_GALLON',
   frequency:'WEEKLY',observations:[
    {date:'2026-09-07',value:3.2,unit:'USD_PER_GALLON'},
    {date:'2026-09-14',value:3.3,unit:'USD_PER_GALLON'}
   ]
  });
  save('inflation-causal-candidates-r1/treasury-mts-customs-duties.json',{
   schemaVersion:1,provider:'US_TREASURY_MTS',
   sourceVersion:'INFLATION_CAUSAL_CANDIDATE_TREASURY_MTS_R1',
   sourceStoredAt:at,lineCode:'405',classification:'Customs Duties',
   frequency:'MONTHLY',observations:[
    {date:'2026-08-31',period:'2026-08',unit:'USD',
     valueKind:'MONTHLY_NET_CASH_RECEIPTS',netUsdDecimal:'100.00'},
    {date:'2026-09-30',period:'2026-09',unit:'USD',
     valueKind:'MONTHLY_NET_CASH_RECEIPTS',netUsdDecimal:'101.00'}
   ]
  });
  save('inflation-causal-candidates-r1/bls-cpi-ppi3.json',{
   schemaVersion:1,provider:'BLS',
   sourceVersion:'INFLATION_CAUSAL_CANDIDATE_BLS3_R1',
   sourceStoredAt:at,frequency:'MONTHLY',
   series:{WPSFD4:rows,CUSR0000SEHA:rows,CUSR0000SEHC01:rows}
  });
  save('inflation-causal-candidates-r1/fed-g17-manufacturing-ip.json',{
   schemaVersion:1,provider:'FEDERAL_RESERVE_G17',
   sourceVersion:'INFLATION_CAUSAL_CANDIDATE_FED_G17_R1',
   sourceStoredAt:at,selector:'GMF',frequency:'MONTHLY',
   unit:'CURRENT_G17_INDEX_SA',observations:rows
  });
  const dbHashBefore=sha(fs.readFileSync(dbPath));
  const report=runA401Baseline23(home);
  assert.equal(report.status,'PASS',JSON.stringify(report));
  assert.equal(report.verified,23);
  assert.equal(report.originalReady,19);
  assert.equal(report.additionalReady,4);
  assert.equal(report.providerCalls,0);
  assert.equal(report.sqliteWrites,0);
  assert.equal(report.d1Writes,0);
  assert.equal(report.taskChanges,0);
  assert.equal(sha(fs.readFileSync(dbPath)),dbHashBefore);
  assert.deepEqual(report.original.map(x=>x.id),INFLATION_CAUSAL_19_IDS);
  assert.deepEqual(report.additional.map(x=>x.id),A401_EXISTING_FOUR);
 } finally {
  try{db?.close();}catch{}
  fs.rmSync(home,{recursive:true,force:true});
 }
});
