import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {planAiTaskMirror,verifyExistingAiTask,verifiedPublication} from '../scripts/pc-writer/theme-ai-task-mirror-r1.mjs';

const sha='a'.repeat(40);
const runner=`E:\\ZGmini\\projects\\zgmini-theme-optional\\releases\\${sha}\\scripts\\pc-writer\\theme-optional-cycle.cmd`;
const workdir=path.win32.dirname(runner);
const template=`<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
<RegistrationInfo><Description>Original seven read-only collection</Description><URI>\\ZGMINI-PC-GetMarketHistory-ETF</URI></RegistrationInfo>
<Principals><Principal id="User"><UserId>TEST-USER-ID</UserId><LogonType>InteractiveToken</LogonType></Principal></Principals>
<Settings><ExecutionTimeLimit>PT12M</ExecutionTimeLimit><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><StartWhenAvailable>true</StartWhenAvailable><RunOnlyIfNetworkAvailable>true</RunOnlyIfNetworkAvailable></Settings>
<Triggers><CalendarTrigger><StartBoundary>2026-10-21T14:00:00</StartBoundary><ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay></CalendarTrigger></Triggers>
<Actions Context="User"><Exec><Command>E:\\ZGmini\\runtime\\node.exe</Command><Arguments>original-seven.mjs</Arguments></Exec></Actions>
</Task>`;

test('AI mirror preserves daily 14:00 trigger, account and run settings',()=>{
 const planned=planAiTaskMirror(template,{runner,workdir});
 assert.equal(planned.triggerCount,1);
 assert.equal(planned.startBoundary,'2026-10-21T14:00:00');
 assert.match(planned.xml,/<RunOnlyIfNetworkAvailable>true<\/RunOnlyIfNetworkAvailable>/);
 assert.match(planned.xml,/<ExecutionTimeLimit>PT12M<\/ExecutionTimeLimit>/);
 assert.match(planned.xml,/<LogonType>InteractiveToken<\/LogonType>/);
 assert.match(planned.xml,/<URI>\\ZGMINI-PC-Theme-AI-Semiconductor<\/URI>/);
 assert.match(planned.xml,/ai-semiconductor --publish/);
 assert.ok(!planned.xml.includes('<Arguments>original-seven.mjs</Arguments>'));
 assert.equal(verifyExistingAiTask({triggers:template.match(/<Triggers>[\s\S]*?<\/Triggers>/)[0],
  principals:template.match(/<Principals>[\s\S]*?<\/Principals>/)[0],settings:template.match(/<Settings>[\s\S]*?<\/Settings>/)[0],
  actions:planned.xml.match(/<Actions[^>]*>[\s\S]*?<\/Actions>/)[0]},planned.xml,{runner}),true);
});

test('AI mirror rejects changed scheduler conditions and paths',()=>{
 assert.throws(()=>planAiTaskMirror(template,{runner:'C:\\unapproved.cmd',workdir}),/AI_RELEASE_RUNNER_PATH_INVALID/);
 assert.throws(()=>planAiTaskMirror(template,{runner,workdir:'E:\\elsewhere'}),/AI_RELEASE_WORKDIR_INVALID/);
 assert.throws(()=>planAiTaskMirror(template.replace('<RunOnlyIfNetworkAvailable>true','<Enabled>false</Enabled><RunOnlyIfNetworkAvailable>true'),{runner,workdir}),/SEVEN_THEME_TASK_DISABLED/);
 const p=planAiTaskMirror(template,{runner,workdir});
 const drifted=p.xml.replace('<DaysInterval>1','<DaysInterval>2');
 assert.throws(()=>verifyExistingAiTask({triggers:template.match(/<Triggers>[\s\S]*?<\/Triggers>/)[0],
  principals:template.match(/<Principals>[\s\S]*?<\/Principals>/)[0],settings:template.match(/<Settings>[\s\S]*?<\/Settings>/)[0],
  actions:p.xml.match(/<Actions[^>]*>[\s\S]*?<\/Actions>/)[0]},drifted,{runner}),/AI_EXISTING_TRIGGERS_DRIFT/);
 const injected=p.xml.replace('ai-semiconductor --publish','ai-semiconductor --publish & unrelated');
 assert.throws(()=>verifyExistingAiTask({triggers:template.match(/<Triggers>[\s\S]*?<\/Triggers>/)[0],
  principals:template.match(/<Principals>[\s\S]*?<\/Principals>/)[0],settings:template.match(/<Settings>[\s\S]*?<\/Settings>/)[0],
  actions:p.xml.match(/<Actions[^>]*>[\s\S]*?<\/Actions>/)[0]},injected,{runner}),/AI_EXISTING_ACTIONS_DRIFT/);
});

test('scheduler apply requires a fresh public verified AI cycle',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-ai-task-gate-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const dir=path.join(root,'themes','ai-semiconductor','state');fs.mkdirSync(dir,{recursive:true});
 const now=Date.parse('2026-10-24T08:00:00Z');
 assert.throws(()=>verifiedPublication(root,now),/AI_PRIVATE_AND_PUBLIC_RUN_REQUIRED/);
 const file=path.join(dir,'cycle-last.json');
 const result={themeId:'ai-semiconductor',status:'CANDIDATE_VERIFIED_NOT_PUBLISHED',publicVerified:false,d1Writes:0,recordedAt:new Date(now).toISOString()};
 fs.writeFileSync(file,JSON.stringify(result));
 assert.throws(()=>verifiedPublication(root,now),/AI_PUBLIC_VERIFICATION_REQUIRED/);
 Object.assign(result,{status:'PUBLIC_VERIFIED',publicVerified:true,d1Writes:1});
 fs.writeFileSync(file,JSON.stringify(result));
 assert.equal(verifiedPublication(root,now),true);
 result.recordedAt=new Date(now-37*3600*1000).toISOString();fs.writeFileSync(file,JSON.stringify(result));
 assert.throws(()=>verifiedPublication(root,now),/AI_PUBLIC_VERIFICATION_STALE/);
});
