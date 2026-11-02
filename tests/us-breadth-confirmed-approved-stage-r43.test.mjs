import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareFullMarketStaging,publishFullMarketStaging}
  from '../scripts/pc-writer/us-breadth-confirmed-staging-r20.mjs';
import {publishApprovedR2StageR43,r43CliOptions}
  from '../scripts/pc-writer/us-breadth-confirmed-approved-stage-r43.mjs';

const date='2026-10-30',previous='2026-10-29';
const now=Date.parse('2026-10-30T22:00:00.000Z');
const hash=b=>createHash('sha256').update(b).digest('hex');

async function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r43-stage-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const folder=path.join(root,'us-breadth-confirmed-r2','marketparquet-stock-daily');
  fs.mkdirSync(folder,{recursive:true});
  const source={};
  for(const day of [previous,date]){
    const bytes=Buffer.from(`PAR1MarketParquet-${day}-sourcePAR1`);
    fs.writeFileSync(path.join(folder,`stock_daily_${day}.parquet`),bytes);
    source[day]=hash(bytes);
  }
  const manifestDay=day=>({date:day,provider:'MarketParquet',feed:'stock_daily',
    priceMode:'SPLIT_ADJUSTED_DIVIDEND_UNADJUSTED',complete:true,
    path:path.join(folder,`stock_daily_${day}.parquet`),sha256:source[day]});
  const rows={
    [previous]:[{date:previous,symbol:'AAA',asset_type:'Stock',close:100,volume:100},
      {date:previous,symbol:'BBB',asset_type:'Stock',close:100,volume:100},
      {date:previous,symbol:'CCC',asset_type:'Stock',close:10,volume:100}],
    [date]:[{date,symbol:'AAA',asset_type:'Stock',close:110,volume:100},
      {date,symbol:'BBB',asset_type:'Stock',close:90,volume:100},
      {date,symbol:'CCC',asset_type:'Stock',close:10,volume:100},
      {date,symbol:'NEW',asset_type:'Stock',close:20,volume:100}],
  };
  const readParquet=bytes=>rows[bytes.toString().includes(previous)?previous:date];
  const prepare=args=>prepareFullMarketStaging({...args,readParquet});
  const body=(await prepare({approvedSourceRoot:root,
    manifest:{previous:manifestDay(previous),current:manifestDay(date)},
    now:new Date(now)})).body;
  assert.ok(body);
  const approvedSourceSha256={previous:source[previous],current:source[date]};
  const inspected={status:'R42_LOCAL_PREFLIGHT_READY_OPERATOR_APPROVAL_REQUIRED',
    providerAuthenticityVerified:true,providerCalls:3,previousDate:previous,
    observationDate:date,independentlyVerifiedSourceSha256:approvedSourceSha256,
    localStagingCandidateSha256:hash(JSON.stringify(body)),
    risingPct:25,fallingPct:25,unchangedPct:50,sourcePairCoveragePct:75};
  const rowsD1=new Map(),writes=[];
  const remote={
    async query(db,sql,params){assert.equal(db,'CORE_TEST');
      assert.match(sql,/^SELECT body,stored_at FROM market_public_snapshots_v1/);
      return {results:rowsD1.has(params[0])?[rowsD1.get(params[0])]:[]};},
    async request(db,batch){assert.equal(db,'CORE_TEST');
      for(const {sql,params} of batch){
        assert.match(sql,/^INSERT INTO market_public_snapshots_v1/);
        writes.push(params[0]);
        rowsD1.set(params[0],{body:params[1],stored_at:params[2]});
      }
      return [];},
  };
  const calls={inspect:0,openD1:0};
  const inspect=async()=>{calls.inspect++;return inspected;};
  const openD1=async()=>{calls.openD1++;return {remote,database:'CORE_TEST'};};
  const opts={dataRoot:root,pcHome:path.join(root,'pcHome'),observationDate:date,
    approvedSourceSha256,now,inspect,prepare,publish:publishFullMarketStaging,
    openD1,freshNow:()=>now};
  return {opts,inspected,calls,writes,rowsD1,root,folder};
}

test('R43 explicit Y writes ONLY R2 staging, reads exact row SHA, emits percent only',async t=>{
  const f=await fixture(t);
  const before=fs.readdirSync(f.folder).sort();
  const result=await publishApprovedR2StageR43({...f.opts,
    allowD1StageWrite:true,operatorConfirmation:'Y'});
  assert.equal(result.status,'R43_VERIFIED_STAGING_ONLY');
  assert.equal(result.stageReadbackVerified,true);
  assert.equal(result.publicationAllowed,false);
  assert.equal(result.finalWriteEnabled,false);
  assert.equal(result.d1Writes,1);
  assert.equal(result.providerCalls,3);
  assert.deepEqual(f.writes,['public:market-breadth-confirmed-r2:usa:staging']);
  assert.equal(result.d1StagingBodySha256,
    hash(f.rowsD1.get(result.stagingKey).body));
  assert.equal(result.risingPct,25);
  assert.equal(result.fallingPct,25);
  assert.equal(result.unchangedPct,50);
  for(const key of ['counts','expectedCount','eligibleCount','imputedUnchangedCount',
    'path','raw','config','token','apiKey'])assert.equal(Object.hasOwn(result,key),false);
  assert.deepEqual(fs.readdirSync(f.folder).sort(),before);
});

test('no operator Y, no exact source SHA, or R42 mismatch means no D1 access',async t=>{
  const f=await fixture(t);
  const absent=await publishApprovedR2StageR43({...f.opts,operatorConfirmation:'N',
    allowD1StageWrite:true});
  assert.equal(absent.status,'R43_OPERATOR_Y_AND_STAGE_WRITE_FLAG_REQUIRED');
  const wrong=await publishApprovedR2StageR43({...f.opts,operatorConfirmation:'Y',
    allowD1StageWrite:true,approvedSourceSha256:{previous:'0'.repeat(64),
      current:f.opts.approvedSourceSha256.current}});
  assert.equal(wrong.status,'R43_R42_SOURCE_APPROVAL_MISMATCH');
  assert.equal(f.calls.openD1,0);
  assert.equal(f.writes.length,0);
});

test('stale approved observation date fails before provider or D1',async t=>{
  const f=await fixture(t);
  const r=await publishApprovedR2StageR43({...f.opts,now:Date.parse('2026-11-04T22:00:00Z'),
    operatorConfirmation:'Y',allowD1StageWrite:true});
  assert.equal(r.status,'R43_APPROVED_DATE_NOT_LATEST_COMPLETED');
  assert.equal(f.calls.inspect,0);
  assert.equal(f.calls.openD1,0);
});

test('existing staging is unchanged on repeat or same-day source conflict',async t=>{
  const f=await fixture(t),args={...f.opts,operatorConfirmation:'Y',allowD1StageWrite:true};
  const first=await publishApprovedR2StageR43(args);
  assert.equal(first.status,'R43_VERIFIED_STAGING_ONLY');
  const second=await publishApprovedR2StageR43(args);
  assert.equal(second.status,'R43_VERIFIED_STAGING_ONLY');
  assert.equal(second.d1Writes,0);
  assert.equal(f.writes.length,1);
  const stored=f.rowsD1.get(first.stagingKey);
  f.rowsD1.set(first.stagingKey,{...stored,body:stored.body.replace('"CANDIDATE"','"READY"')});
  const third=await publishApprovedR2StageR43(args);
  assert.equal(third.status,'UNKNOWN_STAGING_RECORD_PRESERVED');
  assert.equal(third.d1Writes,0);
  assert.equal(f.writes.length,1);
});

test('R43 CLI permits only exact approved staging arguments',()=>{
  const p='a'.repeat(64),c='b'.repeat(64);
  assert.deepEqual(r43CliOptions(['--stage-approved','--allow-d1-stage-write',
    '--observation-date',date,'--previous-sha256',p,'--current-sha256',c]),{
    observationDate:date,approvedSourceSha256:{previous:p,current:c},
    allowD1StageWrite:true});
  assert.equal(r43CliOptions(['--stage-approved']),null);
});
