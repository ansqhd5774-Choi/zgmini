import test from 'node:test';
import assert from 'node:assert/strict';
import {QFR_SNAPSHOT_KEY,QFR_SCHEMA,validateQfrCompanionPayload,
  qfrCompanionFreshness,qfrCompanionWriter} from './earnings-companion-c-qfr-r1.mjs';

const NOW=Date.parse('2026-10-28T02:00:00.000Z');
const SOURCE=Date.parse('2026-10-27T14:52:13.108Z');
const points=['2025-Q2','2025-Q3','2025-Q4','2026-Q1','2026-Q2']
  .map((period,i)=>({period,value:[9,10,11,14.03708175763798,15.599418144173285][i]}));
const clone=x=>structuredClone(x);
const fixture=()=>({schemaVersion:QFR_SCHEMA,status:'READY',sourceVersion:'a'.repeat(64),
  sourceSha256:'b'.repeat(64),sourceStoredAt:SOURCE,
  generatedAt:'2026-10-27T15:05:00.000Z',historicalMode:'CURRENT_RETRIEVAL_NOT_PIT',
  observedThrough:'2026-Q2',coverage:{configured:1,ready:1,independentSources:1},
  rows:[{indicatorId:'census_qfr_manufacturing_after_tax_margin_nsa',
    name:'미국 제조업 세후이익률',category:'PROFITABILITY',kind:'DERIVED',
    provider:'CENSUS',publisher:'U.S. Census Bureau',dataset:'QFR_MFG_US_NSA_AFTER_TAX_MARGIN',
    sourceURL:'https://www.census.gov/econ_getzippedfile/?programCode=QFR',
    frequency:'QUARTERLY',adjustment:'NSA',unit:'PERCENT',
    value:points[4].value,previousValue:points[3].value,
    change:points[4].value-points[3].value,changeUnit:'PERCENTAGE_POINTS',
    observationPeriod:'2026-Q2',previousPeriod:'2026-Q1',
    retrievedAt:new Date(SOURCE).toISOString(),releaseDate:null,officialVintageId:null,
    method:'AFTER_TAX_PROFIT_DIVIDED_BY_NET_SALES',status:'READY',history:clone(points)}]});
function fakeD1({mismatch=false}={}){
  const records=new Map(),queries=[];
  return {records,queries,prepare(sql){return {bind(...args){return {
    async first(){queries.push({kind:'READ',sql,args});return records.get(args[0])??null;},
    async run(){queries.push({kind:'WRITE',sql,args});
      assert.match(sql,/^INSERT INTO market_public_snapshots_v1/);
      const [key,body,at,source,upTo]=args;
      const old=records.get(key);
      if(old&&!(JSON.parse(old.body).projection.sourceStoredAt<source&&old.stored_at<=upTo))
        return {meta:{changes:0}};
      records.set(key,{body:mismatch?'MISMATCH':body,stored_at:at});
      return {meta:{changes:1}};
    }
  };}};}};
}

test('dedicated Census schema, single source, immutable 5 quarters and fresh observation',()=>{
  const p=fixture();
  assert.equal(QFR_SNAPSHOT_KEY,'detail:earnings-recession-indicators:census-qfr-mfg-margin:v1');
  assert.equal(validateQfrCompanionPayload(p,{now:NOW}),p);
  assert.equal(qfrCompanionFreshness(p.rows[0],{now:NOW}).status,'FRESH');
  assert.equal(qfrCompanionFreshness(p.rows[0],{now:SOURCE+166*86_400_000}).status,'STALE');
});
test('reject forged schema, provenance, extra source, raw ZIP, and release/PIT claims',()=>{
  for(const mutate of [
    p=>{p.schemaVersion='earnings-companion-c-r4-v1';},
    p=>{p.rows[0].provider='BLS';},
    p=>{p.rows.push(clone(p.rows[0]));},
    p=>{p.rawZipBase64='not allowed';},
    p=>{p.rows[0].releaseDate='2026-10-27';},
    p=>{p.rows[0].officialVintageId='2026-10-27';},
    p=>{p.historicalMode='PIT';},
    p=>{p.sourceStoredAt=NOW+1000;},
    p=>{p.rows[0].history[2].period='2025-Q2';},
    p=>{p.rows[0].value=17;},
    p=>{p.rows[0].change=2;},
    p=>{p.rows[0].retrievedAt=new Date(SOURCE+1000).toISOString();},
  ]){
    const p=fixture();mutate(p);
    assert.throws(()=>validateQfrCompanionPayload(p,{now:NOW}),/^Error: QFR_D1_/);
  }
});
test('separate D1 key exact readback, idempotent replay; BLS/BEA untouched',async()=>{
  const db=fakeD1(),writer=qfrCompanionWriter(db),p=fixture();
  const first=await writer.write(p,{storedAt:NOW-1000});
  assert.equal(first.status,'READBACK_VERIFIED');
  assert.equal(first.key,QFR_SNAPSHOT_KEY);
  assert.deepEqual([...db.records.keys()],[QFR_SNAPSHOT_KEY]);
  const replay=await writer.write(p,{storedAt:NOW});
  assert.equal(replay.status,'ALREADY_STORED');
  assert.equal(db.queries.filter(x=>x.kind==='WRITE').length,1);
  assert.ok(db.queries.every(x=>x.args[0]===QFR_SNAPSHOT_KEY));
});
test('same checkpoint different SHA/content, older source and corrupt prior fail closed',async()=>{
  const db=fakeD1(),writer=qfrCompanionWriter(db),p=fixture();
  await writer.write(p,{storedAt:NOW-1000});
  let changed=fixture();changed.sourceVersion='c'.repeat(64);
  await assert.rejects(writer.write(changed,{storedAt:NOW}),/QFR_D1_CONFLICTING_VERSION/);
  changed=fixture();changed.rows[0].name='tampered';
  await assert.rejects(writer.write(changed,{storedAt:NOW}),/QFR_D1_ROW_INVALID/);
  changed=fixture();changed.sourceStoredAt=SOURCE-1000;
  changed.rows[0].retrievedAt=new Date(SOURCE-1000).toISOString();
  changed.generatedAt='2026-10-27T15:05:00.000Z';
  await assert.rejects(writer.write(changed,{storedAt:NOW}),/QFR_D1_SUPERSEDED/);
  db.records.set(QFR_SNAPSHOT_KEY,{body:'{}',stored_at:NOW-1000});
  await assert.rejects(writer.write(fixture(),{storedAt:NOW}),/QFR_D1_EXISTING_INVALID/);
  assert.equal(db.queries.filter(x=>x.kind==='WRITE').length,1);
});
test('D1 write acknowledgment without matching body is never a verified publication',async()=>{
  const db=fakeD1({mismatch:true});
  await assert.rejects(qfrCompanionWriter(db).write(fixture(),{storedAt:NOW}),
    /QFR_D1_READBACK_MISMATCH/);
});
test('stale source cannot write, even if schema itself remains structurally valid',async()=>{
  const oldNow=SOURCE+166*86_400_000;
  const p=fixture();
  assert.equal(validateQfrCompanionPayload(p,{now:oldNow}),p);
  const db=fakeD1();
  await assert.rejects(qfrCompanionWriter(db).write(p,{storedAt:oldNow}),/QFR_D1_SOURCE_STALE/);
  assert.equal(db.queries.filter(x=>x.kind==='WRITE').length,0);
});
