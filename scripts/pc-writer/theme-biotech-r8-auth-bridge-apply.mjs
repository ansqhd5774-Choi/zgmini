// Offline-scoped PC patch for the already-installed R8 biotech sidecar.
// Only two R8 files are installed.  The seven-theme code, R7 source,
// credentials, database schema, and scheduler trigger remain untouched.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {switchBiotechTaskR8} from './theme-biotech-connect-r8.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DATA='E:\\ZGmini\\data';
const NODE='E:\\ZGmini\\runtime\\node.exe';
const SOURCE=path.join(DATA,'themes','biotech','source-r8');
const STATE=path.join(DATA,'themes','biotech','state');
const CORE=path.join(DATA,'theme-market-history-r131','marketparquet-r167','r179-publish-core.mjs');
const CORE_SHA256='f9ea0a1bfaf52909b7a434b65ba93887f56660bc979a3cb7e0992597bc9f3b68';
const OLD_AUTO_SHA256='faf33368e427bd1378de9e43e436049d773a3af4e30c6959a4b839c42b46225e';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const verify=(condition,code)=>{if(!condition)fail(code);};
const hash=data=>createHash('sha256').update(data).digest('hex');
const digest=file=>hash(fs.readFileSync(file));
const patches=['scripts/pc-writer/theme-biotech-auto-r8.mjs',
 'scripts/pc-writer/theme-biotech-seven-auth-r8.mjs'];

export function preflight({bundle=HERE,source=SOURCE,core=CORE,state=STATE,
 expectedCoreSha256=CORE_SHA256,oldAutoSha256=OLD_AUTO_SHA256}={}){
 verify(fs.existsSync(source),'R8_EXISTING_INSTALL_MISSING');
 verify(fs.existsSync(core)&&digest(core)===expectedCoreSha256,'R8_APPROVED_SEVEN_CORE_MISMATCH');
 verify(!fs.existsSync(path.join(state,'biotech-auto-r7.lock')),'R8_BIOTECH_CYCLE_RUNNING');
 const a=path.join(source,patches[0]),b=path.join(source,patches[1]);
 verify(fs.existsSync(a),'R8_ORIGINAL_AUTO_MISSING');
 for(const name of patches)verify(fs.existsSync(path.join(bundle,name)),'R8_BRIDGE_BUNDLE_INCOMPLETE');
 const old=digest(a),next=digest(path.join(bundle,patches[0]));
 verify(old===oldAutoSha256||old===next,'R8_ORIGINAL_AUTO_CHANGED');
 if(fs.existsSync(b))verify(digest(b)===digest(path.join(bundle,patches[1])),
  'R8_BRIDGE_AUTH_SOURCE_CHANGED');
 return {oldSha256:old,nextSha256:next,alreadyPatched:old===next&&fs.existsSync(b)};
}

export function install({bundle=HERE,source=SOURCE,core=CORE,state=STATE,
 expectedCoreSha256=CORE_SHA256,oldAutoSha256=OLD_AUTO_SHA256}={}){
 const checked=preflight({bundle,source,core,state,expectedCoreSha256,oldAutoSha256});
 if(checked.alreadyPatched)return {status:'ALREADY_PATCHED',filesChanged:0};
 const oldAuto=path.join(source,patches[0]);
 const backup=path.join(bundle,'BIOTECH_R8_BEFORE_AUTH_BRIDGE.mjs');
 verify(checked.oldSha256===oldAutoSha256||fs.existsSync(backup),
  'R8_PARTIAL_PATCH_BACKUP_MISSING');
 verify(!fs.existsSync(backup)||digest(backup)===oldAutoSha256,'R8_BACKUP_CONFLICT');
 if(!fs.existsSync(backup))fs.copyFileSync(oldAuto,backup,fs.constants.COPYFILE_EXCL);
 const copied=[];
 for(const name of patches){
  const src=path.join(bundle,name),dest=path.join(source,name),expected=digest(src);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  if(fs.existsSync(dest)&&digest(dest)===expected)continue;
  const temp=dest+'.auth-bridge-'+process.pid+'.tmp';
  verify(!fs.existsSync(temp),'R8_BRIDGE_TEMP_CONFLICT');
  try{fs.copyFileSync(src,temp,fs.constants.COPYFILE_EXCL);verify(digest(temp)===expected,
   'R8_BRIDGE_TEMP_HASH_MISMATCH');fs.renameSync(temp,dest);}
  finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  verify(digest(dest)===expected,'R8_BRIDGE_READBACK_MISMATCH');
  copied.push(name);
 }
 return {status:'R8_AUTH_BRIDGE_INSTALLED',filesChanged:copied.length,backup};
}

async function main(){
 const report={report:'BIOTECH_R8_APPROVED_SEVEN_AUTH_BRIDGE',status:'STARTED',
  sevenThemeChanges:0,r7SourceChanges:0,schedulerFrequencyChanged:false,dbSchemaChanged:false};
 try{
  verify(process.argv.length===3&&process.argv[2]==='--apply','R8_BRIDGE_ARGS_INVALID');
  verify(process.platform==='win32'&&fs.existsSync(NODE),'R8_APPROVED_WINDOWS_NODE_MISSING');
  report.install=install();
  // Never switch the biotech task unless this exact source succeeds once.
  let output;
  try{output=execFileSync(NODE,[path.join(SOURCE,patches[0]),'--once','--collect','--publish'],{
   encoding:'utf8',windowsHide:true,timeout:240000,maxBuffer:1024*1024,
   env:{...process.env,ZGMINI_DATA_ROOT:DATA}});}
  catch(error){
   const line=String(error.stdout??'').trim().split(/\r?\n/).filter(Boolean).at(-1);
   let parsed;try{parsed=JSON.parse(line);}catch{}
   if(parsed?.report==='BIOTECH_AUTO_R8')report.firstRun={report:parsed.report,
    status:parsed.status,reason:parsed.reason??null};
   fail('R8_BRIDGE_FIRST_CYCLE_EXIT_NONZERO');
  }
  const last=output.trim().split(/\r?\n/).filter(Boolean).at(-1);
  report.firstRun=JSON.parse(last);
  verify(report.firstRun?.report==='BIOTECH_AUTO_R8'&&[
   'R8_D1_READBACK_VERIFIED_API_PENDING','UNCHANGED_NO_WRITE','NO_NEW_VERIFIED_PROVISIONAL'
  ].includes(report.firstRun.status),'R8_BRIDGE_FIRST_CYCLE_NOT_VERIFIED');
  report.task=switchBiotechTaskR8({folder:HERE}).status;
  report.status='R8_BRIDGE_CONNECTED';
 }catch(error){
  report.status='BLOCKED';report.reason=error?.code??'R8_BRIDGE_FIRST_RUN_OR_TASK_FAILED';
  // Never reveal child stdout/stderr, API credentials, or environment values.
  process.exitCode=1;
 }
 console.log(JSON.stringify(report));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
