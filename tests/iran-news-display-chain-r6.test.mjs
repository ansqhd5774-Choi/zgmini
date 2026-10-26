import assert from 'node:assert/strict';
import test from 'node:test';
import {decodeTaskXml,describeSchedulerXml,parseLauncherScript} from '../scripts/iran-progress/news-display-chain-audit-r6.mjs';

test('R13 wscript launcher accepts one invoked runner and other .mjs argument references',()=>{
 const vbs='Set shell = CreateObject("WScript.Shell")\r\n'+
  'WScript.Quit shell.Run("""E:\\ZGmini\\runtime\\node.exe"" ""E:\\ZGmini\\projects\\zgmini\\scripts\\iran-progress\\run-reference-flow-r3.mjs"" --legacy-runner=""E:\\ZGmini\\projects\\zgmini\\scripts\\iran-progress\\run-reference-flow.mjs"" --collector=""E:\\ZGmini\\projects\\zgmini\\scripts\\iran-progress\\collect-r14.mjs""", 0, True)\r\n';
 const parsed=parseLauncherScript(vbs);
 assert.equal(parsed.scriptBase,'run-reference-flow-r3.mjs');
 assert.equal(parsed.otherScriptReferenceCount,2);
});

test('VBS parser fails closed for ambiguous shell.Run and missing node binary',()=>{
 assert.throws(()=>parseLauncherScript('WScript.Quit shell.Run("x", 0, True)\nWScript.Quit shell.Run("x", 0, True)'),/COUNT_UNVERIFIED/);
 assert.throws(()=>parseLauncherScript('WScript.Quit shell.Run("""E:\\scripts\\run-reference-flow-r3.mjs""", 0, True)'),/BINARY_NOT_VERIFIED/);
});

test('R13 XML action and four daily schedule hours parse without logging arguments',()=>{
 const hours=[0,6,12,18].map(x=>`<CalendarTrigger><StartBoundary>2026-10-08T${String(x).padStart(2,'0')}:00:00+09:00</StartBoundary></CalendarTrigger>`).join('');
 const xml=`<Task><Triggers>${hours}</Triggers><Actions><Exec><Command>C:\\Windows\\System32\\wscript.exe</Command><Arguments>&quot;E:\\ZGmini\\data\\iran-progress-r13\\run.vbs&quot;</Arguments></Exec></Actions></Task>`;
 const data=Buffer.concat([Buffer.from([255,254]),Buffer.from(xml,'utf16le')]);
 const parsed=describeSchedulerXml(decodeTaskXml(data));
 assert.equal(parsed.executable,'wscript.exe');
 assert.equal(parsed.launcherPath,'E:\\ZGmini\\data\\iran-progress-r13\\run.vbs');
 assert.deepEqual(parsed.scheduleHours,[0,6,12,18]);
});
