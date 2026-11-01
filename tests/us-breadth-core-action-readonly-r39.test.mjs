import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {decodeTaskXml,parseCoreTaskXml,extractStaticScriptPaths,
 summarizeCoreActionR39} from '../scripts/pc-writer/us-breadth-core-action-readonly-r39.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const approved='0123456789abcdef0123456789abcdef01234567';
const launcher='E:\\ZGmini\\data\\pc-writer\\run-local-core.vbs';
const core='E:\\ZGmini\\projects\\approved-core\\scripts\\pc-writer\\local-cycle.mjs';
const xml=`<?xml version="1.0" encoding="UTF-16"?><Task xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"><Triggers><TimeTrigger><Repetition><Interval>PT5M</Interval></Repetition></TimeTrigger></Triggers><Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy></Settings><Actions><Exec><Command>C:\\Windows\\System32\\wscript.exe</Command><Arguments>&quot;${launcher}&quot;</Arguments><WorkingDirectory>E:\\ZGmini\\projects\\approved-core</WorkingDirectory></Exec></Actions></Task>`;
const vbs=`Set shell = CreateObject("WScript.Shell")\r\nWScript.Quit shell.Run("""E:\\ZGmini\\runtime\\node.exe"" ""${core}"" --publish", 0, True)\r\n`;
const fixture={taskXml:xml,config:{source:approved,enabled:true,collectionTarget:'pc',
  core:'PRIVATE_DATABASE_ID',apiKey:'PRIVATE_TOKEN'},
 readWrapper:file=>file.toLowerCase()===launcher.toLowerCase()?vbs:null,
 readGit:project=>project.toLowerCase()==='e:\\zgmini\\projects\\approved-core'?
  {head:approved,clean:true}:null,
 sidecar:{output:{slotEndUtc:'2026-11-02T15:00:00.000Z',collectionStatus:'LOCAL_READY',
  prices:{SECRET_SYMBOL:99.1}}},
 early:{status:'VERIFIED',slotEndUtc:'2026-11-02T15:00:00.000Z',
  completedAt:'2026-11-02T15:02:11.000Z'},cycle:{status:'COMPLETE'}};

test('Task XML UTF-16LE and entities are read without returning raw XML',()=>{
 const encoded=Buffer.concat([Buffer.from([0xff,0xfe]),Buffer.from(xml,'utf16le')]);
 assert.equal(decodeTaskXml(encoded),xml);
 const task=parseCoreTaskXml(encoded);
 assert.equal(task.status,'TASK_XML_READ');
 assert.equal(task.arguments,`"${launcher}"`);
 assert.equal(task.triggerPT5M,true);
 assert.equal(task.ignoreNew,true);
 assert.equal(parseCoreTaskXml('<Task></Task>').status,'TASK_EXEC_COUNT_UNEXPECTED');
});

test('static registered VBS -> local-cycle and approved HEAD without exposing secrets',()=>{
 assert.deepEqual(extractStaticScriptPaths(vbs),[core]);
 const result=summarizeCoreActionR39(fixture);
 assert.equal(result.status,'APPROVED_SOURCE_STATIC_CHAIN');
 assert.equal(result.chain.staticChainVerified,true);
 assert.equal(result.chain.liveExecutionVerified,false);
 assert.equal(result.chain.approvedShaMatch,true);
 assert.equal(result.latest.slotEndUtc,'2026-11-02T15:00:00.000Z');
 assert.match(result.natural15MinSlots,/NOT_VERIFIED/);
 for(const secret of ['PRIVATE_DATABASE_ID','PRIVATE_TOKEN','SECRET_SYMBOL','99.1',
  'approved-core','run-local-core','E:\\ZGmini','wscript.exe'])
  assert.equal(JSON.stringify(result).includes(secret),false,`redacted ${secret}`);
 assert.equal(result.d1Reads,0);
 assert.equal(result.d1Writes,0);
 assert.equal(result.eSourceWrites,0);
 assert.equal(result.taskChanges,0);
 assert.equal(result.lockPidActions,0);
});

test('dynamic VBS and mismatched/dirty checkout fail closed',()=>{
 const dynamic=summarizeCoreActionR39({...fixture,
  readWrapper:()=>`value=Environ("ZG_SOURCE")\r\n${vbs}`});
 assert.equal(dynamic.status,'DYNAMIC_LAUNCHER_REVIEW_REQUIRED');
 assert.equal(dynamic.chain.staticChainVerified,false);
 const mismatch=summarizeCoreActionR39({...fixture,readGit:()=>({head:'f'.repeat(40),clean:true})});
 assert.equal(mismatch.status,'SOURCE_SHA_MISMATCH');
 const dirty=summarizeCoreActionR39({...fixture,readGit:()=>({head:approved,clean:false})});
 assert.equal(dirty.status,'SOURCE_DIRTY');
});

test('ambiguous and unapproved Task actions fail without E drive project scanning',()=>{
 const second='E:\\ZGmini\\projects\\another-core\\scripts\\pc-writer\\local-cycle.mjs';
 const multiple=summarizeCoreActionR39({...fixture,readWrapper:()=>`${vbs}\n${second}`});
 assert.equal(multiple.status,'MULTIPLE_PROJECTS_REVIEW_REQUIRED');
 const outside=summarizeCoreActionR39({...fixture,taskXml:xml.replaceAll(launcher,
  'C:\\Users\\test\\unexpected.vbs'),readWrapper:()=>{throw Error('NOT_READ');}});
 assert.equal(outside.chain.staticChainVerified,false);
 assert.equal(outside.status,'WRAPPER_UNREADABLE_OR_UNAPPROVED');
});

test('portable operator CMD uses approved E node, Downloads TXT and read-only command',()=>{
 const script=fs.readFileSync(path.join(root,'tools/us-market-breadth-r1/US_BREADTH_R39_CORE_ACTION_READONLY.cmd'));
 const cmd=script.toString('ascii');
 assert.equal(script.some(byte=>byte>127),false);
 assert.equal(/(^|[^\r])\n/.test(cmd),false,'ASCII CRLF only');
 assert.match(cmd,/E:\\ZGmini\\runtime\\node\.exe/i);
 assert.match(cmd,/%USERPROFILE%\\Downloads/i);
 assert.match(cmd,/%~dp0scripts\\pc-writer\\us-breadth-core-action-readonly-r39\.mjs/i);
 assert.match(cmd,/--inspect-only/i);
 assert.doesNotMatch(cmd,/schtasks\s+\/(?:Change|Create|Delete)|--publish|node scripts/i);
});
