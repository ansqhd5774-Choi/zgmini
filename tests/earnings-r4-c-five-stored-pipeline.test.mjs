// R5-04: native-CI offline integration, independent of unmerged R3C collector sources.
// In-memory SQLite -> verified R3D/R4 calculation -> D1 writer readback -> public GET.
// No provider/network, real PC DB, D1 credential, scheduler or deployment effects.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {buildPreview} from '../scripts/pc-writer/EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs';
import {
  EARNINGS_C_SNAPSHOT_KEY,earningsCompanionWriter,readEarningsCompanionResponse,
} from '../worker/earnings-companion-c-r4.mjs';

const RETRIEVED='2026-10-26T17:02:53.996Z';
const GENERATED='2026-10-27T02:35:01.000Z';
const NOW=Date.parse('2026-10-27T03:00:00.000Z');
const CONTRACT='EARNINGS_COMPANION_R3C_BLS_DIRECT_V1';
const SERIES=['WPSFD4','WPSFD41','PRS85006111'];
const IDS=[
  'bls_ppi_final_demand_yoy_sa','bls_ppi_final_demand_index',
  'bls_ppi_goods_yoy_sa','bls_ppi_goods_index','bls_unit_labor_cost_yoy',
];
const hash=x=>createHash('sha256').update(x,'utf8').digest('hex');

function sourceDb(){
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE api_history_chunks_v1 ('+
    'provider TEXT NOT NULL,dataset TEXT NOT NULL,chunk_sha256 TEXT NOT NULL,'+
    'first_observation_date TEXT,last_observation_date TEXT,row_count INTEGER NOT NULL,'+
    'payload_json TEXT NOT NULL,first_seen_at TEXT NOT NULL,'+
    'PRIMARY KEY(provider,dataset,chunk_sha256));'+
    'CREATE TABLE api_history_snapshots_v1 ('+
    'provider TEXT NOT NULL,dataset TEXT NOT NULL,snapshot_sha256 TEXT NOT NULL,'+
    'as_of TEXT NOT NULL,retrieved_at TEXT NOT NULL,status TEXT NOT NULL,'+
    'history_mode TEXT,row_count INTEGER NOT NULL,latest_observation_date TEXT,'+
    'chunk_hashes_json TEXT NOT NULL,provenance_json TEXT NOT NULL,'+
    'PRIMARY KEY(provider,dataset,snapshot_sha256));');
  return db;
}

function rowsFor(id,{different=false}={}){
  const quarterly=id==='PRS85006111';
  const periods=[];
  for(let year=2025;year<=2026;year++){
    const limit=quarterly?(year===2025?4:2):(year===2025?12:9);
    for(let n=1;n<=limit;n++)periods.push([year,n]);
  }
  return periods.map(([year,n])=>{
    const period=(quarterly?'Q':'M')+String(n).padStart(2,'0');
    const observed=quarterly?year+'-Q'+n:year+'-'+String(n).padStart(2,'0')+'-01';
    const base=quarterly?(year-2025)*2+n/10:(year-2025)*12+n+100;
    const amount=id==='WPSFD41'?base*2:base;
    const value=String(different&&year===2026&&n===9?amount+31:amount);
    return {
      observationDate:observed,value:Number(value),rawValue:value,seriesID:id,
      year:String(year),period,periodName:'Synthetic',frequency:quarterly?'QUARTERLY':'MONTHLY',
      seasonalAdjustment:'SA',rawUnit:quarterly?'PERCENT_YEAR_OVER_YEAR':'INDEX',
      annualRateFlag:false,footnotes:[],releaseDate:null,availableAt:null,vintageId:null,
    };
  });
}

function addVerifiedSnapshot(db,id,{retrievedAt=RETRIEVED,responseSha='a'.repeat(64),different=false}={}){
  const rows=rowsFor(id,{different});
  const raw=JSON.stringify(rows);
  const chunkSha=hash(raw),quarterly=id==='PRS85006111';
  const frequency=quarterly?'QUARTERLY':'MONTHLY';
  const identity=JSON.stringify({
    contract:CONTRACT,provider:'BLS',dataset:id,frequency,seasonalAdjustment:'SA',
    chunks:[chunkSha],
  });
  const snapshotSha=hash(identity);
  const provenance=JSON.stringify({
    contract:CONTRACT,authority:'US_BLS',transportProvider:'BLS_DIRECT_API',
    endpoint:'https://api.bls.gov/publicAPI/v2/timeseries/data/',
    seriesID:id,periodStart:rows[0].observationDate,
    periodEnd:rows.at(-1).observationDate,frequency,seasonalAdjustment:'SA',
    rawUnit:quarterly?'PERCENT_YEAR_OVER_YEAR':'INDEX',
    responseSha256:responseSha,retrievedAt,
    sourceAttribution:'US Bureau of Labor Statistics',officialVintageId:null,
  });
  db.prepare('INSERT INTO api_history_chunks_v1 '+
    '(provider,dataset,chunk_sha256,first_observation_date,last_observation_date,row_count,payload_json,first_seen_at) '+
    'VALUES(?,?,?,?,?,?,?,?)').run('BLS',id,chunkSha,rows[0].observationDate,
      rows.at(-1).observationDate,rows.length,raw,retrievedAt);
  db.prepare('INSERT INTO api_history_snapshots_v1 '+
    '(provider,dataset,snapshot_sha256,as_of,retrieved_at,status,history_mode,'+
    'row_count,latest_observation_date,chunk_hashes_json,provenance_json) '+
    'VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('BLS',id,snapshotSha,retrievedAt.slice(0,10),
      retrievedAt,'READY_DIRECT_BLS',CONTRACT,rows.length,rows.at(-1).observationDate,
      JSON.stringify([chunkSha]),provenance);
}
function populated(){
  const db=sourceDb();
  for(const id of SERIES)addVerifiedSnapshot(db,id);
  return db;
}
function mockD1(){
  const records=new Map(),calls=[];
  return {records,calls,prepare(sql){
    return {bind(...params){
      return {
        async first(){
          calls.push({kind:'READ',key:params[0],sql});
          return records.get(params[0])??null;
        },
        async run(){
          calls.push({kind:'WRITE',key:params[0],sql});
          assert.match(sql,/^INSERT INTO market_public_snapshots_v1/);
          const [key,body,storedAt]=params;
          records.set(key,{body,stored_at:storedAt});
          return {meta:{changes:1}};
        },
      };
    }};
  }};
}

test('verified older BLS 5 rows survive newer incomplete capture through D1 readback and public GET',async()=>{
  const db=populated(),remote=mockD1();
  try{
    const before=buildPreview(db,{generatedAt:GENERATED});
    addVerifiedSnapshot(db,'WPSFD4',{retrievedAt:'2026-10-26T19:00:00.000Z',
      responseSha:'b'.repeat(64),different:true});
    const {payload,diagnostics}=buildPreview(db,{generatedAt:GENERATED});
    assert.equal(diagnostics.r3dStatus,'PARTIAL_NEWER_INCOMPLETE_COHORT');
    assert.equal(diagnostics.newerIncomplete,true);
    assert.equal(payload.status,'READY');
    assert.equal(payload.rows.length,5);
    assert.deepEqual(payload.rows.map(x=>x.indicatorId),IDS);
    assert.equal(payload.sourceStoredAt,before.payload.sourceStoredAt);
    assert.equal(payload.sourceVersion,before.payload.sourceVersion);
    assert.deepEqual(payload.rows,before.payload.rows);

    const stored=await earningsCompanionWriter(remote).write(payload,{storedAt:NOW});
    assert.equal(stored.status,'READBACK_VERIFIED');
    assert.equal(stored.key,EARNINGS_C_SNAPSHOT_KEY);
    const get=await readEarningsCompanionResponse(
      new Request('https://zgmini.kr/api/earnings-recession-indicators'),remote,{now:NOW});
    assert.equal(get.status,200);
    const publicBody=await get.json();
    assert.equal(publicBody.status,'READY');
    assert.equal(publicBody.coverage.configured,5);
    assert.equal(publicBody.coverage.ready,5);
    assert.equal(publicBody.rows.length,5);
    assert.equal(publicBody.sourceVersion,before.payload.sourceVersion);
    assert.equal(publicBody.sourceStoredAt,before.payload.sourceStoredAt);
    for(let i=0;i<5;i++){
      const source=payload.rows[i],shown=publicBody.rows[i];
      assert.equal(shown.indicatorId,IDS[i]);
      assert.equal(shown.value,source.value);
      assert.equal(shown.previousValue,source.previousValue);
      assert.equal(shown.unit,source.unit);
      assert.equal(shown.observationPeriod,source.observationPeriod);
      assert.equal(shown.retrievedAt,source.retrievedAt);
      assert.equal(shown.provider,'BLS');
      assert.equal(shown.seriesId,source.seriesId);
      assert.equal(shown.sourceURL,'https://data.bls.gov/timeseries/'+source.seriesId);
      assert.equal(shown.status,'READY');
      assert.equal(shown.freshness.status,'FRESH');
    }
    assert.equal((await readEarningsCompanionResponse(
      new Request('https://zgmini.kr/api/earnings-recession-indicators',{method:'HEAD'}),
      remote,{now:NOW})).status,200);
    assert.equal(remote.calls.filter(x=>x.kind==='WRITE').length,1);
    assert.ok(remote.calls.every(x=>x.key===EARNINGS_C_SNAPSHOT_KEY));
  }finally{db.close();}
});

test('corrupt selected BLS chunk never reaches D1 publication; expired source is not rebranded fresh',async()=>{
  const db=populated(),remote=mockD1();
  try{
    db.prepare("UPDATE api_history_chunks_v1 SET payload_json='[]' "+
      "WHERE provider='BLS' AND dataset='WPSFD4'").run();
    assert.throws(()=>buildPreview(db,{generatedAt:GENERATED}),/CHUNK_SHA256_MISMATCH/);
    assert.equal(remote.calls.length,0);
  }finally{db.close();}
  const good=populated(),published=mockD1();
  try{
    const {payload}=buildPreview(good,{generatedAt:GENERATED});
    await earningsCompanionWriter(published).write(payload,{storedAt:NOW});
    const stale=await readEarningsCompanionResponse(
      new Request('https://zgmini.kr/api/earnings-recession-indicators'),published,
      {now:Date.parse('2027-03-01T00:00:00.000Z')});
    assert.equal(stale.status,503);
    assert.equal((await stale.json()).reason,'STORED_PROJECTION_STALE');
  }finally{good.close();}
});
