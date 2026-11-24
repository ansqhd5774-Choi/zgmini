// Offline-only contracts for the W05 three-key reusable PC publication adapter.
// These tests never connect to a live Provider, SQLite instance or D1.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {saveBeaUnitNipaArchive,beaUnitNipaArchivePaths}
 from '../scripts/pc-writer/EARNINGS_BEA_UNIT_NIPA_ARCHIVE_R1.mjs';
import {
 W05_SAVED_KEYS,W05_SAVED_IDS,latestStoredBeaNipaSha,
 prepareW05StoredSidecar,publishW05StoredSidecar,
} from '../scripts/pc-writer/w05-stored-sidecar-publication-r1.mjs';

const NOW=Date.parse('2026-11-24T01:00:00.000Z');
const VERSION='a'.repeat(64);
const SOURCE=NOW-10_000;
const payload=(id='bea')=>{
 const common={status:'READY',sourceVersion:VERSION,sourceStoredAt:SOURCE};
 if(id==='bea')return {...common,indicator:{
  unit:'USD_PER_REAL_GVA_UNIT',observationPeriodEnd:'2026-06-30',value:0.25,
  history:['2025-06-30','2025-09-30','2025-12-31','2026-03-31','2026-06-30']
   .map((date,i)=>({date,value:[0.216,0.219,0.222,0.231,0.25][i]}))
 }};
 if(id==='qfr')return {...common,rows:[{
  indicatorId:'census_qfr_manufacturing_after_tax_margin_nsa',
  unit:'PERCENT',observationPeriod:'2026-Q2',value:6,
  history:['2025-Q2','2025-Q3','2025-Q4','2026-Q1','2026-Q2']
   .map((period,i)=>({period,value:i+2))
 }]};
 if(id==='wpsfd42')return {...common,rows:[
  {indicatorId:'bls_ppi_services_index',unit:'INDEX',
   observationPeriod:'2026-10',value:158.076,
   history:Array.from({length:13},(_,i)=>({
    period:'month-'+i,value:i===12?158.076:i+140
   }))},
  {indicatorId:'bls_ppi_services_yoy_sa',unit:'PERCENT',
   observationPeriod:'2026-10',value:4.973901956357141,
   history:Array.from({length:13},(_,i)=>({
    period:'month-'+i,value:i<3?null:i===12?4.973901956357141:i/10
   }))}
 ]};
 throw Error('unrecognized fixture id');
};
const prepared=({id}={})=>({status:'READY',payload:payload(id)});

function fakeRemote({result='READBACK_VERIFIED',badReadback=false,missing=false,
 corruptHistoricalPoint=false}={}){
 let row=null,writes=0,queries=0,adapters=0;
 const remote={
  adapter(db,opts){
   assert.equal(db,'d1-core');
   assert.deepEqual(opts,{allowWrites:true});adapters++;
   return {marker:'approved-existing-d1-adapter'};
  },
  async query(db,sql,args){
   assert.equal(db,'d1-core');
   assert.equal(sql,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?');
   assert.equal(args.length,1);queries++;
   return {results:missing?[]:[row].filter(Boolean)};
  },
 };
 const factory=(id,db)=>{
  assert.equal(db.marker,'approved-existing-d1-adapter');
  assert.ok(W05_SAVED_IDS.includes(id));
  return {async write(p,{storedAt}){
   if(result==='READBACK_VERIFIED')writes++;
   const stored=structuredClone(p);
   if(corruptHistoricalPoint){
    const first=id==='bea'?stored.indicator:stored.rows[0];
    first.history[0].value=927348.5;
   }
   row={body:JSON.stringify({payload:stored,projection:{
    status:'READY',sourceVersion:p.sourceVersion,sourceStoredAt:p.sourceStoredAt,
    builtAt:badReadback?storedAt+1:result==='ALREADY_STORED'?storedAt-1000:storedAt,
   }}),stored_at:result==='ALREADY_STORED'?storedAt-1000:storedAt};
   return {status:result,key:W05_SAVED_KEYS[id],storedAt:row.stored_at};
  }};
 };
 return {remote,factory,stats:()=>({writes,queries,adapters})};
}

test('exact three independent informational sidecar keys, never core market or scored keys',()=>{
 assert.deepEqual(W05_SAVED_IDS,['wpsfd42','qfr','bea']);
 assert.deepEqual(Object.values(W05_SAVED_KEYS),[
  'detail:earnings-recession-indicators:bls-wpsfd42:v1',
  'detail:earnings-recession-indicators:census-qfr-mfg-margin:v1',
  'detail:earnings-bea-unit-profit:v1',
 ]);
 assert.equal(new Set(Object.values(W05_SAVED_KEYS)).size,3);
});

test('source directory absent is SKIPPED without creating PC root, SQLite or archive',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'w05-saved-missing-'));
 const absent=path.join(root,'not-present');
 try{
  assert.equal(latestStoredBeaNipaSha(absent,{now:NOW}),null);
  for(const id of W05_SAVED_IDS)
   assert.equal(prepareW05StoredSidecar({id,pcHome:absent,now:NOW}).status,
    'SKIPPED_SOURCE_NOT_STORED');
  assert.equal(fs.existsSync(absent),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('stored native BEA archive selects newer readback, preserves source provenance and fails on corruption',()=>{
 const pcBase=fs.mkdtempSync(path.join(os.tmpdir(),'w05-stored-bea-'));
 const record=value=>Buffer.from(JSON.stringify({BEAAPI:{Results:{Data:
  [['2025Q2','0.216'],['2025Q3','0.219'],['2025Q4','0.222'],
   ['2026Q1','0.231'],['2026Q2',value]]
  .map(([TimePeriod,DataValue])=>({
   TableName:'T11500',SeriesCode:'A463RD',LineNumber:'7',
   TimePeriod,DataValue,CL_UNIT:'Level',UNIT_MULT:'0',
  }))
 }}}),'utf8');
 const at=Date.parse('2026-11-23T12:00:00.000Z');
 try{
  const first=saveBeaUnitNipaArchive({
   pcBase,rawBytes:record('0.250'),sourceStoredAt:at});
  const second=saveBeaUnitNipaArchive({
   pcBase,rawBytes:record('0.251'),sourceStoredAt:at+1000});
  assert.notEqual(first.sourceVersion,second.sourceVersion);
  assert.equal(latestStoredBeaNipaSha(pcBase,{now:NOW}),second.sourceVersion);
  const ready=prepareW05StoredSidecar({id:'bea',pcHome:pcBase,now:NOW});
  assert.equal(ready.status,'READY');
  assert.equal(ready.payload.sourceVersion,second.sourceVersion);
  assert.equal(ready.payload.indicator.value,0.251);
  assert.equal(ready.payload.indicator.transport,'BEA_API_JSON');
  const files=beaUnitNipaArchivePaths({pcBase,sourceSha:first.sourceVersion});
  const original=fs.readFileSync(files.meta);
  fs.writeFileSync(files.meta,Buffer.from('{"corrupt":true}'));
  assert.throws(()=>latestStoredBeaNipaSha(pcBase,{now:NOW}),
   /BEA_UNIT_NIPA_ARCHIVE_METADATA_MISMATCH/,
   'one corrupt candidate must not be silently skipped');
  fs.writeFileSync(files.meta,original);
  assert.equal(latestStoredBeaNipaSha(pcBase,{now:NOW}),second.sourceVersion);
 }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('no source or stale source never opens a write-capable D1 adapter',async()=>{
 const f=fakeRemote();
 for(const status of ['SKIPPED_SOURCE_NOT_STORED','SKIPPED_SOURCE_STALE']){
  const output=await publishW05StoredSidecar({
   id:'bea',pcHome:'never-opened',coreDb:'d1-core',remote:f.remote,now:NOW,
   prepare:()=>({status}),makeWriter:f.factory,
  });
  assert.equal(output.status,status);
  assert.equal(output.d1Writes,0);
 }
 assert.deepEqual(f.stats(),{writes:0,queries:0,adapters:0});
});

test('each sidecar reuses the exact D1 key and independent verified readback',async()=>{
 for(const id of W05_SAVED_IDS){
  const f=fakeRemote();
  const result=await publishW05StoredSidecar({
   id,pcHome:'fixture',coreDb:'d1-core',remote:f.remote,now:NOW,
   prepare:prepared,makeWriter:f.factory,
  });
  assert.equal(result.status,'READBACK_VERIFIED');
  assert.equal(result.key,W05_SAVED_KEYS[id]);
  assert.equal(result.sourceVersion,VERSION);
  assert.equal(result.sourceStoredAt,SOURCE);
  assert.equal(result.publishedAt,NOW);
  assert.equal(result.d1Writes,1);
  assert.equal(result.providerCalls,0);
  assert.equal(result.sqliteWrites,0);
  assert.equal(result.schedulerWrites,0);
  assert.equal(result.historyParityVerified,true);
  assert.equal(result.historyPointsVerified,id==='wpsfd42'?26:5);
  assert.match(result.historySha256,/^[a-f0-9]{64}$/);
  assert.deepEqual(f.stats(),{writes:1,queries:1,adapters:1});
 }
});

test('ALREADY_STORED preserves prior published timestamp and reports zero D1 writes',async()=>{
 const f=fakeRemote({result:'ALREADY_STORED'});
 const result=await publishW05StoredSidecar({
  id:'qfr',pcHome:'fixture',coreDb:'d1-core',remote:f.remote,now:NOW,
  prepare:prepared,makeWriter:f.factory,
 });
 assert.equal(result.status,'ALREADY_STORED');
 assert.equal(result.publishedAt,NOW-1000);
 assert.equal(result.d1Writes,0);
 assert.equal(result.historyParityVerified,true);
 assert.equal(result.historyPointsVerified,5);
 assert.deepEqual(f.stats(),{writes:0,queries:1,adapters:1});
});

test('incorrect or missing D1 readback fails closed without retrying the write',async()=>{
 for(const opts of [{badReadback:true},{missing:true}]){
  const f=fakeRemote(opts);
  await assert.rejects(publishW05StoredSidecar({
   id:'wpsfd42',pcHome:'fixture',coreDb:'d1-core',remote:f.remote,now:NOW,
   prepare:prepared,makeWriter:f.factory,
  }),/W05_SAVED_REMOTE_READBACK_(INVALID|MISSING)/);
  assert.equal(f.stats().writes,1,'no automatic retry after an uncertain D1 effect');
 }
});

test('invalid sidecar, clock, database or unverified prepared source fails before D1 writes',async()=>{
 const f=fakeRemote();
 await assert.rejects(publishW05StoredSidecar({
  id:'market',pcHome:'fixture',coreDb:'d1-core',remote:f.remote,now:NOW,
  prepare:prepared,makeWriter:f.factory,
 }),/W05_SAVED_KEY_DENIED/);
 await assert.rejects(publishW05StoredSidecar({
  id:'bea',pcHome:'fixture',coreDb:'d1-core',remote:f.remote,now:-5,
  prepare:prepared,makeWriter:f.factory,
 }),/W05_SAVED_PUBLICATION_ARGUMENTS_INVALID/);
 await assert.rejects(publishW05StoredSidecar({
  id:'bea',pcHome:'fixture',coreDb:'d1-core',remote:f.remote,now:NOW,
  prepare:()=>({status:'READY',payload:{...payload(),sourceVersion:'not-a-hash'}}),
  makeWriter:f.factory,
 }),/W05_SAVED_PREVIEW_INVALID/);
 assert.deepEqual(f.stats(),{writes:0,queries:0,adapters:0});
});

test('same hash but altered D1 historical values fails without retrying',async()=>{
 for(const id of W05_SAVED_IDS)for(const mode of ['ALREADY_STORED','READBACK_VERIFIED']){
  const f=fakeRemote({result:mode,corruptHistoricalPoint:true});
  await assert.rejects(publishW05StoredSidecar({
   id,pcHome:'fixture',coreDb:'d1-core',remote:f.remote,now:NOW,
   prepare:prepared,makeWriter:f.factory
  }),/W05_SAVED_REMOTE_HISTORY_PARITY_MISMATCH/);
  assert.equal(f.stats().queries,1);
  assert.equal(f.stats().writes,mode==='ALREADY_STORED'?0:1);
 }
});
test('WPS historical missing values remain null and count as checked',async()=>{
 const f=fakeRemote({result:'ALREADY_STORED'});
 const result=await publishW05StoredSidecar({
  id:'wpsfd42',pcHome:'fixture',coreDb:'d1-core',remote:f.remote,now:NOW,
  prepare:prepared,makeWriter:f.factory
 });
 assert.equal(result.historyParityVerified,true);
 assert.equal(result.historyPointsVerified,26);
});
