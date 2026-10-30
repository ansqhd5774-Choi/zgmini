import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {configuredDependencyClosure,installConfiguredTool} from '../scripts/pc-writer/theme-config-install.mjs';
test('existing installer stages complete common CLI and inspect runs offline',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-platform-package-'));t.after(()=>fs.rmSync(root,{recursive:true}));
 const result=installConfiguredTool({dataRoot:root,sourceSha:'a'.repeat(40),stageOnly:true});
 assert.equal(result.launcherWrites,0);assert.equal(result.taskWrites,0);
 const runner=path.join(result.home,'versions',result.version,'scripts/pc-writer/theme-config-tool.mjs');
 const report=JSON.parse(execFileSync(process.execPath,[runner,'--platform-inspect'],{encoding:'utf8',windowsHide:true}));
 assert.equal(report.status,'SOURCE_INVENTORY_NOT_RUNTIME_PROOF');assert.equal(report.d1Writes,0);
 assert.ok(result.manifest['scripts/pc-writer/theme-platform.mjs']);
 assert.ok(result.manifest['scripts/pc-writer/theme-platform-policy.mjs']);
 assert.ok(report.delegation.every(r=>r.decision==='PROCEED'));
 const scheduled=JSON.parse(execFileSync(process.execPath,[runner,'--scheduled'],{encoding:'utf8',windowsHide:true,
  env:{...process.env,ZGMINI_DATA_ROOT:root},timeout:15000}));
 assert.equal(scheduled.status,'NO_REGISTERED_THEMES');assert.equal(scheduled.publicConnection.status,'NO_REGISTERED_THEMES');
 assert.equal(scheduled.d1Writes,0);
});
test('missing local dependency is detected at package build, not user execution',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-platform-import-'));t.after(()=>fs.rmSync(root,{recursive:true}));
 fs.writeFileSync(path.join(root,'start.mjs'),"import './missing.mjs';\n");
 assert.throws(()=>configuredDependencyClosure(['start.mjs'],{root}),/DEPENDENCY_MISSING/);
 fs.writeFileSync(path.join(root,'start.mjs'),"import '../outside.mjs';\n");
 assert.throws(()=>configuredDependencyClosure(['start.mjs'],{root}),/DEPENDENCY_ESCAPE/);
});
