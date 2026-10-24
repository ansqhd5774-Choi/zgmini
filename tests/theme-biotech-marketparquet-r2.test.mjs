import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {investigate} from '../scripts/pc-writer/theme-biotech-marketparquet-r2.mjs';

test('R2 bounded content evidence must never infer parquet ticker or commercial rights',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'biotech-r2-test-'));
 try{
  const raw=path.join(root,'theme-market-history-r131','raw');fs.mkdirSync(raw,{recursive:true});
  fs.writeFileSync(path.join(raw,'IBB_sample.json'),JSON.stringify({source:'unknown',items:[{symbol:'IBB',timestamp:'2026-10-21T19:00:00Z',close:201}]}));
  const cod=path.join(root,'theme-market-history-r131','marketparquet-r167');fs.mkdirSync(cod,{recursive:true});
  fs.writeFileSync(path.join(cod,'r167.mjs'),"// MarketParquet parquet fetch plan only\nconst next = 'not-local-raw';\n");
  const r=investigate(root);
  assert.deepEqual(r.conclusion.knownJsonSymbolLiterals,['IBB']);
  assert.equal(r.conclusion.parquetTickerPresence,'NO_CONFIRMED_PARQUET_ROWS');
  assert.equal(r.rights,'FREE_COMMERCIAL_DERIVED_AND_STORAGE_RIGHTS_NOT_VERIFIED');
  assert.equal(r.files[0].originDomainEvidence.getmarkethistory,false);
  assert.equal(r.files[0].originDomainEvidence.marketparquet,false);
  assert.equal(r.files[0].metadata[0].value,'unknown');
  assert.equal(r.found.length,1);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('R2 missing data root fails without C: or other fallback',()=>{
 assert.throws(()=>investigate('/no-such-zgmini-r2-root'),/DATA_ROOT_UNAVAILABLE_NO_FALLBACK/);
});
