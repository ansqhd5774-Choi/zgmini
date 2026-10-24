import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planBiotechTaskMirror,verifyExistingBiotech} from './theme-biotech-task-mirror-r7-node.mjs';

const template=(logon='InteractiveToken')=>`<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
<RegistrationInfo><Author>example</Author></RegistrationInfo>
<Triggers><CalendarTrigger><StartBoundary>2026-10-24T08:00:00</StartBoundary>
<Repetition><Interval>PT5M</Interval><Duration>P1D</Duration></Repetition>
<Enabled>true</Enabled><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay>
</CalendarTrigger><LogonTrigger><Enabled>true</Enabled></LogonTrigger></Triggers>
<Principals><Principal id="Author"><UserId>S-1-5-18</UserId><LogonType>${logon}</LogonType>
<RunLevel>HighestAvailable</RunLevel></Principal></Principals>
<Settings><Enabled>true</Enabled><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
<ExecutionTimeLimit>PT1H</ExecutionTimeLimit></Settings>
<Actions Context="Author"><Exec><Command>E:\\old\\run.cmd</Command></Exec></Actions>
</Task>`;

test('plan mirrors triggers, principal, settings without touching original XML',()=>{
 const original=template();
 const result=planBiotechTaskMirror(original);
 assert.equal(result.triggerCount,2);
 assert.equal(result.logon,'InteractiveToken');
 assert.equal(original.includes('E:\\old\\run.cmd'),true);
 assert.equal(result.xml.includes('E:\\old\\run.cmd'),false);
 assert.match(result.xml,/BIOTECH_R7_SCHEDULED\.cmd/);
 assert.match(result.xml,/<Interval>PT5M<\/Interval>/);
 assert.match(result.xml,/<RunLevel>HighestAvailable<\/RunLevel>/);
 assert.match(result.xml,/<MultipleInstancesPolicy>IgnoreNew<\/MultipleInstancesPolicy>/);
 assert.equal(verifyExistingBiotech(result,result.xml),true);
});

test('blocks password-only principal without credential extraction',()=>{
 assert.throws(()=>planBiotechTaskMirror(template('Password')),
  /SEVEN_THEME_TEMPLATE_LOGON_REQUIRES_MANUAL_REVIEW/);
});

test('blocks disabled template',()=>{
 assert.throws(()=>planBiotechTaskMirror(template().replace('<Settings><Enabled>true',
  '<Settings><Enabled>false')),/SEVEN_THEME_TEMPLATE_TASK_DISABLED/);
});

test('blocks unauthorized existing biotech action',()=>{
 const t=planBiotechTaskMirror(template());
 assert.throws(()=>verifyExistingBiotech(t,template()),/EXISTING_BIOTECH_TASK_NOT_OURS/);
});

test('blocks trigger drift of existing biotech task',()=>{
 const t=planBiotechTaskMirror(template());
 assert.throws(()=>verifyExistingBiotech(t,t.xml.replace('PT5M','PT10M')),
  /EXISTING_BIOTECH_TASK_TRIGGER_DRIFT/);
});
