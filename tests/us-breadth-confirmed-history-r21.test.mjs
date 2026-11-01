import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareFullMarketYearPreview} from '../scripts/pc-writer/us-breadth-confirmed-history-r21.mjs';
import {US_BREADTH_CURRENT_KEY,US_BREADTH_DAILY_KEY_PREFIX} from '../lib/market-breadth/us-public-r1.mjs';
import {US_FULL_MARKET_STAGING_KEY} from '../lib/market-breadth/us-marketparquet-confirmed-public-r2.mjs';

const dates=['2026-10-27','2026-10-28','2026-10-29','2026-10-30'];
const priceByDay=[100,101,99,102];
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r21-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const manifestEntries=dates.map((date,i)=>{
    const file=path.join(root,`stock_daily_${date}.parquet`);
    const bytes=Buffer.from(`PAR1:${i}:R21:PAR1`);fs.writeFileSync(file,bytes);
    return {date,provider:'MarketParquet',feed:'stock_daily',complete:true,
      priceMode:'SPLIT_ADJUSTED_DIVIDEND_UNADJUSTED',path:file,
      sha256:createHash('sha256').update(bytes).digest('hex'),rowCount:6500};
  });
  const readParquet=async bytes=>{
    const i=Number(bytes.toString().match(/PAR1:(\d+):R21/)[1]);
    return Array.from({length:6500},(_,j)=>({date:dates[i],symbol:`S${j}`,
      asset_type:'Stock',close:priceByDay[i],volume:1000}));
  };
  return {root,manifestEntries,readParquet};
}

test('full-market new history computes distinct session points without touching R1 250-day history',async t=>{
  const f=fixture(t);
  const history=await prepareFullMarketYearPreview({approvedSourceRoot:f.root,
    manifestEntries:f.manifestEntries,readParquet:f.readParquet,sessionCount:3});
  assert.equal(history.prepared,true);
  assert.equal(history.points.length,3);
  assert.deepEqual(history.points.map(x=>[x.rising,x.falling]),[[6500,0],[0,6500],[6500,0]]);
  assert.equal(history.points.every(x=>x.expectedCount===6500&&x.imputedUnchangedCount===0),true);
  assert.equal(history.publicationStage,'PREVIEW_ONLY');
  assert.equal(history.points.at(-1).date,'2026-10-30');
  assert.equal(US_FULL_MARKET_STAGING_KEY.startsWith(US_BREADTH_DAILY_KEY_PREFIX),false);
  assert.notEqual(US_BREADTH_CURRENT_KEY,US_FULL_MARKET_STAGING_KEY);
});

test('a missing trading session rejects the entire year preview without returning partial chart',async t=>{
  const f=fixture(t);f.manifestEntries.splice(1,1);
  const result=await prepareFullMarketYearPreview({approvedSourceRoot:f.root,
    manifestEntries:f.manifestEntries,readParquet:f.readParquet,sessionCount:2});
  assert.equal(result.status,'NON_ADJACENT_HISTORY_SESSIONS');
  assert.equal(result.prepared,false);
  assert.equal('points' in result,false);
});

test('source corruption and insufficient 250-session manifest reject history',async t=>{
  const f=fixture(t);
  assert.equal((await prepareFullMarketYearPreview({approvedSourceRoot:f.root,
    manifestEntries:f.manifestEntries})).status,'COMPLETE_HISTORY_MANIFEST_REQUIRED');
  f.manifestEntries[1].sha256='b'.repeat(64);
  const result=await prepareFullMarketYearPreview({approvedSourceRoot:f.root,
    manifestEntries:f.manifestEntries,readParquet:f.readParquet,sessionCount:3});
  assert.equal(result.status,'HISTORY_SOURCE_NOT_VERIFIED');
  assert.equal(result.prepared,false);
  assert.equal('points' in result,false);
});
