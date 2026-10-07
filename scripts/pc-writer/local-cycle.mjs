import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {save,read} from './d1.mjs';

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
 const quotaGuarded=process.env.ZGMINI_QUOTA_MODE==='enforce'&&(collectionReport?.quota?.guarded??0)>0;
 const collectionFailed=collection.status!==0||['ERROR','FAILED','SOURCE_FAILED'].includes(collectionReport?.status);
 const publishRequested=process.argv.includes('--publish');
 const publishAllowed=publishRequested&&!quotaGuarded&&!collectionFailed;
 const publishSkipped=publishRequested&&!publishAllowed?(quotaGuarded?'QUOTA_GUARD':collectionFailed?'COLLECTION_FAILED':null):null;
 const publication=spawnSync(process.execPath,[path.join(here,'run-local.mjs'),...(publishAllowed?['--publish']:[])],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30*60000});
 let prospective=null,prospectiveReport=null;
 if(lane==='core'){
  prospective=spawnSync(process.execPath,[path.join(here,'dollar-prospective-forward-r1.mjs')],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:5*60000});
  const prospectiveFile=path.join(base,'local-dollar-prospective-last-run.json');
  prospectiveReport=fs.existsSync(prospectiveFile)?read(prospectiveFile):null;
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
 const report={at:new Date().toISOString(),lane,collectionExit:collection.status,collectionStatus:collectionReport?.status??null,publicationExit:publication.status,publishRequested,publishSkipped,researchProspective,status:publication.status===0?(publishSkipped==='QUOTA_GUARD'?'QUOTA_GUARDED':publishSkipped==='COLLECTION_FAILED'?'COLLECTION_FAILED_PUBLISH_BLOCKED':'COMPLETE'):'PUBLICATION_NOT_VERIFIED'};
 save(path.join(base,'local-cycle-last-run.json'),report);console.log(JSON.stringify(report));
 if(publication.status!==0)process.exitCode=1;
}finally{fs.unlinkSync(file);}
