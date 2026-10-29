import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {digest} from '../scripts/pc-writer/theme-config-registry.mjs';
import {PACKAGE_FILES,PACKAGE_SCHEMA,PACKAGE_REPOSITORY,parseTaskStateCsv} from '../scripts/pc-writer/theme-config-package-runner.mjs';

const repo=path.resolve(import.meta.dirname,'..');
const sourceSha='a'.repeat(40);
const sourceTreeSha='b'.repeat(40);
const sourcePath=rel=>['RUN_PREFLIGHT.cmd','RUN_INSTALL.cmd','RUN_DIAGNOSE.cmd','README_KO.txt'].includes(rel)?
 path.join(repo,'packaging','theme-config',rel):path.join(repo,...rel.split('/'));
const hashes=root=>{
 const entries={};
 const walk=(dir,rel='')=>{
  for(const item of fs.readdirSync(dir,{withFileTypes:true})){
   const p=rel?rel+'/'+item.name:item.name;
   if(item.isDirectory())walk(path.join(dir,item.name),p);
   else entries[p]=digest(fs.readFileSync(path.join(dir,item.name)));
  }
 };
 walk(root);return entries;
};

test('native Task Scheduler CSV accepts only exact ready state and task identity',()=>{
 assert.equal(parseTaskStateCsv(Buffer.from('"\\\\ZGMINI-PC-Configured-Themes","10/30/2026 1:00:00 PM","Ready"\r\n')),3);
 assert.equal(parseTaskStateCsv(Buffer.from('"\\\\ZGMINI-PC-Configured-Themes","2026-10-30 13:00:00","준비"\r\n')),3);
 const koreanPrefix=Buffer.from('"\\\\ZGMINI-PC-Configured-Themes","2026-10-30 13:00:00","');
 assert.equal(parseTaskStateCsv(Buffer.concat([koreanPrefix,
  Buffer.from([0xC1,0xD8,0xBA,0xF1]),Buffer.from('"\r\n')])),3);
 assert.equal(parseTaskStateCsv(Buffer.from('"\\\\ZGMINI-PC-Configured-Themes","N/A","Running"\r\n')),4);
 assert.equal(parseTaskStateCsv(Buffer.from('"\\\\ZGMINI-PC-Configured-Themes","N/A","Disabled"\r\n')),1);
 assert.throws(()=>parseTaskStateCsv(Buffer.from('"\\\\ZGMINI-PC-Configured-Themes","N/A","Unknown"')),
  /PACKAGE_TASK_CSV_STATE_UNRECOGNIZED/);
 assert.throws(()=>parseTaskStateCsv(Buffer.from('"\\\\OTHER-TASK","N/A","Ready"')),
  /PACKAGE_TASK_CSV_STATE_UNRECOGNIZED/);
});

async function fixture(t){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-한글 공백 package-'));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const packageRoot=path.join(base,'한국어 공백 압축 폴더');
 fs.mkdirSync(packageRoot);
 const files=[];
 for(const rel of PACKAGE_FILES){
  let data=fs.readFileSync(sourcePath(rel));
  if(rel.endsWith('.cmd'))data=Buffer.from(data.toString('ascii').replace(/\r?\n/g,'\r\n'));
  const out=path.join(packageRoot,...rel.split('/'));
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,data);
  files.push({path:rel,sha256:digest(data)});
 }
 fs.writeFileSync(path.join(packageRoot,'package-manifest.json'),
  JSON.stringify({schema:PACKAGE_SCHEMA,repository:PACKAGE_REPOSITORY,
   sourceSha,sourceTreeSha,files},null,2)+'\n');
 assert.equal(fs.existsSync(path.join(packageRoot,'.git')),false);
 const module=await import(pathToFileURL(path.join(packageRoot,
  'scripts','pc-writer','theme-config-package-runner.mjs')).href);
 const upgradeModule=await import(pathToFileURL(path.join(packageRoot,
  'scripts','pc-writer','theme-config-upgrade.mjs')).href);
 const install=await import(pathToFileURL(path.join(packageRoot,
  'scripts','pc-writer','theme-config-install.mjs')).href);
 const dataRoot=path.join(base,'PC 데이터 공백');
 const home=path.join(dataRoot,'pc-writer','theme-config-tool');
 fs.mkdirSync(home,{recursive:true});
 const oldRel='scripts/pc-writer/theme-config-tool.mjs',old=Buffer.from('// previous installed version\n');
 const oldManifest={[oldRel]:digest(old)},oldVersion=digest(JSON.stringify(oldManifest)).slice(0,16);
 const oldFile=path.join(home,'versions',oldVersion,oldRel);
 fs.mkdirSync(path.dirname(oldFile),{recursive:true});
 fs.writeFileSync(oldFile,old);
 const installed={status:'CONFIG_TOOL_INSTALLED',sourceSha:'c'.repeat(40),
  home,version:oldVersion,manifest:oldManifest};
 fs.writeFileSync(path.join(home,'INSTALL_RESULT.json'),JSON.stringify(installed));
 const oldCmd=install.configuredScheduledCommand({dataRoot,home,version:oldVersion});
 fs.writeFileSync(path.join(home,'THEME_SCHEDULED.cmd'),oldCmd);
 fs.writeFileSync(path.join(home,'THEME_SCHEDULED.vbs'),
  'WScript.Quit shell.Run("'+path.join(home,'THEME_SCHEDULED.cmd')+'")');
 const taskXml='<Task><StartBoundary>2026-10-29T13:00:00</StartBoundary><Command>'+
  path.join(home,'THEME_SCHEDULED.vbs')+'</Command></Task>';
 const inspectOptions={platform:'win32',getTaskXml:()=>taskXml,
  getTaskState:()=>3,checkNode:()=>process.version};
 const preflight=()=>module.runConfiguredPackage({mode:'preflight',packageRoot,
  dataRoot,inspectOptions});
 const upgrade=(options,override={})=>upgradeModule.upgradeConfiguredSchedule({...options,
  platform:'win32',getTaskXml:()=>taskXml,
  now:new Date('2026-10-29T05:30:00Z'),...override});
 const installRun=(override={})=>module.runConfiguredPackage({mode:'install',
  packageRoot,dataRoot,inspectOptions,upgrade:options=>upgrade(options,override)});
 const report=()=>fs.readFileSync(path.join(packageRoot,'PACKAGE_RESULT.txt'),'utf8');
 return {base,packageRoot,module,upgradeModule,dataRoot,home,oldCmd,oldVersion,taskXml,
  inspectOptions,preflight,installRun,report};
}

test('Git-free Hangul and spaces: one preflight then one existing upgrade; old task and bundle survive',async t=>{
 const f=await fixture(t);
 const before=hashes(f.dataRoot);
 const result=f.preflight();
 assert.equal(result.status,'PREFLIGHT_PASS');
 assert.deepEqual(hashes(f.dataRoot),before);
 assert.match(f.report(),/PREFLIGHT_STATUS=PREFLIGHT_PASS/);
 assert.equal(fs.readFileSync(path.join(f.home,'THEME_SCHEDULED.cmd'),'utf8'),f.oldCmd);
 assert.equal(fs.existsSync(path.join(f.home,'AUTO_PUBLISH_UPGRADE_RESULT.json')),false);
 const installed=f.installRun();
 assert.equal(installed.status,'CONFIGURED_AUTO_PUBLISH_UPGRADE_INSTALLED',
  JSON.stringify(installed)+'\n'+f.report());
 assert.match(f.report(),/TASK_XML_UNCHANGED=YES/);
 assert.match(f.report(),/BACKUP_STATUS=READBACK_VERIFIED_BY_EXISTING_UPGRADER/);
 const saved=JSON.parse(fs.readFileSync(path.join(f.home,'AUTO_PUBLISH_UPGRADE_RESULT.json')));
 assert.equal(saved.sourceSha,sourceSha);
 assert.equal(saved.oldVersion,f.oldVersion);
 assert.equal(saved.task.changed,false);
 assert.equal(fs.readFileSync(path.join(saved.backup,'THEME_SCHEDULED.cmd'),'utf8'),
  f.oldCmd);
 assert.equal(fs.existsSync(path.join(f.home,'versions',f.oldVersion,
  'scripts','pc-writer','theme-config-tool.mjs')),true);
 assert.equal(fs.existsSync(path.join(f.home,'versions',saved.newVersion,
  'scripts','pc-writer','theme-config-tool.mjs')),true);
 assert.equal(f.preflight().status,'STOP');
 assert.equal(f.installRun().status,'STOP');
});

test('Git-free command invocation does not call git rev-parse in the package',async t=>{
 const f=await fixture(t);
 const runner=path.join(f.packageRoot,'scripts','pc-writer','theme-config-package-runner.mjs');
 let output='';
 try{output=execFileSync(process.execPath,[runner,'--preflight'],
  {cwd:f.packageRoot,encoding:'utf8'});}
 catch(e){output=e.stdout?.toString()??'';}
 assert.match(output,/"reason":"PACKAGE_WINDOWS_REQUIRED"/);
 assert.doesNotMatch(output,/git|rev-parse/i);
 for(const name of ['RUN_PREFLIGHT.cmd','RUN_INSTALL.cmd','RUN_DIAGNOSE.cmd']){
  const bytes=fs.readFileSync(path.join(f.packageRoot,name));
  assert.equal(bytes.some(b=>b>=128),false);
  assert.match(bytes.toString('ascii'),/\r\n/);
  assert.doesNotMatch(bytes.toString('ascii'),/(?<!\r)\n/);
 }
});

test('timeout diagnosis distinguishes COM task-state failure from XML query without install',async t=>{
 const f=await fixture(t);
 const diag=await import(pathToFileURL(path.join(f.packageRoot,'scripts',
  'pc-writer','theme-config-timeout-diagnose.mjs')).href);
 const before=hashes(f.dataRoot);
 const calls=[];
 const report=diag.diagnoseConfiguredTask({platform:'win32',
  program:'E:\\ZGmini\\runtime\\node.exe',
  run:(command,args,options)=>{
   calls.push({command,args,options});
   if(command==='cscript.exe')return {error:{code:'ETIMEDOUT'}};
   return {status:0,stdout:f.taskXml};
  }});
 assert.equal(report.DIAG_STATUS,'REVIEW_REQUIRED');
 assert.equal(report.TASK_STATE_QUERY,'PROCESS_ERROR');
 assert.equal(report.TASK_STATE_ERROR,'ETIMEDOUT');
 assert.equal(report.TASK_XML_QUERY,'COMMAND_OK');
 assert.equal(report.TASK_XML_TIME_1300,'YES');
 assert.equal(report.PC_FILES_CHANGED,0);
 assert.equal(calls.length,2);
 assert.ok(calls.every(c=>c.options.timeout===12000));
 assert.deepEqual(hashes(f.dataRoot),before);
});

test('changed package bytes block preflight before any PC file change',async t=>{
 const f=await fixture(t),old=fs.readFileSync(path.join(f.home,'THEME_SCHEDULED.cmd'));
 fs.appendFileSync(path.join(f.packageRoot,
  'scripts','pc-writer','theme-config-upgrade.mjs'),'\n// corruption');
 const result=f.preflight();
 assert.equal(result.reason,'PACKAGE_FILE_SHA_MISMATCH');
 assert.equal(fs.readFileSync(path.join(f.home,'THEME_SCHEDULED.cmd')).equals(old),true);
 assert.match(f.report(),/PREFLIGHT_STATUS=STOP/);
});

test('scheduled and registered collector locks each block preflight',async t=>{
 const f=await fixture(t);
 const state=path.join(f.dataRoot,'theme-config','state');
 fs.mkdirSync(state,{recursive:true});
 fs.writeFileSync(path.join(state,'scheduled.lock'),'busy');
 assert.equal(f.preflight().reason,'PACKAGE_SCHEDULE_LOCK_PRESENT');
});

test('registered source collection lock is also checked before existing upgrader',async t=>{
 const f=await fixture(t);
 const state=path.join(f.dataRoot,'themes','registered-test','state');
 fs.mkdirSync(state,{recursive:true});
 fs.writeFileSync(path.join(state,'collection.lock'),'busy');
 assert.equal(f.preflight().reason,'PACKAGE_THEME_LOCK_PRESENT');
});

test('Task Scheduler non-ready numeric state stops without staging',async t=>{
 const f=await fixture(t);
 const result=f.module.runConfiguredPackage({mode:'preflight',
  packageRoot:f.packageRoot,dataRoot:f.dataRoot,
  inspectOptions:{...f.inspectOptions,getTaskState:()=>4}});
 assert.equal(result.reason,'PACKAGE_TASK_NOT_READY');
 assert.equal(fs.existsSync(path.join(f.home,'backups')),false);
});

test('previous completed upgrade record blocks a second attempted transition',async t=>{
 const f=await fixture(t);
 fs.writeFileSync(path.join(f.home,'AUTO_PUBLISH_UPGRADE_RESULT.json'),'{}');
 assert.equal(f.preflight().reason,'PACKAGE_PRIOR_UPGRADE_RESULT_PRESENT');
 assert.equal(fs.existsSync(path.join(f.home,'backups')),false);
});

test('history change after PASS stops install before existing transition',async t=>{
 const f=await fixture(t);
 assert.equal(f.preflight().status,'PREFLIGHT_PASS');
 fs.writeFileSync(path.join(f.home,'SCHEDULE_HISTORY.log'),'new scheduled work\n');
 const outcome=f.installRun();
 assert.equal(outcome.reason,'PACKAGE_PREFLIGHT_STATE_DRIFT');
 assert.equal(fs.readFileSync(path.join(f.home,'THEME_SCHEDULED.cmd'),'utf8'),f.oldCmd);
 assert.match(f.report(),/INSTALL_STATUS=STOP/);
 assert.equal(fs.existsSync(path.join(f.home,'backups')),false);
});

test('existing upgrader rollback on post-swap XML change is preserved',async t=>{
 const f=await fixture(t);
 assert.equal(f.preflight().status,'PREFLIGHT_PASS');
 let inspected=0;
 const result=f.module.runConfiguredPackage({mode:'install',
  packageRoot:f.packageRoot,dataRoot:f.dataRoot,inspectOptions:f.inspectOptions,
  upgrade:options=>f.upgradeModule.upgradeConfiguredSchedule({...options,
   platform:'win32',now:new Date('2026-10-29T05:30:00Z'),
   getTaskXml:()=>{
    inspected++;
    return inspected===3?f.taskXml.replace('13:00:00','14:00:00'):f.taskXml;
   }})});
 assert.equal(result.status,'STOP');
 assert.equal(result.reason,'CONFIG_UPGRADE_TASK_XML_CHANGED',
  JSON.stringify(result)+'\n'+f.report());
 assert.equal(fs.readFileSync(path.join(f.home,'THEME_SCHEDULED.cmd'),'utf8'),f.oldCmd);
 assert.match(f.report(),/RESTORE_STATUS=OLD_CMD_SHA_VERIFIED/);
 assert.equal(fs.existsSync(path.join(f.home,'AUTO_PUBLISH_UPGRADE_RESULT.json')),false);
 const backups=fs.readdirSync(path.join(f.home,'backups'));
 assert.equal(backups.length,1);
 assert.equal(fs.existsSync(path.join(f.home,'versions',f.oldVersion)),true);
});
