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
 // The 1-minute trigger is independent of execution timeout: collection and
 // publication may each run for up to five minutes, and IgnoreNew prevents overlap.
 assert.match(result.taskXml,/<ExecutionTimeLimit>PT30M<\/ExecutionTimeLimit>/);
 assert.doesNotMatch(result.taskXml,/<ExecutionTimeLimit>PT5M<\/ExecutionTimeLimit>/);
 assert.match(result.launcherText,/--cnn-minute --publish/);
 // Task Scheduler does not guarantee an interactive account's custom env.
 // Pin only the child PROCESS environment; never modify USER/SYSTEM globally.
 assert.match(result.launcherText,/shell\.Environment\("PROCESS"\)/);
 assert.ok(result.launcherText.includes('taskEnvironment("ZGMINI_PC_HOME") = "'+
  String.raw`E:\ZGmini\data\pc-writer`+'"'));
 assert.doesNotMatch(result.launcherText,/Environment\("(?:USER|SYSTEM)"\)/i);
 assert.match(result.taskXml,/run-local-cnn-minute\.vbs/);
 assert.equal(result.effectRequiresApproval,'CREATE_ENABLE_ONE_TASK_CNN_HTTP_SQLITE_D1_WITH_EXACT_CAS_AND_ROLLBACK');
 assert.deepEqual(result.scheduledRuntimeEffects,{cnnHttpRequests:true,
  sqliteObservationWrites:true,d1PublicProjectionWrites:true});
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
