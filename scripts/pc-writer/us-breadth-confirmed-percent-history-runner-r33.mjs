/**
 * R33: isolated PC entry point for verified US R2 percentage-only history.
 *
 * The default programmatic mode is inspect; the CLI requires --inspect-only,
 * which never opens D1. A separately authorized
 * final publication requires BOTH --publish-approved and --allow-d1-final-write,
 * plus the exact SHA-256 of the previously inspected R25 raw verified preview.
 *
 * No Core task, R1 key, legacy 250-session history, or Alpaca IEX modification.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareProviderVerifiedYearPreview} from './us-breadth-confirmed-year-preview-r25.mjs';
import {prepareVerifiedPercentHistoryR32,publishVerifiedPercentHistoryR32}
  from './us-breadth-confirmed-percent-history-publisher-r32.mjs';

const SHA256=/^[a-f0-9]{64}$/;
const DEFAULT_POINTS=249;
const pathRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const fail=status=>({revision:'US_BREADTH_R33_PERCENT_HISTORY',mode:'READ_ONLY',
  status,publicationAllowed:false,d1Writes:0,coreTaskChanges:0});

function checkedInputs(options){
 if(!options||!['inspect','publish'].includes(options.mode))return false;
 if(!Number.isSafeInteger(options.now)||options.now<=0)return false;
 if(typeof options.dataRoot!=='string'||!options.dataRoot||
   typeof options.pcHome!=='string'||!options.pcHome)return false;
 return true;
}

/**
 * Only opened after explicit approved publication gates, never in inspect.
 * R36 operator D1 probe confirmed market_public_snapshots_v1 is on config.core,
 * not config.history. This R2-only publisher must use the approved public DB.
 */
export async function loadApprovedHistoryD1R33({pcHome}){
 const config=JSON.parse(fs.readFileSync(path.join(pcHome,'config.json'),'utf8'));
 if(!config||typeof config.history!=='string'||typeof config.core!=='string')
  throw Error('R33_D1_HISTORY_CONFIG_UNAVAILABLE');
 const {client,credential}=await import('./d1.mjs');
 return {remote:client(config,()=>credential(pathRoot)),database:config.core};
}

/**
 * Provider-verifies 250 REAL stock_daily source sessions each time before any
 * final write; returns no counts, stock prices, config, secrets or source paths.
 * A small SHA approval is only a second gate, never provider authentication.
 */
export async function runUsBreadthPercentHistoryR33({
 mode='inspect',now=Date.now(),
 dataRoot=process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',
 pcHome=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),
 approvedPreviewSha256=null,allowD1FinalWrite=false,
 preparePreview=prepareProviderVerifiedYearPreview,
 prepareHistory=prepareVerifiedPercentHistoryR32,
 publishHistory=publishVerifiedPercentHistoryR32,
 loadD1=loadApprovedHistoryD1R33,
}={}){
 if(!checkedInputs({mode,now,dataRoot,pcHome}))return fail('R33_ARGUMENTS_INVALID');
 // No provider calls, credential access, E: write, or D1 access if the
 // operator has not given every publication authorization up front.
 if(mode==='publish'&&(!allowD1FinalWrite||!SHA256.test(approvedPreviewSha256??'')))
  return fail('R33_SEPARATE_D1_WRITE_APPROVAL_REQUIRED');

 let verified;
 try{verified=await preparePreview({dataRoot,pcHome,now:new Date(now),
   sessionCount:DEFAULT_POINTS});}
 catch{return fail('R33_PROVIDER_VERIFICATION_UNAVAILABLE');}
 if(verified?.status!=='YEAR_PREVIEW_READY_UNPUBLISHED'||
   verified.providerAuthenticityVerified!==true)
  return fail('R33_PROVIDER_VERIFIED_PREVIEW_UNAVAILABLE');

 const prepared=prepareHistory(verified,{now});
 if(prepared?.ok!==true)return fail('R33_PERCENT_HISTORY_PREPARATION_FAILED');
 const {body,evidenceSha256}=prepared;

 if(mode==='inspect')return {revision:'US_BREADTH_R33_PERCENT_HISTORY',
   mode:'READ_ONLY_PROVIDER_REVERIFICATION',
   status:'R33_PERCENT_HISTORY_PREVIEW_READY_UNPUBLISHED',
   publicationAllowed:false,providerAuthenticityVerified:true,
   d1Writes:0,coreTaskChanges:0,
   evidenceSha256,firstDate:body.firstDate,lastDate:body.lastDate,
   points:body.points};

 if(evidenceSha256!==approvedPreviewSha256)
  return fail('R33_APPROVED_PREVIEW_SHA_MISMATCH');
 let remote,database;
 try{({remote,database}=await loadD1({pcHome}));}
 catch{return fail('R33_APPROVED_HISTORY_D1_UNAVAILABLE');}
 try{
  const result=await publishHistory(remote,database,verified,
   {now,finalWriteEnabled:true,approvedPreviewSha256});
  return {revision:'US_BREADTH_R33_PERCENT_HISTORY',mode:'EXPLICIT_APPROVED_D1_WRITE',
   status:result.status,publicationAllowed:result.publicationAllowed===true,
   providerAuthenticityVerified:true,d1Writes:result.d1Writes??0,
   coreTaskChanges:0,firstDate:body.firstDate,lastDate:body.lastDate};
 }catch{return fail('R33_D1_RESULT_UNKNOWN_REQUIRES_READBACK');}
}

export function r33CliOptions(argv){
 if(!Array.isArray(argv))return null;
 if(argv.length===1&&argv[0]==='--inspect-only')return {mode:'inspect'};
 if(argv.length===4&&argv[0]==='--publish-approved'&&
  argv[1]==='--allow-d1-final-write'&&argv[2]==='--approved-sha256'&&
  SHA256.test(argv[3]))
  return {mode:'publish',allowD1FinalWrite:true,approvedPreviewSha256:argv[3]};
 return null;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const options=r33CliOptions(process.argv.slice(2));
 const output=options?await runUsBreadthPercentHistoryR33(options):
  fail('R33_EXPLICIT_INSPECT_OR_APPROVED_PUBLISH_ARGUMENTS_REQUIRED');
 process.stdout.write(JSON.stringify(output)+'\n');
 if(output.status!=='R33_PERCENT_HISTORY_PREVIEW_READY_UNPUBLISHED'&&
   output.status!=='VERIFIED_PERCENT_HISTORY_FINAL')process.exitCode=2;
}
