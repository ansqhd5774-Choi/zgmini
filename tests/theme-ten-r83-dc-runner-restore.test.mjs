import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDcPowerScheduledRunner} from '../scripts/pc-writer/theme-data-center-power-task-r5.mjs';
import {parseR83TaskAction,approvedR83Parent,decodeR83Windows,
 validateR83Runner,executeR83} from '../scripts/pc-writer/theme-ten-r83-dc-runner-restore.mjs';

const target='C:\\Users\\TEST_USER\\Desktop\\DATA_CENTER_POWER_R5_SCHEDULED.cmd';
const goodXml=(args='/d /c &quot;&quot;'+target+'&quot;&quot;')=>
 '<?xml version="1.0"?>'+
 '<Task><Triggers><CalendarTrigger><StartBoundary>2026-10-30T14:00:00</StartBoundary></CalendarTrigger></Triggers>'+
 '<Settings><StartWhenAvailable>true</StartWhenAvailable></Settings>'+
 '<Principals><Principal><UserId>SECRET_DO_NOT_LOG</UserId><LogonType>InteractiveToken</LogonType></Principal></Principals>'+
 '<Actions><Exec><Command>C:\\Windows\\System32\\cmd.exe</Command>'+
 '<Arguments>'+args+'</Arguments></Exec></Actions></Task>';

test('R83 accepts exact existing schedule action without logging identity',()=>{
 const r=parseR83TaskAction(goodXml());
 assert.equal(r.runner,target);
 assert.equal(r.taskXmlSha256.length,64);
 assert.ok(!JSON.stringify(r).includes('SECRET_DO_NOT_LOG'));
});

test('R83 rejects altered task arguments and an extra Exec',()=>{
 assert.throws(()=>parseR83TaskAction(goodXml('/d /c &quot;evil.cmd&quot;')),
  {code:'TASK_EXEC_ARGUMENTS_DRIFT'});
 assert.throws(()=>parseR83TaskAction(goodXml().replace('</Actions>',
  '<Exec><Command>cmd.exe</Command></Exec></Actions>')),{code:'TASK_ACTION_NOT_UNIQUE'});
 assert.throws(()=>parseR83TaskAction(goodXml().replace('T14:00:00','T13:00:00')),
  {code:'TASK_TRIGGER_TIME_CHANGED'});
 assert.throws(()=>parseR83TaskAction(goodXml().replace(
  '<Settings><StartWhenAvailable>true</StartWhenAvailable></Settings>',
  '<Settings><Enabled>false</Enabled></Settings>')),{code:'TASK_EXPLICITLY_DISABLED'});
});

test('R83 accepts only stable approved runner path roots',()=>{
 const user='C:\\Users\\TEST_USER';
 assert.equal(approvedR83Parent(target,{userProfile:user}),true);
 assert.equal(approvedR83Parent('E:\\ZGmini\\data\\pc-writer\\DATA_CENTER_POWER_R5_SCHEDULED.cmd',
  {userProfile:user}),true);
 assert.equal(approvedR83Parent('C:\\Windows\\Temp\\DATA_CENTER_POWER_R5_SCHEDULED.cmd',
  {userProfile:user}),false);
 assert.equal(approvedR83Parent('C:\\Users\\OTHER\\Desktop\\DATA_CENTER_POWER_R5_SCHEDULED.cmd',
  {userProfile:user}),false);
});

test('R83 restores only byte-for-byte approved private R5 runner',()=>{
 const bytes=buildDcPowerScheduledRunner();
 assert.equal(validateR83Runner(bytes),true);
 const changed=Buffer.from(bytes.toString('ascii').replace('--once --collect',
  '--once --publish'),'ascii');
 assert.throws(()=>validateR83Runner(changed),{code:'APPROVED_R5_RUNNER_CONTENT_DRIFT'});
});

test('R83 decodes Windows XML and rejects non-Windows without writes',async()=>{
 const xml=goodXml();
 assert.equal(decodeR83Windows(Buffer.concat([Buffer.from([255,254]),Buffer.from(xml,'utf16le')])),xml);
 const result=await executeR83({platform:'linux',clock:new Date('2026-10-29T17:00:00Z'),
  create:()=>{throw new Error('unexpected write');}});
 assert.equal(result.status,'STOP_R83');
 assert.equal(result.reason,'WINDOWS_PC_REQUIRED');
 assert.equal(result.runnerCreated,0);
 assert.equal(result.taskChanges,0);
 assert.equal(result.d1Writes,0);
});
