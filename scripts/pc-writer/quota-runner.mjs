import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {read,save} from './d1.mjs';
import {PROVIDER_QUOTA_POLICY} from './quota-policy.mjs';
import {publicationCompatibility,appendPublicationEvent} from './publication-guard.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const base=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
const root=path.resolve(here,'../..');
const lane=process.argv.includes('--korea')?'korea':'core';
const publish=process.argv.includes('--publish');
const mode=process.argv.includes('--enforce-quota')?'enforce':'observe';
if(process.argv.includes('--plan')){
 console.log(JSON.stringify({status:'PLAN',mode,providers:Object.entries(PROVIDER_QUOTA_POLICY).map(([provider,policy])=>({provider,label:policy.label,hard:policy.hard,perSecond:policy.perSecond??null,per10Sec:policy.per10Sec??null,perMinute:policy.perMinute??null,perHour:policy.perHour??null,perDay:policy.perDay??null,minIntervalMs:policy.minIntervalMs,limitSource:policy.limitSource}))}));
 process.exit(0);
}
const report={at:new Date().toISOString(),lane,mode,publish,status:'STARTED',publishAllowed:!publish};
let publishBlock=null;
if(publish){
 try{
  const source=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
  const originMain=execFileSync('git',['rev-parse','origin/main'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
  const config=read(path.join(base,'config.json'));
  publishBlock=publicationCompatibility(root,config.source,source,originMain);
 }catch(error){publishBlock={status:error.code==='ENOENT'?'PUBLISH_PREFLIGHT_MISSING':'PUBLISH_PREFLIGHT_FAILED'};}
 if(publishBlock)Object.assign(report,publishBlock,{publishAllowed:false,publishBlock:publishBlock.status});
 else report.publishAllowed=true;
}
const lock=path.join(base,'quota-runner.lock');
fs.mkdirSync(base,{recursive:true});
if(fs.existsSync(lock)){
 try{const owner=read(lock);process.kill(owner.pid,0);console.log(JSON.stringify({status:'ALREADY_RUNNING'}));process.exit(0);}catch(error){if(error.code!=='ESRCH')throw error;fs.renameSync(lock,`${lock}.interrupted-${Date.now()}`);}
}
fs.writeFileSync(lock,JSON.stringify({pid:process.pid,at:Date.now()}),{flag:'wx'});
try{
 const env={...process.env,ZGMINI_QUOTA_MODE:mode};
 const args=[path.join(here,'local-cycle.mjs'),...(lane==='korea'?['--korea']:[]),...(publish&&!publishBlock?['--publish']:[])];
 const child=spawnSync(process.execPath,args,{cwd:root,env,windowsHide:true,stdio:'inherit',timeout:30*60*1000});
 report.exitCode=child.status;
 report.collection=fs.existsSync(path.join(base,'local-collection-last-run.json'))?read(path.join(base,'local-collection-last-run.json')):null;
 report.publication=fs.existsSync(path.join(base,'local-cycle-last-run.json'))?read(path.join(base,'local-cycle-last-run.json')):null;
 report.status=child.status===0?(publishBlock?'COLLECTION_COMPLETE_PUBLISH_BLOCKED':report.publication?.status?.endsWith('PUBLISH_BLOCKED')?report.publication.status:'COMPLETE'):'NOT_VERIFIED';
 save(path.join(base,'quota-runner-last-run.json'),report);
 appendPublicationEvent(base,{at:report.at,status:report.status,reason:publishBlock?.status??report.publication?.publishSkipped??null,files:publishBlock?.files,publishAllowed:report.publishAllowed,exitCode:report.exitCode});
 if(publishBlock)console.error(`PUBLICATION_BLOCKED: ${publishBlock.status}`);
 console.log(JSON.stringify(report));
 if(child.status!==0)process.exitCode=1;
 else if(publishBlock)process.exitCode=2;
}finally{try{fs.unlinkSync(lock);}catch{}}
