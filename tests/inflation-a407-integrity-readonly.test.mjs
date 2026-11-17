import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {inspectA407,secureDigest,verifyPitSnapshot}
  from '../scripts/pc-writer/inflation-a407-integrity-readonly.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');

test('A4-07: canonical fixed readback rejects traversal and escaping symlink',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'a407-secure-'));
 const outside=fs.mkdtempSync(path.join(os.tmpdir(),'a407-outside-'));
 try{
  fs.writeFileSync(path.join(home,'source.json'),'{"safe":true}');
  const result=secureDigest(home,'source.json');
  assert.equal(result.digest,sha('{"safe":true}'));
  assert.deepEqual(result.json,{safe:true});
  assert.throws(()=>secureDigest(home,'../secret.json'),/A407_PATH_DENIED/);
  assert.throws(()=>secureDigest(home,'/etc/passwd'),/A407_PATH_DENIED/);
  assert.throws(()=>secureDigest(home,'source.json',3),/A407_FILE_UNVERIFIED/);
  if(process.platform!=='win32'){
   fs.writeFileSync(path.join(outside,'secret.json'),'{"secret":"internal"}');
   fs.symlinkSync(path.join(outside,'secret.json'),path.join(home,'link.json'));
   assert.throws(()=>secureDigest(home,'link.json'),/A407_FILE_UNVERIFIED/);
   fs.symlinkSync(outside,path.join(home,'folder'),'dir');
   assert.throws(()=>secureDigest(home,'folder/secret.json'),/A407_FILE_UNVERIFIED/);
  }
 }finally{
  fs.rmSync(home,{recursive:true,force:true});
  fs.rmSync(outside,{recursive:true,force:true});
 }
});

test('A4-07: stored PIT snapshot and every chunk SHA must match original writer',()=>{
 const data=[{date:'2026-08-01',value:1},{date:'2026-09-01',value:2}];
 const payload=JSON.stringify(data),h=sha(payload),prov={authority:'FRED'};
 const stored='2026-11-01T00:00:00.000Z',dataset='CES0500000003';
 const snap=sha(JSON.stringify({schemaVersion:1,provider:'FRED',dataset,
   provenance:prov,chunks:[h]}));
 const row={snapshot_sha256:snap,retrieved_at:stored,
   history_mode:'INITIAL_RELEASE_ONLY',row_count:2,
   chunk_hashes_json:JSON.stringify([h]),provenance_json:JSON.stringify(prov)};
 const chunk={payload_json:payload,row_count:2};
 const mock={prepare(sql){return {get(){return sql.includes('api_history_snapshots_v1')?row:chunk}}}};
 assert.deepEqual(verifyPitSnapshot(mock,dataset,stored),
  {sha256:snap,proof:'PIT_SNAPSHOT_AND_CHUNKS_HASH_MATCHED',chunkCount:1});
 chunk.payload_json=payload+' ';
 assert.throws(()=>verifyPitSnapshot(mock,dataset,stored),/A407_PIT_CHUNK_HASH_MISMATCH/);
 chunk.payload_json=payload;
 row.snapshot_sha256='0'.repeat(64);
 assert.throws(()=>verifyPitSnapshot(mock,dataset,stored),/A407_PIT_SNAPSHOT_HASH_MISMATCH/);
});

test('A4-07: PIT hash verification accepts actual api-history-store writer plan',async()=>{
  const {buildInflationHistoryPlan}=await import('../worker/api-history-store.mjs');
  const stored='2026-11-17T11:05:00.000Z';
  const plans=await buildInflationHistoryPlan([{seriesId:'CES0500000003',
    status:'READY_INITIAL_RELEASE_HISTORY',historyMode:'INITIAL_RELEASE_ONLY',
    authority:'FRED',transport:'API',rows:[
      {observationDate:'2026-07-01',value:34.5,availableAt:'2026-08-01T00:00:00.000Z'},
      {observationDate:'2026-08-01',value:34.8,availableAt:'2026-09-01T00:00:00.000Z'}]
  }],{asOf:'2026-11-17',retrievedAt:stored});
  assert.equal(plans.length,1);
  const plan=plans[0];
  assert.equal(plan.chunks.length,1);
  const s={snapshot_sha256:plan.snapshotSha256,retrieved_at:plan.retrievedAt,
    history_mode:plan.historyMode,row_count:plan.rowCount,
    chunk_hashes_json:plan.chunkHashesJson,provenance_json:plan.provenanceJson};
  const find=plan.chunks.map(c=>[c.chunkSha256,{payload_json:c.payloadJson,row_count:c.rowCount}]);
  const byHash=new Map(find);
  const db={prepare(sql){return {get(...args){return sql.includes('api_history_snapshots_v1')?
    s:byHash.get(args[1]);}}}};
  assert.equal(verifyPitSnapshot(db,'CES0500000003',stored).sha256,plan.snapshotSha256);
  byHash.get(plan.chunks[0].chunkSha256).payload_json+=' ';
  assert.throws(()=>verifyPitSnapshot(db,'CES0500000003',stored),
    /A407_PIT_CHUNK_HASH_MISMATCH/);
});

test('A4-07: no private raw cannot be counted as audited; zero operational writes',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'a407-empty-'));
 try{
  const report=inspectA407(home);
  assert.notEqual(report.status,'PASS');
  assert.equal(report.originalVerified,0);
  assert.equal(report.candidateVerified,0);
  for(const key of ['providerCalls','d1Writes','sqliteWrites','operationalWrites',
    'taskChanges','sourceWrites'])assert.equal(report[key],0);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});

test('A4-07: real parsers + SQLite WAL audit stored 19+6, 2 checkpoints, and detect tampered PIT',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'a407-real-'));
 const stored='2026-11-01T00:00:00.000Z';
 const rows=[{date:'2026-08-01',value:100},{date:'2026-09-01',value:101}];
 const put=(name,body)=>{
  const p=path.join(home,name);
  fs.mkdirSync(path.dirname(p),{recursive:true});
  fs.writeFileSync(p,typeof body==='string'?body:JSON.stringify(body));
  return p;
 };
 let db=null;
 try{
  const bls=['WPU1017','WPU102502','WPU081','WPU061','WPU012','WPU0221',
    'WPU029','WPUID61'];
  put('inflation-causal-r1/bls-ppi8.json',{schemaVersion:1,provider:'BLS',
   sourceVersion:'BLS_API_V2_PPI_BATCH8_R1',sourceStoredAt:stored,ids:bls,
   series:Object.fromEntries(bls.map(id=>[id,rows]))});
  put('inflation-causal-r1/gas-dhhngsp.json',{schemaVersion:1,
   sourceVersion:'INFLATION_CAUSAL_GAS_ELECTRIC_R1',source:'FRED_DHHNGSP',
   sourceStoredAt:stored,observations:rows});
  put('inflation-causal-r1/electricity-industrial-eia.json',{schemaVersion:1,
   sourceVersion:'INFLATION_CAUSAL_GAS_ELECTRIC_R1',
   source:'EIA_INDUSTRIAL_ELECTRICITY_US',sourceStoredAt:stored,
   facets:{stateid:'US',sectorid:'IND'},
   observations:[{month:'2026-08',value:15},{month:'2026-09',value:16}]});
  const sce='a'.repeat(64);
  put('inflation-causal/sce31/latest.json',{status:'STORED',
   source:'NY_FED_SCE_ONE_YEAR_MEDIAN',downloadSha256:sce,
   fetchedAt:stored,count:2,attributionRequired:true,disclaimerRequired:true});
  put('inflation-causal/sce31/'+sce+'.json',{
   source:'NY_FED_SCE_ONE_YEAR_MEDIAN',historyMode:'LATEST',observations:rows});
  put('supply-r10/gscpi.json',{source:'NY_FED_GSCPI',
   rows:[{observationDate:'2026-08-01',value:1},
    {observationDate:'2026-09-01',value:2}]});
  put('supply-r10/gscpi.xlsx','fixture archived binary');
  put('supply-r10/DPCERA3M086SBEA.json',rows);
  put('supply-r10/DPCERA3M086SBEA.csv','fixture parsed source bytes');
  put('supply-r10/extra-manifest.json',[
   {id:'gscpi',status:'STORED',storedAt:stored},
   {id:'DPCERA3M086SBEA',status:'STORED',storedAt:stored}]);
  put('inflation-causal-r1/recurring-checkpoint-r1.json',{
   schema:'ZGMINI_INFL19_RECURRING_R1',processed:{gas:'2026-11-01'},attempted:{}});
  const dbPath=path.join(home,'storage','core.sqlite');
  fs.mkdirSync(path.dirname(dbPath));
  db=new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode=WAL');
  db.exec('PRAGMA wal_autocheckpoint=0');
  db.exec('CREATE TABLE market_input_batches_v1(batch_key TEXT,body TEXT,stored_at INTEGER);'+
   'CREATE TABLE api_history_snapshots_v1(provider TEXT,dataset TEXT,'+
   'history_mode TEXT,retrieved_at TEXT,row_count INTEGER,snapshot_sha256 TEXT,'+
   'chunk_hashes_json TEXT,provenance_json TEXT);'+
   'CREATE TABLE api_history_chunks_v1(provider TEXT,dataset TEXT,'+
   'chunk_sha256 TEXT,payload_json TEXT,row_count INTEGER);');
  db.prepare('INSERT INTO market_input_batches_v1 VALUES(?,?,?)').run(
   'macro:fixture',JSON.stringify({series:{MCOILWTICO:rows,DTWEXBGS:rows}}),
   Date.parse(stored));
  const pitRows=rows.map(x=>({...x,availableAt:'2026-10-01T00:00:00.000Z'}));
  for(const dataset of ['MCOILWTICO','CES0500000003','ECIALLCIV',
    'PRS85006111','IREXFUELS']){
    const payload=JSON.stringify(pitRows),chunk=sha(payload),prov={authority:'FRED'};
    const snap=sha(JSON.stringify({schemaVersion:1,provider:'FRED',
      dataset,provenance:prov,chunks:[chunk]}));
    db.prepare('INSERT INTO api_history_snapshots_v1 VALUES(?,?,?,?,?,?,?,?)').run(
     'FRED',dataset,'INITIAL_RELEASE_ONLY',stored,2,snap,
     JSON.stringify([chunk]),JSON.stringify(prov));
    db.prepare('INSERT INTO api_history_chunks_v1 VALUES(?,?,?,?,?)').run(
     'FRED',dataset,chunk,payload,2);
  }
  put('inflation-causal-candidates-r1/eia-us-regular-gasoline-weekly.json',{
   schemaVersion:1,provider:'EIA',
   sourceVersion:'INFLATION_CAUSAL_CANDIDATE_EIA_REGULAR_R1',
   sourceStoredAt:stored,selector:'EMM_EPMR_PTE_NUS_DPG',unit:'USD_PER_GALLON',
   frequency:'WEEKLY',observations:[
    {date:'2026-09-07',value:3.2,unit:'USD_PER_GALLON'},
    {date:'2026-09-14',value:3.3,unit:'USD_PER_GALLON'}]});
  put('inflation-causal-candidates-r1/treasury-mts-customs-duties.json',{
   schemaVersion:1,provider:'US_TREASURY_MTS',
   sourceVersion:'INFLATION_CAUSAL_CANDIDATE_TREASURY_MTS_R1',
   sourceStoredAt:stored,lineCode:'405',classification:'Customs Duties',
   frequency:'MONTHLY',observations:[
    {date:'2026-08-31',period:'2026-08',unit:'USD',
      valueKind:'MONTHLY_NET_CASH_RECEIPTS',netUsdDecimal:'100.00'},
    {date:'2026-09-30',period:'2026-09',unit:'USD',
      valueKind:'MONTHLY_NET_CASH_RECEIPTS',netUsdDecimal:'101.00'}]});
  put('inflation-causal-candidates-r1/bls-cpi-ppi3.json',{
   schemaVersion:1,provider:'BLS',
   sourceVersion:'INFLATION_CAUSAL_CANDIDATE_BLS3_R1',
   sourceStoredAt:stored,frequency:'MONTHLY',
   series:{WPSFD4:rows,CUSR0000SEHA:rows,CUSR0000SEHC01:rows}});
  put('inflation-causal-candidates-r1/fed-g17-manufacturing-ip.json',{
   schemaVersion:1,provider:'FEDERAL_RESERVE_G17',
   sourceVersion:'INFLATION_CAUSAL_CANDIDATE_FED_G17_R1',
   sourceStoredAt:stored,selector:'GMF',frequency:'MONTHLY',
   unit:'CURRENT_G17_INDEX_SA',observations:rows});
  put('inflation-causal-candidates-r1/core-attempts-r1.json',{
   schema:'ZGMINI_INFLATION_CANDIDATE_CORE_R1',processed:{},attempted:{}});
  const dbHashBefore=sha(fs.readFileSync(dbPath));
  const first=inspectA407(home);
  assert.equal(first.status,'PASS',JSON.stringify(first));
  assert.equal(first.originalVerified,19);
  assert.equal(first.candidateVerified,6);
  assert.equal(first.census,'MISSING');
  // CPI #22 and OER #23 share the PPI #24 BLS file. A valid SHA of that
  // file must not prove #22 exists if its series was removed after storage.
  const sharedBls=path.join(home,'inflation-causal-candidates-r1','bls-cpi-ppi3.json');
  const sharedBefore=fs.readFileSync(sharedBls);
  const sharedDocument=JSON.parse(sharedBefore.toString('utf8'));
  delete sharedDocument.series.CUSR0000SEHA;
  fs.writeFileSync(sharedBls,JSON.stringify(sharedDocument));
  const missingCpi=inspectA407(home);
  assert.equal(missingCpi.status,'PARTIAL');
  assert.equal(missingCpi.code,'A407_CANDIDATE_CONTENT_UNVERIFIED');
  assert.equal(missingCpi.candidateVerified,0);
  fs.writeFileSync(sharedBls,sharedBefore);
  assert.equal(first.original.length,19);
  assert.equal(new Set(first.original.map(x=>x.id)).size,19);
  for(const id of ['21','26']){
    const source=first.original.find(x=>x.id===id);
    assert.match(source.archiveSha256,/^[a-f0-9]{64}$/);
    assert.match(source.sha256,/^[a-f0-9]{64}$/);
  }
  assert.match(first.original.find(x=>x.id==='31').metadataSha256,/^[a-f0-9]{64}$/);
  assert.equal(first.original.find(x=>x.id==='31').archiveRefSha256,sce);
  assert.equal(first.checkpoints.inflation19.sha256.length,64);
  assert.equal(first.checkpoints.candidates7.sha256.length,64);
  for(const key of ['providerCalls','d1Writes','sqliteWrites','operationalWrites',
    'taskChanges','sourceWrites'])assert.equal(first[key],0);
  assert.equal(sha(fs.readFileSync(dbPath)),dbHashBefore);
  // A valid JSON row with changed bytes must fail SHA verification. A4-01
  // accepts the row shape, but A4-07 must detect its corrupt stored chunk.
  const original=db.prepare("SELECT payload_json FROM api_history_chunks_v1 WHERE dataset='CES0500000003'").get();
  db.prepare("UPDATE api_history_chunks_v1 SET payload_json=? WHERE dataset='CES0500000003'")
    .run(original.payload_json+' ');
  const second=inspectA407(home);
  assert.equal(second.status,'PARTIAL');
  assert.equal(second.code,'A407_PIT_CHUNK_HASH_MISMATCH');
 }finally{
  try{db?.close()}catch{}
  fs.rmSync(home,{recursive:true,force:true});
 }
});
