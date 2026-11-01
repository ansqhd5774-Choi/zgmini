import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {rollingParquetDecoder,prepareProviderVerifiedYearPreview,publicYearPreviewSummary}
 from '../scripts/pc-writer/us-breadth-confirmed-year-preview-r25.mjs';
import {US_BREADTH_CURRENT_KEY,US_BREADTH_DAILY_KEY_PREFIX}
 from '../lib/market-breadth/us-public-r1.mjs';

const dates=['2026-10-27','2026-10-28','2026-10-29','2026-10-30'];
const prices=[100,101,99,102];
const digest=b=>createHash('sha256').update(b).digest('hex');

function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r25-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const dataRoot=path.join(dir,'data'),pcHome=path.join(dir,'pc');
 fs.mkdirSync(dataRoot,{recursive:true});
 const entries=dates.map((date,i)=>{
  const file=path.join(dataRoot,`stock_daily_${date}.parquet`);
  const bytes=Buffer.from(`PAR1:R25:${i}:PAR1`);
  fs.writeFileSync(file,bytes);
  return {date,provider:'MarketParquet',feed:'stock_daily',complete:true,
   priceMode:'SPLIT_ADJUSTED_DIVIDEND_UNADJUSTED',path:file,
   sha256:digest(bytes),rowCount:i===0?6499:6500};
 });
 const verified={status:'PROVIDER_BYTES_MATCHED_ALL_DATES',providerAuthenticityVerified:true,
  candidateManifestEntries:entries,approvedR21ManifestEntries:null,providerCalls:5};
 let decodes=0;
 const readParquet=async bytes=>{
  decodes++;
  const i=Number(bytes.toString().match(/R25:(\d+)/)[1]);
  return Array.from({length:i===0?6499:6500},(_,j)=>({date:dates[i],symbol:`S${j}`,
   asset_type:'Stock',close:prices[i],volume:1000}));
 };
 return {dir,dataRoot,pcHome,entries,verified,readParquet,get decodes(){return decodes;}};
}

test('rolling decoder reuses adjacent days and evicts older decoded rows',async()=>{
 let calls=0;
 const decode=rollingParquetDecoder(async()=>{calls++;return [{price:calls}];});
 const a=Buffer.from('a'),b=Buffer.from('b'),c=Buffer.from('c');
 assert.equal((await decode(a))[0].price,1);
 assert.equal((await decode(b))[0].price,2);
 assert.equal((await decode(a))[0].price,1);
 assert.equal((await decode(c))[0].price,3);
 assert.equal((await decode(a))[0].price,1);
 assert.equal(calls,3);
});

test('verified provider files yield 3 unpublished R2 chart points with missing-previous-price unchanged',async t=>{
 const f=fixture(t);
 const report=await prepareProviderVerifiedYearPreview({dataRoot:f.dataRoot,pcHome:f.pcHome,
  now:new Date('2026-11-01T12:00:00Z'),sessionCount:3,
  verifyProvider:async()=>f.verified,readParquet:f.readParquet});
 assert.equal(report.status,'YEAR_PREVIEW_READY_UNPUBLISHED');
 assert.equal(report.publicationAllowed,false);
 assert.equal(report.manualReviewRequired,true);
 assert.equal(report.chart.points.length,3);
 assert.equal(f.decodes,4,'each stored date is decoded once via two-day cache');
 assert.deepEqual(report.chart.points.map(x=>[x.rising,x.falling,x.unchanged]),
  [[6499,0,1],[0,6500,0],[6500,0,0]]);
 assert.equal(report.chart.points[0].imputedUnchangedCount,1);
 assert.equal(report.chart.points[0].expectedCount,6500);
 const visible=JSON.stringify(publicYearPreviewSummary(report));
 assert.doesNotMatch(visible,/stock_daily_\d{4}-\d{2}-\d{2}\.parquet|SECRET|X-Amz-Signature/i);
 assert.equal(publicYearPreviewSummary(report).points.length,3);
 assert.deepEqual(Object.keys(publicYearPreviewSummary(report).points[0]).sort(),
  ['date','risingPct','fallingPct','unchangedPct'].sort());
 assert.doesNotMatch(visible,/expectedCount|imputedUnchangedCount|observedComparableCount|"counts"/);
 assert.notEqual(US_BREADTH_CURRENT_KEY,'public:market-breadth-confirmed-r2:usa:current');
 assert.equal(US_BREADTH_DAILY_KEY_PREFIX.startsWith('public:market-breadth-confirmed-r2:'),false);
});

test('unverified provider or missing 251 entries fails without reading any price bytes',async t=>{
 const f=fixture(t);
 const denied=await prepareProviderVerifiedYearPreview({dataRoot:f.dataRoot,pcHome:f.pcHome,
  sessionCount:3,verifyProvider:async()=>({...f.verified,providerAuthenticityVerified:false}),
  readParquet:f.readParquet});
 assert.equal(denied.status,'PREVIEW_PROVIDER_NOT_VERIFIED');
 assert.equal(f.decodes,0);
 const partial=await prepareProviderVerifiedYearPreview({dataRoot:f.dataRoot,pcHome:f.pcHome,
  sessionCount:3,verifyProvider:async()=>({...f.verified,candidateManifestEntries:f.entries.slice(1)}),
  readParquet:f.readParquet});
 assert.equal(partial.prepared,false);
 assert.equal(f.decodes,0);
});

test('stored source outside approved data root cannot feed preview',async t=>{
 const f=fixture(t);
 const outside=path.join(f.dir,'foreign-stock_daily_2026-10-27.parquet');
 fs.writeFileSync(outside,Buffer.from('PAR1:foreign:PAR1'));
 const entries=[{...f.entries[0],path:outside},...f.entries.slice(1)];
 const result=await prepareProviderVerifiedYearPreview({dataRoot:f.dataRoot,pcHome:f.pcHome,
  sessionCount:3,verifyProvider:async()=>({...f.verified,candidateManifestEntries:entries}),
  readParquet:f.readParquet});
 assert.equal(result.status,'PREVIEW_SOURCE_ROOT_NOT_APPROVED');
 assert.equal(result.publicationAllowed,false);
 assert.equal(f.decodes,0);
});
