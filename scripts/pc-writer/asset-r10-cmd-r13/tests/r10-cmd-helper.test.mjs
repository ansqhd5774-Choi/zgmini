import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyHook,verifyWriterBaseline,verifyPinnedTextFile,updateSourceOnly,validateManifest,sha256,pinnedRuntimeRoute,assessSchedulerSafety,assertReadyResultConsistency,transientPreflightStop,parseNativeTaskSnapshot} from '../r10-ops.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const pkg=path.dirname(here);
const spec=JSON.parse(fs.readFileSync(path.join(pkg,'hook-spec.json'),'utf8'));
const base=fs.readFileSync(path.join(here,'fixtures','run-local-pr893-base.mjs'),'utf8');
const expected=fs.readFileSync(path.join(pkg,'payload','scripts','pc-writer','run-local.mjs'),'utf8');

test('Git-less package manifest validates without a repository',()=>{
 assert.doesNotThrow(()=>validateManifest(pkg));
 assert.equal(fs.existsSync(path.join(pkg,'.git')),false);
});
test('PR #893 hook inserts once, exactly matching pinned implementation',()=>{
 const first=applyHook(base,spec);
 assert.equal(first.status,'READY_TO_PATCH');
 assert.equal(first.content,expected);
 const second=applyHook(first.content,spec);
 assert.equal(second.status,'ALREADY_PRESENT');
 assert.equal(second.content,expected);
});
test('Windows CRLF checkout matches the same Git LF baseline without weakening content checks',()=>{
 const checkout=base.replace(/\n/g,'\r\n');
 const match=verifyWriterBaseline(checkout,base);
 assert.equal(match.worktreeEol,'CRLF');
 assert.equal(match.gitBlobEol,'LF');
 assert.equal(match.normalized,base);
 const patch=applyHook(checkout,spec);
 assert.equal(patch.status,'READY_TO_PATCH');
 assert.equal(patch.content,expected.replace(/\n/g,'\r\n'));
 assert.equal(applyHook(patch.content,spec).status,'ALREADY_PRESENT');
});
test('baseline byte/content drift cannot be accepted as EOL conversion',()=>{
 const checkout=base.replace(/\n/g,'\r\n');
 assert.throws(()=>verifyWriterBaseline(checkout.replace('publicationCompatibility','changedPublicationCompatibility'),base),
  /STOP_WRITER_BASELINE_SHA_MISMATCH/);
 assert.throws(()=>verifyWriterBaseline(checkout+' ',base),/STOP_WRITER_BASELINE_SHA_MISMATCH/);
 const oneCrlf=base.replace(/\n/,'\r\n');
 assert.equal(verifyWriterBaseline(oneCrlf,base).worktreeEol,'MIXED');
 assert.throws(()=>verifyWriterBaseline(base.replace(/\n/,'\r'),base),/STOP_WRITER_INVALID_LINE_ENDINGS/);
});
test('unknown Writer anchor or missing publication contract stops without mutation',()=>{
 const mutant=base.replace('  // Reuse the existing public snapshot table;','  // Unknown publication section');
 assert.throws(()=>applyHook(mutant,spec),/STOP_WRITER_ANCHOR_MISMATCH/);
 const noGuard=base.replace('publicationCompatibility(root,config.source,source,main)','changedGuard()');
 assert.throws(()=>applyHook(noGuard,spec),/STOP_WRITER_CONTRACT_MISMATCH/);
 const duplicate=expected.replace(spec.anchor,spec.hunk+spec.anchor);
 assert.throws(()=>applyHook(duplicate,spec),/STOP_HOOK_DUPLICATED/);
});
test('only config.source is altered in memory, with exact baseline match',()=>{
 const old=spec.approvedBaselineSha,newSha='f'.repeat(40);
 const input=JSON.stringify({config:{other:true},source:old,key:'KEEP_SECRET_UNPRINTED'},null,2);
 const changed=updateSourceOnly(input,old,newSha);
 assert.equal(JSON.parse(changed).source,newSha);
 assert.equal(JSON.parse(changed).key,'KEEP_SECRET_UNPRINTED');
 assert.throws(()=>updateSourceOnly(input,'0'.repeat(40),newSha),/STOP_CONFIG_SOURCE_FORMAT/);
});
test('SHA-256 fixture and missing/altered package file fail closed',()=>{
 assert.equal(sha256(Buffer.from('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r10-manifest-'));
 try{
  const original=JSON.parse(fs.readFileSync(path.join(pkg,'package-manifest.json'),'utf8'));
  // A verified file is required to exist and match the pinned digest.
  const copy={...original,files:[...original.files]};
  const sample=copy.files.find(x=>x.path==='hook-spec.json');
  fs.writeFileSync(path.join(tmp,'package-manifest.json'),JSON.stringify(copy));
  fs.writeFileSync(path.join(tmp,'hook-spec.json'),fs.readFileSync(path.join(pkg,'hook-spec.json')));
  assert.equal(sample.sha256.length,64);
  assert.throws(()=>validateManifest(tmp),/STOP_PACKAGE_HASH_MISMATCH/);
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
test('R5 observed Core VBS route is accepted only with pinned script SHA',()=>{
 const expected='E:\\ZGmini\\data\\pc-writer\\cutover-evidence\\inflation-r37-2026-10-20T19-39-19-549Z\\run-local-core.vbs';
 const xml=`<Task><Actions><Exec><Command>wscript.exe</Command><Arguments>"${expected}"</Arguments></Exec></Actions></Task>`;
 const sha='bb3e11c0b5c8da07162b1c824e7b52e7a7c2f987c079f29713211a2413932b01';
 assert.equal(pinnedRuntimeRoute(xml,()=>true,()=>sha),'VERIFIED_R5_PINNED_RUNTIME_ROUTE');
 assert.equal(pinnedRuntimeRoute(xml,()=>true,()=>"0".repeat(64)),'STOP_CORE_VBS_HASH_DRIFT');
 assert.equal(pinnedRuntimeRoute(xml.replace('wscript.exe','other.exe'),()=>true,()=>sha),'STOP_CORE_VBS_ROUTE_CHANGED');
});
test('R7 requires two idle scheduled tasks and adequate next-run margin',()=>{
 const time=Date.parse('2026-10-29T15:52:00Z');
 const core={Enabled:true,State:'Ready',NextMs:time+180000};
 const korea={Enabled:true,State:'Ready'};
 assert.equal(assessSchedulerSafety(core,korea,time),'CLEAR');
 assert.equal(assessSchedulerSafety({...core,State:'Running'},korea,time),'STOP_SCHEDULER_BUSY');
 assert.equal(assessSchedulerSafety({...core,NextMs:time+10000},korea,time),'STOP_CORE_NEXT_RUN_TOO_NEAR');
 assert.equal(assessSchedulerSafety(core,{...korea,Enabled:false},time),'STOP_SCHEDULER_DISABLED_OR_UNVERIFIED');
});
test('bounded PREFLIGHT wait retries only expected busy states',()=>{
 assert.equal(transientPreflightStop('STOP_SCHEDULER_BUSY'),true);
 assert.equal(transientPreflightStop('STOP_LOCK_PRESENT'),true);
 assert.equal(transientPreflightStop('STOP_CORE_NEXT_RUN_TOO_NEAR'),true);
 assert.equal(transientPreflightStop('STOP_SOURCE_CONFLICT'),false);
 assert.equal(transientPreflightStop('STOP_CORE_VBS_HASH_DRIFT'),false);
});


test('R9: mixed-EOL baseline has exact Git content and keeps each original newline unchanged',()=>{
 let n=0;const mixed=base.replace(/\n/g,()=>++n%3===0?'\r\n':'\n');
 const profile=verifyWriterBaseline(mixed,base);
 assert.equal(profile.worktreeEol,'MIXED');
 assert.equal(profile.gitBlobEol,'LF');
 assert.equal(profile.worktreeCrLf>0,true);
 assert.equal(profile.worktreeLf>0,true);
 const {status,content}=applyHook(mixed,spec);
 assert.equal(status,'READY_TO_PATCH');
 assert.equal(content.replace(/\r\n/g,'\n'),expected);
 const anchor=spec.anchor;
 const index=mixed.indexOf(anchor);
 const eol=mixed.slice(0,index).match(/(?:\r\n|\n)$/)[0];
 const hunk=spec.hunk.replace(/\n/g,eol);
 assert.equal(content.slice(0,index),mixed.slice(0,index));
 assert.equal(content.slice(index+hunk.length),mixed.slice(index));
 assert.equal(applyHook(content,spec).status,'ALREADY_PRESENT');
 // A mixed-format Git blob is also allowed only if the whole text matches.
 assert.equal(verifyWriterBaseline(mixed,mixed).gitBlobEol,'MIXED');
 assert.throws(()=>verifyWriterBaseline(mixed+' ',base),/STOP_WRITER_BASELINE_SHA_MISMATCH/);
 assert.throws(()=>verifyWriterBaseline(mixed.replace('publicationCompatibility','badguard'),base),
  /STOP_WRITER_BASELINE_SHA_MISMATCH/);
});
test('R9: insertion at mixed-EOL anchor uses local EOL only',()=>{
 const pattern=base.replace(/(\n)/g,(m,i)=>i%2?'\n':'\r\n');
 const {content}=applyHook(pattern,spec);
 const idx=pattern.indexOf(spec.anchor);
 const eol=pattern.slice(0,idx).match(/(?:\r\n|\n)$/)[0];
 const inserted=spec.hunk.replace(/\n/g,eol);
 assert.equal(content.slice(0,idx),pattern.slice(0,idx));
 assert.equal(content.slice(idx+inserted.length),pattern.slice(idx));
 assert.equal(content.replace(/\r\n/g,'\n'),expected);
});


test('R10: byte-exact publication guard and identical LF/CRLF/mixed content pass without writing',()=>{
 const guard=fs.readFileSync(path.join(pkg,'payload','scripts','pc-writer','publication-guard.mjs'));
 assert.equal(verifyPinnedTextFile(guard,guard).equivalence,'BYTE_EXACT');
 let count=0;
 const mixed=Buffer.from(guard.toString('utf8').replace(/\n/g,()=>++count%4?'\r\n':'\n'));
 const verified=verifyPinnedTextFile(mixed,guard,
  {code:'STOP_PUBLICATION_COMPATIBILITY_CONTENT_MISMATCH'});
 assert.equal(verified.equivalence,'EXACT_CONTENT_ALLOWED_EOL');
 assert.equal(verified.eol,'MIXED');
 assert.equal(verifyPinnedTextFile(Buffer.from(guard.toString().replace(/\n/g,'\r\n')),guard).eol,'CRLF');
 assert.equal(mixed.toString('utf8').replace(/\r\n/g,'\n'),guard.toString('utf8'));
});

test('R10: substantive guard/dependency drift, standalone CR and invalid UTF-8 always stop',()=>{
 const guard=fs.readFileSync(path.join(pkg,'payload','scripts','pc-writer','publication-guard.mjs'));
 const bytes=guard.toString('utf8');
 const mutate=Buffer.from(bytes.replace('publicationCompatibility','publicationCompatFake'));
 assert.throws(()=>verifyPinnedTextFile(mutate,guard,
  {code:'STOP_PUBLICATION_COMPATIBILITY_CONTENT_MISMATCH'}),
  /STOP_PUBLICATION_COMPATIBILITY_CONTENT_MISMATCH/);
 assert.throws(()=>verifyPinnedTextFile(Buffer.from(bytes+' '),guard),
  /STOP_DEPENDENCY_CONTENT_MISMATCH/);
 assert.throws(()=>verifyPinnedTextFile(Buffer.from(bytes.replace(/\n/,'\r')),guard),
  /STOP_WRITER_INVALID_LINE_ENDINGS/);
 assert.throws(()=>verifyPinnedTextFile(Buffer.from([0xff,0xfe,0x0a]),guard),
  /STOP_PINNED_TEXT_INVALID_UTF8/);
});


test('R11 READY report requires live lock and process CLEAR, not an old snapshot',()=>{
 const safe={LOCK_STATUS:'CLEAR',PROCESS_STATUS:'CLEAR',CORE_TASK_STATE:'Ready',
  KOREA_TASK_STATE:'Ready',CORE_NEXT_RUN_MARGIN_SEC:157,LEDGER_STATUS:'VERIFIED'};
 assert.doesNotThrow(()=>assertReadyResultConsistency(safe));
 assert.throws(()=>assertReadyResultConsistency({...safe,LOCK_STATUS:'STOP_LOCK_PRESENT'}),
  /STOP_LOCK_PRESENT/);
 assert.throws(()=>assertReadyResultConsistency({...safe,PROCESS_STATUS:'STOP_WRITER_PROCESS_ACTIVE'}),
  /STOP_WRITER_PROCESS_ACTIVE/);
 assert.throws(()=>assertReadyResultConsistency({...safe,CORE_TASK_STATE:'Running'}),
  /STOP_SCHEDULER_BUSY/);
});
test('R11 READY report also requires safe current publication ledger and run margin',()=>{
 const safe={LOCK_STATUS:'CLEAR',PROCESS_STATUS:'CLEAR',CORE_TASK_STATE:'Ready',
  KOREA_TASK_STATE:'Ready',CORE_NEXT_RUN_MARGIN_SEC:157,LEDGER_STATUS:'VERIFIED'};
 assert.throws(()=>assertReadyResultConsistency({...safe,CORE_NEXT_RUN_MARGIN_SEC:50}),
  /STOP_CORE_NEXT_RUN_TOO_NEAR/);
 assert.throws(()=>assertReadyResultConsistency({...safe,LEDGER_STATUS:'SUBMITTING'}),
  /STOP_PUBLICATION_LEDGER_UNSAFE/);
 assert.doesNotThrow(()=>assertReadyResultConsistency({...safe,LEDGER_STATUS:'READBACK_RECOVERED'}));
});

test('R12 parses native Task Scheduler COM task states without PowerShell',()=>{
 const sample='TASK|CORE|1|3|2026-10-31T13:00:00\nTASK|KOREA|1|3|2026-10-31T13:37:00';
 const list=parseNativeTaskSnapshot(sample);
 assert.equal(list[0].Enabled,true);assert.equal(list[0].State,'Ready');
 assert.equal(list[1].State,'Ready');
 assert.equal(assessSchedulerSafety(list[0],list[1],Date.parse('2026-10-31T12:55:00')), 'CLEAR');
 assert.throws(()=>parseNativeTaskSnapshot(sample+'\nTASK|OTHER|1|3|2026-10-31T13:00:00'),/STOP_SCHEDULER_LIVE_QUERY_FAILED/);
 assert.throws(()=>parseNativeTaskSnapshot('TASK|CORE|1|3|bogus\nTASK|KOREA|1|3|2026-10-31T13:37:00'),/STOP_SCHEDULER_LIVE_QUERY_FAILED/);
});
test('R12 uses only CMD/cscript native Windows interfaces, preserving scheduler and source guard',()=>{
 const code=fs.readFileSync(path.join(pkg,'r10-ops.mjs'),'utf8');
 const vbs=fs.readFileSync(path.join(pkg,'windows-runtime-readonly.vbs'),'utf8');
 assert.doesNotMatch(code,/powershell(?:\.exe)?|Get-ScheduledTask|Get-CimInstance/i);
 assert.match(code,/cscript\.exe/);assert.match(code,/installWhenSafe/);
 assert.match(code,/INSTALL_START_MARGIN_SEC=230/);
 assert.match(vbs,/Schedule\.Service/);assert.match(vbs,/Win32_Process/);
 assert.doesNotMatch(vbs,/RegisterTask|DeleteTask|\bTerminate\b|\bDelete\b/);
});
test('R12 protects last scheduler margin after in-place tests and before git add',()=>{
 const code=fs.readFileSync(path.join(pkg,'r10-ops.mjs'),'utf8');
 assert.match(code,/out\.TEST_STATUS=sanityTests\(root,manifest\);\s*\/\/ Tests must not consume[\s\S]{0,250}assertIdle\(home,root,out\);\s*git\(root,'add'/);
 assert.match(code,/if\(Date\.now\(\)\+10000>until\)/);
});


test('R13: cscript Task Scheduler stdout remains enabled; //B silently hides WScript.Echo',()=>{
 const code=fs.readFileSync(path.join(pkg,'r10-ops.mjs'),'utf8');
 const segment=code.slice(code.indexOf('function nativeWindowsRead('),code.indexOf('export function parseNativeTaskSnapshot('));
 assert.match(segment,/cmd\('cscript\.exe',\['\/\/Nologo','\/\/T:15'/);
 assert.doesNotMatch(segment,/['"]\/\/B['"]/);
 assert.match(segment,/windows-runtime-readonly\.vbs/);
 assert.match(segment,/\.trim\(\)/);
});
test('R13: never treat blank or malformed native task output as scheduler Ready',()=>{
 assert.throws(()=>parseNativeTaskSnapshot(''),/STOP_SCHEDULER_LIVE_QUERY_FAILED/);
 assert.throws(()=>parseNativeTaskSnapshot('\n'),/STOP_SCHEDULER_LIVE_QUERY_FAILED/);
 assert.throws(()=>parseNativeTaskSnapshot('TASK|CORE|1|3|2026-10-31T12:00:00\n'),/STOP_SCHEDULER_LIVE_QUERY_FAILED/);
 assert.throws(()=>parseNativeTaskSnapshot('CScript error'),/STOP_SCHEDULER_LIVE_QUERY_FAILED/);
 const ok=parseNativeTaskSnapshot('TASK|CORE|1|3|2026-10-31T12:05:00\nTASK|KOREA|1|3|2026-10-31T12:37:00');
 assert.equal(ok.length,2);assert.ok(ok.every(t=>t.State==='Ready'&&t.Enabled));
});
