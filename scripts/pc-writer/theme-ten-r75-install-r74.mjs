// R75: SHA-pinned installation of the already-tested R74 private R47 bundle.
// No new task, formula, provider, D1, or publication action occurs here.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const R47_NAME='THEME_NINE_R47_RECURRING_PRIVATE_UPDATE.cmd';
const SOURCE_SHA='2e0fc3e358feff70103d1e9025ce0944132b7b10a2159900f9479b9860550888';
const PRIOR_SHA=new Set([
 '5a2149556ab4ebc255ea54a14501d1511a906a2904252cad938f9de0b730a24c',
 '2133e5d4e625762340e715ecd21e809f274713c030e904e3e3f314dc3b6a0729',
]);
const hash=data=>createHash('sha256').update(data).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code});};

export function installR74({
 source=path.join(path.dirname(fileURLToPath(import.meta.url)),R47_NAME),
 target='E:/ZGmini/data/pc-writer/theme-nine-r48/'+R47_NAME,
 lock='E:/ZGmini/data/themes/legacy-nine-r35-delta/state/delta.lock',
 now=new Date(),
}={}){
 if(process.platform!=='win32'&&process.env.R75_TEST_MODE!=='1')fail('WINDOWS_REQUIRED');
 // The two existing 11:30/13:30 operations must not be raced by an upgrade.
 const kst=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',
  hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 const minutes=Number(kst.slice(0,2))*60+Number(kst.slice(3,5));
 if(minutes>=11*60+15&&minutes<=14*60+15)fail('EXISTING_TASK_WINDOW');
 if(fs.existsSync(lock))fail('EXISTING_PRIVATE_LOCK');
 if(!fs.existsSync(source)||!fs.statSync(source).isFile()||
    fs.lstatSync(source).isSymbolicLink())fail('R74_PACKAGE_MISSING');
 const candidate=fs.readFileSync(source);
 if(hash(candidate)!==SOURCE_SHA)fail('R74_PACKAGE_SHA_MISMATCH');
 if(!fs.existsSync(target)||!fs.statSync(target).isFile()||
    fs.lstatSync(target).isSymbolicLink())fail('INSTALLED_R47_MISSING');
 const original=fs.readFileSync(target),oldSha=hash(original);
 if(oldSha===SOURCE_SHA)return {status:'ALREADY_R74_SHA_VERIFIED',
  oldSha256:oldSha,newSha256:SOURCE_SHA,backupCreated:false,
  taskWrites:0,d1Writes:0,scoreWrites:0};
 if(!PRIOR_SHA.has(oldSha))fail('UNRECOGNIZED_PC_R47_SHA_STOP');
 const backup=target+'.R75_BACKUP_'+oldSha.slice(0,12);
 const staged=target+'.R75_NEW_'+SOURCE_SHA.slice(0,12);
 if(fs.existsSync(backup)||fs.existsSync(staged))fail('REPAIR_BACKUP_OR_STAGE_EXISTS');
 fs.writeFileSync(staged,candidate,{flag:'wx'});
 if(hash(fs.readFileSync(staged))!==SOURCE_SHA)fail('STAGED_SHA_MISMATCH');
 fs.renameSync(target,backup);
 try{
  fs.renameSync(staged,target);
  if(hash(fs.readFileSync(target))!==SOURCE_SHA)fail('INSTALLED_READBACK_FAILED');
 }catch(error){
  if(fs.existsSync(target)){
   // Never replace a conflicting file while another process may be active.
   fail('INSTALL_REQUIRES_MANUAL_BACKUP_REVIEW');
  }
  fs.renameSync(backup,target);
  throw error;
 }
 return {status:'R74_PRIVATE_BUNDLE_INSTALLED',
  oldSha256:oldSha,newSha256:SOURCE_SHA,
  backupCreated:true,backupName:path.basename(backup),
  scheduledTaskChanged:false,taskWrites:0,d1Writes:0,scoreWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3||process.argv[2]!=='--install-once')fail('USAGE');
  const result=installR74();
  console.log(JSON.stringify({report:'R75_R74_PRIVATE_INSTALL',...result},null,2));
 }catch(error){console.log(JSON.stringify({report:'R75_PRIVATE_INSTALL_STOP',
  reason:error?.code??'UNEXPECTED',taskWrites:0,d1Writes:0,scoreWrites:0}));
  process.exitCode=1;}
}
