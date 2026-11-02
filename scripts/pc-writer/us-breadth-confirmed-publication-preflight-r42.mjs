/**
 * R42: read-only R2 current/daily publication *candidate* preflight.
 * Confirms the freshest stored source pair with R41 provider byte evidence,
 * re-prepares R20 staging from those verified on-disk Parquet files, and
 * checks the shape expected by R22 final promotion. No D1 access or writes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {latestCompletedSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';
import {US_FULL_MARKET_PRICE_MODE,US_FULL_MARKET_STAGING_KEY,
  validFullMarketStagingRecord} from '../../lib/market-breadth/us-marketparquet-confirmed-public-r2.mjs';
import {US_FULL_MARKET_PUBLIC_KEY,US_FULL_MARKET_PUBLIC_DAILY_PREFIX,
  validFullMarketPublicRecord,fullMarketPublicPercentOnly}
  from '../../lib/market-breadth/us-marketparquet-confirmed-reader-r2.mjs';
import {prepareFullMarketStaging,decodeStoredParquet}
  from './us-breadth-confirmed-staging-r20.mjs';
import {verifyMarketParquetLocalPairR41}
  from './us-breadth-confirmed-provider-pair-r41.mjs';

const sha=body=>createHash('sha256').update(body,'utf8').digest('hex');
const ROOT_FOLDER='us-breadth-confirmed-r2';
const RAW_FOLDER='marketparquet-stock-daily';
const zero={d1Reads:0,d1Writes:0,localWrites:0,coreTaskChanges:0,lockPidActions:0};
const status=(code,details={})=>({revision:'US_BREADTH_R42_R2_PUBLICATION_PREFLIGHT',
  mode:'READ_ONLY_LOCAL_AND_PROVIDER_PREFLIGHT',status:code,
  publicationAllowed:false,readyForOperatorReview:false,
  stageWriteEnabled:false,finalWriteEnabled:false,
  operatorApprovalRequired:true,stageAndFinalD1ReadbackRequired:true,
  d1State:'NOT_READ',providerAuthenticityVerified:false,
  providerCalls:0,downloadCalls:0,...zero,...details});

function currentSourceAuditPresent(root,date){
  const actual=fs.realpathSync(root),folder=path.join(actual,ROOT_FOLDER,RAW_FOLDER);
  if(actual===path.parse(actual).root) return false;
  const checked=fs.realpathSync(folder);
  if(checked!==folder||!checked.startsWith(actual+path.sep))return false;
  const audit=path.join(folder,`stock_daily_${date}.audit.json`);
  const stat=fs.lstatSync(audit);
  return stat.isFile()&&!stat.isSymbolicLink();
}

/**
 * `verifyProviderPair` and `readParquet` are injectable for deterministic
 * test fixtures only. The CLI always invokes the real R41 provider verifier.
 */
export async function inspectFullMarketR2PublicationR42({
  dataRoot,pcHome,apiKey,now=new Date(),fetchImpl=fetch,
  readParquet=decodeStoredParquet,verifyProviderPair=verifyMarketParquetLocalPairR41,
}={}){
  const pinned=now instanceof Date?now:new Date(now);
  if(!Number.isFinite(pinned.valueOf())||!dataRoot||typeof dataRoot!=='string')
    return status('R42_SOURCE_ROOT_OR_DATE_REQUIRED');
  const latest=latestCompletedSession(pinned);
  try{
    // Cheap local existence gate prevents three needless provider GETs if
    // the currently completed NYSE session has not been staged on this PC.
    if(!currentSourceAuditPresent(dataRoot,latest))
      return status('R42_LATEST_COMPLETED_SESSION_NOT_STAGED',{latestCompletedSession:latest});
  }catch{return status('R42_LATEST_COMPLETED_SESSION_NOT_STAGED',
    {latestCompletedSession:latest});}

  const verified=await verifyProviderPair({dataRoot,pcHome,apiKey,now:pinned,
    fetchImpl,readParquet});
  const usage={providerCalls:verified.providerCalls??0,
    downloadCalls:verified.downloadCalls??0,latestCompletedSession:latest};
  if(verified.status!=='PROVIDER_BYTES_MATCHED_LOCAL_PAIR'||
    verified.providerAuthenticityVerified!==true)
    return status('R42_PROVIDER_PAIR_NOT_VERIFIED',{
      ...usage,providerVerificationStatus:verified.status});
  if(verified.observationDate!==latest||verified.sourcePairIsLatestCompleted!==true)
    return status('R42_VERIFIED_PAIR_NOT_CURRENT',usage);
  const previous=verified.previousDate,current=verified.observationDate;
  if(typeof previous!=='string'||typeof current!=='string'||
    !verified.providerMatchedSha256?.previous||!verified.providerMatchedSha256?.current)
    return status('R42_PROVIDER_SHA_EVIDENCE_INVALID',usage);

  const root=fs.realpathSync(dataRoot);
  const file=date=>path.join(root,ROOT_FOLDER,RAW_FOLDER,`stock_daily_${date}.parquet`);
  const entry=(date,hash)=>({date,provider:'MarketParquet',feed:'stock_daily',
    priceMode:US_FULL_MARKET_PRICE_MODE,complete:true,path:file(date),sha256:hash});
  const manifest={previous:entry(previous,verified.providerMatchedSha256.previous),
    current:entry(current,verified.providerMatchedSha256.current)};
  let staged;
  try{staged=await prepareFullMarketStaging({approvedSourceRoot:root,
    manifest,now:pinned,readParquet});}
  catch{return status('R42_STAGING_PREPARATION_FAILED',usage);}
  if(staged?.status!=='PREPARED_STAGING_ONLY'||staged.prepared!==true||
    !validFullMarketStagingRecord(staged.body))
    return status('R42_STAGING_CONTRACT_NOT_READY',{
      ...usage,stagingStatus:staged?.status??null});
  const body=staged.body;
  if(body.observationDate!==current||body.previousDate!==previous||
    body.sourceEvidence.current.sha256!==manifest.current.sha256||
    body.sourceEvidence.previous.sha256!==manifest.previous.sha256)
    return status('R42_STAGING_SOURCE_SHA_MISMATCH',usage);

  const candidateJson=JSON.stringify(body);
  const candidateSha=sha(candidateJson),time=pinned.toISOString();
  // Shape-check only. This is NOT an authorized D1 staging body and is never
  // sent to a DB. R22 must hash the actual D1 staging row on readback.
  const simulated={...body,status:'READY',publicationStage:'PUBLIC_FINAL',
    finalizedAt:time,promotionProof:{stagingKey:US_FULL_MARKET_STAGING_KEY,
      stagingBodySha256:candidateSha,verifiedAt:time}};
  if(!validFullMarketPublicRecord(simulated))
    return status('R42_FINAL_CONTRACT_SHAPE_INVALID',usage);
  const percent=fullMarketPublicPercentOnly(simulated);
  if(!percent||Math.abs(percent.risingPct+percent.fallingPct+percent.unchangedPct-100)>1e-8)
    return status('R42_FINAL_PERCENT_PROJECTION_INVALID',usage);
  return {...status('R42_LOCAL_PREFLIGHT_READY_OPERATOR_APPROVAL_REQUIRED',usage),
    readyForOperatorReview:true,providerAuthenticityVerified:true,
    observationDate:current,previousDate:previous,
    risingPct:percent.risingPct,fallingPct:percent.fallingPct,
    unchangedPct:percent.unchangedPct,
    sourcePairCoveragePct:body.sourcePairCoverage*100,
    independentlyVerifiedSourceSha256:{previous:manifest.previous.sha256,
      current:manifest.current.sha256},
    localStagingCandidateSha256:candidateSha,
    // The actual R22 approval SHA must come from separately approved D1
    // staging read-back, not this local candidate digest.
    approvedD1StagingBodySha256:null,
    expectedR2StagingKey:US_FULL_MARKET_STAGING_KEY,
    expectedR2CurrentKey:US_FULL_MARKET_PUBLIC_KEY,
    expectedR2DailyKey:US_FULL_MARKET_PUBLIC_DAILY_PREFIX+current,
  };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=process.argv.length===3&&process.argv[2]==='--preflight-local'
    ?await inspectFullMarketR2PublicationR42({dataRoot:process.env.ZGMINI_DATA_ROOT})
    :status('R42_EXPLICIT_PREFLIGHT_ARGUMENT_REQUIRED');
  process.stdout.write(JSON.stringify(result)+'\n');
  if(result.status!=='R42_LOCAL_PREFLIGHT_READY_OPERATOR_APPROVAL_REQUIRED')process.exitCode=2;
}
