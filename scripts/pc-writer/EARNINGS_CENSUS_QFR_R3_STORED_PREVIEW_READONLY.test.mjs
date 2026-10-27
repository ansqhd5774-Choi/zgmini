// Fully offline R3 tests: synthetic Census ZIP + memory SQLite only.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {DatabaseSync} from 'node:sqlite';
import {makeQfrPlan,appendQfrPlan} from './EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs';
import {buildStoredQfrPreview} from './EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY.mjs';

const TIME='2026-10-27T14:16:37.000Z';
const NEXT='2026-10-27T14:52:11.000Z';
const crc32=data=>{
  let crc=0xffffffff;
  for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
};
function zip({latestSales=1400}={}){
  const periods=['Q2-2025','Q3-2025','Q4-2025','Q1-2026','Q2-2026'];
  const rows=periods.flatMap((_,i)=>[
    `${101+i},1,1,0,1,0,${i===4?latestSales:1000+i*100}`,
    `${101+i},1,9,0,1,0,${100+i*20}`,
  ]);
  const csv=[
    'CATEGORIES\ncat_idx,cat_code,cat_desc,cat_indent\n1,MFG,All Manufacturing,0',
    'DATA TYPES\ndt_idx,dt_code,dt_desc,dt_unit\n1,101,Net Sales,MLN$\n9,115,After Taxes,MLN$',
    'GEO LEVELS\ngeo_idx,geo_code,geo_desc\n1,US,United States',
    'TIME PERIODS\nper_idx,per_name\n'+periods.map((p,i)=>`${101+i},${p}`).join('\n'),
    'DATA UPDATED ON\nTuesday, 08-Sep-26 09:05:38 EDT',
    'DATA\nper_idx,cat_idx,dt_idx,et_idx,geo_idx,is_adj,val\n'+rows.join('\n'),
  ].join('\n\n');
  const raw=Buffer.from(csv),name=Buffer.from('QFR-mf.csv'),packed=zlib.deflateRawSync(raw);
  const crc=crc32(raw),local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22);
  local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);
  local.writeUInt16LE(8,8);local.writeUInt32LE(crc,14);
  local.writeUInt32LE(packed.length,18);local.writeUInt32LE(raw.length,22);
  local.writeUInt16LE(name.length,26);
  central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);
  central.writeUInt16LE(20,6);central.writeUInt16LE(8,10);
  central.writeUInt32LE(crc,16);central.writeUInt32LE(packed.length,20);
  central.writeUInt32LE(raw.length,24);central.writeUInt16LE(name.length,28);
  const dataOffset=local.length+name.length+packed.length;
  end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(1,8);
  end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+name.length,12);
  end.writeUInt32LE(dataOffset,16);
  return Buffer.concat([local,name,packed,central,name,end]);
}
function memoryDb(){
  const db=new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE api_history_chunks_v1 (
    provider TEXT NOT NULL,dataset TEXT NOT NULL,chunk_sha256 TEXT NOT NULL,
    first_observation_date TEXT NOT NULL,last_observation_date TEXT NOT NULL,
    row_count INTEGER NOT NULL,payload_json TEXT NOT NULL,first_seen_at TEXT NOT NULL,
    PRIMARY KEY (provider,dataset,chunk_sha256)
  );CREATE TABLE api_history_snapshots_v1 (
    provider TEXT NOT NULL,dataset TEXT NOT NULL,snapshot_sha256 TEXT NOT NULL,
    as_of TEXT NOT NULL,retrieved_at TEXT NOT NULL,
    status TEXT NOT NULL,history_mode TEXT NOT NULL,row_count INTEGER NOT NULL,
    latest_observation_date TEXT NOT NULL,chunk_hashes_json TEXT NOT NULL,
    provenance_json TEXT NOT NULL,
    PRIMARY KEY (provider,dataset,snapshot_sha256)
  );`);
  return db;
}

test('stored ZIP only: one derived margin with correct previous and percentage-point change',()=>{
  const db=memoryDb();
  try{
    const plan=makeQfrPlan(zip(),TIME);
    appendQfrPlan(db,plan);
    const before=db.prepare('SELECT COUNT(*) AS n FROM api_history_chunks_v1').get().n;
    const result=buildStoredQfrPreview(db);
    assert.equal(result.status,'PASS_QFR_STORED_READONLY_PREVIEW');
    assert.equal(result.observedThrough,'2026-Q2');
    assert.equal(result.indicator.value,100*180/1400);
    assert.equal(result.indicator.previousValue,100*160/1300);
    assert.equal(result.indicator.changePercentagePoints,result.indicator.value-result.indicator.previousValue);
    assert.equal(result.sourceSha256,plan.result.sourceSha256);
    assert.equal(result.sourceStoredAt,Date.parse(TIME));
    assert.equal(result.indicator.releaseDate,null);
    assert.equal(result.historyMode,'CURRENT_RETRIEVAL_NOT_PIT');
    assert.equal(result.independentSourceCount,1);
    assert.equal(result.scoreInput,false);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM api_history_chunks_v1').get().n,before);
  }finally{db.close();}
});

test('revised ZIP is appended and newer retrieval selected; both originals remain intact',()=>{
  const db=memoryDb();
  try{
    appendQfrPlan(db,makeQfrPlan(zip(),TIME));
    const revised=makeQfrPlan(zip({latestSales:1500}),NEXT);
    appendQfrPlan(db,revised);
    const result=buildStoredQfrPreview(db);
    assert.equal(result.indicator.value,12);
    assert.equal(result.sourceSha256,revised.result.sourceSha256);
    assert.equal(result.storedSnapshotsChecked,2);
    assert.equal(result.latestQuarterVersions,2);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM api_history_snapshots_v1').get().n,2);
  }finally{db.close();}
});

test('missing Census records stops without treating a foreign provider as Census',()=>{
  const db=memoryDb();
  try{
    db.prepare('INSERT INTO api_history_chunks_v1 VALUES(?,?,?,?,?,?,?,?)')
      .run('BLS','WPSFD42','a'.repeat(64),'2026-01-01','2026-01-01',1,'[1]',TIME);
    assert.throws(()=>buildStoredQfrPreview(db),/QFR_STORED_SNAPSHOT_MISSING/);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM api_history_chunks_v1 WHERE provider='BLS'").get().n,1);
  }finally{db.close();}
});

test('misleading retrieval provenance fails even when snapshot and payload hashes remain valid',()=>{
  const db=memoryDb();
  try{
    appendQfrPlan(db,makeQfrPlan(zip(),TIME));
    const row=db.prepare('SELECT provenance_json FROM api_history_snapshots_v1').get();
    const forged={...JSON.parse(row.provenance_json),sourceRetrievedAt:NEXT};
    db.prepare('UPDATE api_history_snapshots_v1 SET provenance_json=?')
      .run(JSON.stringify(forged));
    assert.throws(()=>buildStoredQfrPreview(db),/QFR_STORED_PROVENANCE_MISMATCH/);
  }finally{db.close();}
});

test('corrupted raw ZIP SHA reference fails before any derived numeric output',()=>{
  const db=memoryDb();
  try{
    appendQfrPlan(db,makeQfrPlan(zip(),TIME));
    db.prepare('UPDATE api_history_chunks_v1 SET chunk_sha256=?')
      .run('f'.repeat(64));
    assert.throws(()=>buildStoredQfrPreview(db),/QFR_PRIOR_CHUNK_HASH_INVALID_NO_WRITE/);
  }finally{db.close();}
});

test('standalone CMD includes all R1/R2/R3 prerequisites and early failure TXT',()=>{
  const cmd=fs.readFileSync(new URL('./EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY.cmd',import.meta.url),'utf8');
  for(const n of ['R1_READONLY','R2_SQLITE_APPEND','R3_STORED_PREVIEW_READONLY'])
    assert.match(cmd,new RegExp(`if not exist "%~dp0EARNINGS_CENSUS_QFR_${n}\\.mjs"`));
  assert.match(cmd,/EARNINGS_CENSUS_QFR_R3_STORED_RESULT_SETUP_/);
  assert.match(cmd,/FAIL_QFR_STORED_PREVIEW_NO_WRITE/);
  assert.doesNotMatch(cmd,/--apply|--confirm|wrangler|curl/);
});
