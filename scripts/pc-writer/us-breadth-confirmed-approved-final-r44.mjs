/**
 * R44: separately approved CORE D1 R2 staging -> current+daily promotion.
 * No provider GET, source write, scheduler change, R1 or R2 history mutation.
 * The required staging-body SHA must come from R43's actual D1 read-back;
 * R42's local candidate SHA may not be substituted for it.
 */
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {latestCompletedSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';
import {US_FULL_MARKET_PUBLIC_KEY,US_FULL_MARKET_PUBLIC_DAILY_PREFIX,
  fullMarketPublicPercentOnly} from '../../lib/market-breadth/us-marketparquet-confirmed-reader-r2.mjs';
import {promoteVerifiedFullMarketStaging}
  from './us-breadth-confirmed-final-r22.mjs';
import {openR43CoreD1}
  from './us-breadth-confirmed-approved-stage-r43.mjs';

const SHA=/^[0-9a-f]{64}$/;
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const GET='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
const result=(status,extra={})=>({revision:'US_BREADTH_R44_APPROVED_R2_FINAL',
  mode:'EXPLICIT_APPROVED_CURRENT_AND_DAILY_ONLY',status,
  providerCalls:0,eSourceWrites:0,coreTaskChanges:0,d1Writes:0,
  ...extra});

export async function promoteApprovedR2FinalR44({
  observationDate,approvedStagingBodySha256,approvedSourceSha256,
  allowD1FinalWrite=false,operatorConfirmation,
  pcHome=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),
  now=Date.now(),openD1=openR43CoreD1,
  promote=promoteVerifiedFullMarketStaging,freshNow=Date.now,
}={}){
  if(!allowD1FinalWrite||operatorConfirmation!=='Y')
    return result('R44_OPERATOR_Y_AND_FINAL_WRITE_FLAG_REQUIRED');
  if(!DAY.test(observationDate??'')||!SHA.test(approvedStagingBodySha256??'')||
    !approvedSourceSha256||!SHA.test(approvedSourceSha256.previous??'')||
    !SHA.test(approvedSourceSha256.current??'')||
    !Number.isSafeInteger(now)||now<=0||
    typeof pcHome!=='string'||!pcHome.trim())
    return result('R44_STAGING_AND_SOURCE_SHA_APPROVAL_REQUIRED');
  if(observationDate!==latestCompletedSession(new Date(now))||
    observationDate!==latestCompletedSession(new Date(freshNow())))
    return result('R44_APPROVED_DATE_NOT_LATEST_COMPLETED');
  let remote,database;
  try{({remote,database}=await openD1({pcHome}));}
  catch{return result('R44_CORE_D1_UNAVAILABLE');}
  if(!remote||typeof remote.query!=='function'||typeof remote.request!=='function'||
    typeof database!=='string'||!database.trim())
    return result('R44_CORE_D1_INVALID');
  let promoted;
  try{promoted=await promote(remote,database,{
    now,finalWriteEnabled:true,approvedStagingBodySha256,
    approvedProviderSourceSha256:approvedSourceSha256,
  });}
  catch{return result('R44_D1_OUTCOME_UNKNOWN_READBACK_REQUIRED',
    {d1Writes:'UNKNOWN'});}
  if(!['VERIFIED_FULL_MARKET_FINAL','FINAL_ALREADY_PUBLISHED'].includes(promoted?.status))
    return result(promoted?.status??'R44_FINAL_NOT_PUBLISHED');
  const dayKey=US_FULL_MARKET_PUBLIC_DAILY_PREFIX+observationDate;
  let current,daily;
  try{
    [current,daily]=await Promise.all([
      remote.query(database,GET,[US_FULL_MARKET_PUBLIC_KEY]),
      remote.query(database,GET,[dayKey]),
    ]);
  }catch{return result('R44_FINAL_READBACK_UNAVAILABLE',
    {d1Writes:promoted.status==='VERIFIED_FULL_MARKET_FINAL'?2:0});}
  const a=current?.results?.[0]??null,b=daily?.results?.[0]??null;
  let record;
  try{record=JSON.parse(a?.body??'');}catch{}
  const percent=fullMarketPublicPercentOnly(record);
  if(!percent||record.observationDate!==observationDate||
    record.promotionProof?.stagingBodySha256!==approvedStagingBodySha256||
    a?.body!==b?.body||!Number.isSafeInteger(Number(a?.stored_at))||
    Number(a.stored_at)<=0||Number(a.stored_at)!==Number(b.stored_at))
    return result('R44_FINAL_READBACK_MISMATCH',
      {d1Writes:promoted.status==='VERIFIED_FULL_MARKET_FINAL'?2:0});
  return result('R44_VERIFIED_CURRENT_AND_DAILY_FINAL',{
    observationDate,previousDate:record.previousDate,
    risingPct:percent.risingPct,fallingPct:percent.fallingPct,
    unchangedPct:percent.unchangedPct,
    sourcePairCoveragePct:record.sourcePairCoverage*100,
    currentKey:US_FULL_MARKET_PUBLIC_KEY,dailyKey:dayKey,
    approvedD1StagingBodySha256:approvedStagingBodySha256,
    readbackVerified:true,publicationAllowed:true,
    d1Writes:promoted.status==='VERIFIED_FULL_MARKET_FINAL'?2:0,
  });
}

export function r44CliOptions(argv){
  if(!Array.isArray(argv)||argv.length!==10||argv[0]!=='--final-approved'||
    argv[1]!=='--allow-d1-final-write'||argv[2]!=='--observation-date'||
    !DAY.test(argv[3]??'')||argv[4]!=='--staging-sha256'||
    !SHA.test(argv[5]??'')||argv[6]!=='--previous-sha256'||
    !SHA.test(argv[7]??'')||argv[8]!=='--current-sha256'||
    !SHA.test(argv[9]??''))return null;
  return {observationDate:argv[3],approvedStagingBodySha256:argv[5],
    approvedSourceSha256:{previous:argv[7],current:argv[9]},
    allowD1FinalWrite:true};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const options=r44CliOptions(process.argv.slice(2));
  const output=options?await promoteApprovedR2FinalR44({...options,
    operatorConfirmation:process.env.US_BREADTH_R44_OPERATOR_CONFIRMATION}):
    result('R44_EXPLICIT_APPROVED_FINAL_ARGUMENTS_REQUIRED');
  process.stdout.write(JSON.stringify(output)+'\n');
  if(output.status!=='R44_VERIFIED_CURRENT_AND_DAILY_FINAL')process.exitCode=2;
}
