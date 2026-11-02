import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareFullMarketStaging}
  from '../scripts/pc-writer/us-breadth-confirmed-staging-r20.mjs';
import {promoteApprovedR2FinalR44,r44CliOptions}
  from '../scripts/pc-writer/us-breadth-confirmed-approved-final-r44.mjs';

const observationDate='2026-10-30',previousDate='2026-10-29';
const now=Date.parse('2026-10-30T22:30:00Z');
const hash=s=>createHash('sha256').update(s).digest('hex');
const stagingKey='public:market-breadth-confirmed-r2:usa:staging';
const currentKey='public:market-breadth-confirmed-r2:usa:current';
const dailyKey='public:market-breadth-confirmed-r2:usa:daily:2026-10-30';

async function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r44-final-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const folder=path.join(root,'marketparquet');fs.mkdirSync(folder);
  const rows={
    [previousDate]:[
      {date:previousDate,symbol:'AAA',asset_type:'Stock',close:100,volume:100},
      {date:previousDate,symbol:'BBB',asset_type:'Stock',close:100,volume:100},
      {date:previousDate,symbol:'CCC',asset_type:'Stock',close:10,volume:100},
    ],
    [observationDate]:[
      {date:observationDate,symbol:'AAA',asset_type:'Stock',close:110,volume:100},
      {date:observationDate,symbol:'BBB',asset_type:'Stock',close:90,volume:100},
      {date:observationDate,symbol:'CCC',asset_type:'Stock',close:10,volume:100},
      {date:observationDate,symbol:'NEW',asset_type:'Stock',close:20,volume:100},
    ],
  };
  const entry=day=>{
    const bytes=Buffer.from(`PAR1date=${day};PAR1`);
    const file=path.join(folder,`stock_daily_${day}.parquet`);
    fs.writeFileSync(file,bytes);
    return {date:day,provider:'MarketParquet',feed:'stock_daily',
      priceMode:'SPLIT_ADJUSTED_DIVIDEND_UNADJUSTED',complete:true,path:file,
      sha256:hash(bytes)};
  };
  const manifest={previous:entry(previousDate),current:entry(observationDate)};
  const readParquet=bytes=>rows[bytes.toString().includes(previousDate)?previousDate:observationDate];
  const prepared=await prepareFullMarketStaging({approvedSourceRoot:root,manifest,
    now:new Date(now-1000),readParquet});
  assert.equal(prepared.status,'PREPARED_STAGING_ONLY');
  const stagingBody=JSON.stringify(prepared.body);
  const approvedStagingBodySha256=hash(stagingBody);
  const approvedSourceSha256={previous:manifest.previous.sha256,
    current:manifest.current.sha256};
  const rowsD1=new Map([[stagingKey,{body:stagingBody,stored_at:now-1000}]]);
  const writes=[];
  const remote={
    async query(db,sql,params){assert.equal(db,'CORE_TEST');
      assert.match(sql,/^SELECT body,stored_at FROM market_public_snapshots_v1/);
      const row=rowsD1.get(params[0]);return {results:row?[row]:[]};},
    async request(db,batch){assert.equal(db,'CORE_TEST');
      for(const {sql,params} of batch){
        assert.match(sql,/^INSERT INTO market_public_snapshots_v1/);
        writes.push(params[0]);
        const old=rowsD1.get(params[0]);
        if((old?.stored_at??-1)!==params[3]||(old?.body??'')!==params[4])
          continue;
        rowsD1.set(params[0],{body:params[1],stored_at:params[2]});
      }
      return [];},
  };
  let opened=0;
  const openD1=async()=>{opened++;return {remote,database:'CORE_TEST'};};
  const options={observationDate,approvedStagingBodySha256,
    approvedSourceSha256,allowD1FinalWrite:true,operatorConfirmation:'Y',
    pcHome:root,now,freshNow:()=>now,openD1};
  return {options,rowsD1,writes,get opened(){return opened;}};
}

test('R44 approved staging SHA promotes ONLY current and daily with exact readback',async t=>{
  const f=await fixture(t);
  const result=await promoteApprovedR2FinalR44(f.options);
  assert.equal(result.status,'R44_VERIFIED_CURRENT_AND_DAILY_FINAL');
  assert.equal(result.readbackVerified,true);
  assert.equal(result.publicationAllowed,true);
  assert.equal(result.d1Writes,2);
  assert.deepEqual(f.writes,[currentKey,dailyKey]);
  assert.equal(f.rowsD1.get(currentKey).body,f.rowsD1.get(dailyKey).body);
  assert.equal(result.risingPct,25);
  assert.equal(result.fallingPct,25);
  assert.equal(result.unchangedPct,50);
  for(const key of ['counts','expectedCount','eligibleCount','sourceRows','apiKey',
    'config','token','path'])assert.equal(Object.hasOwn(result,key),false);
});

test('a repeat final with same SHA is idempotent and never rewrites R1 or history',async t=>{
  const f=await fixture(t);
  assert.equal((await promoteApprovedR2FinalR44(f.options)).d1Writes,2);
  const again=await promoteApprovedR2FinalR44(f.options);
  assert.equal(again.status,'R44_VERIFIED_CURRENT_AND_DAILY_FINAL');
  assert.equal(again.d1Writes,0);
  assert.deepEqual(f.writes,[currentKey,dailyKey]);
});

test('incorrect approved staging SHA or missing Y cannot publish',async t=>{
  const f=await fixture(t);
  const no=await promoteApprovedR2FinalR44({...f.options,operatorConfirmation:'N'});
  assert.equal(no.status,'R44_OPERATOR_Y_AND_FINAL_WRITE_FLAG_REQUIRED');
  assert.equal(f.opened,0);
  const wrong=await promoteApprovedR2FinalR44({...f.options,
    approvedStagingBodySha256:'0'.repeat(64)});
  assert.equal(wrong.status,'STAGING_APPROVAL_SHA_MISMATCH');
  assert.equal(f.writes.length,0);
});

test('stale approved day is blocked before CORE D1 access',async t=>{
  const f=await fixture(t);
  const stale=await promoteApprovedR2FinalR44({...f.options,
    freshNow:()=>Date.parse('2026-11-04T22:00:00Z')});
  assert.equal(stale.status,'R44_APPROVED_DATE_NOT_LATEST_COMPLETED');
  assert.equal(f.opened,0);
  assert.equal(f.writes.length,0);
});

test('R44 CLI only accepts exact 3-SHA approved final arguments',()=>{
  const s='a'.repeat(64),p='b'.repeat(64),c='c'.repeat(64);
  assert.deepEqual(r44CliOptions(['--final-approved','--allow-d1-final-write',
    '--observation-date',observationDate,'--staging-sha256',s,
    '--previous-sha256',p,'--current-sha256',c]),{
    observationDate,approvedStagingBodySha256:s,
    approvedSourceSha256:{previous:p,current:c},allowD1FinalWrite:true});
  assert.equal(r44CliOptions(['--final-approved']),null);
});
