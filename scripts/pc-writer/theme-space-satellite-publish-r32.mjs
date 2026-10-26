// R32 only: extend 1Y chart from real long-lived ETF scores into an isolated
// NEW D1 key; existing nine and old space R1 remain untouched.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runApprovedSpacePcR28} from './theme-space-satellite-operational-r28.mjs';
import {runSpacePublishR29} from './theme-space-satellite-publish-r29.mjs';
import {buildSpaceSatellitePublicR32} from './theme-space-satellite-public-r32.mjs';
import {SPACE_SATELLITE_R2_PUBLIC_KEY,SPACE_SATELLITE_R2_PUBLIC_VERSION} from
 '../../worker/theme-space-satellite-r2.mjs';

export async function runSpacePublishR32({dataRoot,allowPublish=false,
 pcAudit=({dataRoot:root})=>runApprovedSpacePcR28({dataRoot:root,
  historicalSingleContinuity:true}),...options}={}){
 return runSpacePublishR29({dataRoot,allowPublish,pcAudit,
  buildPublic:buildSpaceSatellitePublicR32,
  publicKey:SPACE_SATELLITE_R2_PUBLIC_KEY,
  d1Options:{publicKey:SPACE_SATELLITE_R2_PUBLIC_KEY,
   publicVersion:SPACE_SATELLITE_R2_PUBLIC_VERSION},
  reportName:'SPACE_SATELLITE_R32_PC_PUBLICATION',...options});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args[0]!=='--once'||args.length>2||args.slice(1).some(arg=>arg!=='--publish')){
  console.log('Usage: theme-space-satellite-publish-r32.mjs --once [--publish]');
  process.exitCode=2;
 }else{
  const report=await runSpacePublishR32({
   dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',
   allowPublish:args.includes('--publish')});
  console.log(JSON.stringify(report));
  if(!['PRIVATE_CANDIDATE_SAVED_NOT_PUBLISHED','PUBLIC_API_VERIFIED',
   'D1_VERIFIED_PUBLIC_API_PENDING'].includes(report.status))process.exitCode=1;
 }
}
