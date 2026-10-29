import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeTaskXml,taskArguments,launcherFromTask,cycleFromLauncher,classifyInspection}
 from './ASSET_R10_AUTO_PC_COMPAT_READONLY_R2.mjs';

const xml='<Task><Actions><Exec><Arguments>&quot;E:\\ZGmini\\data\\pc-writer\\run-local-core.vbs&quot;</Arguments></Exec></Actions></Task>';
test('UTF-16 task XML decoding and existing VBS resolution',()=>{
 const b=Buffer.concat([Buffer.from([255,254]),Buffer.from(xml,'utf16le')]);
 assert.equal(decodeTaskXml(b),xml);
 assert.equal(taskArguments(xml),'"E:\\ZGmini\\data\\pc-writer\\run-local-core.vbs"');
 assert.equal(launcherFromTask(xml),'E:\\ZGmini\\data\\pc-writer\\run-local-core.vbs');
});
test('actual script is resolved without launching it',()=>{
 const vbs='Set shell = CreateObject("WScript.Shell")\r\nWScript.Quit shell.Run(""E:\\ZGmini\\runtime\\node.exe"" ""E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release\\scripts\\pc-writer\\local-cycle.mjs"" --publish", 0, True)';
 assert.equal(cycleFromLauncher(vbs),'E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release\\scripts\\pc-writer\\local-cycle.mjs');
});
test('only unmodified, linked and complete sources are eligible',()=>{
 const base={configMatches:true,taskLinked:true,trackedDirty:false,hook:false,anchorCount:1,prerequisites:true};
 assert.equal(classifyInspection(base),'READY_FOR_SELECTIVE_INSTALL_REVIEW');
 assert.equal(classifyInspection({...base,trackedDirty:true}),'STOP_SOURCE_REVIEW_REQUIRED');
 assert.equal(classifyInspection({...base,taskLinked:false}),'STOP_SOURCE_REVIEW_REQUIRED');
 assert.equal(classifyInspection({...base,prerequisites:false}),'STOP_SOURCE_REVIEW_REQUIRED');
 assert.equal(classifyInspection({...base,anchorCount:0}),'STOP_PATCH_ANCHOR_MISMATCH');
 assert.equal(classifyInspection({...base,hook:true}),'HOOK_PRESENT_RUNTIME_VERIFICATION_REQUIRED');
});
