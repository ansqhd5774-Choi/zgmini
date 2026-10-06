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
 const publishRequested=process.argv.includes('--publish');
 const publishAllowed=publishRequested&&!quotaGuarded;
 const publication=spawnSync(process.execPath,[path.join(here,'run-local.mjs'),...(publishAllowed?['--publish']:[])],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30*60000});
 const report={at:new Date().toISOString(),lane,collectionExit:collection.status,publicationExit:publication.status,publishRequested,publishSkipped:publishRequested&&!publishAllowed?('QUOTA_GUARD'):null,status:publication.status===0?(quotaGuarded?'QUOTA_GUARDED':'COMPLETE'):'PUBLICATION_NOT_VERIFIED'};
 save(path.join(base,'local-cycle-last-run.json'),report);console.log(JSON.stringify(report));
 if(publication.status!==0)process.exitCode=1;
}finally{fs.unlinkSync(file);}
