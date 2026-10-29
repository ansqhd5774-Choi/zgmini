import {test} from 'node:test';
import assert from 'node:assert/strict';
import {auditR73ExistingTaskXml} from
  '../scripts/pc-writer/theme-nine-r73-install-private-auto.mjs';

const root='E:/ZGmini/data/pc-writer/theme-nine-r48';
const xml=(cmd,at='T11:30:00')=>
  '<?xml version="1.0"?>'+
  '<Task xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">'+
  `<Triggers><CalendarTrigger><StartBoundary>2026-10-28${at}</StartBoundary>`+
  '<ScheduleByDay><DaysInterval>1</DaysInterval></ScheduleByDay>'+ 
  '</CalendarTrigger></Triggers>'+
  `<Actions><Exec><Command>cmd.exe</Command><Arguments>/d /c &quot;&quot;`+
  `E:\\ZGmini\\data\\pc-writer\\theme-nine-r48\\${cmd}`+
  '&quot;&quot;</Arguments></Exec></Actions></Task>';

test('R73 audits only exact existing 11:30 R48 task action',()=>{
  assert.equal(auditR73ExistingTaskXml(xml('THEME_NINE_R48_PRIVATE_CYCLE.cmd'),
    {target:root}).status,'EXACT_R48');
  assert.equal(auditR73ExistingTaskXml(xml('THEME_NINE_R73_SCHEDULED_PRIVATE.cmd'),
    {target:root}).status,'ALREADY_R73');
});

test('R73 installer blocks unknown task action and trigger drift',()=>{
  assert.throws(()=>auditR73ExistingTaskXml(xml('UNKNOWN.cmd'),{target:root}),
    {code:'R73_UNEXPECTED_TASK_ACTION'});
  assert.throws(()=>auditR73ExistingTaskXml(xml('THEME_NINE_R48_PRIVATE_CYCLE.cmd',
    'T12:30:00'),{target:root}),{code:'R73_UNEXPECTED_TASK_TRIGGER'});
});
