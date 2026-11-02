import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {previewLocalFullMarketPairR40}
  from '../scripts/pc-writer/us-breadth-confirmed-local-pair-preview-r40.mjs';

const source='MARKETPARQUET_STOCK_DAILY_OFFICIAL_PRESIGNED';
const priceMode='SPLIT_ADJUSTED_DIVIDEND_UNADJUSTED';
const currentDate='2026-10-30',priorDate='2026-10-29';
const now=new Date('2026-10-30T22:00:00.000Z');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const namespace='us-breadth-confirmed-r2/marketparquet-stock-daily';

function makeFixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r40-local-pair-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const folder=path.join(root,namespace);
  fs.mkdirSync(folder,{recursive:true});
  for(const date of [priorDate,currentDate]){
    const basename=`stock_daily_${date}`;
    const parquet=Buffer.from(`PAR1local-${date}-R31PAR1`);
    fs.writeFileSync(path.join(folder,basename+'.parquet'),parquet);
    const audit={revision:'US_BREADTH_CONFIRMED_DOWNLOAD_R31',source,
      provider:'MarketParquet',feed:'stock_daily',priceMode,
      relativePath:`${namespace}/${basename}.parquet`,date,
      sha256:hash(parquet),bytes:parquet.length,complete:true,
      providerShaProvided:false,providerAuthenticityVerified:false};
    fs.writeFileSync(path.join(folder,basename+'.audit.json'),JSON.stringify(audit));
  }
  const rowsByDate={
    [priorDate]:[
      {date:priorDate,symbol:'AAA',asset_type:'Stock',close:100,volume:100},
      {date:priorDate,symbol:'BBB',asset_type:'Stock',close:100,volume:100},
      {date:priorDate,symbol:'CCC',asset_type:'Stock',close:10,volume:100}],
    [currentDate]:[
      {date:currentDate,symbol:'AAA',asset_type:'Stock',close:110,volume:100},
      {date:currentDate,symbol:'BBB',asset_type:'Stock',close:90,volume:100},
      {date:currentDate,symbol:'CCC',asset_type:'Stock',close:10,volume:100},
      {date:currentDate,symbol:'NEW',asset_type:'Stock',close:20,volume:100}],
  };
  const readParquet=bytes=>rowsByDate[bytes.toString('utf8').includes(priorDate)?priorDate:currentDate];
  return {root,folder,readParquet};
}

test('R31 latest adjacent pair produces local-only percent shares without D1/provider calls',async t=>{
  const fixture=makeFixture(t),before=fs.readdirSync(fixture.folder).sort();
  const result=await previewLocalFullMarketPairR40({dataRoot:fixture.root,now,
    readParquet:fixture.readParquet});
  assert.equal(result.status,'LOCAL_ONLY_NOT_PROVIDER_AUTHENTICATED');
  assert.equal(result.publicationAllowed,false);
  assert.equal(result.providerAuthenticityVerified,false);
  assert.equal(result.observationDate,currentDate);
  assert.equal(result.previousDate,priorDate);
  assert.equal(result.latestCompletedSession,currentDate);
  assert.equal(result.sourcePairIsLatestCompleted,true);
  assert.equal(result.risingPct,25);
  assert.equal(result.fallingPct,25);
  assert.equal(result.unchangedPct,50);
  assert.equal(result.sourcePairCoveragePct,75);
  assert.match(result.candidateBodySha256,/^[a-f0-9]{64}$/);
  assert.match(result.sourcePairAuditSha256,/^[a-f0-9]{64}$/);
  for(const field of ['expectedCount','eligibleCount','counts','missingCount',
    'imputedUnchangedCount','path','raw','prices','manifest'])
    assert.equal(Object.hasOwn(result,field),false,`not public: ${field}`);
  for(const field of ['providerCalls','d1Reads','d1Writes','localWrites',
    'coreTaskChanges','lockPidActions'])assert.equal(result[field],0,field);
  assert.deepEqual(fs.readdirSync(fixture.folder).sort(),before);
});

test('locally complete older pair previews after market advances without new source days',async t=>{
  const fixture=makeFixture(t);
  const later=new Date('2026-11-04T22:00:00.000Z');
  const result=await previewLocalFullMarketPairR40({dataRoot:fixture.root,now:later,
    readParquet:fixture.readParquet});
  assert.equal(result.status,'LOCAL_ONLY_NOT_PROVIDER_AUTHENTICATED');
  assert.equal(result.observationDate,currentDate);
  assert.equal(result.sourcePairIsLatestCompleted,false);
  assert.equal(result.publicationAllowed,false);
  assert.equal(result.d1Writes,0);
  assert.equal(result.providerCalls,0);
});

test('missing middle/previous day cannot silently use a nonadjacent Parquet pair',async t=>{
  const fixture=makeFixture(t);
  fs.renameSync(path.join(fixture.folder,`stock_daily_${priorDate}.parquet`),
    path.join(fixture.folder,'stock_daily_2026-10-28.parquet'));
  const result=await previewLocalFullMarketPairR40({dataRoot:fixture.root,now,
    readParquet:fixture.readParquet});
  assert.equal(result.status,'R40_LOCAL_PAIR_NOT_VERIFIED');
  assert.equal(result.publicationAllowed,false);
});

test('R31 local audit mismatch fails closed; provider-authenticated flag is never inferred',async t=>{
  const fixture=makeFixture(t);
  const auditPath=path.join(fixture.folder,`stock_daily_${currentDate}.audit.json`);
  const audit=JSON.parse(fs.readFileSync(auditPath,'utf8'));
  audit.sha256='f'.repeat(64);
  fs.writeFileSync(auditPath,JSON.stringify(audit));
  const mismatch=await previewLocalFullMarketPairR40({dataRoot:fixture.root,now,
    readParquet:fixture.readParquet});
  assert.equal(mismatch.status,'R40_LOCAL_PAIR_CALCULATION_UNAVAILABLE');
  assert.equal(mismatch.publicationAllowed,false);
  audit.providerAuthenticityVerified=true;
  fs.writeFileSync(auditPath,JSON.stringify(audit));
  const forged=await previewLocalFullMarketPairR40({dataRoot:fixture.root,now,
    readParquet:fixture.readParquet});
  assert.equal(forged.status,'R40_LOCAL_PAIR_NOT_VERIFIED');
  assert.equal(forged.providerAuthenticityVerified,false);
});

test('future date, absent approved data root and synthetic wrong-date rows fail closed',async t=>{
  const fixture=makeFixture(t);
  const missing=await previewLocalFullMarketPairR40({now,readParquet:fixture.readParquet});
  assert.equal(missing.status,'R40_SOURCE_ROOT_OR_DATE_REQUIRED');
  const wrongDate=await previewLocalFullMarketPairR40({dataRoot:fixture.root,now,
    readParquet:()=>[{date:'2026-10-28',symbol:'AAA',asset_type:'Stock',close:4,volume:1}]});
  assert.equal(wrongDate.status,'R40_LOCAL_PAIR_CALCULATION_UNAVAILABLE');
  assert.equal(wrongDate.publicationAllowed,false);
});
