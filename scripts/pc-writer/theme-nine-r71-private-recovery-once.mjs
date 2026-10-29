// R71: one controlled invocation of the EXISTING R48 private-only CMD.
// Does not change task configuration, post to D1, or publish a public score.
// The underlying approved R47 command may request GetMarketHistory raw bars.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {summarizeR70Evidence} from './theme-nine-r70-cycle-correlation-readonly.mjs';

const ROOT='E:/ZGmini/data/pc-writer/theme-nine-r48';
const ACTION=path.join(ROOT,'THEME_NINE_R48_PRIVATE_CYCLE.cmd');
const REQUIRED=[
  'THEME_NINE_R48_PRIVATE_CYCLE.cmd',
  'THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd',
  'theme-nine-r48-stage-current.mjs',
  'theme-nine-r48-r47-bridge.mjs',
];
const MATCH_R48=/^THEME_NINE_R48_PRIVATE_CYCLE_\d+_\d+\.txt$/i;
const MATCH_R47=/^THEME_NINE_R47_RECURRING_PRIVATE_UPDATE_\d+_\d+\.txt$/i;

export function r71Preflight({root=ROOT,exists=fs.existsSync,now=new Date()}={}){
  const required=Object.fromEntries(REQUIRED.map(name=>[name,exists(path.join(root,name))]));
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{
    timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23',
  }).formatToParts(now).filter(x=>['hour','minute'].includes(x.type))
    .map(x=>[x.type,Number(x.value)]));
  const minute=parts.hour*60+parts.minute;
  // The 11:30 collector can take longer; allow the 13:30 publisher to finish.
  // Do not block the rest of the afternoon after its completed 13:30 run.
  const nearTask=(minute>=11*60+10&&minute<=12*60+15)||
    (minute>=13*60+15&&minute<=13*60+45);
  const allPresent=Object.values(required).every(Boolean);
  return {allRequiredPresent:allPresent,required,nearScheduledTask:nearTask,
    canRun:allPresent&&!nearTask};
}

function latest(root,pattern){
  if(!fs.existsSync(root))return null;
  const files=fs.readdirSync(root).filter(name=>pattern.test(name))
    .map(name=>({name,file:path.join(root,name)}))
    .map(entry=>({...entry,stat:fs.lstatSync(entry.file)}))
    .filter(entry=>entry.stat.isFile()&&entry.stat.size<=1024*1024)
    .sort((a,b)=>b.stat.mtimeMs-a.stat.mtimeMs);
  const found=files[0];
  if(!found)return null;
  return {filename:found.name,modifiedAt:new Date(found.stat.mtimeMs).toISOString(),
    ...summarizeR70Evidence(fs.readFileSync(found.file,'utf8'))};
}

export function r71LogChange(before,after,launchTime){
  return !!after&&after.modifiedAt!==before?.modifiedAt&&
    Date.parse(after.modifiedAt)>=Date.parse(launchTime)-3000;
}

export function runR71PrivateRecovery({run=spawnSync,now=new Date()}={}){
  if(process.platform!=='win32')throw Error('R71_WINDOWS_PC_REQUIRED');
  const preflight=r71Preflight({now});
  const report={report:'THEME_NINE_R71_PRIVATE_RECOVERY_ONCE',
    startedAt:now.toISOString(),preflight,taskWrites:0,d1Writes:0,
    publicWrites:0,privateCommand:'EXISTING_R48_ONLY',
    providerCallsByR71Wrapper:0};
  if(!preflight.canRun)return {...report,status:!preflight.allRequiredPresent?
    'STOP_R71_MISSING_LOCAL_CHAIN':'STOP_R71_NEAR_SCHEDULED_TASK',
    existingPrivateCommandLaunched:false};
  const beforeR48=latest(ROOT,MATCH_R48);
  const beforeR47=latest(ROOT,MATCH_R47);
  const result=run('cmd.exe',['/d','/c',ACTION],{
    encoding:null,timeout:25*60*1000,windowsHide:true,cwd:ROOT,
    maxBuffer:8*1024*1024});
  // The subprocess output could contain private absolute paths and API data.
  // Never put stdout/stderr in the user-shareable report.
  const afterR48=latest(ROOT,MATCH_R48);
  const afterR47=latest(ROOT,MATCH_R47);
  const r48Changed=r71LogChange(beforeR48,afterR48,now.toISOString());
  const r47Changed=r71LogChange(beforeR47,afterR47,now.toISOString());
  return {...report,status:result.error?'STOP_R71_PRIVATE_RUN_ERROR':
    result.status===0?'R71_EXISTING_PRIVATE_RUN_RETURNED_ZERO':'R71_EXISTING_PRIVATE_RUN_NONZERO',
    existingPrivateCommandLaunched:true,existingPrivateCommandExit:result.status,
    processError:result.error?result.error.code??'SUBPROCESS_ERROR':null,
    newestR48LogCreatedByThisRun:r48Changed,
    newestR47LogCreatedByThisRun:r47Changed,
    latestR48:afterR48,latestR47:afterR47,
    rawPricesPrinted:false,secretConfigPrinted:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==3||!['--check','--run'].includes(process.argv[2]))
      throw Error('R71_USAGE');
    const check=process.argv[2]==='--check'?r71Preflight():null;
    const report=check?{
      report:'THEME_NINE_R71_PRIVATE_PREFLIGHT',
      status:check.canRun?'R71_PREFLIGHT_READY':'STOP_R71_PREFLIGHT',
      preflight:check,taskWrites:0,d1Writes:0,publicWrites:0,
    }:runR71PrivateRecovery();
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
    if(report.status?.startsWith('STOP')||report.existingPrivateCommandExit>0)
      process.exitCode=2;
  }catch(error){
    process.stderr.write(JSON.stringify({status:'STOP_R71_UNEXPECTED',
      reason:error?.code??error?.message??'UNKNOWN',taskWrites:0,d1Writes:0})+'\n');
    process.exitCode=1;
  }
}
