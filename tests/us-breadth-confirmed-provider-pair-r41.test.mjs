import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifyMarketParquetLocalPairR41}
  from '../scripts/pc-writer/us-breadth-confirmed-provider-pair-r41.mjs';

const dates=['2026-10-29','2026-10-30'];
const now=new Date('2026-10-30T22:00:00.000Z');
const folderName='us-breadth-confirmed-r2/marketparquet-stock-daily';
const sha=b=>createHash('sha256').update(b).digest('hex');

function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r41-pair-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const folder=path.join(root,folderName);
  fs.mkdirSync(folder,{recursive:true});
  const bytesByDate={};
  for(const date of dates){
    const name=`stock_daily_${date}`;
    const bytes=Buffer.from(`PAR1MarketParquet-${date}-R31PAR1`);
    bytesByDate[date]=bytes;
    fs.writeFileSync(path.join(folder,name+'.parquet'),bytes);
    fs.writeFileSync(path.join(folder,name+'.audit.json'),JSON.stringify({
      revision:'US_BREADTH_CONFIRMED_DOWNLOAD_R31',
      source:'MARKETPARQUET_STOCK_DAILY_OFFICIAL_PRESIGNED',
      provider:'MarketParquet',feed:'stock_daily',
      priceMode:'SPLIT_ADJUSTED_DIVIDEND_UNADJUSTED',
      relativePath:`${folderName}/${name}.parquet`,date,
      sha256:sha(bytes),bytes:bytes.length,complete:true,
      providerShaProvided:false,providerAuthenticityVerified:false,
    }));
  }
  const rowsByDate={
    [dates[0]]:[
      {date:dates[0],symbol:'AAA',asset_type:'Stock',close:100,volume:100},
      {date:dates[0],symbol:'BBB',asset_type:'Stock',close:100,volume:100},
      {date:dates[0],symbol:'CCC',asset_type:'Stock',close:10,volume:100},
    ],
    [dates[1]]:[
      {date:dates[1],symbol:'AAA',asset_type:'Stock',close:110,volume:100},
      {date:dates[1],symbol:'BBB',asset_type:'Stock',close:90,volume:100},
      {date:dates[1],symbol:'CCC',asset_type:'Stock',close:10,volume:100},
      {date:dates[1],symbol:'NEW',asset_type:'Stock',close:20,volume:100},
    ],
  };
  const readParquet=bytes=>rowsByDate[bytes.toString().includes(dates[0])?dates[0]:dates[1]];
  return {root,folder,bytesByDate,readParquet};
}

function mockProvider(fixture,{corruptDate=null,omitDate=null,status=200}={}){
  const calls=[];
  const signedUrl=date=>`https://test-data.r2.cloudflarestorage.com/stock_daily_${date}.parquet?X-Amz-Signature=abc123`;
  const fetchImpl=async(input,options)=>{
    const url=String(input),isManifest=url.includes('marketparquet.com/api/v1/manifest/');
    calls.push({isManifest,redirect:options?.redirect,auth:options?.headers?.Authorization??null});
    if(isManifest){
      if(status!==200)return new Response(null,{status});
      return Response.json({asset_type:'stock_daily',start:dates[0],end:dates[1],
        file_count:omitDate?1:2,files:dates.filter(d=>d!==omitDate).map(date=>({
          date,filename:`stock_daily_${date}.parquet`,
          file_size_bytes:fixture.bytesByDate[date].length,download_url:signedUrl(date),
        }))});
    }
    const date=dates.find(d=>url.includes(d));
    if(!date)throw Error('INVALID_FAKE_URL');
    const bytes=corruptDate===date
      ?Buffer.from(fixture.bytesByDate[date].toString().replace('MarketParquet','MarketCorrupt'))
      :fixture.bytesByDate[date];
    return new Response(bytes,{headers:{'content-length':String(bytes.length)}});
  };
  return {fetchImpl,calls};
}

test('independently matches only stored adjacent pair: percent-only, three GET, no writes',async t=>{
  const f=fixture(t),provider=mockProvider(f);
  const before=fs.readdirSync(f.folder).sort();
  const r=await verifyMarketParquetLocalPairR41({dataRoot:f.root,now,
    apiKey:'test-secret',fetchImpl:provider.fetchImpl,readParquet:f.readParquet});
  assert.equal(r.status,'PROVIDER_BYTES_MATCHED_LOCAL_PAIR');
  assert.equal(r.providerAuthenticityVerified,true);
  assert.equal(r.publicationAllowed,false);
  assert.equal(r.providerCalls,3);
  assert.equal(r.downloadCalls,2);
  assert.equal(r.risingPct,25);
  assert.equal(r.fallingPct,25);
  assert.equal(r.unchangedPct,50);
  assert.equal(r.sourcePairCoveragePct,75);
  assert.equal(r.providerMatchedSha256.previous,sha(f.bytesByDate[dates[0]]));
  assert.equal(r.providerMatchedSha256.current,sha(f.bytesByDate[dates[1]]));
  assert.deepEqual(r.independentlyVerifiedDates,dates);
  for(const key of ['counts','expectedCount','eligibleCount','path','raw','prices',
    'download_url','manifest','apiKey'])assert.equal(Object.hasOwn(r,key),false);
  for(const key of ['d1Reads','d1Writes','localWrites','coreTaskChanges','lockPidActions'])
    assert.equal(r[key],0);
  assert.deepEqual(fs.readdirSync(f.folder).sort(),before);
  assert.equal(provider.calls.length,3);
  assert.ok(provider.calls.every(c=>c.redirect==='manual'));
});

test('a stale local pair can be verified without claiming current publication readiness',async t=>{
  const f=fixture(t),provider=mockProvider(f);
  const r=await verifyMarketParquetLocalPairR41({dataRoot:f.root,
    now:new Date('2026-11-04T22:00:00.000Z'),apiKey:'test-secret',
    fetchImpl:provider.fetchImpl,readParquet:f.readParquet});
  assert.equal(r.status,'PROVIDER_BYTES_MATCHED_LOCAL_PAIR');
  assert.equal(r.sourcePairIsLatestCompleted,false);
  assert.equal(r.publicationAllowed,false);
});

test('provider byte mismatch, incomplete manifest, and HTTP 429 fail closed',async t=>{
  const f=fixture(t);
  for(const [options,expected] of [
    [{corruptDate:dates[0]},'PROVIDER_LOCAL_SHA_MISMATCH'],
    [{omitDate:dates[0]},'PROVIDER_MANIFEST_MISSING_SESSION'],
    [{status:429},'PROVIDER_RATE_LIMITED'],
  ]){
    const provider=mockProvider(f,options);
    const r=await verifyMarketParquetLocalPairR41({dataRoot:f.root,now,
      apiKey:'test-secret',fetchImpl:provider.fetchImpl,readParquet:f.readParquet});
    assert.equal(r.status,expected);
    assert.equal(r.providerAuthenticityVerified,false);
    assert.equal(r.publicationAllowed,false);
    assert.equal(r.d1Writes,0);
  }
});

test('tampered R31 local audit and absent provider key make no provider calls',async t=>{
  const f=fixture(t),provider=mockProvider(f);
  const keyless=await verifyMarketParquetLocalPairR41({dataRoot:f.root,now,
    apiKey:'',pcHome:path.join(f.root,'missing'),fetchImpl:provider.fetchImpl,
    readParquet:f.readParquet});
  assert.equal(keyless.status,'PROVIDER_API_KEY_NOT_CONFIGURED');
  assert.equal(keyless.providerCalls,0);
  const auditPath=path.join(f.folder,`stock_daily_${dates[1]}.audit.json`);
  const audit=JSON.parse(fs.readFileSync(auditPath,'utf8'));
  audit.sha256='0'.repeat(64);
  fs.writeFileSync(auditPath,JSON.stringify(audit));
  const tampered=await verifyMarketParquetLocalPairR41({dataRoot:f.root,now,
    apiKey:'test-secret',fetchImpl:provider.fetchImpl,readParquet:f.readParquet});
  assert.equal(tampered.status,'R40_LOCAL_PREVIEW_REQUIRED');
  assert.equal(tampered.providerCalls,0);
  assert.equal(provider.calls.length,0);
});
