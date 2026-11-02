import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {traceCoreExecutionR47}
  from '../scripts/pc-writer/us-breadth-core-execution-trace-r47.mjs';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const approved='0123456789abcdef0123456789abcdef01234567';
const wrapper=String.raw`E:\ZGmini\data\pc-writer\run-local-core.vbs`;
const local=String.raw`E:\ZGmini\projects\approved-core\scripts\pc-writer\local-cycle.mjs`;
const other=String.raw`E:\ZGmini\projects\old-core\scripts\pc-writer\local-cycle.mjs`;
const origin=String.raw`E:\ZGmini\data\pc-writer\run-local-core-origin.vbs`;
const task=`<Task><Triggers><TimeTrigger><Repetition><Interval>PT5M</Interval>`
  +`</Repetition></TimeTrigger></Triggers><Settings><MultipleInstancesPolicy>`
  +`IgnoreNew</MultipleInstancesPolicy></Settings><Actions><Exec>`
  +`<Command>C:\\Windows\\System32\\wscript.exe</Command>`
  +`<Arguments>&quot;${wrapper}&quot;</Arguments></Exec></Actions></Task>`;
const launcher=`Set shell = CreateObject("WScript.Shell")\r\n`
  +`WScript.Quit shell.Run("""E:\\ZGmini\\runtime\\node.exe"" ""${local}"" --publish", 0, True)\r\n`;
const config={enabled:true,collectionTarget:'pc',source:approved,
  core:'DO_NOT_LOG_DATABASE',providerToken:'DO_NOT_LOG_SECRET'};
function inspect(source=launcher,options={}){
  return traceCoreExecutionR47({taskXml:task,config,readScript:file=>
    file.toLowerCase()===wrapper.toLowerCase()?source:null,
    readGit:()=>({head:approved,clean:true}),...options});
}
const noEffects=r=>{
  for(const field of ['providerCalls','d1Reads','d1Writes','localWrites',
    'taskChanges','lockPidActions'])assert.equal(r[field],0,field);
  assert.equal(r.liveExecutionVerified,false);
};

test('R47 ignores comment-only projects and proves one registered executable entry',()=>{
  const source=`' old reference: ${other}\r\nRem ${other}\r\n${launcher}`;
  const r=inspect(source);
  assert.equal(r.status,'APPROVED_CORE_STATIC_ACTION_CHAIN');
  assert.equal(r.staticChainVerified,true);
  assert.equal(r.executableInvocationLines,1);
  assert.equal(r.executableScriptReferences,1);
  assert.equal(r.nonExecutingScriptReferences,1);
  assert.equal(r.approvedShaMatch,true);
  assert.equal(r.gitClean,true);
  assert.match(r.projectFingerprint,/^[0-9a-f]{12}$/);
  for(const privateText of [wrapper,local,other,'approved-core',
    'DO_NOT_LOG_DATABASE','DO_NOT_LOG_SECRET'])
    assert.equal(JSON.stringify(r).includes(privateText),false);
  noEffects(r);
});

test('R47 rejects multiple active executable branches, not merely text matches',()=>{
  const source=launcher+`WScript.Quit shell.Run("""E:\\ZGmini\\runtime\\node.exe"" ""${other}"" --publish", 0, True)\r\n`;
  const r=inspect(source);
  assert.equal(r.status,'DUAL_EXECUTABLE_CORE_TARGET_AMBIGUOUS');
  assert.equal(r.executableInvocationLines,2);
  assert.equal(r.executableScriptReferences,2);
  assert.equal(r.coreEntrypointCandidates,2);
  assert.equal(r.staticChainVerified,false);
  noEffects(r);
});

test('R47 FIX2 recognizes a unique Core source and a second auxiliary invocation',()=>{
  const auxiliary=String.raw`E:\ZGmini\projects\earnings-helper\scripts\pc-writer\earnings-r7.mjs`;
  const second=`WScript.Quit shell.Run("""E:\\ZGmini\\runtime\\node.exe"" ""${auxiliary}"" --publish", 0, True)\r\n`;
  const r=inspect(launcher+second);
  assert.equal(r.revision,'US_BREADTH_CORE_EXECUTION_TRACE_R47_FIX2');
  assert.equal(r.status,'CORE_SOURCE_MATCHED_AUXILIARY_EXECUTION_UNVERIFIED');
  assert.equal(r.executableInvocationLines,2);
  assert.equal(r.coreEntrypointCandidates,1);
  assert.equal(r.auxiliaryExecutableReferences,1);
  assert.equal(r.approvedShaMatch,true);
  assert.equal(r.gitClean,true);
  assert.equal(r.staticChainVerified,false,'dual-lane static scan never proves live execution');
  assert.equal(JSON.stringify(r).includes('earnings-helper'),false);
  noEffects(r);
});

test('R47 fails closed on dynamic VBS command or unapproved executed target',()=>{
  const dynamic=inspect(`source = Environ("HOME")\r\n${launcher}`);
  assert.equal(dynamic.status,'DYNAMIC_EXECUTION_NOT_PROVEN');
  const conditional=inspect(launcher.replace('WScript.Quit shell.Run',
    'If True Then WScript.Quit shell.Run'));
  assert.equal(conditional.status,'INDIRECT_OR_CONDITIONAL_LAUNCH_NOT_PROVEN');
  const wrong=inspect(launcher.replaceAll(local,other));
  assert.equal(wrong.status,'APPROVED_CORE_STATIC_ACTION_CHAIN',
    'only config/git provenance, not branch naming, determines approval');
  const none=inspect(`' just a comment ${local}\r\n`);
  assert.equal(none.status,'EXECUTABLE_ENTRY_NOT_UNIQUE');
});

test('R47 distinguishes R38 origin candidate from proven direct invocation',()=>{
  const wrapped=`' ZGMINI_R38_WRAPPER_V1\r\norigin="${origin}"\r\n`;
  const r=inspect(wrapped,{readScript:file=>
    file.toLowerCase()===wrapper.toLowerCase()?wrapped:
      file.toLowerCase()===origin.toLowerCase()?launcher:null});
  assert.equal(r.status,'R38_ORIGIN_CANDIDATE_NEEDS_LAUNCH_PROOF');
  assert.equal(r.launcherOrigin,'R38_LITERAL_ORIGIN');
  assert.equal(r.approvedShaMatch,true);
  assert.equal(r.staticChainVerified,false);
  noEffects(r);
});

test('R47 does not silently trust a dirty or mismatched PC checkout',()=>{
  assert.equal(inspect(launcher,{readGit:()=>({head:'f'.repeat(40),clean:true})}).status,
    'PC_SOURCE_CONFIG_OR_CLEAN_NOT_VERIFIED');
  assert.equal(inspect(launcher,{readGit:()=>({head:approved,clean:false})}).status,
    'PC_SOURCE_CONFIG_OR_CLEAN_NOT_VERIFIED');
  assert.equal(inspect(launcher,{config:{...config,enabled:false}}).status,
    'PC_SOURCE_CONFIG_OR_CLEAN_NOT_VERIFIED');
});

test('R47 rejects unknown Task source before reading arbitrary files',()=>{
  let reads=0;
  const invalid=inspect(launcher,{taskXml:task.replaceAll(wrapper,
    String.raw`C:\Users\untrusted\launcher.vbs`),readScript:()=>{reads++;return launcher;}});
  assert.equal(invalid.status,'REGISTERED_LAUNCHER_NOT_UNIQUE_OR_UNAPPROVED');
  assert.equal(reads,0);
  noEffects(invalid);
  assert.equal(inspect(launcher,{taskXml:task.replace('PT5M','PT1M')}).status,
    'CORE_TASK_POLICY_UNVERIFIED');
});

test('R47 portable CMD remains ASCII CRLF and writes TXT strictly beside CMD',()=>{
  const bytes=fs.readFileSync(path.join(repo,
    'tools/us-market-breadth-r1/US_BREADTH_R47_CORE_TRACE_READONLY.cmd'));
  assert.equal(bytes.some(x=>x>127),false);
  assert.equal(/(^|[^\r])\n/.test(bytes.toString('ascii')),false);
  const cmd=bytes.toString('ascii');
  assert.match(cmd,/set "RESULT=%~dp0US_BREADTH_R47_CORE_TRACE_[^"]+\.txt"/);
  assert.match(cmd,/E:\\ZGmini\\runtime\\node\.exe/);
  assert.match(cmd,/--inspect-only/);
  assert.match(cmd,/LOG_LOCATION=NEXT_TO_CMD/);
  assert.doesNotMatch(cmd,/schtasks\s+\/(?:Change|Create|Delete)|--publish|%TEMP%|%USERPROFILE%/i);
});

test('R47 FIX2 portable CMD is self-contained, read-only and logs next to CMD',()=>{
  const bytes=fs.readFileSync(path.join(repo,
    'tools/us-market-breadth-r1/US_BREADTH_R47_FIX2_CORE_TRACE_READONLY.cmd'));
  assert.equal(bytes.some(x=>x>127),false);
  const cmd=bytes.toString('ascii');
  assert.equal(/(^|[^\r])\n/.test(cmd),false);
  assert.match(cmd,/set "RESULT=%~dp0US_BREADTH_R47_FIX2_CORE_TRACE_/);
  assert.match(cmd,/E:\\ZGmini\\runtime\\node\.exe/);
  assert.match(cmd,/--inspect-only/);
  assert.match(cmd,/LOG_LOCATION=NEXT_TO_CMD/);
  assert.doesNotMatch(cmd,/schtasks\s+\/(?:Change|Create|Delete)|--publish|%TEMP%|%USERPROFILE%/i);
});
