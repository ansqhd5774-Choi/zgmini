// A Git-free, operator-run envelope around the existing immutable upgrade.
// PREFLIGHT touches no PC operation file. INSTALL delegates every mutation
// and rollback to upgradeConfiguredSchedule(), never to this wrapper.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {digest,safeDirectory} from './theme-config-registry.mjs';
import {configuredScheduledCommand} from './theme-config-install.mjs';
import {upgradeConfiguredSchedule} from './theme-config-upgrade.mjs';

export const PACKAGE_SCHEMA='ZGMINI_THEME_CONFIG_UPGRADE_PACKAGE_V1';
export const PACKAGE_REPOSITORY='ansqhd5774-Choi/zgmini';
export const PACKAGE_TASK='ZGMINI-PC-Configured-Themes';
export const PACKAGE_DATA_ROOT='E:/ZGmini/data';
export const PACKAGE_NODE='E:/ZGmini/runtime/node.exe';
export const PACKAGE_FILES=[
 'RUN_PREFLIGHT.cmd','RUN_INSTALL.cmd','README_KO.txt',
 'scripts/pc-writer/theme-config-package-runner.mjs',
 'scripts/pc-writer/theme-config-task-state.js',
 'scripts/pc-writer/theme-config-upgrade.mjs',
 'scripts/pc-writer/theme-config-install.mjs',
 'scripts/pc-writer/theme-config-registry.mjs',
 'scripts/pc-writer/theme-config-score.mjs',
 'scripts/pc-writer/theme-config-tool.mjs',
 'scripts/pc-writer/theme-optional-collect.mjs',
 'scripts/pc-writer/theme-optional-adaptive-r2.mjs',
 'scripts/pc-writer/theme-optional-pair-weight-r3.mjs',
 'scripts/pc-writer/theme-space-satellite-adaptive-r2.mjs',
 'scripts/pc-writer/theme-shared-spy-readonly-r1.mjs',
 'scripts/pc-writer/theme-optional-score-r188.mjs',
 'scripts/pc-writer/theme-config-publication-preflight.mjs',
 'scripts/pc-writer/theme-config-publication-d1.mjs',
 'scripts/pc-writer/theme-config-auto-publish.mjs',
 'scripts/pc-writer/theme-nine-r54-d1-client.mjs',
 'scripts/pc-writer/theme-biotech-auth-r7.mjs',
 'worker/public-display-freshness.mjs',
 'config/theme-data-registry.json',
 'examples/theme-registration.template.json',
 'docs/THEME_CONFIG_TOOL.md',
].sort();
const packageHere=fileURLToPath(new URL('../../',import.meta.url));
const fail=code=>{throw Object.assign(new Error(code),{code});};
const need=(ok,code)=>{if(!ok)fail(code);};
const hex64=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const hex40=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
const relative=x=>typeof x==='string'&&/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(x)&&
 !x.split('/').some(p=>p==='.'||p==='..');
const readRegular=file=>{
 const stat=fs.lstatSync(file);
 need(stat.isFile()&&!stat.isSymbolicLink(),'PACKAGE_FILE_REDIRECT');
 return fs.readFileSync(file);
};
const safeError=e=>typeof e?.code==='string'&&/^[A-Z0-9_]+$/.test(e.code)?
 e.code:'PACKAGE_IO_OR_RUNTIME_ERROR';
const lines=obj=>Object.entries(obj).map(([k,v])=>k+'='+String(v??'NOT_AVAILABLE')).join('\r\n')+'\r\n';
const resultFile=root=>path.join(root,'PACKAGE_RESULT.txt');

function inventory(root){
 const found=[];
 function walk(dir,relativeDir=''){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const rel=relativeDir?relativeDir+'/'+entry.name:entry.name;
   need(!entry.isSymbolicLink(),'PACKAGE_FILE_REDIRECT');
   if(entry.isDirectory())walk(path.join(dir,entry.name),rel);
   else{
    need(entry.isFile(),'PACKAGE_UNSUPPORTED_ENTRY');
    found.push(rel);
   }
  }
 }
 walk(root);
 return found.sort();
}

export function verifyConfiguredPackage(packageRoot=packageHere){
 const root=path.resolve(packageRoot);
 const samePath=(a,b)=>process.platform==='win32'?
  a.toLowerCase()===b.toLowerCase():a===b;
 need(fs.lstatSync(root).isDirectory()&&samePath(fs.realpathSync(root),root),
  'PACKAGE_ROOT_REDIRECT');
 const raw=readRegular(path.join(root,'package-manifest.json'));
 need(raw.length<=16384,'PACKAGE_MANIFEST_SIZE');
 let manifest;try{manifest=JSON.parse(raw);}catch{fail('PACKAGE_MANIFEST_JSON');}
 need(manifest?.schema===PACKAGE_SCHEMA&&
  manifest.repository===PACKAGE_REPOSITORY&&hex40(manifest.sourceSha)&&
  hex40(manifest.sourceTreeSha)&&Array.isArray(manifest.files)&&
  manifest.files.length===PACKAGE_FILES.length,'PACKAGE_MANIFEST_CONTRACT');
 const seen=[];
 for(const entry of manifest.files){
  need(entry&&Object.keys(entry).sort().join(',')==='path,sha256'&&
   relative(entry.path)&&hex64(entry.sha256),'PACKAGE_MANIFEST_ENTRY');
  seen.push(entry.path);
 }
 need(JSON.stringify(seen)===JSON.stringify(PACKAGE_FILES),
  'PACKAGE_MANIFEST_FILE_SET');
 const allowed=[...PACKAGE_FILES,'package-manifest.json','PACKAGE_RESULT.txt'];
 const present=inventory(root);
 need(present.every(f=>allowed.includes(f))&&
  present.filter(f=>f!=='PACKAGE_RESULT.txt').length===PACKAGE_FILES.length+1,
  'PACKAGE_UNLISTED_OR_MISSING_FILE');
 for(const entry of manifest.files){
  need(digest(readRegular(path.join(root,...entry.path.split('/'))))===entry.sha256,
   'PACKAGE_FILE_SHA_MISMATCH');
 }
 return {sourceSha:manifest.sourceSha,sourceTreeSha:manifest.sourceTreeSha,
  manifestSha256:digest(raw),fileCount:manifest.files.length,
  provenance:'LOCAL_HASH_MATCH_EXTERNAL_SOURCE_SHA_REQUIRED'};
}

const taskXmlWindows=()=>execFileSync('schtasks',
 ['/Query','/TN',PACKAGE_TASK,'/XML'],
 {encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:12000});
const taskStateWindows=root=>{
 const program=path.join(root,'scripts','pc-writer','theme-config-task-state.js');
 const output=execFileSync('cscript.exe',['//NoLogo',program],
  {encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:12000}).trim();
 need(/^ZG_TASK_STATE=[0-4]$/.test(output),'PACKAGE_TASK_STATE_UNKNOWN');
 return Number(output.slice(-1));
};
const nodeWindows=()=>{
 need(fs.statSync(PACKAGE_NODE).isFile(),'PACKAGE_NODE_NOT_FOUND');
 const normalized=s=>path.win32.normalize(s).toLowerCase().replaceAll('/','\\');
 need(normalized(process.execPath)===normalized(PACKAGE_NODE),
  'PACKAGE_UNAPPROVED_NODE_EXECUTABLE');
 const [major,minor]=process.versions.node.split('.').map(Number);
 need(major>22||major===22&&minor>=13,'PACKAGE_NODE_VERSION_UNSUPPORTED');
 return process.version;
};
function ensureLocksAbsent(dataRoot){
 const configLock=path.join(fs.realpathSync(dataRoot),'theme-config','state','scheduled.lock');
 need(!fs.existsSync(configLock),'PACKAGE_SCHEDULE_LOCK_PRESENT');
 const themes=path.join(fs.realpathSync(dataRoot),'themes');
 if(!fs.existsSync(themes))return 0;
 safeDirectory(dataRoot,'themes');
 let count=0;
 for(const name of fs.readdirSync(themes)){
  if(!/^registered-[a-z][a-z0-9-]*$/.test(name))continue;
  const dir=safeDirectory(dataRoot,'themes/'+name);
  for(const file of ['configured-cycle.lock','collection.lock']){
   need(!fs.existsSync(path.join(dir,'state',file)),
    'PACKAGE_THEME_LOCK_PRESENT');
  }
  count++;
 }
 return count;
}
const historyFingerprint=home=>{
 const file=path.join(home,'SCHEDULE_HISTORY.log');
 if(!fs.existsSync(file))return 'ABSENT';
 const stat=fs.lstatSync(file);
 need(stat.isFile()&&!stat.isSymbolicLink(),'PACKAGE_HISTORY_REDIRECT');
 return digest(JSON.stringify({size:stat.size,mtimeMs:stat.mtimeMs}));
};
const backupNames=home=>{
 const dir=path.join(home,'backups');
 if(!fs.existsSync(dir))return [];
 need(fs.lstatSync(dir).isDirectory()&&!fs.lstatSync(dir).isSymbolicLink(),
  'PACKAGE_BACKUPS_REDIRECT');
 return fs.readdirSync(dir).filter(n=>/^auto-publish-[0-9]+$/.test(n)).sort();
};

export function inspectConfiguredPackage({
 packageRoot=packageHere,dataRoot=PACKAGE_DATA_ROOT,platform=process.platform,
 getTaskXml=taskXmlWindows,getTaskState=()=>taskStateWindows(packageRoot),
 checkNode=nodeWindows
}={}){
 need(platform==='win32','PACKAGE_WINDOWS_REQUIRED');
 const source=verifyConfiguredPackage(packageRoot);
 const runtime=checkNode();
 need(typeof runtime==='string'&&runtime.startsWith('v'),
  'PACKAGE_NODE_VERSION');
 const home=safeDirectory(dataRoot,'pc-writer/theme-config-tool');
 const installedFile=path.join(home,'INSTALL_RESULT.json');
 const installedBytes=readRegular(installedFile);
 let installed;try{installed=JSON.parse(installedBytes);}catch{fail('PACKAGE_OLD_MANIFEST_JSON');}
 need(installed?.status==='CONFIG_TOOL_INSTALLED'&&installed.home===home&&
  /^[a-f0-9]{16}$/.test(installed.version??'')&&
  hex40(installed.sourceSha)&&installed.manifest&&
  Object.getPrototypeOf(installed.manifest)===Object.prototype&&
  Object.hasOwn(installed.manifest,'scripts/pc-writer/theme-config-tool.mjs')&&
  installed.version===digest(JSON.stringify(installed.manifest)).slice(0,16),
  'PACKAGE_OLD_MANIFEST_IDENTITY');
 const oldVersion=safeDirectory(home,'versions/'+installed.version);
 for(const [rel,sha] of Object.entries(installed.manifest)){
  need(relative(rel)&&hex64(sha),'PACKAGE_OLD_MANIFEST_PATH');
  need(digest(readRegular(path.join(oldVersion,...rel.split('/'))))===sha,
   'PACKAGE_OLD_BUNDLE_SHA_MISMATCH');
 }
 const cmd=path.join(home,'THEME_SCHEDULED.cmd');
 const expected=Buffer.from(configuredScheduledCommand({
  dataRoot,home,version:installed.version}));
 const cmdSha=digest(readRegular(cmd));
 need(cmdSha===digest(expected),'PACKAGE_OLD_CMD_MISMATCH');
 const vbs=readRegular(path.join(home,'THEME_SCHEDULED.vbs'));
 need(vbs.toString('utf8').includes(path.join(home,'THEME_SCHEDULED.cmd')),
  'PACKAGE_OLD_VBS_MISMATCH');
 need(!fs.existsSync(path.join(home,'AUTO_PUBLISH_UPGRADE_RESULT.json')),
  'PACKAGE_PRIOR_UPGRADE_RESULT_PRESENT');
 const registered=ensureLocksAbsent(dataRoot);
 const taskState=getTaskState();
 need(taskState===3,'PACKAGE_TASK_NOT_READY');
 const xml=getTaskXml();
 need(typeof xml==='string'&&xml.includes(path.join(home,'THEME_SCHEDULED.vbs'))&&
  xml.includes('T13:00:00'),'PACKAGE_TASK_XML_MISMATCH');
 const state={sourceSha:source.sourceSha,manifestSha256:source.manifestSha256,
  oldVersion:installed.version,installedManifestSha256:digest(installedBytes),
  oldCmdSha256:cmdSha,oldVbsSha256:digest(vbs),taskXmlSha256:digest(xml),
  taskState,registered,historySha256:historyFingerprint(home),
  backupNames:backupNames(home)};
 return {...state,proof:digest(JSON.stringify(state)),home,
  sourceFileCount:source.fileCount,runtime};
}

function parseResult(content){
 const result={};
 for(const line of content.split(/\r?\n/)){
  if(!line)continue;
  const equal=line.indexOf('=');
  need(equal>0,'PACKAGE_RESULT_FORMAT');
  const key=line.slice(0,equal),value=line.slice(equal+1);
  need(/^[A-Z0-9_]+$/.test(key)&&!Object.hasOwn(result,key),
   'PACKAGE_RESULT_FORMAT');
  result[key]=value;
 }
 return result;
}
function readback(home,oldSha){
 const cmd=path.join(home,'THEME_SCHEDULED.cmd');
 let current='UNAVAILABLE';
 try{current=digest(readRegular(cmd));}catch{}
 const file=path.join(home,'AUTO_PUBLISH_UPGRADE_RESULT.json');
 let installed=null;
 if(fs.existsSync(file))try{installed=JSON.parse(readRegular(file));}catch{}
 return {current,oldPreserved:current===oldSha,
  installed:installed?.status==='CONFIGURED_AUTO_PUBLISH_UPGRADE_INSTALLED'?
   installed:null};
}

export function runConfiguredPackage({
 mode,packageRoot=packageHere,dataRoot=PACKAGE_DATA_ROOT,
 inspect=inspectConfiguredPackage,upgrade=upgradeConfiguredSchedule,
 inspectOptions={},upgradeOptions={}
}={}){
 const root=path.resolve(packageRoot),output=resultFile(root);
 let attemptWritten=false,baseline=null;
 try{
  need(mode==='preflight'||mode==='install','PACKAGE_MODE');
  if(mode==='preflight'){
   need(!fs.existsSync(output),'PACKAGE_PREFLIGHT_ALREADY_ATTEMPTED');
   const measured=inspect({packageRoot:root,dataRoot,...inspectOptions});
   fs.writeFileSync(output,lines({
    RESULT_SCHEMA:'ZGMINI_THEME_CONFIG_PACKAGE_RESULT_V1',
    SOURCE_SHA:measured.sourceSha,PACKAGE_MANIFEST_SHA256:measured.manifestSha256,
    PREFLIGHT_STATUS:'PREFLIGHT_PASS',PREFLIGHT_PROOF:measured.proof,
    INSTALLED_MANIFEST_SHA256:measured.installedManifestSha256,
    OLD_CMD_SHA256:measured.oldCmdSha256,TASK_XML_SHA256:measured.taskXmlSha256,
    TASK_STATE:measured.taskState,REGISTERED_THEMES_EXISTING:measured.registered,
    NODE_VERSION:measured.runtime,PC_FILES_CHANGED:0,D1_WRITES:0,
    PROVIDER_CALLS:0,GITHUB_WRITES:0,SITE_DEPLOYS:0
   }),{flag:'wx'});
   return {status:'PREFLIGHT_PASS',sourceSha:measured.sourceSha,
    manifestSha256:measured.manifestSha256,changed:0};
  }
  need(fs.existsSync(output),'PACKAGE_PREFLIGHT_RESULT_REQUIRED');
  const record=parseResult(readRegular(output).toString('utf8'));
  need(record.PREFLIGHT_STATUS==='PREFLIGHT_PASS'&&
   !Object.hasOwn(record,'INSTALL_ATTEMPTED')&&
   !Object.hasOwn(record,'INSTALL_STATUS'),'PACKAGE_INSTALL_ALREADY_ATTEMPTED_OR_NOT_READY');
  baseline=inspect({packageRoot:root,dataRoot,...inspectOptions});
  need(baseline.proof===record.PREFLIGHT_PROOF&&
   baseline.sourceSha===record.SOURCE_SHA&&
   baseline.manifestSha256===record.PACKAGE_MANIFEST_SHA256,
   'PACKAGE_PREFLIGHT_STATE_DRIFT');
  fs.appendFileSync(output,lines({INSTALL_ATTEMPTED:'YES'}));
  attemptWritten=true;
  const r=upgrade({dataRoot,sourceSha:baseline.sourceSha,...upgradeOptions});
  need(r?.status==='CONFIGURED_AUTO_PUBLISH_UPGRADE_INSTALLED'&&
   r.sourceSha===baseline.sourceSha&&r.oldVersion===baseline.oldVersion&&
   r.oldSha256===baseline.oldCmdSha256&&r.task?.xmlSha256===baseline.taskXmlSha256&&
   r.task.changed===false&&r.legacyLaunchersChanged===0&&
   r.providerCalls===0&&r.d1Writes===0&&r.registeredThemesAdded===0,
   'PACKAGE_UPGRADE_RETURN_MISMATCH');
  const after=readback(baseline.home,baseline.oldCmdSha256);
  need(after.installed?.newSha256===r.newSha256&&
   after.current===r.newSha256,'PACKAGE_INSTALL_READBACK_MISMATCH');
  fs.appendFileSync(output,lines({
   INSTALL_STATUS:'CONFIGURED_AUTO_PUBLISH_UPGRADE_INSTALLED',
   NEW_CMD_SHA256:r.newSha256,NEW_VERSION:r.newVersion,
   BACKUP_PATH:r.backup,BACKUP_STATUS:'READBACK_VERIFIED_BY_EXISTING_UPGRADER',
   RESTORE_STATUS:'NOT_REQUIRED',TASK_XML_UNCHANGED:'YES',
   PC_FILES_CHANGED:'SCHEDULED_CMD_ONLY',D1_WRITES:0,
   PROVIDER_CALLS:0,GITHUB_WRITES:0,SITE_DEPLOYS:0,
   WINDOWS_RUNTIME_STATUS:'WINDOWS_RESULT_REQUIRES_USER_READBACK'
  }));
  return {status:'CONFIGURED_AUTO_PUBLISH_UPGRADE_INSTALLED',
   sourceSha:baseline.sourceSha,backup:r.backup,changed:1};
 }catch(e){
  const reason=safeError(e);
  if(mode==='preflight'&&!fs.existsSync(output)){
   try{fs.writeFileSync(output,lines({RESULT_SCHEMA:'ZGMINI_THEME_CONFIG_PACKAGE_RESULT_V1',
    PREFLIGHT_STATUS:'STOP',REASON:reason,PC_FILES_CHANGED:0,D1_WRITES:0,
    PROVIDER_CALLS:0,GITHUB_WRITES:0,SITE_DEPLOYS:0}),{flag:'wx'});}catch{}
  }else if(mode==='install'&&attemptWritten){
   const after=baseline?readback(baseline.home,baseline.oldCmdSha256):null;
   try{fs.appendFileSync(output,lines({INSTALL_STATUS:'STOP',REASON:reason,
    CURRENT_CMD_SHA256:after?.current??'UNKNOWN',
    RESTORE_STATUS:after?.oldPreserved?'OLD_CMD_SHA_VERIFIED':'STATE_UNKNOWN',
    BACKUP_STATUS:'INSPECT_EXISTING_BACKUPS_BEFORE_ACTION',
    D1_WRITES:0,PROVIDER_CALLS:0,GITHUB_WRITES:0,SITE_DEPLOYS:0}));}catch{}
  }else if(mode==='install'&&fs.existsSync(output)){
   try{
    const prior=parseResult(readRegular(output).toString('utf8'));
    if(!Object.hasOwn(prior,'INSTALL_STATUS')&&
       !Object.hasOwn(prior,'INSTALL_ATTEMPTED')){
     fs.appendFileSync(output,lines({INSTALL_STATUS:'STOP',REASON:reason,
      PC_FILES_CHANGED:0,D1_WRITES:0,PROVIDER_CALLS:0,
      GITHUB_WRITES:0,SITE_DEPLOYS:0}));
    }
   }catch{}
  }
  return {status:'STOP',reason,changed:attemptWritten?'CHECK_RESULT':'NO_INSTALL_ATTEMPT'};
 }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const arg=process.argv[2];
 const result=process.argv.length===3&&['--preflight','--install'].includes(arg)?
  runConfiguredPackage({mode:arg.slice(2)}):
  {status:'STOP',reason:'PACKAGE_USAGE'};
 console.log(JSON.stringify(result));
 if(result.status!=='PREFLIGHT_PASS'&&
  result.status!=='CONFIGURED_AUTO_PUBLISH_UPGRADE_INSTALLED')process.exitCode=2;
}
