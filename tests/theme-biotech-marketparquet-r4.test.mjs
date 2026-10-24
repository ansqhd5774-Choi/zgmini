import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectSavedAudits} from './theme-biotech-marketparquet-r4.mjs';

function fixture(audit){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'biotech-r4-'));
 const base=path.join(root,'theme-market-history-r131');
 const archive=path.join(base,'marketparquet-r165'),audits=path.join(base,'marketparquet-r167');
 fs.mkdirSync(archive,{recursive:true});fs.mkdirSync(audits,{recursive:true});
 const bytes=Buffer.concat([Buffer.from('PAR1'),Buffer.from([42,0,0,0]),Buffer.from([4,0,0,0]),Buffer.from('PAR1')]);
 fs.writeFileSync(path.join(archive,'etf_daily_2026-10-22.parquet'),bytes);
 const sha256=createHash('sha256').update(bytes).digest('hex');
 fs.writeFileSync(path.join(audits,'etf_daily_2026-10-22.audit.json'),JSON.stringify({date:'2026-10-22',sha256,source:'MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED',complete:true,...audit}));
 return root;
}
test('audit evidence is labeled indirect and hash-bound',()=>{
 const root=fixture({prices:{IBB:120,XBI:50,SPY:600},rawRows:4000});
 try{const r=inspectSavedAudits(root);assert.equal(r.status,'AUDIT_CLAIMS_TARGETS_AND_HASHES_MATCH_NOT_DIRECT_ROWS');
  assert.equal(r.auditLinkedAllThreeCount,1);assert.equal(r.directParquetRowsVerified,false);
  assert.equal(r.dates[0].shaBinding,'HASH_MATCH');assert.equal(r.dates[0].targetEvidence.IBB,'AUDIT_PRICES');
  assert.equal(r.dates[0].auditFileSha256===r.dates[0].parquetFileSha256,false);
  assert.equal(JSON.stringify(r).includes('"IBB": 120'),false);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('missing ticker and wrong hash are never reported as verified',()=>{
 const root=fixture({prices:{IBB:120,SPY:600},sha256:'bad'});
 try{const r=inspectSavedAudits(root);assert.equal(r.status,'AUDIT_LINK_PARTIAL_OR_UNVERIFIED');
  assert.equal(r.dates[0].shaBinding,'HASH_MISMATCH');assert.equal(r.dates[0].targetEvidence.XBI,'NOT_EVIDENCED');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('missing archive never falls back to another data root',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'biotech-r4-empty-'));
 try{assert.equal(inspectSavedAudits(root).status,'R165_ARCHIVE_MISSING');}
 finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('audit complete=false is never counted as a complete audit linkage',()=>{
 const root=fixture({prices:{IBB:1,XBI:2,SPY:3},complete:false});
 try{const r=inspectSavedAudits(root);assert.equal(r.auditLinkedAllThreeCount,0);
  assert.equal(r.status,'AUDIT_LINK_PARTIAL_OR_UNVERIFIED');}
 finally{fs.rmSync(root,{recursive:true,force:true});}
});
