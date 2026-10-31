/** Add a separate, fail-closed Windows US breadth task; never modify existing tasks. */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const source=path.resolve(process.argv[2]??path.dirname(fileURLToPath(import.meta.url)));
const home=process.env.ZGMINI_PC_HOME??'E:\\ZGmini\\data\\pc-writer';
const root='E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release';
const target=path.join(home,'features','us-market-breadth-r1');
const reportPath=path.join(source,'US_BREADTH_PC_R4_INSTALL_RESULT.txt');
const TASK='ZGMINI-PC-US-Breadth-R1';
const logs=['REPORT=US_BREADTH_PC_R4_SAFE_INSTALL','SCOPE=US_ONLY_NO_EXISTING_TASK_MODIFICATION'];
const log=(key,value)=>logs.push(`${key}=${String(value??'UNKNOWN').replace(/[\r\n]/g,' ').slice(0,140)}`);
const sha=body=>createHash('sha256').update(body).digest('hex');
const decode=b=>b?.[0]===255&&b?.[1]===254?b.subarray(2).toString('utf16le'):
 b?.length>6&&b[1]===0&&b[3]===0?b.toString('utf16le'):b?.toString('utf8')??'';
const files=[
 'us-scheduled.mjs',
 'scripts/pc-writer/market-breadth-us-r1.mjs',
 'scripts/pc-writer/breadth-r10-v9-shadow/audit.mjs',
 'lib/market-score/breadth-b1-r3-calendar.mjs',
 'lib/market-breadth/compute.mjs',
 'lib/market-breadth/us-public-r1.mjs',
];

function run(){
 if(process.platform!=='win32'||Number(process.versions.node.split('.')[0])<24)throw Error('WINDOWS_NODE_24_REQUIRED');
 if(new Date().getTimezoneOffset()!==-540)throw Error('PC_LOCAL_TIME_NOT_KST');
 const config=JSON.parse(fs.readFileSync(path.join(home,'config.json'),'utf8'));
 if(config?.enabled!==true||config?.collectionTarget!=='pc'||!config?.core)throw Error('PC_CONFIG_NOT_APPROVED');
 const head=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true,timeout:10000}).trim();
 if(head!==config.source)throw Error('APPROVED_PC_SOURCE_MISMATCH');
 execFileSync('git',['-C',root,'diff','--quiet','HEAD','--','worker','lib','scripts/pc-writer'],{windowsHide:true,timeout:10000});
 const collector=path.join(root,'scripts','pc-writer','collect-local.mjs');
 if(!fs.existsSync(collector)||!fs.readFileSync(collector,'utf8').includes('--job='))throw Error('COLLECTOR_JOB_INTERFACE_NOT_FOUND');
 const d1File=path.join(root,'scripts','pc-writer','d1.mjs');
 if(!fs.existsSync(d1File))throw Error('EXISTING_D1_CLIENT_MISSING');
 const d1=fs.readFileSync(d1File,'utf8');
 if(!d1.includes('export function client(')||!d1.includes('export function credential('))throw Error('EXISTING_D1_CLIENT_INCOMPATIBLE');
 const node=process.execPath;
 if(!node.toLowerCase().startsWith('e:\\zgmini\\runtime\\'))throw Error('APPROVED_NODE_NOT_SELECTED');

 const current=spawnSync('schtasks.exe',['/Query','/TN',TASK,'/XML'],{windowsHide:true,timeout:15000});
 if(current.status===0){
  const taskXml=decode(current.stdout);
  if(!taskXml.includes('us-scheduled.mjs')||!taskXml.includes('us-market-breadth-r1'))
   throw Error('TASK_NAME_CONFLICT_PRESERVE_EXISTING');
  log('SCHEDULE','ALREADY_REGISTERED');
 }else if(current.status!==1){
  throw Error('TASK_LOOKUP_UNAVAILABLE');
 }

 for(const file of files){
  const input=path.join(source,file),output=path.join(target,file);
  if(!fs.existsSync(input))throw Error('PACKAGE_INCOMPLETE');
  const body=fs.readFileSync(input);
  if(body.length<80)throw Error('PACKAGE_FILE_TOO_SMALL');
  if(fs.existsSync(output)&&sha(fs.readFileSync(output))!==sha(body))throw Error('INSTALLED_VERSION_CONFLICT_PRESERVE_EXISTING');
 }
 for(const file of files){
  const output=path.join(target,file);
  if(fs.existsSync(output))continue;
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.copyFileSync(path.join(source,file),output,fs.constants.COPYFILE_EXCL);
 }
 log('INSTALL','FILES_VERIFIED');
 const entry=path.join(target,'us-scheduled.mjs');
 const syntax=spawnSync(node,['--check',entry],{windowsHide:true,stdio:'ignore',timeout:10000});
 if(syntax.status!==0)throw Error('INSTALLED_ENTRY_SYNTAX_FAILED');
 if(current.status!==0){
  const command=`${node} ${entry}`;
  const created=spawnSync('schtasks.exe',['/Create','/SC','DAILY','/ST','21:00','/TN',TASK,'/TR',command],{
   windowsHide:true,encoding:'utf8',timeout:20000,
  });
  if(created.status!==0)throw Error('SCHEDULE_CREATION_FAILED');
  log('SCHEDULE','CREATED_DAILY_21_LOCAL_TIME');
 }
 log('PC_SOURCE',head);
 log('NEXT','RUN_TASK_ONCE_OR_WAIT_FOR_21_LOCAL_TIME');
}

try{run();log('RESULT','INSTALLED_SCHEDULED');}
catch(error){log('RESULT','BLOCKED_OR_PARTIAL');log('REASON',/^[A-Z0-9_]+$/.test(error?.message??'')?error.message:'UNCLASSIFIED');process.exitCode=1;}
finally{fs.writeFileSync(reportPath,logs.join('\r\n')+'\r\n','utf8');console.log(`RESULT_FILE=${reportPath}`);}
