import test from 'node:test';
import assert from 'node:assert/strict';
import {taskXmlSummary} from '../scripts/pc-writer/theme-ten-r76-runtime-gate.mjs';

test('task enabled is three-state, not falsely disabled when omitted',()=>{
 const xml='<Task><Triggers><CalendarTrigger><StartBoundary>2026-10-29</StartBoundary></CalendarTrigger></Triggers><Actions><Exec /></Actions><Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy></Settings></Task>';
 assert.deepEqual(taskXmlSummary(xml),{settingsEnabled:'UNSPECIFIED',
  triggers:[{enabled:'UNSPECIFIED'}],hasExec:true,xmlParsed:true});
});

test('explicit disabled trigger and task are separately represented',()=>{
 const xml='<Task><Triggers><CalendarTrigger><Enabled>false</Enabled></CalendarTrigger></Triggers><Actions><Exec /></Actions><Settings><Enabled>true</Enabled></Settings></Task>';
 assert.deepEqual(taskXmlSummary(xml),{settingsEnabled:'true',
  triggers:[{enabled:'false'}],hasExec:true,xmlParsed:true});
});
