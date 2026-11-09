import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import {readDcParquetR8} from '../scripts/pc-writer/theme-data-center-power-provisional-r8.mjs';
import {readSpaceParquetR8} from '../scripts/pc-writer/theme-space-satellite-provisional-r8.mjs';

// These guards precede archive access. The test deliberately uses no real
// operational data or decoder, so it cannot collect, score, or publish.
const missingRoot=path.join(os.tmpdir(),
 `zgmini-r8-history-contract-${process.pid}-${Math.random().toString(36).slice(2)}`);
const confirmedDate='2026-11-05';

for(const {name,read,invalid,missing} of [
 {name:'data-center',read:readDcParquetR8,
  invalid:'DC_R8_HISTORICAL_TARGET_DATE_INVALID',
  missing:'DC_R8_SAVED_ARCHIVE_MISSING'},
 {name:'space-satellite',read:readSpaceParquetR8,
  invalid:'SPACE_R8_HISTORICAL_TARGET_DATE_INVALID',
  missing:'SPACE_R8_SAVED_SEVEN_ARCHIVE_MISSING'},
]){
 test(`${name} rejects a historical target at or before the confirmed anchor`,async()=>{
  for(const targetObservationDate of ['2026-11-04',confirmedDate]){
   await assert.rejects(
    read(missingRoot,{confirmedDate,targetObservationDate}),
    {code:invalid});
  }
  await assert.rejects(
   read(missingRoot,{confirmedDate,targetObservationDate:'2026-11-06'}),
   {code:missing});
 });
}
