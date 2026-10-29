import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {diagnoseAndApply,safeWindowsCommandMessage} from
  '../scripts/pc-writer/theme-nine-r73-native-error-and-apply.mjs';

function fakeTaskXml(root,command){
  return '<?xml version="1.0"?>'+
    '<Task xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">'+
    '<Triggers><CalendarTrigger><StartBoundary>2026-10-29T11:30:00</StartBoundary>'+
    '<ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay>'+
    '</CalendarTrigger></Triggers>'+
    '<Principals><Principal id="Author"/></Principals>'+
    '<Settings><Enabled>true</Enabled></Settings>'+
    `<Actions><Exec><Command>${path.win32.join(root,command)}`+
    '</Command></Exec></Actions></Task>';
}

function withTempRoot(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'r73-native-task-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  for(const name of ['THEME_NINE_R73_SCHEDULED_PRIVATE.cmd',
    'THEME_NINE_R73_AUTO_HTTP502_PRIVATE.cmd'])
    fs.writeFileSync(path.join(root,name),'@echo off\n');
  return root;
}

test('R73 native diagnostic changes only known original task and reads back',t=>{
  const root=withTempRoot(t);
  let action='THEME_NINE_R48_PRIVATE_CYCLE.cmd',changed=0;
  const run=(_program,args)=>{
    if(args[0]==='/Query')return {status:0,stdout:Buffer.from(fakeTaskXml(root,action))};
    if(args[0]==='/Change'){
      changed++;
      assert.equal(args[2],'ZGMINI-PC-Theme-Nine-R47-Private');
      action='THEME_NINE_R73_SCHEDULED_PRIVATE.cmd';
      return {status:0,stdout:Buffer.from('SUCCESS')};
    }
    throw Error('Unexpected external command');
  };
  const out=diagnoseAndApply({root,platform:'win32',run,exists:p=>
    p.endsWith('delta.lock')?false:fs.existsSync(p)});
  assert.equal(out.status,'R73_TASK_ACTION_VERIFIED');
  assert.equal(out.taskChangedByThisRun,true);
  assert.equal(changed,1);
  assert.match(out.nativeMessage,/SUCCESS/);
});

test('R73 reports the actual native scheduler denial without disguising exit 1',t=>{
  const root=withTempRoot(t);
  const run=(_program,args)=>args[0]==='/Query'?{
    status:0,stdout:Buffer.from(fakeTaskXml(root,'THEME_NINE_R48_PRIVATE_CYCLE.cmd'))
  }:{status:1,stdout:Buffer.from('ERROR: Access is denied.')};
  const out=diagnoseAndApply({root,platform:'win32',run,exists:p=>
    p.endsWith('delta.lock')?false:fs.existsSync(p)});
  assert.equal(out.status,'STOP_R73_TASK_NOT_UPDATED');
  assert.equal(out.nativeChangeExitCode,1);
  assert.match(out.nativeMessage,/Access is denied/);
  assert.equal(out.taskChangedByThisRun,false);
});

test('R73 native error log redacts absolute paths and account names',()=>{
  const result=safeWindowsCommandMessage({status:1,
    stderr:Buffer.from('ERROR E:\\Private\\folder and DOMAIN\\User denied')});
  assert.ok(!result.includes('E:\\Private'));
  assert.ok(!result.includes('DOMAIN\\User'));
  assert.match(result,/denied/);
});
