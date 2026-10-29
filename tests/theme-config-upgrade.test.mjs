import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {digest} from '../scripts/pc-writer/theme-config-registry.mjs';
import {configuredScheduledCommand} from '../scripts/pc-writer/theme-config-install.mjs';
import {upgradeConfiguredSchedule} from '../scripts/pc-writer/theme-config-upgrade.mjs';

const sourceSha='a'.repeat(40);
function setup(t){
 const dataRoot=fs.mkdtempSync(path.join(os.tmpdir(),'zg-theme-upgrade-'));
 t.after(()=>fs.rmSync(dataRoot,{recursive:true,force:true}));
 const home=path.join(dataRoot,'pc-writer','theme-config-tool');
 fs.mkdirSync(home,{recursive:true});
 const rel='scripts/pc-writer/theme-config-tool.mjs',contents=Buffer.from('// old\n');
 const manifest={[rel]:digest(contents)};
 const version=digest(JSON.stringify(manifest)).slice(0,16);
 const oldDir=path.join(home,'versions',version,path.dirname(rel));
 fs.mkdirSync(oldDir,{recursive:true});
 fs.writeFileSync(path.join(oldDir,path.basename(rel)),contents);
 fs.writeFileSync(path.join(home,'INSTALL_RESULT.json'),JSON.stringify({
  status:'CONFIG_TOOL_INSTALLED',sourceSha,version,home,manifest}));
 const oldScheduled=configuredScheduledCommand({dataRoot,home,version});
 fs.writeFileSync(path.join(home,'THEME_SCHEDULED.cmd'),oldScheduled);
 fs.writeFileSync(path.join(home,'THEME_SCHEDULED.vbs'),
  `WScript.Run "${path.join(home,'THEME_SCHEDULED.cmd')}"`);
 const taskXml=`<Task><StartBoundary>2026-10-29T13:00:00</StartBoundary><Command>${path.join(home,'THEME_SCHEDULED.vbs')}</Command></Task>`;
 let stageCalls=0;
 const stageBundle=()=>{
  stageCalls++;
  const required=['scripts/pc-writer/theme-config-tool.mjs',
   'scripts/pc-writer/theme-config-auto-publish.mjs',
   'scripts/pc-writer/theme-config-publication-preflight.mjs',
   'scripts/pc-writer/theme-config-publication-d1.mjs',
   'scripts/pc-writer/theme-nine-r54-d1-client.mjs',
   'scripts/pc-writer/theme-biotech-auth-r7.mjs',
   'worker/public-display-freshness.mjs'];
  const manifest={};
  for(const rel of required){
   const bytes=Buffer.from(`staged ${rel}\n`),
    dest=path.join(home,'versions','b'.repeat(16),rel);
   fs.mkdirSync(path.dirname(dest),{recursive:true});
   fs.writeFileSync(dest,bytes);manifest[rel]=digest(bytes);
  }
  return {status:'CONFIG_BUNDLE_STAGED_NO_LAUNCHER_CHANGE',
   home,sourceSha,version:'b'.repeat(16),manifest};
 };
 const run=overrides=>upgradeConfiguredSchedule({dataRoot,sourceSha,
  platform:'win32',getTaskXml:()=>taskXml,stageBundle,
  now:new Date('2026-10-29T05:30:00Z'),...overrides});
 return {dataRoot,home,version,oldScheduled,taskXml,run,
  stageCalls:()=>stageCalls};
}

test('approved one-time upgrade changes only scheduled launcher, leaves old bundle and task',t=>{
 const f=setup(t),r=f.run();
 assert.equal(r.status,'CONFIGURED_AUTO_PUBLISH_UPGRADE_INSTALLED');
 assert.equal(r.task.changed,false);assert.equal(r.registeredThemesAdded,0);
 assert.equal(r.d1Writes,0);assert.equal(r.providerCalls,0);
 assert.equal(f.stageCalls(),1);
 assert.equal(fs.readFileSync(path.join(f.home,'THEME_SCHEDULED.cmd'),'utf8'),
  configuredScheduledCommand({dataRoot:f.dataRoot,home:f.home,version:'b'.repeat(16)}));
 assert.equal(fs.readFileSync(path.join(r.backup,'THEME_SCHEDULED.cmd'),'utf8'),f.oldScheduled);
 assert.equal(JSON.parse(fs.readFileSync(path.join(f.home,'INSTALL_RESULT.json'),'utf8')).version,f.version);
 assert.equal(fs.existsSync(path.join(f.home,'versions',f.version,
  'scripts','pc-writer','theme-config-tool.mjs')),true);
 assert.equal(JSON.parse(fs.readFileSync(path.join(f.home,
  'AUTO_PUBLISH_UPGRADE_RESULT.json'),'utf8')).newSha256,r.newSha256);
});

test('unknown scheduled launcher prevents staging and overwrites',t=>{
 const f=setup(t),target=path.join(f.home,'THEME_SCHEDULED.cmd');
 fs.appendFileSync(target,'REM custom\n');
 assert.throws(()=>f.run(),/CONFIG_UPGRADE_SCHEDULED_LAUNCHER_DRIFT/);
 assert.equal(f.stageCalls(),0);
 assert.equal(fs.readFileSync(target,'utf8').includes('REM custom'),true);
});

test('present scheduler lock blocks upgrade without touching running cycle',t=>{
 const f=setup(t),state=path.join(f.dataRoot,'theme-config','state');
 fs.mkdirSync(state,{recursive:true});
 fs.writeFileSync(path.join(state,'scheduled.lock'),'present');
 assert.throws(()=>f.run(),/CONFIG_UPGRADE_SCHEDULE_LOCK_PRESENT/);
 assert.equal(f.stageCalls(),0);
 assert.equal(fs.readFileSync(path.join(f.home,'THEME_SCHEDULED.cmd'),'utf8'),f.oldScheduled);
});

test('scheduler XML drift blocks transition before staging',t=>{
 const f=setup(t);
 assert.throws(()=>f.run({getTaskXml:()=>f.taskXml.replace('13:00:00','14:00:00')}),
  /CONFIG_UPGRADE_TASK_NOT_APPROVED/);
 assert.equal(f.stageCalls(),0);
});
