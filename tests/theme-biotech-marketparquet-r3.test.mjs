import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectArchive} from '../scripts/pc-writer/theme-biotech-marketparquet-r3.mjs';

test('R3 inspects actual R165 archive, not R167 source-code directory',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mp-r165-check-'));
 try{
  const archive=path.join(root,'theme-market-history-r131','marketparquet-r165');
  const audits=path.join(root,'theme-market-history-r131','marketparquet-r167');
  fs.mkdirSync(archive,{recursive:true});fs.mkdirSync(audits,{recursive:true});
  fs.writeFileSync(path.join(archive,'etf_daily_2026-10-22.parquet'),Buffer.concat([Buffer.from('PAR1'),Buffer.from([0,0,0,0]),Buffer.from([1,0,0,0]),Buffer.from('PAR1')]));
  fs.writeFileSync(path.join(audits,'etf_daily_2026-10-22.audit.json'),JSON.stringify({source:'MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED',date:'2026-10-22'}));
  const r=inspectArchive(root,{attemptRowRead:false});
  assert.equal(r.archive.count,1);
  assert.equal(r.archive.lastDate,'2026-10-22');
  assert.equal(r.audit.length,1);
  assert.equal(r.audit[0].source,'MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED');
  assert.equal(r.recentParquet[0].magicAndFooterValid,true);
  assert.equal(r.status,'PARQUET_ROWS_NOT_VERIFIED');
  assert.equal(r.rights,'NOT_VERIFIED_FOR_FREE_COMMERCIAL_DERIVED_PUBLICATION');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('R3 does not invent raw files when R165 is absent',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mp-r165-missing-'));
 try{
  const r=inspectArchive(root,{attemptRowRead:false});
  assert.equal(r.status,'ARCHIVE_NOT_PRESENT_NOT_PROVEN_PROVIDER_ABSENT');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
