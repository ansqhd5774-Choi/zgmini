import {updateDataAlert} from './local-data-alert.mjs';
import {progressivePublication,auxiliaryInputCheckpoint} from './progressive-publication.mjs';
import {collectionPublicationPolicy} from './collection-publication-policy.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {save,read} from './d1.mjs';
import {collectSupplyR10} from './supply-r10.mjs';
import {collectAlpacaIncremental} from './alpaca-incremental.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const file=path.join(base,'local-cycle.lock');
if(fs.existsSync(file)){
 let alive=true;try{process.kill(read(file).pid,0);}catch(error){if(error.code==='ESRCH')alive=false;}
 if(alive){console.log('LOCAL_CYCLE_RUNNING');process.exit(0);}
 fs.renameSync(file,file+'.interrupted-'+Date.now());
}
fs.writeFileSync(file,JSON.stringify({pid:process.pid,at:Date.now()}),{flag:'wx'});
try{
 const lane=process.argv.includes('--korea')?'korea':'core';
 const collection=spawnSync(process.execPath,[path.join(here,'collect-local.mjs'),...(lane==='korea'?['--korea']:[])],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30*60000});
 try{updateDataAlert(base,{key:'collection',failed:collection.status!==0});}catch{console.warn('LOCAL_DATA_ALERT_RECORD_FAILED');}
 // A provider failure retains stored good data; publication still reads local storage.
 const collectionReport=fs.existsSync(path.join(base,'local-collection-last-run.json'))?read(path.join(base,'local-collection-last-run.json')):null;
 const quotaGuarded=process.env.ZGMINI_QUOTA_MODE==='enforce'&&(collectionReport?.quota?.guarded??0)>0;
 const publishRequested=process.argv.includes('--publish');
 const publicationPolicy=collectionPublicationPolicy({requested:publishRequested,collectionExit:collection.status,collectionStatus:collectionReport?.status,quotaGuarded});
 const publishAllowed=publicationPolicy.publishAllowed;
 const publishSkipped=null;
 let supplyR10=null,alpacaIncremental=null,sectorFearGreedR3=null,sectorFearGreedR3Report=null;
 const {publication,progressive}=await progressivePublication({
  enabled:lane==='core'&&publishAllowed,
  publish:async({early})=>{
   const publication=spawnSync(process.execPath,[path.join(here,'run-local.mjs'),...(publishAllowed?['--publish',...((early||publicationPolicy.collectionDegraded)?['--collection-degraded']:[])]:[])],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30*60000});
   return publication;
  },
  checkpoint:()=>auxiliaryInputCheckpoint(base),
  collectAuxiliary:async()=>{
  supplyR10=lane==='core'?await collectSupplyR10(base):{status:'SKIPPED_KOREA_LANE'};
 if(lane==='core'){
  try{const result=await collectAlpacaIncremental(base);alpacaIncremental={status:result.status,runRequests:result.runRequests??0};}
  catch{alpacaIncremental={status:'FAILED_PREVIOUS_INPUTS_PRESERVED',runRequests:null};}
 }

 if(lane==='core'){
  // Separate provisional inputs/output; failures never block the confirmed publisher.
  spawnSync(process.execPath,[path.join(here,'sector-provisional-cycle.mjs'),'--write-local'],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:5*60000});
  sectorFearGreedR3=spawnSync(process.execPath,[path.join(here,'sector-fear-greed-r3-local-cycle.mjs'),'--write-local'],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:5*60000});
  const sectorFearGreedR3File=path.join(base,'local-sector-fear-greed-r3-last-run.json');
  sectorFearGreedR3Report=fs.existsSync(sectorFearGreedR3File)?read(sectorFearGreedR3File):null;
 }

  },
 });
 let prospective=null,prospectiveReport=null,fundFlowProspective=null,fundFlowProspectiveReport=null,breadthProspective=null,breadthProspectiveReport=null,earningsR5OfficialRefresh=null,earningsR5OfficialRefreshReport=null,earningsR5Prospective=null,earningsR5ProspectiveReport=null,earningsR5ProspectiveReportStale=false;
 if(lane==='core'){
  prospective=spawnSync(process.execPath,[path.join(here,'dollar-prospective-forward-r1.mjs')],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:5*60000});
  const prospectiveFile=path.join(base,'local-dollar-prospective-last-run.json');
  prospectiveReport=fs.existsSync(prospectiveFile)?read(prospectiveFile):null;
  fundFlowProspective=spawnSync(process.execPath,[path.join(here,'fund-flow-index-prospective-r1.mjs')],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:5*60000});
  const fundFlowProspectiveFile=path.join(base,'local-fund-flow-index-prospective-last-run.json');
  fundFlowProspectiveReport=fs.existsSync(fundFlowProspectiveFile)?read(fundFlowProspectiveFile):null;
  breadthProspective=spawnSync(process.execPath,[path.join(here,'breadth-r7-prospective-r1.mjs')],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:10*60000});
  const breadthProspectiveFile=path.join(base,'local-breadth-r7-prospective-last-run.json');
  breadthProspectiveReport=fs.existsSync(breadthProspectiveFile)?read(breadthProspectiveFile):null;
  earningsR5OfficialRefresh=spawnSync(process.execPath,[path.join(here,'earnings-r5-official-refresh-cycle-r1.mjs')],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30*60000});
  const earningsR5OfficialRefreshFile=path.join(base,'local-earnings-r5-official-refresh-cycle-last-run.json');
  earningsR5OfficialRefreshReport=fs.existsSync(earningsR5OfficialRefreshFile)?read(earningsR5OfficialRefreshFile):null;
  const earningsR5ProspectiveStartedAt=Date.now();
  earningsR5Prospective=spawnSync(process.execPath,[path.join(here,'earnings-r5-forward-prospective-cycle-r1.mjs')],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:5*60000});
  const earningsR5ProspectiveFile=path.join(base,'local-earnings-r5-forward-prospective-last-run.json');
  if(fs.existsSync(earningsR5ProspectiveFile)){
   const candidate=read(earningsR5ProspectiveFile);
   const candidateAt=Date.parse(candidate?.at??'');
   const fresh=Number.isFinite(candidateAt)&&candidateAt>=earningsR5ProspectiveStartedAt-1000;
   earningsR5ProspectiveReport=fresh?candidate:null;
   earningsR5ProspectiveReportStale=!fresh;
  }
 }
 let breadthV9ShadowRun=null,breadthV9ShadowReport=null,breadthV9ShadowFresh=false;
 const breadthV9OptIn=lane==='core'&&process.env.ZGMINI_R10_V9_SHADOW_ENABLED==='1';
 if(breadthV9OptIn){
  const startedAt=Date.now();
  breadthV9ShadowRun=spawnSync(process.execPath,[path.join(here,'breadth-r10-v9-shadow-r1.mjs'),'--write-local'],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:2*60000});
  const resultPath=path.join(base,'local-breadth-r10-v9-shadow-last-run.json');
  if(fs.existsSync(resultPath)){
   try{
    const candidate=read(resultPath),timestamp=Date.parse(candidate?.at??'');
    breadthV9ShadowFresh=breadthV9ShadowRun.status===0&&Number.isFinite(timestamp)&&timestamp>=startedAt-1000;
    if(breadthV9ShadowFresh)breadthV9ShadowReport=candidate;
   }catch{breadthV9ShadowFresh=false;}
  }
 }
 const researchProspective=lane==='core'?{
  nonBlocking:true,
  exit:prospective?.status??null,
  status:prospectiveReport?.status??(prospective?.status===0?'REPORT_MISSING':'EXECUTION_FAILED'),
  recorded:prospectiveReport?.recorded??null,
  signalDate:prospectiveReport?.signalDate??null,
  totalSignals:prospectiveReport?.totalSignals??null,
  eligible1m:prospectiveReport?.eligible1m??null,
  eligible3m:prospectiveReport?.eligible3m??null,
  error:prospectiveReport?.error??(prospective?.error?.code??null),
 }:{nonBlocking:true,status:'SKIPPED_KOREA_LANE'};
 const researchFundFlowProspective=lane==='core'?{
  nonBlocking:true,
  exit:fundFlowProspective?.status??null,
  status:fundFlowProspectiveReport?.status??(fundFlowProspective?.status===0?'REPORT_MISSING':'EXECUTION_FAILED'),
  initialized:fundFlowProspectiveReport?.initialized??null,
  recorded:fundFlowProspectiveReport?.recorded??null,
  observedReleaseDate:fundFlowProspectiveReport?.observedReleaseDate??null,
  totalSignals:fundFlowProspectiveReport?.totalSignals??null,
  eligible1m:fundFlowProspectiveReport?.eligible1m??null,
  eligible3m:fundFlowProspectiveReport?.eligible3m??null,
  error:fundFlowProspectiveReport?.error??(fundFlowProspective?.error?.code??null),
 }:{nonBlocking:true,status:'SKIPPED_KOREA_LANE'};
 const researchBreadthProspective=lane==='core'?{
  nonBlocking:true,
  exit:breadthProspective?.status??null,
  status:breadthProspectiveReport?.status??(breadthProspective?.status===0?'REPORT_MISSING':'EXECUTION_FAILED'),
  pitRefreshed:breadthProspectiveReport?.pitRefreshed??null,
  initialized:breadthProspectiveReport?.initialized??null,
  recorded:breadthProspectiveReport?.recorded??null,
  signalDate:breadthProspectiveReport?.signalDate??null,
  totalSignals:breadthProspectiveReport?.totalSignals??null,
  eligible1m:breadthProspectiveReport?.eligible1m??null,
  eligible3m:breadthProspectiveReport?.eligible3m??null,
  error:breadthProspectiveReport?.error??breadthProspectiveReport?.reason??(breadthProspective?.error?.code??null),
 }:{nonBlocking:true,status:'SKIPPED_KOREA_LANE'};
 const researchEarningsR5OfficialRefresh=lane==='core'?{
  nonBlocking:true,
  exit:earningsR5OfficialRefresh?.status??null,
  status:earningsR5OfficialRefreshReport?.status??(earningsR5OfficialRefresh?.status===0?'REPORT_MISSING':'EXECUTION_FAILED'),
  kstDate:earningsR5OfficialRefreshReport?.kstDate??null,
  kstHour:earningsR5OfficialRefreshReport?.kstHour??null,
  lastAttemptKstDate:earningsR5OfficialRefreshReport?.lastAttemptKstDate??null,
  updatedSources:earningsR5OfficialRefreshReport?.updatedSources??[],
  officialNetworkCalls:earningsR5OfficialRefreshReport?.officialNetworkCalls??null,
  error:earningsR5OfficialRefreshReport?.code??(earningsR5OfficialRefresh?.error?.code??null),
 }:{nonBlocking:true,status:'SKIPPED_KOREA_LANE'};
 const researchEarningsR5Prospective=lane==='core'?{
  nonBlocking:true,
  exit:earningsR5Prospective?.status??null,
  status:earningsR5ProspectiveReport?.status??(earningsR5Prospective?.status===0?'REPORT_MISSING':'EXECUTION_FAILED'),
  snapshotStatus:earningsR5ProspectiveReport?.snapshotStatus??null,
  snapshotDate:earningsR5ProspectiveReport?.snapshotDate??null,
  snapshotCount:earningsR5ProspectiveReport?.snapshotCount??null,
  decision:earningsR5ProspectiveReport?.decision??null,
  staleReportIgnored:earningsR5ProspectiveReportStale,
  error:earningsR5ProspectiveReport?.code??(earningsR5Prospective?.error?.code??null),
 }:{nonBlocking:true,status:'SKIPPED_KOREA_LANE'};
 const researchBreadthR10V9Shadow=lane!=='core'?{nonBlocking:true,status:'SKIPPED_KOREA_LANE'}:
  !breadthV9OptIn?{nonBlocking:true,status:'DISABLED'}:{
  nonBlocking:true,
  enabled:true,
  status:breadthV9ShadowFresh?breadthV9ShadowReport?.status??'REPORT_MISSING':breadthV9ShadowRun?.status===0?'REPORT_MISSING':'EXECUTION_FAILED',
  observationDate:breadthV9ShadowReport?.display?.observationDate??null,
  asOf:breadthV9ShadowReport?.asOf??null,
  latestStored:breadthV9ShadowReport?.latestStored??null,
  error:breadthV9ShadowRun?.error?.code??null,
 };
 const sectorFearGreed=lane==='core'?{
  nonBlocking:true,
  exit:sectorFearGreedR3?.status??null,
  status:sectorFearGreedR3Report?.status??(sectorFearGreedR3?.status===0?'REPORT_MISSING':'EXECUTION_FAILED'),
  observationDate:sectorFearGreedR3Report?.observationDate??null,
  historyPoints:sectorFearGreedR3Report?.historyPoints??null,
  sectors:sectorFearGreedR3Report?.sectors??null,
  error:sectorFearGreedR3Report?.error??(sectorFearGreedR3?.error?.code??null),
 }:{nonBlocking:true,status:'SKIPPED_KOREA_LANE'};
 const report={at:new Date().toISOString(),lane,collectionExit:collection.status,collectionStatus:collectionReport?.status??null,supplyR10,alpacaIncremental,sectorFearGreed,researchBreadthR10V9Shadow,publicationExit:publication.status,publishRequested,publishSkipped,publicationPolicy,progressive,researchProspective,researchFundFlowProspective,researchBreadthProspective,researchEarningsR5OfficialRefresh,researchEarningsR5Prospective,status:publication.status===0?(publicationPolicy.collectionDegraded?'COMPLETE_WITH_COLLECTION_GAPS':'COMPLETE'):'PUBLICATION_NOT_VERIFIED'};
 save(path.join(base,'local-cycle-last-run.json'),report);console.log(JSON.stringify(report));
 if(publishRequested)try{updateDataAlert(base,{key:'publication',failed:publication.status!==0});}catch{console.warn('LOCAL_DATA_ALERT_RECORD_FAILED');}
 if(publication.status!==0)process.exitCode=1;
}finally{fs.unlinkSync(file);}
