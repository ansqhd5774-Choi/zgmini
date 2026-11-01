import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fullMarketYearSessions,auditFullMarketYearInventory}
 from '../scripts/pc-writer/us-breadth-confirmed-year-inventory-r22.mjs';

const now=new Date('2026-10-31T04:00:00Z');
const data=Buffer.from('PAR1:MARKETPARQUET_READONLY_FIXTURE:PAR1');
const sha=createHash('sha256').update(data).digest('hex');

function fixture(t){
  const dataRoot=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-year-r22-'));
  t.after(()=>fs.rmSync(dataRoot,{recursive:true,force:true}));
  const pcHome=path.join(dataRoot,'pc-writer');
  const stockRoot=path.join(dataRoot,'theme-market-history-r131','marketparquet-r165');
  fs.mkdirSync(stockRoot,{recursive:true});
  const dates=fullMarketYearSessions({now,sessionCount:3});
  const write=(date,{audited=true,alteredSha=false}={})=>{
    const file=path.join(stockRoot,`stock_daily_${date}.parquet`);
    fs.writeFileSync(file,data);
    if(audited)fs.writeFileSync(file.replace(/\.parquet$/,'.audit.json'),JSON.stringify({
      date,source:'MARKETPARQUET_STOCK_DAILY_SPLIT_ADJUSTED',complete:true,
      sha256:alteredSha?'f'.repeat(64):sha}));
    return file;
  };
  return {dataRoot,pcHome,stockRoot,dates,write};
}

test('251 session dates are NYSE/NASDAQ trading-day calendar consecutive and ascending',()=>{
  const dates=fullMarketYearSessions({now});
  assert.equal(dates.length,251);
  assert.equal(dates.at(-1),'2026-10-30');
  assert.equal(dates[0]<dates.at(-1),true);
  assert.equal(dates.every((date,i)=>i===0||date>dates[i-1]),true);
});

test('complete local sha ledger is still not independent provider proof or R21-approved manifest',t=>{
  const f=fixture(t);
  for(const date of f.dates)f.write(date);
  const before=fs.readdirSync(f.stockRoot).sort();
  const r=auditFullMarketYearInventory({...f,now,sessionCount:3});
  assert.equal(r.status,'LOCAL_YEAR_INVENTORY_COMPLETE_PROVIDER_UNVERIFIED');
  assert.equal(r.found,4);
  assert.equal(r.localAuditShaMatched,4);
  assert.equal(r.localComplete,true);
  assert.equal(r.providerAuthenticityVerified,false);
  assert.equal(r.approvedR21ManifestEntries,null);
  assert.equal(r.localWrites,0);
  assert.equal(r.remoteWrites,0);
  assert.equal(r.providerCalls,0);
  assert.deepEqual(fs.readdirSync(f.stockRoot).sort(),before);
});

test('isolated R2 stock_daily audit root is visible without altering legacy roots',t=>{
  const f=fixture(t);
  const isolated=path.join(f.dataRoot,'us-breadth-confirmed-r2','marketparquet-stock-daily');
  fs.mkdirSync(isolated,{recursive:true});
  for(const date of f.dates){
    const file=path.join(isolated,`stock_daily_${date}.parquet`);
    fs.writeFileSync(file,data);
    fs.writeFileSync(file.replace(/\.parquet$/,'.audit.json'),JSON.stringify({
      date,source:'MARKETPARQUET_STOCK_DAILY_OFFICIAL_SIGNED_DOWNLOAD',
      complete:true,sha256:sha}));
  }
  const report=auditFullMarketYearInventory({...f,now,sessionCount:3});
  assert.equal(report.localComplete,true);
  assert.equal(report.found,4);
  assert.equal(report.localAuditShaMatched,4);
  assert.equal(report.providerAuthenticityVerified,false);
  assert.equal(report.providerCalls,0);
  assert.deepEqual(fs.readdirSync(f.stockRoot),[]);
});

test('isolated R2 root junction outside data root is rejected before any trust',t=>{
  const f=fixture(t);
  const external=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-year-r2-external-'));
  t.after(()=>fs.rmSync(external,{recursive:true,force:true}));
  const parent=path.join(f.dataRoot,'us-breadth-confirmed-r2');
  fs.mkdirSync(parent);
  fs.symlinkSync(external,path.join(parent,'marketparquet-stock-daily'),'dir');
  const report=auditFullMarketYearInventory({...f,now,sessionCount:3});
  assert.equal(report.status,'LOCAL_YEAR_INVENTORY_INCOMPLETE');
  assert.equal(report.localComplete,false);
  assert.equal(report.reason,'R2_ROOT_OUTSIDE_DATA_ROOT');
  assert.deepEqual(report.sourceIssues,['R2_ROOT_OUTSIDE_DATA_ROOT']);
  assert.equal(report.localWrites,0);
  assert.equal(report.providerCalls,0);
});

test('missing dates and absent SHA audits are separately reported without creating files',t=>{
  const f=fixture(t);
  f.write(f.dates[0],{audited:false});f.write(f.dates.at(-1));
  const r=auditFullMarketYearInventory({...f,now,sessionCount:3});
  assert.equal(r.status,'LOCAL_YEAR_INVENTORY_INCOMPLETE');
  assert.equal(r.found,2);
  assert.deepEqual(r.missingDates,f.dates.slice(1,-1));
  assert.deepEqual(r.localAuditMissingDates,[f.dates[0]]);
  assert.equal(r.providerAuthenticityVerified,false);
  assert.equal(r.approvedR21ManifestEntries,null);
});

test('digest mismatch or ambiguous stored copy is not silently accepted',t=>{
  const f=fixture(t);
  for(const date of f.dates)f.write(date);
  f.write(f.dates[0],{alteredSha:true});
  const folder=path.join(f.dataRoot,'marketparquet');
  fs.mkdirSync(folder);
  fs.writeFileSync(path.join(folder,`stock_daily_${f.dates[1]}.parquet`),data);
  const r=auditFullMarketYearInventory({...f,now,sessionCount:3});
  assert.equal(r.days[f.dates[0]].status,'LOCAL_AUDIT_MISMATCH');
  assert.equal(r.days[f.dates[1]].status,'AMBIGUOUS_STORED_SOURCE');
  assert.deepEqual(r.sourceIssues,[f.dates[0],f.dates[1]]);
  assert.equal(r.localComplete,false);
});

test('symlink leaving approved existing stock root fails closed',t=>{
  const f=fixture(t);
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-year-outside-r22-'));
  t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
  const external=path.join(outside,`stock_daily_${f.dates[0]}.parquet`);
  fs.writeFileSync(external,data);
  fs.symlinkSync(external,path.join(f.stockRoot,path.basename(external)));
  const r=auditFullMarketYearInventory({...f,now,sessionCount:3});
  assert.equal(r.days[f.dates[0]].status,'SOURCE_SCAN_FAILED');
  assert.equal(r.days[f.dates[0]].reason,'SOURCE_OUTSIDE_APPROVED_ROOT');
  assert.equal(r.approvedR21ManifestEntries,null);
});

test('source sidecar audit symlink outside approved roots is never trusted',t=>{
  const f=fixture(t);
  const source=f.write(f.dates[0],{audited:false});
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-year-audit-outside-r22-'));
  t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
  const outsideAudit=path.join(outside,'untrusted.audit.json');
  fs.writeFileSync(outsideAudit,JSON.stringify({date:f.dates[0],
    source:'MARKETPARQUET_STOCK_DAILY_SPLIT_ADJUSTED',sha256:sha,complete:true}));
  fs.symlinkSync(outsideAudit,source.replace(/\.parquet$/,'.audit.json'));
  const r=auditFullMarketYearInventory({...f,now,sessionCount:3});
  assert.equal(r.days[f.dates[0]].status,'SOURCE_SCAN_FAILED');
  assert.equal(r.days[f.dates[0]].reason,'AUDIT_OUTSIDE_APPROVED_ROOT');
  assert.equal(r.providerAuthenticityVerified,false);
});
