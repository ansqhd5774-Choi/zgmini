import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectEmploymentR6TaskLauncher,saveEmploymentR6TaskTrace} from
  '../scripts/pc-writer/employment-r6-task-launcher-trace.mjs';

const win=path.win32;
const initial=String.raw`E:\private\person\run-local-core-r7.vbs`;
const nested=String.raw`E:\private\person\core-original.vbs`;
const core=String.raw`E:\projects\approved-core\scripts\pc-writer\quota-runner.mjs`;
const alt=String.raw`E:\projects\another-core\scripts\pc-writer\run-local.mjs`;

function task({script=initial,binary=String.raw`C:\Windows\System32\wscript.exe`,more=false}={}){
  const exec=`<Exec><Command>${binary}</Command><Arguments>&quot;${script}&quot;</Arguments></Exec>`;
  return `<Task><Actions Context="Author">${exec}${more?exec:''}</Actions></Task>`;
}
function fixture({launcher=`WScript.Quit shell.Run("""${core}""", 0, True)\r\n`,
  other=null,xml=task()}={}){
  const files=new Map([[win.normalize(initial).toLowerCase(),launcher]]);
  if(other!==null)files.set(win.normalize(nested).toLowerCase(),other);
  const seen=[];
  const result=inspectEmploymentR6TaskLauncher({taskXml:xml,
    fileExists:p=>files.has(win.normalize(p).toLowerCase()),
    readFile:p=>{seen.push(win.normalize(p));return files.get(win.normalize(p).toLowerCase());},
  });
  return {result,seen};
}

test('single registered VBS reveals only structural counts and whitelisted runner name',()=>{
  const {result,seen}=fixture();
  assert.equal(result.status,'WRAPPER_STRUCTURE_INSPECTED');
  assert.equal(result.actionKind,'WSCRIPT');
  assert.equal(result.inspectedWrappers[0].runCalls,1);
  assert.equal(result.inspectedWrappers[0].runParenCalls,1);
  assert.equal(result.inspectedWrappers[0].referenceCounts.MJS,1);
  assert.deepEqual(result.knownCoreRunners,['quota-runner.mjs']);
  assert.deepEqual(seen,[initial]);
  assert.equal(result.taskMutations,0);
  assert.equal(result.pcCoreWrites,0);
  assert.equal(result.d1Writes,0);
  assert.equal(result.providerCalls,0);
  assert.doesNotMatch(JSON.stringify(result),/\\private\\|\\projects\\|run-local-core-r7|E:\\|Run\(/i);
});

test('normal R7 multi-step VBS remains inspectable instead of failing runnable length one',()=>{
  const {result}=fixture({launcher:`' R7_CORE_WRAPPER\r\n`+
    `shell.Run """${core}""", 0, True\r\n`+
    `shell.Run """${alt}""", 0, True\r\n`});
  assert.equal(result.status,'WRAPPER_STRUCTURE_INSPECTED');
  assert.equal(result.inspectedWrappers[0].runCalls,2);
  assert.equal(result.inspectedWrappers[0].runBareCalls,2);
  assert.equal(result.inspectedWrappers[0].ambiguousStaticReferences,true);
  assert.equal(result.inspectedWrappers[0].markerR7,true);
  assert.deepEqual(result.knownCoreRunners,['quota-runner.mjs','run-local.mjs']);
});

test('approved R7 archive auxiliary names are classified separately from Core runners',()=>{
  const archiveRun=String.raw`E:\private\archive\archive-run.mjs`;
  const archiveCore=String.raw`E:\private\archive\archive-core.mjs`;
  const {result}=fixture({launcher:`shell.Run """${core}""", 0, True\r\n`+
    `shell.Run """${archiveRun}""", 0, True\r\n`+
    `shell.Run """${archiveCore}""", 0, True\r\n`});
  assert.deepEqual(result.knownCoreRunners,['quota-runner.mjs']);
  assert.deepEqual(result.knownAuxiliaryRunners,['archive-core.mjs','archive-run.mjs']);
  assert.equal(result.inspectedWrappers[0].runCalls,3);
  assert.doesNotMatch(JSON.stringify(result),/\\private\\|E:\\/);
});

test('dynamic command without literal script path reports ambiguity, never guesses E root',()=>{
  const {result}=fixture({launcher:'shell.Run commandFromRegistry, 0, True\r\n'});
  assert.equal(result.inspectedWrappers[0].runBareCalls,1);
  assert.equal(result.unresolvedDynamic,true);
  assert.deepEqual(result.knownCoreRunners,[]);
  assert.equal(result.inspectedWrappers[0].referenceCounts.VBS,0);
});

test('one registered R38 wrapper can show nested VBS format without exposing nested path',()=>{
  const {result,seen}=fixture({launcher:`' ZGMINI_R38_WRAPPER_V1\r\n`+
    `origin = "${nested}"\r\nWScript.Quit shell.Run(origin, 0, True)\r\n`,
    other:`WScript.Quit shell.Run("""${core}""", 0, True)\r\n`});
  assert.equal(result.inspectedWrappers.length,2);
  assert.deepEqual(seen,[initial,nested]);
  assert.equal(result.inspectedWrappers[0].markerR38,true);
  assert.equal(result.inspectedWrappers[1].referenceCounts.MJS,1);
  assert.doesNotMatch(JSON.stringify(result),/\\private\\|\\projects\\|origin\s*=|E:\\/);
});

test('multiple Task Exec actions fail closed before reading a wrapper',()=>{
  const {result,seen}=fixture({xml:task({more:true})});
  assert.equal(result.status,'TASK_ACTION_UNRESOLVED');
  assert.deepEqual(seen,[]);
});

test('unreadable or arbitrary Task entry produces codes without secret exception text',()=>{
  const {result,seen}=fixture({xml:task({binary:String.raw`C:\Secrets\unexpected.exe`})});
  assert.equal(result.status,'TASK_ENTRY_UNRECOGNIZED');
  assert.deepEqual(seen,[]);
  assert.doesNotMatch(JSON.stringify(result),/Secrets|unexpected\.exe/i);
});

test('large wrapper is not parsed and cannot leak its text',()=>{
  const {result}=fixture({launcher:'privateToken123 '+'.Run("E:\\secret\\core.mjs")'.repeat(7000)});
  assert.equal(result.inspectedWrappers[0].status,'FILE_TOO_LARGE');
  assert.doesNotMatch(JSON.stringify(result),/privateToken123|secret/);
});

test('report writes TXT/JSON only to the selected output directory and no raw paths',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'r6-task-trace-test-'));
  const result=fixture({launcher:'shell.Run commandFromRegistry, 0, True\r\n'}).result;
  const files=saveEmploymentR6TaskTrace(root,result);
  assert.equal(fs.readdirSync(root).length,2);
  assert.match(path.basename(files.txtPath),/^EMPLOYMENT_R6_TASK_LAUNCHER_/);
  assert.deepEqual(JSON.parse(fs.readFileSync(files.jsonPath,'utf8')),result);
  const all=fs.readFileSync(files.txtPath,'utf8')+fs.readFileSync(files.jsonPath,'utf8');
  assert.doesNotMatch(all,/\\private\\|E:\\|commandFromRegistry|providers\.env/);
  assert.match(all,/PC_CORE_WRITES: 0/);
  assert.match(all,/TASK_MUTATIONS: 0/);
});

test('Windows CMD keeps ASCII CRLF and delegates Node selection to existing resolver',()=>{
  const bytes=fs.readFileSync(new URL('../scripts/pc-writer/employment-r6-task-launcher-trace.cmd',import.meta.url));
  assert.ok(bytes.every(b=>b<128));
  assert.equal(bytes[0],64);
  const cmd=bytes.toString('ascii');
  assert.ok(cmd.includes('\r\n'));
  assert.doesNotMatch(cmd.replaceAll('\r\n',''),/\n/);
  assert.match(cmd,/call "%~dp0\.\.\\resolve-local-node\.cmd"/);
  assert.match(cmd,/employment-r6-task-launcher-trace\.mjs/);
  assert.doesNotMatch(cmd,/schtasks\s*\/Change|\/Delete|\/Create|--publish|--collect/i);
});
