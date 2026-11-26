import test from 'node:test';
import assert from 'node:assert/strict';
import {buildW06MinuteTaskCandidate,W06_MINUTE_TASK_NAME,W06_MINUTE_TASK_INTERVAL}
 from '../scripts/pc-writer/w06-minute-task-candidate.mjs';

const args=()=>({sourceRoot:String.raw`E:\ZGmini\projects\zgmini-earnings-history-pc-release`,
 account:'PC\\test-user',now:new Date('2026-11-26T12:07:11.123Z')});

test('W06 is a nonexecuting source candidate with exactly one 60s CNN-only Task',()=>{
 const result=buildW06MinuteTaskCandidate(args());
 assert.equal(result.status,'SOURCE_CANDIDATE_NOT_APPROVED');
 assert.equal(result.taskName,W06_MINUTE_TASK_NAME);
 assert.equal(result.repetitionInterval,W06_MINUTE_TASK_INTERVAL);
 assert.match(result.taskXml,/<Interval>PT1M<\/Interval>/);
 assert.match(result.taskXml,/<StartBoundary>2026-11-26T12:08:00.000Z<\/StartBoundary>/);
 assert.match(result.taskXml,/<MultipleInstancesPolicy>IgnoreNew<\/MultipleInstancesPolicy>/);
 assert.match(result.launcherText,/--cnn-minute --publish/);
 assert.match(result.taskXml,/run-local-cnn-minute\.vbs/);
 assert.equal(result.candidateWrites,0);
 assert.equal(result.coreTaskChanges,0);
 assert.equal(result.existingWriterTaskChanges,0);
 assert.equal(result.providerCalls,0);
 assert.equal(result.dbWrites,0);
 assert.equal(result.d1Writes,0);
 assert.doesNotMatch(result.launcherText,/--korea|--job=|schtasks|powershell/i);
 assert.doesNotMatch(result.taskXml,/ZGMINI-PC-Local-Core|ZGMINI-PC-Writer/);
});

test('W06 requires fixed installed roots and explicit Windows account',()=>{
 for(const patch of [{sourceRoot:'C:\\tmp'},{sourceRoot:'E:\\ZGmini\\projects\\..'},
  {pcHome:null},{nodeExe:null},{pcHome:'C:\\Temp'},{nodeExe:'C:\\node.exe'},{systemRoot:'C:\\Something'},
  {account:'x\nmalicious'},{account:''},{now:new Date('invalid')}]){
  assert.throws(()=>buildW06MinuteTaskCandidate({...args(),...patch}),
   e=>e.code==='W06_MINUTE_TASK_INPUT_SCOPE_STOP');
 }
});

test('W06 Task spec safely escapes account and never generates an extra OS action',()=>{
 const result=buildW06MinuteTaskCandidate({...args(),account:'PC\\Name<&"Test'});
 assert.match(result.taskXml,/PC\\Name&lt;&amp;&quot;Test/);
 assert.equal((result.taskXml.match(/<Exec>/g)||[]).length,1);
 assert.equal((result.taskXml.match(/<TimeTrigger>/g)||[]).length,1);
 assert.equal((result.taskXml.match(/<Command>/g)||[]).length,1);
 assert.equal((result.taskXml.match(/<Interval>/g)||[]).length,1);
});
