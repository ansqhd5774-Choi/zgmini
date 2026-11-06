import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {readDcParquetR8} from '../scripts/pc-writer/theme-data-center-power-provisional-r8.mjs';
import {readSpaceParquetR8} from '../scripts/pc-writer/theme-space-satellite-provisional-r8.mjs';

const dates=['2026-10-28','2026-10-29','2026-10-30','2026-10-31'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

function archiveFixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-r8-historic-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const base=path.join(root,'theme-market-history-r131');
 const raw=path.join(base,'marketparquet-r165');
 const audit=path.join(base,'marketparquet-r167');
 fs.mkdirSync(raw,{recursive:true});fs.mkdirSync(audit,{recursive:true});
 const bytes=Buffer.alloc(16);bytes.write('PAR1',0);bytes.writeUInt32LE(4,8);bytes.write('PAR1',12);
 for(const day of dates){
  const name=`etf_daily_${day}`;
  fs.writeFileSync(path.join(raw,name+'.parquet'),bytes);
  fs.writeFileSync(path.join(audit,name+'.audit.json'),JSON.stringify({
   date:day,sha256:sha(bytes),complete:true,source:'MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED'}));
 }
 return root;
}

for(const [name,read,symbols] of [
 ['data-center',readDcParquetR8,['DTCR','GRID','SPY']],
 ['space',readSpaceParquetR8,['UFO','NASA','WARP','ROKT','SPY']],
]){
 test(name+' historic replay limits saved parquet to published observation date',async t=>{
  const dataRoot=archiveFixture(t);let reads=0;
  const decoder={parquetReadObjects:async()=>{
   const day=dates[reads++];
   return symbols.map(symbol=>({date:day,symbol,asset_type:'etf',close:100}));
  }};
  const replay=await read(dataRoot,{confirmedDate:dates[0],
   targetObservationDate:dates[1],decoder});
  assert.equal(replay.status,'VERIFIED');
  assert.deepEqual(replay.dates.map(item=>item.date),dates.slice(0,2));
  assert.equal(reads,2);

  const normal=await read(dataRoot,{confirmedDate:dates[0],decoder});
  assert.equal(normal.status,'CONFIRMED_REFRESH_NEEDED_FOR_BACKLOG');
  assert.equal(reads,2,'normal backlog rejection must not decode additional files');

  const missing=await read(dataRoot,{confirmedDate:dates[0],
   targetObservationDate:'2026-11-01',decoder});
  assert.equal(missing.status,'HISTORICAL_TARGET_DATE_NOT_SAVED');
  assert.equal(reads,2,'missing history must not silently use the latest existing file');
  await assert.rejects(read(dataRoot,{confirmedDate:dates[0],
   targetObservationDate:dates[0],decoder}),/HISTORICAL_TARGET_DATE_INVALID/);
 });
}
