import test from 'node:test';
import assert from 'node:assert/strict';
import {fullMarketYearSessions} from '../scripts/pc-writer/us-breadth-confirmed-year-inventory-r22.mjs';
import {probeAvailableStockDailyYear,summarizeAvailableStockDailyManifest}
 from '../scripts/pc-writer/us-breadth-confirmed-availability-r29.mjs';

const now=new Date('2026-11-01T12:00:00Z');
const dates=fullMarketYearSessions({now,sessionCount:3});
const signed=date=>`https://bucket.r2.cloudflarestorage.com/file?X-Amz-Signature=${date}`;
const manifest=available=>({asset_type:'stock_daily',start:dates[0],
 end:dates.at(-1),file_count:available.length,
 files:available.map(date=>({date,filename:`stock_daily_${date}.parquet`,
  file_size_bytes:250_000,download_url:signed(date)}))});
const jsonResponse=body=>({status:200,headers:{get:()=>null},
 text:async()=>JSON.stringify(body)});

test('R29 accepts complete 251-style date contracts without downloading any files',async()=>{
 const original=manifest(dates);
 let calls=0;
 const report=await probeAvailableStockDailyYear({now,sessionCount:3,apiKey:'do-not-print',
  fetchImpl:async(url,options)=>{
   calls++;
   assert.equal(url.hostname,'marketparquet.com');
   assert.equal(url.searchParams.get('start'),dates[0]);
   assert.equal(options.redirect,'manual');
   assert.equal(options.headers.Authorization,'Bearer do-not-print');
   return jsonResponse(original);
  }});
 assert.equal(calls,1);
 assert.equal(report.status,'PROVIDER_YEAR_AVAILABLE');
 assert.equal(report.availableDates,4);
 assert.equal(report.missingDatesCount,0);
 assert.equal(report.providerCalls,1);
 assert.equal(report.downloadCalls,0);
 assert.equal(report.localWrites,0);
 assert.equal(report.remoteWrites,0);
 assert.equal(report.publicationAllowed,false);
 assert.equal(report.providerShaProvided,false);
 assert.ok(!JSON.stringify(report).includes('do-not-print'));
 assert.ok(!JSON.stringify(report).includes('X-Amz-Signature'));
});

test('R29 distinguishes a missing first session from a complete chart',()=>{
 const report=summarizeAvailableStockDailyManifest(manifest(dates.slice(1)),dates);
 assert.equal(report.status,'PROVIDER_YEAR_PARTIAL');
 assert.equal(report.availableDates,3);
 assert.equal(report.firstMissingDate,dates[0]);
 assert.equal(report.missingDatesCount,1);
});

test('R29 rejects duplicate dates, malformed signed URLs, and unexpected days',()=>{
 const duplicate=manifest([...dates.slice(0,2),dates[1]]);
 assert.equal(summarizeAvailableStockDailyManifest(duplicate,dates).ok,false);
 const malformed=manifest(dates);
 malformed.files[0].download_url='http://untrusted.example/file';
 assert.equal(summarizeAvailableStockDailyManifest(malformed,dates).ok,false);
 const outOfRange=manifest([...dates.slice(0,3),'2020-01-01']);
 assert.equal(summarizeAvailableStockDailyManifest(outOfRange,dates).ok,false);
});

test('R29 no-key and 403 fail closed without download or leakage',async()=>{
 const noKey=await probeAvailableStockDailyYear({now,sessionCount:3,apiKey:'',
  pcHome:'/definitely-missing-pc-home',fetchImpl:()=>{throw Error('must not call fetch');}});
 assert.equal(noKey.status,'PROVIDER_API_KEY_NOT_CONFIGURED');
 assert.equal(noKey.providerCalls,0);
 const auth=await probeAvailableStockDailyYear({now,sessionCount:3,apiKey:'secret',
  fetchImpl:async()=>({status:403})});
 assert.equal(auth.status,'PROVIDER_AUTH_OR_WINDOW_UNAVAILABLE');
 assert.equal(auth.providerCalls,1);
 assert.ok(!JSON.stringify(auth).includes('secret'));
});
