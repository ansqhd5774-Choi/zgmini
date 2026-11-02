/**
 * R41: independently compare the newest locally staged R31 two-day source
 * pair with a freshly fetched MarketParquet manifest and signed bytes.
 * READ ONLY: no D1, scheduler, E:, or other local writes. No 251-day gate.
 * A provider manifest supplies no SHA; only fresh provider byte equality
 * establishes independent provenance for the local source pair.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadLocalProviders} from './local-env.mjs';
import {validateMarketParquetManifest} from './us-breadth-confirmed-provider-manifest-r24.mjs';
import {previewLocalFullMarketPairR40} from './us-breadth-confirmed-local-pair-preview-r40.mjs';

const SOURCE_ROOT='us-breadth-confirmed-r2';
const RAW_DIR='marketparquet-stock-daily';
const MAX_BYTES=30_000_000;
const SHA=/^[a-f0-9]{64}$/;
const hex=bytes=>createHash('sha256').update(bytes).digest('hex');

const status=(code,details={})=>({revision:'US_BREADTH_R41_PROVIDER_PAIR_PROVENANCE',
  mode:'READ_ONLY_TWO_DAY_PROVIDER_BYTE_COMPARISON',status:code,
  providerAuthenticityVerified:false,publicationAllowed:false,
  providerCalls:0,downloadCalls:0,d1Reads:0,d1Writes:0,localWrites:0,
  coreTaskChanges:0,lockPidActions:0,...details});

function localShaForDate(dataRoot,date){
  const root=fs.realpathSync(dataRoot);
  if(root===path.parse(root).root)throw Error('DATA_ROOT_TOO_BROAD');
  const sub=path.join(root,SOURCE_ROOT,RAW_DIR),real=fs.realpathSync(sub);
  if(real!==sub||!real.startsWith(root+path.sep))throw Error('DATA_ROOT_NOT_APPROVED');
  const name=`stock_daily_${date}`;
  const auditFile=path.join(sub,`${name}.audit.json`);
  const sourceFile=path.join(sub,`${name}.parquet`);
  for(const file of [auditFile,sourceFile]){
    const fileStat=fs.lstatSync(file);
    if(!fileStat.isFile()||fileStat.isSymbolicLink()||
      !fs.realpathSync(file).startsWith(root+path.sep))throw Error('LOCAL_SOURCE_NOT_APPROVED');
  }
  const auditSize=fs.statSync(auditFile).size;
  const size=fs.statSync(sourceFile).size;
  if(auditSize<1||auditSize>4096||size<12||size>MAX_BYTES)
    throw Error('LOCAL_SOURCE_SIZE_INVALID');
  const audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));
  if(audit?.revision!=='US_BREADTH_CONFIRMED_DOWNLOAD_R31'||
    audit.date!==date||audit.source!=='MARKETPARQUET_STOCK_DAILY_OFFICIAL_PRESIGNED'||
    audit.provider!=='MarketParquet'||audit.feed!=='stock_daily'||
    audit.relativePath!==`${SOURCE_ROOT}/${RAW_DIR}/${name}.parquet`||
    audit.complete!==true||!SHA.test(audit.sha256)||audit.bytes!==size||
    audit.providerShaProvided!==false||audit.providerAuthenticityVerified!==false)
    throw Error('LOCAL_R31_AUDIT_INVALID');
  const bytes=fs.readFileSync(sourceFile);
  if(bytes.toString('ascii',0,4)!=='PAR1'||
    bytes.toString('ascii',bytes.length-4)!=='PAR1'||hex(bytes)!==audit.sha256)
    throw Error('LOCAL_R31_SOURCE_SHA_MISMATCH');
  return {sha256:audit.sha256,bytes:size};
}

// Signed files must be bounded even when the server omits Content-Length.
async function digestBoundedParquetResponse(response,expectedSize){
  const contentLength=response.headers?.get?.('content-length');
  if(contentLength!=null&&Number(contentLength)!==expectedSize)
    throw Error('PROVIDER_SIZE_MISMATCH');
  if(!response.body?.getReader)throw Error('PROVIDER_BODY_UNREADABLE');
  const reader=response.body.getReader();
  const hash=createHash('sha256');
  let bytes=0,first=Buffer.alloc(0),last=Buffer.alloc(0);
  try{
    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      const block=Buffer.from(value);
      bytes+=block.length;
      if(bytes>MAX_BYTES||bytes>expectedSize)throw Error('PROVIDER_BODY_OVERSIZED');
      hash.update(block);
      if(first.length<4)first=Buffer.concat([first,block]).subarray(0,4);
      last=Buffer.concat([last,block]).subarray(-4);
    }
  }finally{reader.releaseLock();}
  if(bytes!==expectedSize||first.toString('ascii')!=='PAR1'||
    last.toString('ascii')!=='PAR1')throw Error('PROVIDER_PARQUET_INVALID');
  return hash.digest('hex');
}

/**
 * Only compares the newest existing adjacent local NYSE pair; no full-year
 * prerequisite and no requirement that the local pair be today's date.
 * `publicationAllowed` stays false even if all checks pass.
 */
export async function verifyMarketParquetLocalPairR41({
  dataRoot,pcHome=path.join(os.homedir(),'.zgmini','pc-writer'),
  now=new Date(),apiKey=process.env.MARKETPARQUET_API_KEY,
  fetchImpl=fetch,readParquet,
}={}){
  const preview=await previewLocalFullMarketPairR40({dataRoot,now,readParquet});
  if(preview.status!=='LOCAL_ONLY_NOT_PROVIDER_AUTHENTICATED')
    return status('R40_LOCAL_PREVIEW_REQUIRED',{r40Status:preview.status});
  const dates=[preview.previousDate,preview.observationDate],scope={
    previousDate:dates[0],observationDate:dates[1],
    sourcePairIsLatestCompleted:preview.sourcePairIsLatestCompleted,
    risingPct:preview.risingPct,fallingPct:preview.fallingPct,
    unchangedPct:preview.unchangedPct,sourcePairCoveragePct:preview.sourcePairCoveragePct,
    sourcePairAuditSha256:preview.sourcePairAuditSha256,
    providerCalls:0,downloadCalls:0,
  };
  let local;
  try{local=dates.map(d=>localShaForDate(dataRoot,d));}
  catch{return status('R31_LOCAL_PAIR_INVALID',scope);}
  if(typeof apiKey!=='string'||!apiKey.trim()){
    try{apiKey=loadLocalProviders(pcHome).MARKETPARQUET_API_KEY;}catch{}
  }
  if(typeof apiKey!=='string'||!apiKey.trim())
    return status('PROVIDER_API_KEY_NOT_CONFIGURED',scope);

  const manifestUrl=new URL('https://marketparquet.com/api/v1/manifest/stock_daily');
  manifestUrl.searchParams.set('start',dates[0]);
  manifestUrl.searchParams.set('end',dates[1]);
  let parsed;
  try{
    scope.providerCalls++;
    const response=await fetchImpl(manifestUrl,{headers:{Authorization:`Bearer ${apiKey}`},
      redirect:'manual',signal:AbortSignal.timeout(30_000)});
    if(response.status===401||response.status===403)
      return status('PROVIDER_AUTH_UNAVAILABLE',scope);
    if(response.status===429)return status('PROVIDER_RATE_LIMITED',scope);
    if(response.status!==200)return status('PROVIDER_MANIFEST_HTTP_UNAVAILABLE',scope);
    parsed=validateMarketParquetManifest(await response.json(),dates);
  }catch{return status('PROVIDER_MANIFEST_UNAVAILABLE',scope);}
  if(!parsed.ok)return status(parsed.reason,scope);

  for(let i=0;i<dates.length;i++){
    const file=parsed.files[i];
    if(file.file_size_bytes!==local[i].bytes)
      return status('PROVIDER_LOCAL_FILE_SIZE_MISMATCH',
        {...scope,firstFailDate:dates[i]});
    try{
      scope.providerCalls++;
      scope.downloadCalls++;
      const response=await fetchImpl(file.download_url,{redirect:'manual',
        signal:AbortSignal.timeout(30_000)});
      if(response.status!==200)return status('PROVIDER_SIGNED_DOWNLOAD_FAILED',
        {...scope,firstFailDate:dates[i]});
      const freshSha=await digestBoundedParquetResponse(response,file.file_size_bytes);
      if(freshSha!==local[i].sha256)
        return status('PROVIDER_LOCAL_SHA_MISMATCH',
          {...scope,firstFailDate:dates[i]});
    }catch{return status('PROVIDER_SIGNED_DOWNLOAD_UNAVAILABLE',
      {...scope,firstFailDate:dates[i]});}
  }
  return {...status('PROVIDER_BYTES_MATCHED_LOCAL_PAIR',scope),
    providerAuthenticityVerified:true,
    providerMatchedSha256:{previous:local[0].sha256,current:local[1].sha256},
    independentlyVerifiedDates:dates,
    independentApprovalRequired:true};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=process.argv.length===3&&process.argv[2]==='--verify-provider-pair'
    ?await verifyMarketParquetLocalPairR41({dataRoot:process.env.ZGMINI_DATA_ROOT})
    :status('R41_EXPLICIT_VERIFY_ARGUMENT_REQUIRED');
  process.stdout.write(JSON.stringify(result)+'\n');
  if(result.status!=='PROVIDER_BYTES_MATCHED_LOCAL_PAIR')process.exitCode=2;
}
