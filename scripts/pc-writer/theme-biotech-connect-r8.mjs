// One-time biotech-only install/cutover. Preserves the existing seven-theme
// schedule and all 13 immutable R7 source files, then retargets only the
// already-registered biotech task to the additive R8 wrapper.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DATA='E:\\ZGmini\\data';
const NODE='E:\\ZGmini\\runtime\\node.exe';
const R7=path.join(DATA,'themes','biotech','source-r7');
const R8=path.join(DATA,'themes','biotech','source-r8');
const TASK='\\ZGMINI-PC-Theme-Biotech';
const CMD=path.join(R8,'BIOTECH_R8_SCHEDULED.cmd');
const SCHED=path.win32.join(process.env.SystemRoot??'C:\\Windows','System32','schtasks.exe');
const digest=b=>createHash('sha256').update(b).digest('hex');
const fail=s=>{throw Object.assign(new Error(s),{code:s});};
const check=(ok,s)=>{if(!ok)fail(s);};
const normalized=s=>s.replace(/>\s+</g,'><').trim();

function queryTask(){
 const b=execFileSync(SCHED,['/query','/tn',TASK,'/xml'],{windowsHide:true,timeout:30000});
 if(b[0]===255&&b[1]===254)return b.subarray(2).toString('utf16le');
 if(b[1]===0)return b.toString('utf16le').replace(/^\uFEFF/,'');
 return b.toString('utf8').replace(/^\uFEFF/,'');
}
const xmlTag=(xml,name)=>{
 const m=[...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${name}>`,'g'))];
 check(m.length===1,'R8_TASK_XML_'+name.toUpperCase()+'_AMBIGUOUS');return m[0][0];
};
const taskSignature=xml=>Object.fromEntries(['Triggers','Principals','Settings'].map(tag=>[tag,normalized(xmlTag(xml,tag))]));
function planTaskReplace(xml){
 const before=xmlTag(xml,'Actions');
 check(before.includes('BIOTECH_R7_SCHEDULED.cmd')&&before.includes('source-r7')&&
  !before.includes('BIOTECH_R8_SCHEDULED.cmd')&&[...before.matchAll(/<Exec>/g)].length===1,
  'R8_EXISTING_BIOTECH_TASK_NOT_R7');
 const open=before.match(/^<Actions(?:\s[^>]*)?>/);
 check(open,'R8_ACTIONS_TAG_INVALID');
 const newAction=`${open[0]}<Exec><Command>C:\\Windows\\System32\\cmd.exe</Command>`+
  `<Arguments>/d /c &quot;&quot;${CMD}&quot;&quot;</Arguments>`+
  `<WorkingDirectory>${R8}</WorkingDirectory></Exec></Actions>`;
 const updated=xml.replace(before,newAction),a=taskSignature(xml),b=taskSignature(updated);
 check(Object.keys(a).every(k=>a[k]===b[k]),'R8_BIOTECH_TASK_SETTINGS_DRIFT');
 return updated;
}
function writeXml(filename,xml){
 check(!fs.existsSync(filename),'R8_TEMP_XML_ALREADY_PRESENT');
 fs.writeFileSync(filename,Buffer.from('\uFEFF'+xml.replace(/<\?xml\s+[^>]*\?>/,
  '<?xml version="1.0" encoding="UTF-16"?>'),'utf16le'),{flag:'wx'});
}
function registerXml(file){execFileSync(SCHED,['/create','/tn',TASK,'/xml',file,'/f'],
 {windowsHide:true,timeout:30000,maxBuffer:1024*1024});}

export function inspectR8Files({bundle=HERE,source7=R7}={}){
 const manifest7=JSON.parse(fs.readFileSync(path.join(bundle,'BIOTECH_R7_FILES.json'),'utf8'));
 const manifest8=JSON.parse(fs.readFileSync(path.join(bundle,'BIOTECH_R8_FILES.json'),'utf8'));
 check(manifest7.version===1&&manifest8.version===1,'R8_INSTALL_MANIFEST_VERSION');
 const files=[];
 for(const [relative,expected] of Object.entries(manifest7.files)){
  const src=path.join(source7,relative);
  check(fs.existsSync(src)&&digest(fs.readFileSync(src))===expected,'R8_R7_SOURCE_IMMUTABILITY_FAILED');
  files.push({relative,source:src,sha256:expected});
 }
 for(const [relative,expected] of Object.entries(manifest8.files)){
  const src=path.join(bundle,relative);
  check(fs.existsSync(src)&&digest(fs.readFileSync(src))===expected,'R8_RELEASE_SOURCE_SHA_INVALID');
  check(!files.some(f=>f.relative===relative),'R8_DUPLICATE_INSTALL_PATH');
  files.push({relative,source:src,sha256:expected});
 }
 return files;
}

export function installBiotechR8({bundle=HERE,dataRoot=DATA,source7=R7,source8=R8}={}){
 check(fs.existsSync(dataRoot)&&fs.existsSync(source7),'R8_DATA_OR_R7_SOURCE_MISSING');
 const files=inspectR8Files({bundle,source7});
 const root=fs.realpathSync(dataRoot);
 check(path.relative(root,source8).startsWith('themes'+path.sep+'biotech'+path.sep),
  'R8_INSTALL_TARGET_ESCAPE');
 for(const file of files){
  const dest=path.join(source8,file.relative);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  if(fs.existsSync(dest))check(digest(fs.readFileSync(dest))===file.sha256,'R8_INSTALLED_SOURCE_DRIFT');
  else fs.copyFileSync(file.source,dest,fs.constants.COPYFILE_EXCL);
  check(digest(fs.readFileSync(dest))===file.sha256,'R8_INSTALL_READBACK_MISMATCH');
 }
 return {source8,files:files.length};
}

export function switchBiotechTaskR8({beforeXml=queryTask(),folder=HERE}={}){
 const action=xmlTag(beforeXml,'Actions');
 if(action.includes('BIOTECH_R8_SCHEDULED.cmd'))return {status:'ALREADY_CONNECTED'};
 const updated=planTaskReplace(beforeXml);
 const backup=path.join(folder,'BIOTECH_R8_BEFORE_TASK.xml');
 if(fs.existsSync(backup)){
  const b=fs.readFileSync(backup);
  check(b.length>=2&&digest(b)===digest(Buffer.from('\uFEFF'+beforeXml.replace(/<\?xml\s+[^>]*\?>/,
   '<?xml version="1.0" encoding="UTF-16"?>'),'utf16le')),'R8_TASK_BACKUP_CONFLICT');
 }else writeXml(backup,beforeXml);
 const working=path.join(folder,'BIOTECH_R8_TASK_APPLY_ONCE.xml');
 writeXml(working,updated);
 let applied=false;
 try{
  registerXml(working);applied=true;
  const verified=queryTask(),newAction=xmlTag(verified,'Actions');
  check(newAction.includes('BIOTECH_R8_SCHEDULED.cmd')&&newAction.includes('source-r8'),
   'R8_TASK_ACTION_READBACK_FAILED');
  const a=taskSignature(beforeXml),b=taskSignature(verified);
  check(Object.keys(a).every(k=>a[k]===b[k]),'R8_TASK_SCHEDULE_OR_IDENTITY_CHANGED');
 }catch(e){
  if(applied){try{registerXml(backup);}catch{fail('R8_TASK_RECOVERY_REQUIRES_MANUAL_REVIEW');}}
  throw e;
 }finally{if(fs.existsSync(working))fs.unlinkSync(working);}
 return {status:'BIOTECH_ONLY_SCHEDULE_ACTION_CONNECTED',originalTaskBackup:backup};
}

async function main(){
 const result={report:'BIOTECH_R8_CONNECT',status:'STARTED',sevenThemeChanges:0,
  existingBiotechConfirmedFilesChanged:0,schedulerFrequencyChanged:false};
 try{
  check(process.argv.length===3&&process.argv[2]==='--apply','R8_INSTALL_ARGS');
  check(process.platform==='win32'&&fs.existsSync(NODE),'R8_APPROVED_WINDOWS_NODE_MISSING');
  const installed=installBiotechR8();result.installedFiles=installed.files;
  // Do not change the Task Scheduler before the same runtime has passed once.
  const started=execFileSync(NODE,[path.join(R8,'scripts','pc-writer','theme-biotech-auto-r8.mjs'),
   '--once','--collect','--publish'],{windowsHide:true,timeout:240000,maxBuffer:1024*1024,
   env:{...process.env,ZGMINI_DATA_ROOT:DATA}}).toString('utf8').trim();
  const last=started.split(/\r?\n/).filter(Boolean).at(-1);
  const output=JSON.parse(last);result.firstRun=output;
  check(output.report==='BIOTECH_AUTO_R8'&&[
   'R8_D1_READBACK_VERIFIED_API_PENDING','UNCHANGED_NO_WRITE',
   'NO_NEW_VERIFIED_PROVISIONAL'].includes(output.status),'R8_FIRST_CYCLE_NOT_PUBLISHABLE');
  const changed=switchBiotechTaskR8();result.task=changed.status;
  result.status='R8_CONNECTED_FIRST_CYCLE_EXECUTED';
 }catch(e){result.status='BLOCKED';result.reason=e?.code??'R8_INSTALL_OR_SCHEDULER_FAILED';process.exitCode=1;}
 console.log(JSON.stringify(result));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
