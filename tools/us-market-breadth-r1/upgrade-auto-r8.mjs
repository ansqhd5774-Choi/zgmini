/** Upgrade only the previously installed US sidecar file, retaining task XML. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const source=path.resolve(process.argv[2]??path.dirname(fileURLToPath(import.meta.url)));
const home=process.env.ZGMINI_PC_HOME??'E:\\ZGmini\\data\\pc-writer';
const root='E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release';
const target=path.join(home,'features','us-market-breadth-r1');
const active=path.join(target,'us-scheduled.mjs');
const backup=path.join(target,'us-scheduled.r4-backup.mjs');
const stage=path.join(target,'us-scheduled.r8-stage.mjs');
const report=path.join(source,'US_BREADTH_PC_R8_AUTO_UPGRADE_RESULT.txt');
const task='ZGMINI-PC-US-Breadth-R1';
const approvedR4Sha='1341ff6289301ff41e4faf2d6c032e5ed27f470a51f945e8611b301bf985feaf';
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
const readJSON=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const logs=['REPORT=US_BREADTH_PC_R8_AUTO_UPGRADE','SCOPE=US_ONLY_PRESERVE_TASK_XML'];
const log=(key,value)=>logs.push(`${key}=${String(value??'UNKNOWN').replace(/[\r\n]/g,' ').slice(0,140)}`);
const decode=b=>b?.[0]===255&&b?.[1]===254?b.subarray(2).toString('utf16le'):
 b?.length>6&&b[1]===0&&b[3]===0?b.toString('utf16le'):b?.toString('utf8')??'';

function run(){
 if(process.platform!=='win32'||Number(process.versions.node.split('.')[0])<24)throw Error('WINDOWS_NODE_24_REQUIRED');
 if(!process.execPath.toLowerCase().startsWith('e:\\zgmini\\runtime\\'))throw Error('APPROVED_NODE_NOT_SELECTED');
 if(new Date().getTimezoneOffset()!==-540)throw Error('PC_LOCAL_TIME_NOT_KST');
 const localTime=new Date();
 if(localTime.getHours()===20&&localTime.getMinutes()>=45||localTime.getHours()===21&&localTime.getMinutes()<=15)
  throw Error('WAIT_OUTSIDE_TASK_START_WINDOW');
 const config=readJSON(path.join(home,'config.json'));
 if(config?.enabled!==true||config?.collectionTarget!=='pc'||!config?.core)throw Error('PC_CONFIG_NOT_APPROVED');
 const head=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true,timeout:10000}).trim();
 log('PC_SOURCE',head);
 if(head!==config.source)throw Error('APPROVED_PC_SOURCE_MISMATCH');
 execFileSync('git',['-C',root,'diff','--quiet','HEAD','--','worker','lib','scripts/pc-writer'],{windowsHide:true,timeout:10000});
 const existingTask=spawnSync('schtasks.exe',['/Query','/TN',task,'/XML'],{windowsHide:true,timeout:15000});
 if(existingTask.status!==0)throw Error('EXISTING_US_TASK_NOT_FOUND');
 const xml=decode(existingTask.stdout).toLowerCase();
 if(!xml.includes('us-scheduled.mjs')||!xml.includes('us-market-breadth-r1'))throw Error('TASK_TARGET_MISMATCH');
 const next=fs.readFileSync(path.join(source,'us-scheduled.mjs'));
 if(!next.toString('utf8').includes('needsOneFreshSourceAttempt'))throw Error('R8_PACKAGE_INVALID');
 const nextSha=sha(next);
 const before=fs.readFileSync(active);
 const beforeSha=sha(before);
 log('BEFORE_SHA256',beforeSha);
 if(beforeSha===nextSha){log('INSTALL','ALREADY_R8');return;}
 if(beforeSha!==approvedR4Sha)throw Error('INSTALLED_SOURCE_HASH_CONFLICT');
 if(fs.existsSync(backup)||fs.existsSync(stage))throw Error('EXISTING_BACKUP_OR_STAGE_REVIEW_REQUIRED');

 // Write and syntax-check all new files before swapping the active entrypoint.
 for(const name of ['manual-collector-policy.mjs','manual-source-refresh.mjs']){
  const incoming=fs.readFileSync(path.join(source,name));
  const destination=path.join(target,name);
  if(fs.existsSync(destination)&&sha(fs.readFileSync(destination))!==sha(incoming))
   throw Error('HELPER_FILE_HASH_CONFLICT');
 }
 for(const name of ['manual-collector-policy.mjs','manual-source-refresh.mjs']){
  const destination=path.join(target,name);
  if(!fs.existsSync(destination))fs.copyFileSync(path.join(source,name),destination,fs.constants.COPYFILE_EXCL);
 }
 fs.writeFileSync(stage,next,{flag:'wx'});
 if(sha(fs.readFileSync(stage))!==nextSha)throw Error('STAGED_SOURCE_MISMATCH');
 const checks=[stage,path.join(target,'manual-source-refresh.mjs'),path.join(target,'manual-collector-policy.mjs')];
 for(const file of checks){
  const syntax=spawnSync(process.execPath,['--check',file],{windowsHide:true,stdio:'ignore',timeout:10000});
  if(syntax.status!==0)throw Error('STAGED_SYNTAX_CHECK_FAILED');
 }
 fs.renameSync(active,backup);
 try{fs.renameSync(stage,active)}catch(error){fs.renameSync(backup,active);throw error}
 if(sha(fs.readFileSync(active))!==nextSha)throw Error('ACTIVE_READBACK_MISMATCH_REVIEW_BACKUP');
 log('AFTER_SHA256',nextSha);
 log('BACKUP','PRESERVED_R4_SOURCE');
 log('SCHEDULE','UNCHANGED_DAILY_21_LOCAL_TIME');
 log('INSTALL','R8_FILE_SWITCH_VERIFIED');
}

try{run();log('RESULT','INSTALLED_OR_ALREADY_R8');}
catch(error){log('RESULT','BLOCKED_OR_PARTIAL');log('REASON',/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'UNCLASSIFIED');process.exitCode=1;}
finally{fs.writeFileSync(report,logs.join('\r\n')+'\r\n','utf8');console.log(`RESULT_FILE=${report}`)}
