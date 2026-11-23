import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {saveBeaUnitNipaArchive,beaUnitNipaArchivePaths}
 from '../scripts/pc-writer/EARNINGS_BEA_UNIT_NIPA_ARCHIVE_R1.mjs';
import {buildBeaUnitNipaPublicProjection,
 BEA_NIPA_PUBLIC_SOURCE_URL,BEA_NIPA_PUBLIC_SERIES}
 from '../scripts/pc-writer/EARNINGS_BEA_UNIT_NIPA_PUBLIC_PROJECTION_R1.mjs';
import {validateBeaUnitProfit,beaUnitWriter,readBeaUnitResponse,BEA_UNIT_ROUTE}
 from '../worker/earnings-bea-unit-profit-r1.mjs';

const storedAt=Date.parse('2026-11-23T11:00:00.000Z');
const records=[['2025Q1','0.209'],['2025Q2','0.216'],
 ['2025Q3','0.219'],['2025Q4','0.222'],['2026Q1','0.231'],['2026Q2','0.250']];
const raw=Buffer.from(JSON.stringify({BEAAPI:{
 Request:{RequestParam:[{ParameterName:'USERID',ParameterValue:'NOT_A_REAL_KEY'}]},
 Results:{Data:records.map(([TimePeriod,DataValue])=>({
  TableName:'T11500',SeriesCode:'A463RD',LineNumber:'7',
  TimePeriod,DataValue,CL_UNIT:'Level',UNIT_MULT:'0'
 }))}}}),'utf8');
const working=()=>fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-bea-native-public-'));

function database(){
 let row=null,writes=0;
 return {getWrites:()=>writes,prepare(sql){return {bind(...args){return {
  async first(){return row;},
  async run(){
   assert.match(sql,/INSERT INTO market_public_snapshots_v1/);
   row={body:args[1],stored_at:args[2]};writes++;
   return {meta:{changes:1}};
  }
 };}};}};
}

test('native stored JSON maps to five exact quarterly public points, not FRED',()=>{
 const pcBase=working();
 try{
  const source=saveBeaUnitNipaArchive({pcBase,rawBytes:raw,sourceStoredAt:storedAt});
  const result=buildBeaUnitNipaPublicProjection({
   pcBase,sourceSha:source.sourceVersion,now:storedAt+2000
  });
  assert.equal(result.sourceVersion,source.sourceVersion);
  assert.equal(result.sourceStoredAt,storedAt);
  assert.equal(result.indicator.transport,'BEA_API_JSON');
  assert.equal(result.indicator.seriesId,BEA_NIPA_PUBLIC_SERIES);
  assert.equal(result.indicator.sourceURL,BEA_NIPA_PUBLIC_SOURCE_URL);
  assert.deepEqual(result.indicator.history.map(p=>p.date),
   ['2025-06-30','2025-09-30','2025-12-31','2026-03-31','2026-06-30']);
  assert.equal(result.indicator.value,0.25);
  assert.equal(result.indicator.previousValue,0.231);
  assert.ok(Math.abs(result.indicator.change-0.019)<1e-12);
  assert.equal(validateBeaUnitProfit(result,{now:storedAt+2000}),result);
  assert.doesNotMatch(JSON.stringify(result),/USERID|NOT_A_REAL_KEY|FRED_CSV/);
 }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('strict transport+series+sourceURL pairing rejects hybrid or credential URL',()=>{
 const pcBase=working();
 try{
  const source=saveBeaUnitNipaArchive({pcBase,rawBytes:raw,sourceStoredAt:storedAt});
  const payload=buildBeaUnitNipaPublicProjection({
   pcBase,sourceSha:source.sourceVersion,now:storedAt+2000});
  for(const indicator of [
   {...payload.indicator,transport:'FRED_CSV'},
   {...payload.indicator,seriesId:'A463RD3Q052SBEA'},
   {...payload.indicator,sourceURL:'https://fred.stlouisfed.org/series/A463RD3Q052SBEA'},
   {...payload.indicator,sourceURL:BEA_NIPA_PUBLIC_SOURCE_URL+'?UserID=SECRET'},
  ])assert.throws(()=>validateBeaUnitProfit({...payload,indicator},{
   now:storedAt+2000}),/BEA_UNIT_INVALID_ROW/);
 }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('isolated exact-key D1 writer and stored-only GET preserve BEA provenance',async()=>{
 const pcBase=working();
 try{
  const source=saveBeaUnitNipaArchive({pcBase,rawBytes:raw,sourceStoredAt:storedAt});
  const payload=buildBeaUnitNipaPublicProjection({
   pcBase,sourceSha:source.sourceVersion,now:storedAt+2000});
  const db=database(),request=new Request('https://zgmini.kr'+BEA_UNIT_ROUTE);
  assert.equal((await readBeaUnitResponse(request,db,{now:storedAt+1000})).status,503);
  const written=await beaUnitWriter(db).write(payload,{storedAt:storedAt+1000});
  assert.equal(written.status,'READBACK_VERIFIED');
  assert.equal(db.getWrites(),1);
  const response=await readBeaUnitResponse(request,db,{now:storedAt+2000});
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.indicator.transport,'BEA_API_JSON');
  assert.equal(body.indicator.sourceURL,BEA_NIPA_PUBLIC_SOURCE_URL);
  assert.equal(body.sourceVersion,source.sourceVersion);
  assert.equal((await beaUnitWriter(db).write(payload,{storedAt:storedAt+3000}))
   .status,'ALREADY_STORED');
  assert.equal(db.getWrites(),1);
 }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});

test('missing or tampered immutable private source fails closed before projection',()=>{
 const pcBase=working();
 try{
  const source=saveBeaUnitNipaArchive({pcBase,rawBytes:raw,sourceStoredAt:storedAt});
  const file=beaUnitNipaArchivePaths({pcBase,sourceSha:source.sourceVersion});
  const original=fs.readFileSync(file.raw);
  fs.writeFileSync(file.raw,Buffer.from(original.toString('utf8')
   .replace('0.250','0.251')));
  assert.throws(()=>buildBeaUnitNipaPublicProjection({
   pcBase,sourceSha:source.sourceVersion,now:storedAt+2000}),
   /BEA_UNIT_NIPA_ARCHIVE_SOURCE_MISMATCH/);
  assert.throws(()=>buildBeaUnitNipaPublicProjection({
   pcBase,sourceSha:'f'.repeat(64),now:storedAt+2000}),
   /BEA_UNIT_NIPA_ARCHIVE_MISSING/);
 }finally{fs.rmSync(pcBase,{recursive:true,force:true});}
});
