import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planDcPowerTaskMirror,verifyDcPowerTask,buildDcPowerScheduledRunner}
 from '../scripts/pc-writer/theme-data-center-power-task-r5.mjs';

const RUNNER='C:\\Users\\tester\\Desktop\\DATA_CENTER_POWER_R5_SCHEDULED.cmd';
const xml=(logon='InteractiveToken')=>`<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
<RegistrationInfo><URI>\\ZGMINI-PC-GetMarketHistory-ETF</URI></RegistrationInfo>
<Triggers><CalendarTrigger><StartBoundary>2026-10-24T14:00:00</StartBoundary>
<Enabled>true</Enabled><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay>
</CalendarTrigger></Triggers>
<Principals><Principal id="Author"><UserId>S-1-5-21-123</UserId>
<LogonType>${logon}</LogonType></Principal></Principals>
<Settings><Enabled>true</Enabled><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
<ExecutionTimeLimit>PT12M</ExecutionTimeLimit></Settings>
<Actions Context="Author"><Exec><Command>E:\\original\\run.cmd</Command></Exec></Actions>
</Task>`;

test('R5 clones original existing 7 theme task triggers/identity/settings, new URI and action',()=>{
 const source=xml();
 const planned=planDcPowerTaskMirror(source,RUNNER);
 assert.equal(planned.triggerCount,1);
 assert.equal(planned.login,'InteractiveToken');
 assert.equal(verifyDcPowerTask(planned,planned.xml,RUNNER),true);
 assert.match(planned.xml,/<URI>\\ZGMINI-PC-Theme-Data-Center-Power<\/URI>/);
 assert.match(planned.xml,/Desktop\\DATA_CENTER_POWER_R5_SCHEDULED\.cmd/);
 assert.match(planned.xml,/<ExecutionTimeLimit>PT12M<\/ExecutionTimeLimit>/);
 assert.match(planned.xml,/<StartBoundary>2026-10-24T14:00:00<\/StartBoundary>/);
 assert.match(source,/E:\\original\\run\.cmd/);
 assert.doesNotMatch(planned.xml,/E:\\original\\run\.cmd/);
});

test('R5 refuses an existing task with altered trigger or runner',()=>{
 const t=planDcPowerTaskMirror(xml(),RUNNER);
 assert.throws(()=>verifyDcPowerTask(t,t.xml.replace('PT12M','PT5M'),RUNNER),/SETTINGS_DRIFT/);
 assert.throws(()=>verifyDcPowerTask(t,t.xml.replace('14:00:00','15:00:00'),RUNNER),/TRIGGER_DRIFT/);
 assert.throws(()=>verifyDcPowerTask(t,xml(),RUNNER),/ACTION_MISMATCH/);
});

test('R5 rejects password principal and non-Desktop named runner',()=>{
 assert.throws(()=>planDcPowerTaskMirror(xml('Password'),RUNNER),/LOGON_NEEDS_MANUAL_REVIEW/);
 assert.throws(()=>planDcPowerTaskMirror(xml(),'C:\\unsafe.cmd'),/RUNNER_PATH_INVALID/);
});

test('R5 generated Windows CMD is ASCII CRLF, private-only, Desktop log, pin R3 release',()=>{
 const bytes=buildDcPowerScheduledRunner();
 const text=bytes.toString('ascii');
 assert.ok(bytes.every(b=>b<128));
 assert.doesNotMatch(text.replaceAll('\r\n',''),/\n/);
 assert.match(text,/--once --collect/);
 assert.doesNotMatch(text,/--publish|--accept-anonymous-license-risk|schtasks|wrangler/);
 assert.match(text,/%~dp0DATA_CENTER_POWER_R5_SCHEDULED_RESULT\.txt/);
 assert.match(text,/2f0f1a2c1b31e20f9e943e90824885d586448d29/);
});
