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
 // A provider failure retains stored good data; publication still reads local storage.
 const collectionReport=fs.existsSync(path.join(base,'local-collection-last-run.json'))?read(path.join(base,'local-collection-last-run.json')):null;
 const supplyR10=lane==='core'?await collectSupplyR10(base):{status:'SKIPPED_KOREA_LANE'};
 if(lane==='core')await collectAlpacaIncremental(base);
 const quotaGuarded=process.env.ZGMINI_QUOTA_MODE==='enforce'&&(collectionReport?.quota?.guarded??0)>0;
 const collectionFailed=collection.status!==0||['ERROR','FAILED','SOURCE_FAILED'].includes(collectionReport?.status);
 const publishRequested=process.argv.includes('--publish');
 const publishAllowed=publishRequested&&!quotaGuarded&&!collectionFailed;
 const publishSkipped=publishRequested&&!publishAllowed?(quotaGuarded?'QUOTA_GUARD':collectionFailed?'COLLECTION_FAILED':null):null;
 const publication=spawnSync(process.execPath,[path.join(here,'run-local.mjs'),...(publishAllowed?['--publish']:[])],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30*60000});
 let prospective=null,prospectiveReport=null,fundFlowProspective=null,fundFlowProspectiveReport=null,breadthProspective=null,breadthProspectiveReport=null;
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
 const report={at:new Date().toISOString(),lane,collectionExit:collection.status,collectionStatus:collectionReport?.status??null,supplyR10,publicationExit:publication.status,publishRequested,publishSkipped,researchProspective,researchFundFlowProspective,researchBreadthProspective,status:publication.status===0?(publishSkipped==='QUOTA_GUARD'?'QUOTA_GUARDED':publishSkipped==='COLLECTION_FAILED'?'COLLECTION_FAILED_PUBLISH_BLOCKED':'COMPLETE'):'PUBLICATION_NOT_VERIFIED'};
 save(path.join(base,'local-cycle-last-run.json'),report);console.log(JSON.stringify(report));
 if(publication.status!==0)process.exitCode=1;
}finally{fs.unlinkSync(file);}
