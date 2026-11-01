// Recover R8's existing Parquet reader without changing the seven-theme lane.
// Only theme-biotech-provisional-r8.mjs is patched; no provider, score formula,
// D1 schema, seven-theme schedule, or R7 confirmed files are changed.
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
const OLD_READER_SHA256='23cf3504f27e647c027637b8ff4884c5a49a88837680351612cc71299c3c13d3';
const AUTH_BRIDGE_SHA256='fd3d5a76859d07219d7a7b349a97c39327646e23b1cb8097f89fe8c7143b9a4e';
const READER='scripts/pc-writer/theme-biotech-provisional-r8.mjs';
const AUTO='scripts/pc-writer/theme-biotech-auto-r8.mjs';
const fail=code=>{throw Object.assign(new Error(code),{code});};
const verify=(condition,code)=>{if(!condition)fail(code);};
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const digest=file=>sha256(fs.readFileSync(file));

export function preflight({bundle=HERE,source=SOURCE,state=STATE,core=CORE,
 expectedCoreSha256=CORE_SHA256,oldReaderSha256=OLD_READER_SHA256,
 authBridgeSha256=AUTH_BRIDGE_SHA256}={}){
 verify(fs.existsSync(core)&&digest(core)===expectedCoreSha256,'R8_SEVEN_APPROVED_CORE_CHANGED');
 verify(!fs.existsSync(path.join(state,'biotech-auto-r7.lock')),'R8_BIOTECH_R7_RUNNING');
 verify(!fs.existsSync(path.join(state,'biotech-auto-r8.lock')),'R8_BIOTECH_R8_RUNNING');
 verify(fs.existsSync(path.join(source,AUTO))&&digest(path.join(source,AUTO))===authBridgeSha256,
  'R8_AUTH_BRIDGE_MISSING_OR_CHANGED');
 const old=path.join(source,READER),next=path.join(bundle,READER);
 verify(fs.existsSync(old),'R8_ORIGINAL_PARQUET_READER_MISSING');
 verify(fs.existsSync(next),'R8_PARQUET_FIX_BUNDLE_INCOMPLETE');
 const before=digest(old),after=digest(next);
 verify(before===oldReaderSha256||before===after,'R8_PARQUET_READER_SOURCE_DRIFT');
 return {beforeSha256:before,afterSha256:after,alreadyPatched:before===after};
}

export function install({bundle=HERE,source=SOURCE,state=STATE,core=CORE,
 expectedCoreSha256=CORE_SHA256,oldReaderSha256=OLD_READER_SHA256,
 authBridgeSha256=AUTH_BRIDGE_SHA256}={}){
 const checked=preflight({bundle,source,state,core,expectedCoreSha256,
  oldReaderSha256,authBridgeSha256});
 if(checked.alreadyPatched)return {status:'ALREADY_PATCHED',filesChanged:0};
 const dest=path.join(source,READER),next=path.join(bundle,READER);
 const backup=path.join(bundle,'BIOTECH_R8_BEFORE_PARQUET_FIX.mjs');
 verify(!fs.existsSync(backup)||digest(backup)===oldReaderSha256,
  'R8_PARQUET_FIX_BACKUP_CONFLICT');
 if(!fs.existsSync(backup))fs.copyFileSync(dest,backup,fs.constants.COPYFILE_EXCL);
 verify(digest(backup)===oldReaderSha256,'R8_PARQUET_FIX_BACKUP_READBACK_FAILED');
 const stage=dest+'.parquet-fix-'+process.pid+'.tmp';
 verify(!fs.existsSync(stage),'R8_PARQUET_FIX_STAGE_CONFLICT');
 try{
  fs.copyFileSync(next,stage,fs.constants.COPYFILE_EXCL);
  verify(digest(stage)===checked.afterSha256,'R8_PARQUET_FIX_STAGED_SHA_MISMATCH');
  fs.renameSync(stage,dest);
 }finally{if(fs.existsSync(stage))fs.unlinkSync(stage);}
 verify(digest(dest)===checked.afterSha256,'R8_PARQUET_FIX_READBACK_FAILED');
 return {status:'R8_PARQUET_READER_PATCHED',filesChanged:1,backup};
}

async function main(){
 const result={report:'BIOTECH_R8_PARQUET_READER_FIX',status:'STARTED',
  sevenThemeChanges:0,r7SourceChanges:0,dbSchemaChanged:false,
  schedulerFrequencyChanged:false};
 try{
  verify(process.argv.length===3&&process.argv[2]==='--apply','R8_PARQUET_FIX_ARGUMENTS');
  verify(process.platform==='win32'&&fs.existsSync(NODE),'R8_WINDOWS_RUNTIME_NOT_APPROVED');
  result.install=install();
  // Only the biotech R8 auto writer runs here. Seven-theme publisher is never called.
  let output;
  try{output=execFileSync(NODE,[path.join(SOURCE,AUTO),'--once','--collect','--publish'],{
   encoding:'utf8',windowsHide:true,timeout:240000,maxBuffer:1024*1024,
   env:{...process.env,ZGMINI_DATA_ROOT:DATA}});}
  catch(error){
   const line=String(error.stdout??'').trim().split(/\r?\n/).filter(Boolean).at(-1);
   let parsed;try{parsed=JSON.parse(line);}catch{}
   if(parsed?.report==='BIOTECH_AUTO_R8')result.firstRun={report:parsed.report,
    status:parsed.status,reason:parsed.reason??null};
   fail('R8_PARQUET_FIX_FIRST_CYCLE_EXIT_NONZERO');
  }
  result.firstRun=JSON.parse(output.trim().split(/\r?\n/).filter(Boolean).at(-1));
  verify(result.firstRun?.report==='BIOTECH_AUTO_R8'&&[
   'R8_D1_READBACK_VERIFIED_API_PENDING','UNCHANGED_NO_WRITE','NO_NEW_VERIFIED_PROVISIONAL'
  ].includes(result.firstRun.status),'R8_PARQUET_FIX_FIRST_CYCLE_NOT_VERIFIED');
  result.task=switchBiotechTaskR8({folder:HERE}).status;
  result.status='R8_PARQUET_FIX_CONNECTED';
 }catch(error){result.status='BLOCKED';
  result.reason=error?.code??'R8_PARQUET_FIX_FAILED';process.exitCode=1;}
 console.log(JSON.stringify(result));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
