import test from 'node:test';
import assert from 'node:assert/strict';
import {auditInflation26RuntimeMetadata}
 from '../lib/inflation-causal-26-runtime-metadata-audit-r1.mjs';

const now=Date.parse('2026-11-15T13:20:00.000Z');
const cutoffs=['2026-11-07T00:00:00.000Z','2026-11-13T12:00:00.000Z'];
// Minimal non-raw metadata from live A receipts #1443/#1444, Nov 15 2026.
// This is NOT a new provider download or an exact historical source vintage.
const old19=[
 ['1','2026-10-01','2026-11-04T21:25:06.490Z'],
 ['3','2026-11-11','2026-11-13T00:00:18.103Z'],
 ['4','2026-08','2026-11-04T06:25:37.684Z'],
 ...['5','6','7','8','9','10','11','25'].map(id=>[id,'2026-09-01','2026-11-04T06:04:19.444Z']),
 ['12','2026-10-01','2026-11-06T16:50:07.364Z'],
 ['13','2026-07-01','2026-10-30T13:30:04.561Z'],
 ['14','2026-07-01','2026-11-05T17:50:37.578Z'],
 ['18','2026-11-06','2026-11-12T23:10:12.509Z'],
 ['19','2026-09-01','2026-10-16T13:20:04.842Z'],
 ['21','2026-10-01','2026-11-12T10:09:38.104Z'],
 ['26','2026-09-01','2026-11-12T10:09:37.286Z'],
 ['31','2026-09-01','2026-11-04T04:41:52.103Z'],
];
const extra7=[
 ['22','INVALID',0,null,null],
 ['23','INVALID',0,null,null],
 ['24','PRESENT_VALID',203,'2026-09-01','2026-11-07T22:40:02.928Z'],
 ['16','PRESENT_VALID',139,'2026-09-30','2026-11-07T22:40:02.928Z'],
 ['28','MISSING',0,null,null],
 ['29','PRESENT_VALID',657,'2026-09-01','2026-11-07T22:40:02.928Z'],
 ['2','PRESENT_VALID',520,'2026-11-02','2026-11-07T22:40:02.928Z'],
];
function fixture(){
 return {
  nineteenProjection:{perId:old19.map(([id,observationDate,sourceStoredAt])=>({
   id,status:'READY',observationDate,sourceStoredAt,
  }))},
  sevenRuntime:{indicators:extra7.map(([id,status,observationCount,latestObservationDate,sourceStoredAt])=>({
   id,status,observationCount,latestObservationDate,sourceStoredAt,
  }))},
  cutoffs,now,
 };
}
test('actual PC A metadata gives 23/26 local and 15 sources by early cutoff',()=>{
 const report=auditInflation26RuntimeMetadata(fixture());
 assert.equal(report.schema,'ZGMINI_W01_INFLATION26_RUNTIME_METADATA_AUDIT_R1');
 assert.equal(report.evidenceLevel,'PC_A_SUMMARY_ONLY_LOCAL_STORAGE');
 assert.equal(report.localReadyCount,23);
 assert.equal(report.old19Ready,19);
 assert.equal(report.new7Ready,4);
 assert.equal(report.localMissingCount,3);
 assert.deepEqual(report.localMissingIds,['22','23','28']);
 assert.equal(report.cutoffResults[0].knownStoredByCutoff,15);
 assert.equal(report.cutoffResults[1].knownStoredByCutoff,23);
 assert.equal(report.cutoffResults[1].previousSnapshotNotProven,3);
 assert.equal(report.sources.length,26);
 assert.equal(report.approvedCompositeFormula,false);
 assert.equal(report.rawEgress+report.providerCalls+report.d1Writes+report.sqliteWrites,0);
});
test('prior storage date cannot be equated with original release or revised PIT history',()=>{
 const r=auditInflation26RuntimeMetadata(fixture());
 assert.equal(r.provenanceLimit,'NOT_A_PUBLIC_RELEASE_OR_HISTORICAL_VINTAGE_BACKTEST');
 assert.equal(r.sources.find(x=>x.id==='24').historicalRowCount,203);
 assert.equal(r.sources.find(x=>x.id==='24').sourceStoredAt,'2026-11-07T22:40:02.928Z');
 assert.equal(r.sources.find(x=>x.id==='22').historicalRowCount,null);
 assert.equal(Object.hasOwn(r,'releaseAt'),false);
 assert.equal(Object.hasOwn(r,'scores'),false);
});
test('a single changed source status changes counts without manufacturing data',()=>{
 const f=fixture();
 const source=f.sevenRuntime.indicators.find(x=>x.id==='24');
 source.status='MISSING';source.observationCount=0;
 source.latestObservationDate=null;source.sourceStoredAt=null;
 const r=auditInflation26RuntimeMetadata(f);
 assert.equal(r.localReadyCount,22);
 assert.deepEqual(r.localMissingIds,['22','23','24','28']);
});
test('approved A-grade seven-candidate numeric receipt IDs normalize to catalog strings',()=>{
 const f=fixture();
 f.sevenRuntime.indicators=f.sevenRuntime.indicators.map(row=>({
  ...row,id:Number(row.id),
 }));
 const report=auditInflation26RuntimeMetadata(f);
 assert.equal(report.localReadyCount,23);
 assert.equal(report.new7Ready,4);
 assert.equal(report.localMissingCount,3);
 assert.deepEqual(report.localMissingIds,['22','23','28']);
 assert.equal(report.cutoffResults[0].knownStoredByCutoff,15);
 assert.equal(report.cutoffResults[1].knownStoredByCutoff,23);
 assert.ok(report.sources.every(row=>typeof row.id==='string'));
 assert.ok(report.sources.some(row=>row.id==='24'&&
  row.historicalRowCount===203));
});
test('numeric A receipt ID normalization still fails closed for invalid or duplicate IDs',()=>{
 const patches=[
  f=>f.sevenRuntime.indicators[0].id=22.5,
  f=>f.sevenRuntime.indicators[0].id=0,
  f=>f.sevenRuntime.indicators[0].id=99,
  f=>f.sevenRuntime.indicators[0].id=24, // duplicate of existing #24
  f=>f.nineteenProjection.perId[0].id=1, // old 19 remains string-only
 ];
 for(const patch of patches){
  const f=fixture();
  f.sevenRuntime.indicators=f.sevenRuntime.indicators.map(row=>({
   ...row,id:Number(row.id),
  }));
  patch(f);
  assert.throws(()=>auditInflation26RuntimeMetadata(f),
   e=>e.code==='W01_METADATA_ID_STOP');
 }
});

test('duplicate, missing, unknown and changed ID fail closed',()=>{
 for(const patch of [
  f=>f.nineteenProjection.perId.pop(),
  f=>f.nineteenProjection.perId[0].id='22',
  f=>f.nineteenProjection.perId[0].id='3',
  f=>f.sevenRuntime.indicators[0].id='20',
 ]){const f=fixture();patch(f);
  assert.throws(()=>auditInflation26RuntimeMetadata(f),
   e=>['W01_METADATA_ID_STOP','W01_METADATA_COUNT_STOP'].includes(e.code));
 }
});
test('future stored or observational date and invalid count are not allowed',()=>{
 for(const patch of [
  f=>f.nineteenProjection.perId[0].sourceStoredAt='2027-01-01T00:00:00.000Z',
  f=>f.nineteenProjection.perId[0].observationDate='2026-12-01',
  f=>f.sevenRuntime.indicators.find(x=>x.id==='24').observationCount=0,
  f=>f.sevenRuntime.indicators.find(x=>x.id==='28').observationCount=5,
 ]){const f=fixture();patch(f);
  assert.throws(()=>auditInflation26RuntimeMetadata(f),
   e=>['W01_METADATA_PROVENANCE_STOP','W01_METADATA_OBSERVATION_COUNT_STOP'].includes(e.code));
 }
});
test('missing cutoff, reordering or future request is blocked before evaluating',()=>{
 for(const patch of [
  f=>f.cutoffs=[],
  f=>f.cutoffs=[cutoffs[1],cutoffs[0]],
  f=>f.cutoffs=['2027-01-01T00:00:00.000Z'],
  f=>f.cutoffs=[cutoffs[0],cutoffs[0]],
 ]){const f=fixture();patch(f);
  assert.throws(()=>auditInflation26RuntimeMetadata(f),
   e=>e.code==='W01_METADATA_CUTOFF_STOP');
 }
});
