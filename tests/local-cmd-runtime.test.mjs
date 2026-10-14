import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

test('Windows launchers preserve paths with spaces, selected data home and runner exit codes without provider calls', {skip:process.platform!=='win32'},()=>{
 const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini cmd fixture '));
 const root=path.join(temp,'repo with spaces'),base=path.join(temp,'data with spaces');
 fs.mkdirSync(path.join(root,'scripts','pc-writer'),{recursive:true});
 fs.mkdirSync(base,{recursive:true});
 fs.copyFileSync(path.join(repo,'scripts','resolve-local-node.cmd'),path.join(root,'scripts','resolve-local-node.cmd'));
 const files=fs.readdirSync(repo).filter(x=>/^ZGMINI_.*\.cmd$/.test(x));
 const stub=`import fs from 'node:fs';import path from 'node:path';const base=process.env.ZGMINI_PC_HOME;fs.appendFileSync(path.join(base,'calls.jsonl'),JSON.stringify({script:path.basename(process.argv[1]),args:process.argv.slice(2)})+'\\n');const report=path.join(base,'manual-input/e1-r5/reports');fs.mkdirSync(report,{recursive:true});for(const name of ['e1-r5-forward-readiness-r3-last.txt','e1-r5-sec-cross-filing-audit-last.txt','e1-r5-sec-history-backfill-last.txt'])fs.writeFileSync(path.join(report,name),'fixture');fs.writeFileSync(path.join(report,'e1-r5-sec-history-backfill-last.json'),JSON.stringify({status:'PARTIAL',remainingAccessions:1}));const out=path.join(base,'manual-input/e1-r5/cfo-survey-r1');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'releases.json'),'[]');process.exit(process.env.FIXTURE_FAIL&&path.basename(process.argv[1]).includes(process.env.FIXTURE_FAIL)?7:0);`;
 for(const file of files){const body=fs.readFileSync(path.join(repo,file),'utf8');fs.writeFileSync(path.join(root,file),body);for(const match of body.matchAll(/[\\/]([a-z0-9-]+\.mjs)/g))fs.writeFileSync(path.join(root,'scripts','pc-writer',match[1]),stub);}
 const source=path.join(root,'source.html');fs.writeFileSync(source,'fixture');
 // A batch harness avoids shell-string interpolation of test paths and arguments.
 const argsFor=file=>file==='ZGMINI_QUOTA_RUNNER.cmd'?'plan nopause':file==='ZGMINI_EARNINGS_R5_CFO_IMPORT.cmd'?`"${source}" https://example.invalid/fixture 2026 3 2026-09-23T11:30:00Z`:'';
 const run=(file,fail='')=>{const harness=path.join(root,'fixture-harness.cmd');fs.writeFileSync(harness,`@echo off\r\ncall "%~dp0${file}" ${argsFor(file)}\r\nexit /b %ERRORLEVEL%\r\n`);return spawnSync('cmd.exe',['/d','/c','fixture-harness.cmd'],{cwd:root,env:{...process.env,ZGMINI_NODE_EXE:process.execPath,ZGMINI_PC_HOME:base,FIXTURE_FAIL:fail},encoding:'utf8',timeout:15000,windowsHide:true});};
 for(const file of files){const result=run(file);assert.equal(result.status,0,`${file}: ${result.stdout} ${result.stderr}`);}
 const calls=fs.readFileSync(path.join(base,'calls.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 for(const call of calls.filter(x=>x.script!=='quota-runner.mjs'))assert.ok(call.args.includes('--base='+base),call.script);
 assert.equal(run('ZGMINI_QUOTA_RUNNER.cmd','quota-runner').status,7);
 assert.equal(run('ZGMINI_EARNINGS_R5_CFO_IMPORT.cmd','forward-r2-local-audit').status,7,'CFO chain must propagate audit failure');
 // Retain only this small isolated fixture on failure; never delete outside its checked path.
 assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));
 fs.rmSync(temp,{recursive:true});
});
