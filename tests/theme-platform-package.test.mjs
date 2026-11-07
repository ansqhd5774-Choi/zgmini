import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import {configuredDependencyClosure,installConfiguredTool} from '../scripts/pc-writer/theme-config-install.mjs';
test('existing installer stages complete common CLI and inspect runs offline',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-platform-package-'));t.after(()=>fs.rmSync(root,{recursive:true}));
 const result=installConfiguredTool({dataRoot:root,sourceSha:'a'.repeat(40),stageOnly:true});
 assert.equal(result.launcherWrites,0);assert.equal(result.taskWrites,0);
 const runner=path.join(result.home,'versions',result.version,'scripts/pc-writer/theme-config-tool.mjs');
 const report=JSON.parse(execFileSync(process.execPath,[runner,'--platform-inspect'],{encoding:'utf8',windowsHide:true}));
 assert.equal(report.status,'SOURCE_INVENTORY_NOT_RUNTIME_PROOF');assert.equal(report.d1Writes,0);
 assert.ok(result.manifest['scripts/pc-writer/theme-platform.mjs']);
 assert.ok(result.manifest['scripts/pc-writer/theme-platform-policy.mjs']);
 for(const included of ['scripts/pc-writer/theme-platform-stored-run.mjs',
  'scripts/pc-writer/theme-platform-provisional-r88.mjs',
  'scripts/pc-writer/theme-platform-provisional-optional.mjs',
  'config/theme-nine-r26-official-aum-evidence.json',
  'config/theme-nine-r32-dated-aum-approval.json',
  'scripts/pc-writer/theme-space-satellite-r23-dated-aum-evidence.json'])
  assert.ok(result.manifest[included],`bundle omitted ${included}`);
 const stagedModule=await import(pathToFileURL(path.join(result.home,'versions',result.version,
  'scripts/pc-writer/theme-platform-stored-run.mjs')).href);
 assert.equal(typeof stagedModule.runStoredOperationalPrivate,'function');
 assert.equal(typeof stagedModule.createStoredD1FeedReader,'function');
 assert.ok(report.delegation.every(r=>r.decision==='PROCEED'));
 const scheduled=JSON.parse(execFileSync(process.execPath,[runner,'--scheduled'],{encoding:'utf8',windowsHide:true,
  env:{...process.env,ZGMINI_DATA_ROOT:root},timeout:15000}));
 assert.equal(scheduled.status,'NO_REGISTERED_THEMES');assert.equal(scheduled.publicConnection.status,'NO_REGISTERED_THEMES');
 assert.equal(scheduled.d1Writes,0);
 // No saved inputs in this isolated fixture: the ten public IDs are really
 // processed and blocked, not merely listed or presented as fresh scores.
 assert.equal(scheduled.platformConnection.status,'PARTIAL');
 assert.equal(scheduled.platformConnection.publicTargetIds.length,10);
 assert.equal(scheduled.platformConnection.physicalFeedGroups,6);
 assert.equal(scheduled.platformConnection.coverage.public.themes,10);
 assert.equal(scheduled.platformConnection.coverage.public.complete,0);
 assert.equal(scheduled.platformConnection.coverage.public.blocked,20);
 assert.equal(scheduled.platformConnection.checkpointPersistence,'DURABLE_PC_REVISION_HISTORY');
 assert.equal(scheduled.platformConnection.providerCalls,0);
 assert.equal(scheduled.platformConnection.d1Writes,0);
 const checkpointDir=path.join(root,'theme-platform','checkpoints');
 assert.equal(fs.existsSync(checkpointDir),true);
 const revisions=()=>fs.readdirSync(checkpointDir).flatMap(key=>
  fs.readdirSync(path.join(checkpointDir,key)).map(file=>key+'/'+file)).sort();
 const saved= revisions();
 assert.ok(saved.length>0,'scheduled shared batch must persist its private checkpoints');
 const plan=JSON.parse(execFileSync(process.execPath,[runner,'--platform-plan'],{encoding:'utf8',windowsHide:true,
  env:{...process.env,ZGMINI_DATA_ROOT:root},timeout:15000}));
 assert.deepEqual(plan.publicTargetIds,scheduled.platformConnection.publicTargetIds);
 assert.equal(plan.status,'PRIVATE_BINDINGS_PLANNED_NOT_EXECUTED');
 const shadow=spawnSync(process.execPath,[runner,'--platform-shadow'],{encoding:'utf8',windowsHide:true,
  env:{...process.env,ZGMINI_DATA_ROOT:root},timeout:15000});
 assert.equal(shadow.status,2,'unverified saved inputs must not yield successful shadow exit');
 const failed=JSON.parse(shadow.stderr.trim()||shadow.stdout.trim());
 assert.ok(['STOP','PARTIAL'].includes(failed.status));
 assert.equal(failed.d1Writes,0);
 assert.equal(failed.schedulerWrites,0);
 if(failed.status==='PARTIAL'){
  assert.equal(failed.checkpointPersistence,'TRANSIENT_MEMORY_ONLY');
  assert.equal(failed.coverage.public.status,'PARTIAL');
 }
 assert.deepEqual(revisions(),saved,'one-shot shadow must not modify scheduled checkpoints');
});
test('missing local dependency is detected at package build, not user execution',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-platform-import-'));t.after(()=>fs.rmSync(root,{recursive:true}));
 fs.writeFileSync(path.join(root,'start.mjs'),"import './missing.mjs';\n");
 assert.throws(()=>configuredDependencyClosure(['start.mjs'],{root}),/DEPENDENCY_MISSING/);
 fs.writeFileSync(path.join(root,'start.mjs'),"import '../outside.mjs';\n");
 assert.throws(()=>configuredDependencyClosure(['start.mjs'],{root}),/DEPENDENCY_ESCAPE/);
});
