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
