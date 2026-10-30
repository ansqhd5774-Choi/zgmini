import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {installConfiguredTool} from '../scripts/pc-writer/theme-config-install.mjs';
import {upgradeConfiguredRuntime} from '../scripts/pc-writer/theme-config-runtime.mjs';
function setup(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-runtime-'));t.after(()=>fs.rmSync(root,{recursive:true}));
 const initial=installConfiguredTool({dataRoot:root,sourceSha:'a'.repeat(40)}),home=initial.home;
 const proof={...initial,authority:'VERIFIED_INSTALLED_SOURCE_MANIFEST'};
 const xml='<Task>'+path.join(home,'THEME_SCHEDULED.vbs')+'T13:00:00</Task>';
 return {root,home,proof,options:{dataRoot:root,currentProof:proof,getTaskXml:()=>xml,getTaskState:()=>3}};
}
test('common update can run again using active manifest without deleting historical install result',t=>{
 const f=setup(t),original=fs.readFileSync(path.join(f.home,'INSTALL_RESULT.json'));
 const first=upgradeConfiguredRuntime({...f.options,sourceSha:'b'.repeat(40),now:new Date('2026-10-31T01:00:00Z')});
 assert.equal(first.runtimeStatus,'CONFIG_COMMON_RUNTIME_UPGRADED');assert.equal(first.manualEntriesUpdated,3);
 const second=upgradeConfiguredRuntime({...f.options,currentProof:null,sourceSha:'c'.repeat(40),now:new Date('2026-10-31T01:00:01Z')});
 assert.equal(second.runtimeStatus,'CONFIG_COMMON_RUNTIME_UPGRADED');
 assert.equal(JSON.parse(fs.readFileSync(path.join(f.home,'ACTIVE_RUNTIME.json'))).sourceSha,'c'.repeat(40));
 assert.ok(fs.readFileSync(path.join(f.home,'INSTALL_RESULT.json')).equals(original));
 assert.equal(fs.existsSync(path.join(f.home,'runtime-upgrade.lock')),false);
});
test('running task prevents any update and releases only its own installation lease',t=>{
 const f=setup(t),before=fs.readFileSync(path.join(f.home,'THEME_SCHEDULED.cmd'));
 assert.throws(()=>upgradeConfiguredRuntime({...f.options,sourceSha:'b'.repeat(40),getTaskState:()=>4}),/TASK_NOT_READY/);
 assert.ok(fs.readFileSync(path.join(f.home,'THEME_SCHEDULED.cmd')).equals(before));
});
test('manual command drift rolls back scheduled command and records failure',t=>{
 const f=setup(t),file=path.join(f.home,'THEME_REGISTER.cmd'),before=fs.readFileSync(path.join(f.home,'THEME_SCHEDULED.cmd'));
 fs.appendFileSync(file,'REM user change\r\n');
 assert.throws(()=>upgradeConfiguredRuntime({...f.options,sourceSha:'b'.repeat(40),now:new Date('2026-10-31T01:00:02Z')}),/MANUAL_ENTRY_DRIFT/);
 assert.ok(fs.readFileSync(path.join(f.home,'THEME_SCHEDULED.cmd')).equals(before));
 assert.equal(fs.existsSync(path.join(f.home,'ACTIVE_RUNTIME.json')),false);
 const report=fs.readdirSync(f.home).find(n=>n.startsWith('COMMON_RUNTIME_FAILURE_'));
 assert.match(fs.readFileSync(path.join(f.home,report),'utf8'),/ROLLBACK_VERIFIED/);
});
