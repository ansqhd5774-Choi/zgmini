// Fully offline, in-memory tests. Never open the user's PC database or call Census/D1.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {makeQfrPlan,checkQfrSchema,appendQfrPlan,parseQfrMode,
  verifyExpectedQfrSource,PROVIDER,DATASET}
  from './EARNINGS_CENSUS_QFR_R2_SQLITE_APPEND.mjs';

const TIME='2026-10-27T13:00:00.000Z';
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const crc32=input=>{
  let crc=0xffffffff;
  for(const b of input){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
};
function archive({stamp='Tuesday, 08-Sep-26 09:05:38 EDT',latestSales=1400}={}){
  const periods=['Q2-2025','Q3-2025','Q4-2025','Q1-2026','Q2-2026'];
  const rows=periods.flatMap((p,i)=>[
    `${101+i},1,1,0,1,0,${i===4?latestSales:1000+i*100}`,
    `${101+i},1,9,0,1,0,${100+i*20}`,
  ]);
  const csv=[
    'CATEGORIES\ncat_idx,cat_code,cat_desc,cat_indent\n1,MFG,All Manufacturing,0',
    'DATA TYPES\ndt_idx,dt_code,dt_desc,dt_unit\n1,101,Net Sales,MLN$\n9,115,After Taxes,MLN$',
    'GEO LEVELS\ngeo_idx,geo_code,geo_desc\n1,US,United States',
    'TIME PERIODS\nper_idx,per_name\n'+periods.map((p,i)=>`${101+i},${p}`).join('\n'),
    'DATA UPDATED ON\n'+stamp,
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
  const at=local.length+name.length+packed.length;
  end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(1,8);
  end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+name.length,12);
  end.writeUInt32LE(at,16);
  return Buffer.concat([local,name,packed,central,name,end]);
}
const createDb=({snapshotCheck=false}={})=>{
  const db=new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE api_history_chunks_v1 (
    provider TEXT NOT NULL,dataset TEXT NOT NULL,chunk_sha256 TEXT NOT NULL,
    first_observation_date TEXT NOT NULL,last_observation_date TEXT NOT NULL,
    row_count INTEGER NOT NULL,payload_json TEXT NOT NULL,first_seen_at TEXT NOT NULL,
    PRIMARY KEY (provider,dataset,chunk_sha256)
  );CREATE TABLE api_history_snapshots_v1 (
    provider TEXT NOT NULL,dataset TEXT NOT NULL,snapshot_sha256 TEXT NOT NULL,
    as_of TEXT NOT NULL,retrieved_at TEXT NOT NULL,
    status TEXT NOT NULL${snapshotCheck?" CHECK (status='IMPOSSIBLE')":''},
    history_mode TEXT NOT NULL,row_count INTEGER NOT NULL,
    latest_observation_date TEXT NOT NULL,chunk_hashes_json TEXT NOT NULL,
    provenance_json TEXT NOT NULL,
    PRIMARY KEY (provider,dataset,snapshot_sha256)
  );`);
  return db;
};
const count=(db,table)=>db.prepare(`SELECT count(*) AS n FROM ${table} WHERE provider=? AND dataset=?`)
  .get(PROVIDER,DATASET).n;

test('approved apply requires exact source hash and rejects later official ZIP revision',()=>{
  const initial=makeQfrPlan(archive(),TIME),revised=makeQfrPlan(archive({latestSales:1500}),TIME);
  const sha256=initial.result.sourceSha256;
  assert.deepEqual(parseQfrMode([]),{apply:false,expectedSha256:null});
  assert.deepEqual(parseQfrMode(['--dry-run']),{apply:false,expectedSha256:null});
  assert.deepEqual(parseQfrMode(['--apply','--confirm-census-qfr-sqlite-append',
    '--expected-source-sha256',sha256]),{apply:true,expectedSha256:sha256});
  assert.throws(()=>parseQfrMode(['--apply','--confirm-census-qfr-sqlite-append']),
    /QFR_APPEND_CONFIRMATION_AND_SOURCE_SHA_REQUIRED/);
  assert.throws(()=>parseQfrMode(['--dry-run','--apply','--confirm-census-qfr-sqlite-append',
    '--expected-source-sha256',sha256]),/QFR_APPEND_CONFIRMATION_AND_SOURCE_SHA_REQUIRED/);
  assert.doesNotThrow(()=>verifyExpectedQfrSource(initial,sha256));
  assert.throws(()=>verifyExpectedQfrSource(revised,sha256),
    /QFR_SOURCE_CHANGED_SINCE_PREFLIGHT_NO_WRITE/);
});

test('Census namespace and exact original ZIP retained with SHA as immutable chunk',()=>{
  const db=createDb();
  try{
    const zip=archive(),plan=makeQfrPlan(zip,TIME);
    assert.equal(sha(zip),plan.result.sourceSha256);
    assert.deepEqual(checkQfrSchema(db),{priorSnapshots:0,priorChunks:0});
    assert.deepEqual(appendQfrPlan(db,plan),{
      insertedChunks:1,insertedSnapshots:1,sourceSha256:sha(zip),observedThrough:'2026-Q2',
    });
    assert.deepEqual(checkQfrSchema(db),{priorSnapshots:1,priorChunks:1});
    const record=db.prepare('SELECT payload_json FROM api_history_chunks_v1').get();
    const original=Buffer.from(JSON.parse(record.payload_json).rawZipBase64,'base64');
    assert.deepEqual(original,zip);
    assert.equal(count(db,'api_history_chunks_v1'),1);
  }finally{db.close();}
});

test('same ZIP rerun idempotent and revision creates a new original + new snapshot',()=>{
  const db=createDb();
  try{
    const a=makeQfrPlan(archive(),TIME),again=makeQfrPlan(archive(),'2026-10-28T00:00:00.000Z');
    const revised=makeQfrPlan(archive({latestSales:1500}),'2026-10-28T00:00:00.000Z');
    assert.equal(appendQfrPlan(db,a).insertedSnapshots,1);
    assert.deepEqual(appendQfrPlan(db,again).insertedChunks,0);
    assert.equal(appendQfrPlan(db,revised).insertedSnapshots,1);
    assert.equal(count(db,'api_history_chunks_v1'),2);
    assert.equal(count(db,'api_history_snapshots_v1'),2);
    assert.equal(revised.result.history.at(-1).salesMillionsUSD,1500);
    assert.equal(checkQfrSchema(db).priorSnapshots,2);
    const rows=db.prepare('SELECT first_seen_at FROM api_history_chunks_v1 ORDER BY first_seen_at').all();
    assert.equal(rows[0].first_seen_at,TIME);
  }finally{db.close();}
});

test('strictly rejected foreign Census namespace does not mutate any existing row',()=>{
  const db=createDb();
  try{
    db.prepare(`INSERT INTO api_history_chunks_v1 VALUES(?,?,?,?,?,?,?,?)`).run(
      PROVIDER,DATASET,'a'.repeat(64),'2025-Q2','2026-Q2',5,'{}',TIME);
    assert.throws(()=>checkQfrSchema(db),/QFR_PRIOR_CHUNK_HASH_INVALID_NO_WRITE/);
    assert.throws(()=>appendQfrPlan(db,makeQfrPlan(archive(),TIME)),
      /QFR_PRIOR_CHUNK_HASH_INVALID_NO_WRITE/);
    assert.equal(count(db,'api_history_chunks_v1'),1);
    assert.equal(count(db,'api_history_snapshots_v1'),0);
  }finally{db.close();}
});

test('missing core table, wrong primary key and trigger fail without side effects',()=>{
  const db=createDb();
  try{
    db.exec('CREATE TRIGGER qfr_test AFTER INSERT ON api_history_chunks_v1 BEGIN SELECT 1; END');
    assert.throws(()=>checkQfrSchema(db),/QFR_EXISTING_TRIGGER_PRESENT_NO_WRITE/);
    db.exec('DROP TRIGGER qfr_test');
    db.exec('DROP TABLE api_history_snapshots_v1');
    assert.throws(()=>checkQfrSchema(db),/QFR_EXISTING_TABLE_MISSING_NO_WRITE/);
    db.exec(`CREATE TABLE api_history_snapshots_v1 (
      provider TEXT,dataset TEXT,snapshot_sha256 TEXT,as_of TEXT,retrieved_at TEXT,
      status TEXT,history_mode TEXT,row_count INTEGER,latest_observation_date TEXT,
      chunk_hashes_json TEXT,provenance_json TEXT,
      PRIMARY KEY (provider,dataset)
    )`);
    assert.throws(()=>checkQfrSchema(db),/QFR_EXISTING_PRIMARY_KEY_MISMATCH_NO_WRITE/);
  }finally{db.close();}
});

test('failed snapshot insert rolls back new ZIP chunk atomically',()=>{
  const db=createDb({snapshotCheck:true});
  try{
    assert.throws(()=>appendQfrPlan(db,makeQfrPlan(archive(),TIME)),/CHECK constraint failed/);
    assert.equal(count(db,'api_history_chunks_v1'),0);
    assert.equal(count(db,'api_history_snapshots_v1'),0);
  }finally{db.close();}
});

test('unrelated provider BLS untouched during Census append and revision',()=>{
  const db=createDb();
  try{
    const id='b'.repeat(64),sample='[1]';
    db.prepare('INSERT INTO api_history_chunks_v1 VALUES(?,?,?,?,?,?,?,?)')
      .run('BLS','WPSFD42',id,'2026-01-01','2026-01-01',1,sample,TIME);
    appendQfrPlan(db,makeQfrPlan(archive(),TIME));
    appendQfrPlan(db,makeQfrPlan(archive({stamp:'Wednesday, 09-Sep-26 10:00:00 EDT'}),TIME));
    const preserved=db.prepare(`SELECT chunk_sha256,payload_json FROM api_history_chunks_v1
      WHERE provider='BLS' AND dataset='WPSFD42'`).all();
    assert.deepEqual(preserved.map(row=>({...row})),[{chunk_sha256:id,payload_json:sample}]);
  }finally{db.close();}
});
