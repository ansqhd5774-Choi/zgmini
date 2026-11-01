import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fullMarketYearSessions}
 from '../scripts/pc-writer/us-breadth-confirmed-year-inventory-r22.mjs';
import {validMarketParquetSignedUrl,validateMarketParquetManifest,
 verifyMarketParquetProviderYear,publicProviderYearSummary}
 from '../scripts/pc-writer/us-breadth-confirmed-provider-manifest-r24.mjs';

const now=new Date('2026-11-01T15:00:00Z');
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
const signed=date=>`https://example.r2.cloudflarestorage.com/${date}.parquet?X-Amz-Signature=secret-signed-url`;
const fakeFile=i=>Buffer.from(`PAR1${String(i).padStart(4,'0')}PAR1`,'ascii');

function makeFiles(t,{sessionCount=2}={}){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'marketparquet-r24-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const dataRoot=path.join(dir,'data'),pcHome=path.join(dir,'pc');
 const root=path.join(dataRoot,'marketparquet');fs.mkdirSync(root,{recursive:true});
 const dates=fullMarketYearSessions({now,sessionCount});
 const files=dates.map((date,i)=>{
  const bytes=fakeFile(i),file=path.join(root,`stock_daily_${date}.parquet`);
  fs.writeFileSync(file,bytes);
  fs.writeFileSync(file.replace(/\.parquet$/,'.audit.json'),JSON.stringify({date,
   source:'MARKETPARQUET_STOCK_DAILY',complete:true,sha256:sha(bytes)}));
  return {date,bytes,file_size_bytes:bytes.length,
   filename:`stock_daily_${date}.parquet`,download_url:signed(date)};
 });
 return {dataRoot,pcHome,dates,files};
}
function manifest(f){return {asset_type:'stock_daily',start:f.dates[0],end:f.dates.at(-1),
 file_count:f.files.length,files:f.files.map(x=>({date:x.date,filename:x.filename,
 file_size_bytes:x.file_size_bytes,download_url:x.download_url}))};}
function mockNetwork(f,{changeDate=null,httpError=null,badManifest=null}={}){
 const requests=[];
 const fetchImpl=async (url,options)=>{
  requests.push({url:String(url),options});
  if(String(url).startsWith('https://marketparquet.com/')){
   return {status:200,async json(){return badManifest??manifest(f);}};
  }
  const date=String(url).match(/\/(\d{4}-\d{2}-\d{2})\.parquet\?/)?.[1];
  const bytes=f.files.find(x=>x.date===date)?.bytes;
  if(httpError&&date===httpError)return {status:503};
  if(!bytes)throw Error('TEST_DATE_MISSING');
  const payload=changeDate===date?fakeFile(9999):bytes;
  return {status:200,headers:{get:n=>n==='content-length'?String(payload.length):null},
    async arrayBuffer(){return payload.buffer.slice(payload.byteOffset,payload.byteOffset+payload.length);}};
 };
 return {requests,fetchImpl};
}

test('only HTTPS signed R2 URLs are accepted; signed URLs never emitted',()=>{
 assert.equal(validMarketParquetSignedUrl(signed('2026-10-30')),true);
 for(const url of ['http://example.r2.cloudflarestorage.com/x?X-Amz-Signature=s',
  'https://r2.cloudflarestorage.com/x?X-Amz-Signature=s',
  'https://example.r2.cloudflarestorage.com.evil.com/x?X-Amz-Signature=s',
  'https://example.r2.cloudflarestorage.com/x',
  'https://user:password@example.r2.cloudflarestorage.com/x?X-Amz-Signature=s',
  'https://127.0.0.1/x?X-Amz-Signature=s',
 ])assert.equal(validMarketParquetSignedUrl(url),false,url);
});

test('manifest contains every exact session, filename and size; provider SHA is not invented',t=>{
 const f=makeFiles(t);const m=manifest(f);
 assert.equal(validateMarketParquetManifest(m,f.dates).ok,true);
 assert.equal(validateMarketParquetManifest({...m,file_count:2},f.dates).ok,false);
 const missing=validateMarketParquetManifest({...m,files:m.files.slice(1),file_count:2},f.dates);
 assert.equal(missing.ok,false);
 assert.equal(missing.reason,'PROVIDER_MANIFEST_MISSING_SESSION');
 assert.equal(missing.firstMissingDate,f.dates[0]);
 assert.equal(missing.missingDatesCount,1);
 assert.equal(validateMarketParquetManifest({...m,files:[m.files[0],m.files[0],m.files[2]]},f.dates).ok,false);
 assert.equal(validateMarketParquetManifest({...m,files:m.files.map((x,i)=>i===0?{...x,file_size_bytes:0}:x)},f.dates).ok,false);
 assert.equal(validateMarketParquetManifest({...m,files:m.files.map((x,i)=>i===0?{...x,date:'2026-99-99'}:x)},f.dates).ok,false);
});

test('local inventory incomplete or key missing has zero provider requests and never completes',async t=>{
 const f=makeFiles(t);const net=mockNetwork(f);
 const noKey=await verifyMarketParquetProviderYear({...f,now,sessionCount:2,
   apiKey:null,fetchImpl:net.fetchImpl});
 assert.equal(noKey.status,'PROVIDER_API_KEY_NOT_CONFIGURED');
 assert.equal(noKey.providerCalls,0);
 assert.equal(noKey.candidateManifestEntries,null);
 assert.equal(net.requests.length,0);
 fs.unlinkSync(path.join(f.dataRoot,'marketparquet',`stock_daily_${f.files[0].date}.parquet`));
 const missing=await verifyMarketParquetProviderYear({...f,now,sessionCount:2,
  apiKey:'test-only',fetchImpl:net.fetchImpl});
 assert.equal(missing.status,'LOCAL_YEAR_INVENTORY_INCOMPLETE');
 assert.equal(missing.providerAuthenticityVerified,false);
 assert.equal(net.requests.length,0);
});

test('fresh official signed bytes matching all existing local audits prove candidates, not D1 approval',async t=>{
 const f=makeFiles(t);const net=mockNetwork(f);
 const result=await verifyMarketParquetProviderYear({...f,now,sessionCount:2,
   apiKey:'test-only',fetchImpl:net.fetchImpl});
 assert.equal(result.status,'PROVIDER_BYTES_MATCHED_ALL_DATES');
 assert.equal(result.providerAuthenticityVerified,true);
 assert.equal(result.verifiedDates,3);
 assert.equal(result.providerCalls,4);
 assert.equal(result.candidateManifestEntries.length,3);
 assert.equal(result.candidateManifestEntries.every(x=>x.complete===true),true);
 assert.equal(result.candidateManifestEntries.every(x=>x.sha256===sha(f.files.find(y=>y.date===x.date).bytes)),true);
 assert.equal(result.approvedR21ManifestEntries,null);
 assert.equal(result.independentApprovalRequired,true);
 assert.equal(net.requests[0].options.headers.Authorization,'Bearer test-only');
 assert.equal(net.requests.slice(1).every(x=>x.options.headers===undefined&&x.options.redirect==='manual'),true);
 const visible=JSON.stringify(publicProviderYearSummary(result));
 assert.doesNotMatch(visible,/test-only|X-Amz-Signature|\.r2\.cloudflarestorage|stock_daily_.*parquet/);
 assert.equal(publicProviderYearSummary(result).candidateEntryCount,3);
});

test('provider checksum mismatch or failed signed download halts without false success',async t=>{
 const f=makeFiles(t);const date=f.dates[1];
 const altered=mockNetwork(f,{changeDate:date});
 const mismatch=await verifyMarketParquetProviderYear({...f,now,sessionCount:2,
   apiKey:'test-only',fetchImpl:altered.fetchImpl});
 assert.equal(mismatch.status,'PROVIDER_LOCAL_SHA_MISMATCH');
 assert.equal(mismatch.firstFailDate,date);
 assert.equal(mismatch.providerAuthenticityVerified,false);
 assert.equal(mismatch.candidateManifestEntries,null);
 const bad=mockNetwork(f,{httpError:date});
 const failed=await verifyMarketParquetProviderYear({...f,now,sessionCount:2,
   apiKey:'test-only',fetchImpl:bad.fetchImpl});
 assert.equal(failed.status,'PROVIDER_SIGNED_DOWNLOAD_FAILED');
 assert.equal(failed.providerAuthenticityVerified,false);
});

test('free-plan 403 and absent provider date fail closed with no URLs disclosed',async t=>{
 const f=makeFiles(t);const net=mockNetwork(f);
 const unauthorized=await verifyMarketParquetProviderYear({...f,now,sessionCount:2,
   apiKey:'test-only',fetchImpl:async()=>({status:403})});
 assert.equal(unauthorized.status,'PROVIDER_AUTH_OR_WINDOW_UNAVAILABLE');
 assert.equal(unauthorized.providerCalls,1);
 const changed={...manifest(f),files:manifest(f).files.slice(1),file_count:2};
 const result=await verifyMarketParquetProviderYear({...f,now,sessionCount:2,
   apiKey:'test-only',fetchImpl:mockNetwork(f,{badManifest:changed}).fetchImpl});
 assert.equal(result.status,'PROVIDER_MANIFEST_MISSING_SESSION');
 assert.equal(result.missingDatesCount,1);
 assert.equal(result.firstMissingDate,f.dates[0]);
 assert.equal(result.candidateManifestEntries,null);
 assert.equal(net.requests.length,0);
});
