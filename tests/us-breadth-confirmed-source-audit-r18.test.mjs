import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {summarizeStockDaily,auditConfirmedSource} from '../scripts/pc-writer/us-breadth-confirmed-source-audit-r18.mjs';

const now=new Date('2026-10-31T03:00:00Z');
const names=Array.from({length:6500},(_,i)=>`STK${i}`);
const daily=date=>names.map(symbol=>({date,asset_type:'stock',symbol,close:100,volume:1000}));
const dir=()=>fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-breadth-r18-'));
const parquetFixture=Buffer.from('PAR1'+'0'.repeat(24)+'PAR1');

test('source inventory reports actual ~6500 without converting SP500 counts to 6500',async t=>{
  const dataRoot=dir(),pcHome=path.join(dataRoot,'pc-writer');
  t.after(()=>fs.rmSync(dataRoot,{recursive:true,force:true}));
  fs.mkdirSync(path.join(pcHome,'storage'),{recursive:true});
  const dbFile=path.join(pcHome,'storage','core.sqlite');
  const db=new DatabaseSync(dbFile);
  db.exec("CREATE TABLE market_score_breadth_b1_r3_current_v1(trade_date TEXT,ticker TEXT);");
  db.exec("CREATE TABLE market_score_breadth_b1_r3_universe_v1(trade_date TEXT,member_count INTEGER);");
  db.prepare('INSERT INTO market_score_breadth_b1_r3_universe_v1 VALUES(?,?)').run('2026-10-30',503);
  for(let i=0;i<503;i++)db.prepare('INSERT INTO market_score_breadth_b1_r3_current_v1 VALUES(?,?)').run('2026-10-30',`SP${i}`);
  db.close();
  const archive=path.join(dataRoot,'theme-market-history-r131','marketparquet-r165');
  fs.mkdirSync(archive,{recursive:true});
  for(const date of ['2026-10-29','2026-10-30'])fs.writeFileSync(path.join(archive,`stock_daily_${date}.parquet`),parquetFixture);
  const before=fs.readdirSync(archive).sort();
  const report=await auditConfirmedSource({dataRoot,pcHome,now,readParquet:async file=>daily(file.match(/\d{4}-\d{2}-\d{2}/)[0])});
  assert.equal(report.status,'STORED_PAIR_INSPECTED');
  assert.equal(report.core.sourceRows['2026-10-30'],503);
  assert.equal(report.core.universeCount['2026-10-30'],503);
  assert.equal(report.raw['2026-10-30'].activeValidSymbols,6500);
  assert.equal(report.pairedActiveSymbols,6500);
  assert.equal(report.confirmedCandidate.status,'CALCULATED_UNPUBLISHED');
  assert.equal(report.confirmedCandidate.expectedCount,6500);
  assert.equal(report.confirmedCandidate.eligibleCount,6500);
  assert.equal(report.confirmedCandidate.publicationAllowed,false);
  assert.equal(report.localAuditShaMatched,false);
  assert.equal(report.providerAuthenticityVerified,false);
  assert.deepEqual(fs.readdirSync(archive).sort(),before);
  assert.equal(report.providerCalls,0);
  assert.equal(report.localWrites,0);
  assert.equal(report.remoteWrites,0);
  assert.doesNotMatch(JSON.stringify(report),/STK\d+/);
});

test('absent full-market source gives honest missing status without creating directories',async t=>{
  const dataRoot=dir();t.after(()=>fs.rmSync(dataRoot,{recursive:true,force:true}));
  const pcHome=path.join(dataRoot,'absent-pc');
  const before=fs.readdirSync(dataRoot);
  const result=await auditConfirmedSource({dataRoot,pcHome,now});
  assert.equal(result.status,'FULL_MARKET_SOURCE_NOT_YET_VERIFIED');
  assert.equal(result.pairedActiveSymbols,null);
  assert.equal(result.confirmedCandidate.status,'WAITING_FOR_FULL_MARKET_SOURCE');
  assert.equal(result.core.status,'CORE_SQLITE_NOT_FOUND');
  assert.equal(result.searchScope,'KNOWN_APPROVED_PATHS_ONLY_NOT_GLOBAL_E_DRIVE');
  assert.deepEqual(fs.readdirSync(dataRoot),before);
});

test('date, delisted, ETF, invalid, and duplicate symbols are separated',()=>{
  const rows=[{date:'2026-10-30',symbol:'A',close:100,volume:0,asset_type:'stock'},
    {date:'2026-10-30',symbol:'A',close:100,volume:0,asset_type:'stock'},
    {date:'2026-10-30',symbol:'OLD-DELISTED',close:10,volume:4,asset_type:'stock'},
    {date:'2026-10-30',symbol:'SPY',close:100,volume:100,asset_type:'etf'},
    {date:'2026-10-30',symbol:'B',close:101,volume:null,asset_type:'stock'},
    {date:'2026-10-29',symbol:'C',close:99,volume:1,asset_type:'stock'}];
  const result=summarizeStockDaily(rows,'2026-10-30');
  assert.equal(result.stockRows,4);
  assert.equal(result.activeValidSymbols,1);
  assert.equal(result.duplicate,1);
  assert.equal(result.delisted,1);
  assert.equal(result.invalid,1);
  assert.equal(result.wrongDate,1);
});

test('official by_date/stock_daily/YYYY/YYYY-MM-DD layout is found without recursive E scan',async t=>{
  const dataRoot=dir();t.after(()=>fs.rmSync(dataRoot,{recursive:true,force:true}));
  const root=path.join(dataRoot,'theme-market-history-r131','marketparquet-r165');
  const folder=path.join(root,'by_date','stock_daily','2026');
  fs.mkdirSync(folder,{recursive:true});
  for(const date of ['2026-10-29','2026-10-30'])fs.writeFileSync(path.join(folder,`${date}.parquet`),parquetFixture);
  const report=await auditConfirmedSource({dataRoot,pcHome:path.join(dataRoot,'missing-pc'),now,
    readParquet:async file=>daily(path.basename(file,'.parquet'))});
  assert.equal(report.status,'STORED_PAIR_INSPECTED');
  assert.equal(report.pairedActiveSymbols,6500);
  assert.equal(report.raw['2026-10-30'].fileAudit.status,'LOCAL_AUDIT_NOT_FOUND');
  assert.equal(report.localAuditShaMatched,false);
  assert.ok(report.searchedRoots.includes(root));
});

test('existing stock-specific local audits are SHA checked, but do not assert provider authenticity',async t=>{
  const dataRoot=dir();t.after(()=>fs.rmSync(dataRoot,{recursive:true,force:true}));
  const base=path.join(dataRoot,'theme-market-history-r131');
  const archive=path.join(base,'marketparquet-r165'),audits=path.join(base,'marketparquet-r167');
  fs.mkdirSync(archive,{recursive:true});fs.mkdirSync(audits,{recursive:true});
  const digest=createHash('sha256').update(parquetFixture).digest('hex');
  for(const date of ['2026-10-29','2026-10-30']){
    fs.writeFileSync(path.join(archive,`stock_daily_${date}.parquet`),parquetFixture);
    fs.writeFileSync(path.join(audits,`stock_daily_${date}.audit.json`),JSON.stringify({
      date,source:'MARKETPARQUET_STOCK_DAILY_SPLIT_ADJUSTED',complete:true,sha256:digest}));
  }
  const report=await auditConfirmedSource({dataRoot,pcHome:path.join(dataRoot,'absent-pc'),now,
    readParquet:async file=>daily(file.match(/\d{4}-\d{2}-\d{2}/)[0])});
  assert.equal(report.localAuditShaMatched,true);
  assert.equal(report.providerAuthenticityVerified,false);
  assert.equal(report.confirmedCandidate.status,'CALCULATED_UNPUBLISHED');
  assert.equal(report.raw['2026-10-30'].fileAudit.status,'LOCAL_AUDIT_SHA_MATCH');
});

test('mismatching persisted SHA prevents even R19 calculation',async t=>{
  const dataRoot=dir();t.after(()=>fs.rmSync(dataRoot,{recursive:true,force:true}));
  const root=path.join(dataRoot,'theme-market-history-r131','marketparquet-r165');
  fs.mkdirSync(root,{recursive:true});
  fs.writeFileSync(path.join(root,'stock_daily_2026-10-30.parquet'),parquetFixture);
  fs.writeFileSync(path.join(root,'stock_daily_2026-10-30.audit.json'),JSON.stringify({
    date:'2026-10-30',source:'MARKETPARQUET_STOCK_DAILY_SPLIT_ADJUSTED',complete:true,sha256:'f'.repeat(64)}));
  const report=await auditConfirmedSource({dataRoot,pcHome:path.join(dataRoot,'absent-pc'),now,
    readParquet:async()=>{throw Error('SHOULD_NOT_DECODE_TAMPERED_FILE')}});
  assert.equal(report.raw['2026-10-30'].status,'SOURCE_AUDIT_FAILED');
  assert.equal(report.confirmedCandidate.status,'WAITING_FOR_FULL_MARKET_SOURCE');
  assert.equal(report.providerCalls,0);
  assert.equal(report.localWrites,0);
});
