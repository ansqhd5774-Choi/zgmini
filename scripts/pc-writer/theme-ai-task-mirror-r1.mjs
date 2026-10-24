// Create only the opt-in AI semiconductor PC scheduled task from the registered
// seven-theme template. --inspect never writes; --apply requires a recent,
// privately verified cycle and an independently confirmed public publication.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const TEMPLATE='\\ZGMINI-PC-GetMarketHistory-ETF';
const TARGET='\\ZGMINI-PC-Theme-AI-Semiconductor';
const DATA_ROOT='E:\\ZGmini\\data';
const NODE='E:\\ZGmini\\runtime\\node.exe';
const SCHTASKS=path.win32.join(process.env.SystemRoot||'C:\\Windows','System32','schtasks.exe');
const FAIL=reason=>{throw Object.assign(new Error(reason),{reason});};
const NEED=(value,reason)=>{if(!value)FAIL(reason);};
const normalize=xml=>xml.replace(/>\s+</g,'><').trim();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

function section(xml,tag){
 const match=[...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>[\\s\\S]*?<\\/${tag}\\s*>`,'g'))];
 NEED(match.length===1,`TASK_XML_${tag.toUpperCase()}_AMBIGUOUS`);
 return match[0][0];
}

function definition(xml){
 NEED(/<Task\s+[^>]*xmlns="http:\/\/schemas\.microsoft\.com\/windows\/2004\/02\/mit\/task"/.test(xml),'TASK_XML_NAMESPACE_UNEXPECTED');
 const triggers=section(xml,'Triggers'),actions=section(xml,'Actions'),principals=section(xml,'Principals'),settings=section(xml,'Settings');
 const count=[...triggers.matchAll(/<\w+Trigger(?:\s|>)/g)].length;
 NEED(count===1&&/<CalendarTrigger(?:\s|>)/.test(triggers),'SEVEN_THEME_TRIGGER_REVIEW_REQUIRED');
 NEED(!/<Enabled>\s*false\s*<\/Enabled>/i.test(triggers+settings),'SEVEN_THEME_TASK_DISABLED');
 NEED(/<RunOnlyIfNetworkAvailable>\s*true\s*<\/RunOnlyIfNetworkAvailable>/.test(settings),'SEVEN_THEME_NETWORK_GATE_CHANGED');
 const logon=principals.match(/<LogonType>([^<]+)<\/LogonType>/)?.[1];
 NEED(['InteractiveToken','S4U','ServiceAccount'].includes(logon),'SEVEN_THEME_LOGON_REVIEW_REQUIRED');
 return {triggers,actions,principals,settings,count,logon};
}

export function planAiTaskMirror(xml,{runner,workdir}){
 NEED(typeof runner==='string'&&/^E:\\ZGmini\\projects\\zgmini-theme-optional\\releases\\[a-f0-9]{40}\\scripts\\pc-writer\\theme-optional-cycle\.cmd$/i.test(runner),'AI_RELEASE_RUNNER_PATH_INVALID');
 NEED(workdir===path.win32.dirname(runner),'AI_RELEASE_WORKDIR_INVALID');
 const previous=definition(xml),open=previous.actions.match(/^<Actions(?:\s[^>]*)?>/);
 NEED(open,'TASK_XML_ACTIONS_OPEN_MISSING');
 const action=`${open[0]}\n<Exec><Command>C:\\Windows\\System32\\cmd.exe</Command>`+
  `<Arguments>/d /c ""${runner}" ai-semiconductor --publish"</Arguments>`+
  `<WorkingDirectory>${workdir}</WorkingDirectory></Exec>\n</Actions>`;
 let proposed=xml.replace(previous.actions,action);
 const info=section(proposed,'RegistrationInfo');
 NEED(/<URI>[^<]*<\/URI>/.test(info),'TASK_XML_URI_MISSING');
 NEED(/<Description>[\s\S]*?<\/Description>/.test(info),'TASK_XML_DESCRIPTION_MISSING');
 const updated=info.replace(/<URI>[^<]*<\/URI>/,`<URI>${TARGET}</URI>`)
  .replace(/<Description>[\s\S]*?<\/Description>/,
   '<Description>ZGMINI AI semiconductor SMH/SOXX ETF only; verified E drive raw collection, R188 score, guarded D1 public update.</Description>');
 proposed=proposed.replace(info,updated);
 const after=definition(proposed);
 for(const key of ['triggers','principals','settings'])
  NEED(normalize(after[key])===normalize(previous[key]),`SEVEN_THEME_${key.toUpperCase()}_CHANGED`);
 NEED(after.count===previous.count&&after.logon===previous.logon,'SEVEN_THEME_IDENTITY_CHANGED');
 NEED(after.actions.includes(runner)&&after.actions.includes('ai-semiconductor --publish'),'AI_ACTION_INVALID');
 return {xml:proposed,triggerCount:previous.count,logon:previous.logon,
  startBoundary:previous.triggers.match(/<StartBoundary>([^<]+)<\/StartBoundary>/)?.[1]??null};
}

export function verifyExistingAiTask(template,existing,{runner}){
 const actual=definition(existing);
 NEED(section(existing,'RegistrationInfo').includes(`<URI>${TARGET}</URI>`),'AI_EXISTING_TASK_URI_MISMATCH');
 NEED(actual.actions.includes(runner)&&actual.actions.includes('ai-semiconductor --publish'),'AI_EXISTING_ACTION_CHANGED');
 for(const key of ['triggers','principals','settings','actions'])
  NEED(normalize(actual[key])===normalize(template[key]),`AI_EXISTING_${key.toUpperCase()}_DRIFT`);
 return true;
}

function decodeXml(bytes){
 if(bytes[0]===0xff&&bytes[1]===0xfe)return bytes.subarray(2).toString('utf16le').replace(/^\uFEFF/,'');
 if(bytes[0]===0xfe&&bytes[1]===0xff){
  const value=Buffer.from(bytes.subarray(2));for(let i=0;i<value.length;i+=2){const a=value[i];value[i]=value[i+1];value[i+1]=a;}
  return value.toString('utf16le').replace(/^\uFEFF/,'');
 }
 if(bytes[1]===0)return bytes.toString('utf16le').replace(/^\uFEFF/,'');
 for(const encoding of ['utf-8','euc-kr']){
  try{return new TextDecoder(encoding,{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');}catch{}
 }
 FAIL('TASK_XML_ENCODING_UNKNOWN');
}

function schtasks(args){return execFileSync(SCHTASKS,args,{windowsHide:true,timeout:25000,maxBuffer:3*1024*1024});}
function query(name){return decodeXml(schtasks(['/query','/tn',name,'/xml']));}
function targetTask(){
 try{return query(TARGET);}catch(error){
  if(error?.status===1)return null; // No overwrite: /create is always called without /f.
  throw error;
 }
}

export function verifiedRelease(scriptFile){
 const sourceRoot=path.resolve(path.dirname(scriptFile),'..','..'),sourceSha=path.basename(sourceRoot);
 NEED(/^[a-f0-9]{40}$/.test(sourceSha),'NOT_AN_IMMUTABLE_PC_RELEASE');
 NEED(path.win32.normalize(sourceRoot).toLowerCase()===path.win32.normalize(`E:\\ZGmini\\projects\\zgmini-theme-optional\\releases\\${sourceSha}`).toLowerCase(),
  'APPROVED_E_RELEASE_PATH_REQUIRED');
 const manifestPath=path.join(sourceRoot,'source-manifest.json');
 NEED(fs.existsSync(manifestPath),'RELEASE_MANIFEST_MISSING');
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 NEED(manifest.sourceSha===sourceSha&&manifest.sourceRepository==='ansqhd5774-Choi/zgmini'&&Array.isArray(manifest.files),'RELEASE_IDENTITY_INVALID');
 for(const f of manifest.files){
  NEED(/^(?:worker|config|lib|scripts)\/[A-Za-z0-9/_-]+\.(?:mjs|json|cmd)$/.test(f.path)&&/^[a-f0-9]{64}$/.test(f.sha256),'RELEASE_MANIFEST_PATH_INVALID');
  const source=path.join(sourceRoot,...f.path.split('/'));
  NEED(fs.existsSync(source)&&hash(fs.readFileSync(source))===f.sha256,'RELEASE_SOURCE_SHA_DRIFT');
 }
 const runner=path.join(sourceRoot,'scripts','pc-writer','theme-optional-cycle.cmd');
 const self='scripts/pc-writer/theme-ai-task-mirror-r1.mjs';
 NEED(manifest.files.some(f=>f.path===self)&&manifest.files.some(f=>f.path==='scripts/pc-writer/theme-optional-cycle.cmd'),'RELEASE_AI_FILES_MISSING');
 NEED(fs.existsSync(NODE),'APPROVED_NODE_MISSING');
 return {sourceSha,runner,workdir:path.dirname(runner)};
}

export function verifiedPublication(dataRoot=DATA_ROOT,now=Date.now()){
 const file=path.join(dataRoot,'themes','ai-semiconductor','state','cycle-last.json');
 NEED(fs.existsSync(file),'AI_PRIVATE_AND_PUBLIC_RUN_REQUIRED');
 const result=JSON.parse(fs.readFileSync(file,'utf8'));
 NEED(result.themeId==='ai-semiconductor'&&result.status==='PUBLIC_VERIFIED'&&result.publicVerified===true&&result.d1Writes===1,
  'AI_PUBLIC_VERIFICATION_REQUIRED');
 const at=Date.parse(result.recordedAt);
 NEED(Number.isFinite(at)&&at<=now&&now-at<36*3600*1000,'AI_PUBLIC_VERIFICATION_STALE');
 return true;
}

function run(mode){
 const release=verifiedRelease(fileURLToPath(import.meta.url));
 const templateXml=query(TEMPLATE),template=definition(templateXml);
 const plan=planAiTaskMirror(templateXml,release);
 const expected={...template,actions:definition(plan.xml).actions};
 const current=targetTask();
 if(current){verifyExistingAiTask(expected,current,release);return {status:'EXISTING_AI_TASK_VERIFIED',...release,triggerCount:plan.triggerCount,startBoundary:plan.startBoundary};}
 if(mode==='--inspect')return {status:'READY_TO_REGISTER_AFTER_PUBLIC_VERIFICATION',...release,triggerCount:plan.triggerCount,startBoundary:plan.startBoundary};
 verifiedPublication();
 const temp=path.join(DATA_ROOT,'themes','ai-semiconductor','state',`AI_TASK_REGISTER_${process.pid}.xml`);
 NEED(!fs.existsSync(temp),'AI_TASK_TEMP_FILE_ALREADY_EXISTS');
 let created=false;
 try{
  const xml=plan.xml.replace(/<\?xml\s+[^>]*\?>/,'<?xml version="1.0" encoding="UTF-16"?>');
  fs.writeFileSync(temp,Buffer.from('\uFEFF'+xml,'utf16le'),{flag:'wx'});created=true;
  schtasks(['/create','/tn',TARGET,'/xml',temp]); // No /f, so preexisting tasks cannot be replaced.
 }finally{if(created)fs.unlinkSync(temp);}
 verifyExistingAiTask(expected,query(TARGET),release);
 return {status:'REGISTERED_NEW_AI_TASK',...release,triggerCount:plan.triggerCount,startBoundary:plan.startBoundary};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  NEED(process.platform==='win32','WINDOWS_PC_REQUIRED');
  NEED(process.argv.length===3&&['--inspect','--apply'].includes(process.argv[2]),'ARGUMENTS_INVALID');
  const result=run(process.argv[2]);
  console.log(JSON.stringify({report:'THEME_AI_TASK_MIRROR_R1',...result,templateTask:TEMPLATE,targetTask:TARGET,existingTasksModified:0}));
 }catch(error){
  console.log(JSON.stringify({report:'THEME_AI_TASK_MIRROR_R1',status:'BLOCKED',reason:error?.reason??'TASK_QUERY_OR_CREATE_FAILED',existingTasksModified:0}));
  process.exitCode=1;
 }
}
