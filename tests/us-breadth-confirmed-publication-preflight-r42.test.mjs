import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {inspectFullMarketR2PublicationR42}
  from '../scripts/pc-writer/us-breadth-confirmed-publication-preflight-r42.mjs';

const dates=['2026-10-29','2026-10-30'];
const now=new Date('2026-10-30T22:00:00.000Z');
const folderName='us-breadth-confirmed-r2/marketparquet-stock-daily';
const sha=b=>createHash('sha256').update(b).digest('hex');

function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r42-local-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const folder=path.join(root,folderName);
  fs.mkdirSync(folder,{recursive:true});
  const bytesByDate={};
  for(const date of dates){
    const name=`stock_daily_${date}`;
    const bytes=Buffer.from(`PAR1official-${date}-dataPAR1`);
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
  const rows={
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
  const readParquet=b=>rows[b.toString().includes(dates[0])?dates[0]:dates[1]];
  let calls=0;
  const fetchImpl=async(input)=>{
    calls++;
    const text=String(input);
    if(text.includes('marketparquet.com/api/v1/manifest/'))
      return Response.json({asset_type:'stock_daily',start:dates[0],end:dates[1],
        file_count:2,files:dates.map(date=>({date,
          filename:`stock_daily_${date}.parquet`,
          file_size_bytes:bytesByDate[date].length,
          download_url:`https://approved.r2.cloudflarestorage.com/stock_daily_${date}.parquet?X-Amz-Signature=test`,
        }))});
    const date=dates.find(d=>text.includes(d));
    return new Response(bytesByDate[date],
      {headers:{'content-length':String(bytesByDate[date].length)}});
  };
  return {root,folder,readParquet,fetchImpl,bytesByDate,get calls(){return calls;}};
}

test('R42 couples R41 independent 2-day SHA to R20 staging and R22 final shape; no writes',async t=>{
  const f=fixture(t),before=fs.readdirSync(f.folder).sort();
  const result=await inspectFullMarketR2PublicationR42({dataRoot:f.root,now,
    apiKey:'fake-secret',fetchImpl:f.fetchImpl,readParquet:f.readParquet});
  assert.equal(result.status,'R42_LOCAL_PREFLIGHT_READY_OPERATOR_APPROVAL_REQUIRED');
  assert.equal(result.providerAuthenticityVerified,true);
  assert.equal(result.publicationAllowed,false);
  assert.equal(result.readyForOperatorReview,true);
  assert.equal(result.stageWriteEnabled,false);
  assert.equal(result.finalWriteEnabled,false);
  assert.equal(result.operatorApprovalRequired,true);
  assert.equal(result.d1State,'NOT_READ');
  assert.equal(result.stageAndFinalD1ReadbackRequired,true);
  assert.equal(result.providerCalls,3);
  assert.equal(result.downloadCalls,2);
  assert.equal(f.calls,3);
  assert.equal(result.observationDate,dates[1]);
  assert.equal(result.previousDate,dates[0]);
  assert.equal(result.risingPct,25);
  assert.equal(result.fallingPct,25);
  assert.equal(result.unchangedPct,50);
  assert.equal(result.sourcePairCoveragePct,75);
  assert.equal(result.independentlyVerifiedSourceSha256.current,sha(f.bytesByDate[dates[1]]));
  assert.match(result.localStagingCandidateSha256,/^[0-9a-f]{64}$/);
  assert.equal(result.approvedD1StagingBodySha256,null);
  assert.equal(result.expectedR2StagingKey,'public:market-breadth-confirmed-r2:usa:staging');
  assert.equal(result.expectedR2CurrentKey,'public:market-breadth-confirmed-r2:usa:current');
  assert.equal(result.expectedR2DailyKey,'public:market-breadth-confirmed-r2:usa:daily:2026-10-30');
  for(const field of ['expectedCount','eligibleCount','counts','prices',
    'path','manifest','apiKey'])assert.equal(Object.hasOwn(result,field),false);
  for(const field of ['d1Reads','d1Writes','localWrites','coreTaskChanges','lockPidActions'])
    assert.equal(result[field],0);
  assert.deepEqual(fs.readdirSync(f.folder).sort(),before);
});

test('stale session pair fails before any provider GET; no artificial 251-day gate',async t=>{
  const f=fixture(t);
  const result=await inspectFullMarketR2PublicationR42({dataRoot:f.root,
    now:new Date('2026-11-04T22:00:00.000Z'),apiKey:'fake-secret',
    fetchImpl:f.fetchImpl,readParquet:f.readParquet});
  assert.equal(result.status,'R42_LATEST_COMPLETED_SESSION_NOT_STAGED');
  assert.equal(result.publicationAllowed,false);
  assert.equal(result.providerCalls,0);
  assert.equal(f.calls,0);
});

test('tampered R31 audit is blocked before publication candidate',async t=>{
  const f=fixture(t),auditFile=path.join(f.folder,`stock_daily_${dates[1]}.audit.json`);
  const audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));
  audit.sha256='f'.repeat(64);
  fs.writeFileSync(auditFile,JSON.stringify(audit));
  const result=await inspectFullMarketR2PublicationR42({dataRoot:f.root,now,
    apiKey:'fake-secret',fetchImpl:f.fetchImpl,readParquet:f.readParquet});
  assert.equal(result.status,'R42_PROVIDER_PAIR_NOT_VERIFIED');
  assert.equal(result.providerAuthenticityVerified,false);
  assert.equal(result.providerCalls,0);
  assert.equal(f.calls,0);
});

test('claimed verified provider SHA cannot bypass the saved-Parquet R20 check',async t=>{
  const f=fixture(t);
  const fakeVerified=async()=>({status:'PROVIDER_BYTES_MATCHED_LOCAL_PAIR',
    providerAuthenticityVerified:true,observationDate:dates[1],previousDate:dates[0],
    sourcePairIsLatestCompleted:true,providerCalls:0,downloadCalls:0,
    providerMatchedSha256:{previous:sha(f.bytesByDate[dates[0]]),current:'a'.repeat(64)}});
  const result=await inspectFullMarketR2PublicationR42({dataRoot:f.root,now,
    readParquet:f.readParquet,verifyProviderPair:fakeVerified});
  assert.equal(result.status,'R42_STAGING_CONTRACT_NOT_READY');
  assert.equal(result.readyForOperatorReview,false);
  assert.equal(result.d1Writes,0);
  assert.equal(f.calls,0);
});
