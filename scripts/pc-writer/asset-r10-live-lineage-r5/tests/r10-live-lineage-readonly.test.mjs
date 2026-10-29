import test from 'node:test';
import assert from 'node:assert/strict';
import {scriptRole,processLineage,routeAssessment} from '../r10-live-lineage-readonly.mjs';

test('R38 alone does not prove normal writer route',()=>{
 assert.equal(scriptRole('node ZGMINI_EARNINGS_R38_AUTO_DISPATCH.mjs'),'EARNINGS_R38');
 assert.equal(routeAssessment([{role:'EARNINGS_R38'}]),'NO_CYCLE_IN_LINEAGE');
});
test('live core VBS -> core --publish is observable, still not install authorization',()=>{
 const processes=[
  {ProcessId:3,ParentProcessId:2,Name:'node.exe',CommandLine:'node local-cycle.mjs --publish E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release'},
  {ProcessId:2,ParentProcessId:1,Name:'wscript.exe',CommandLine:'wscript.exe run-local-core.vbs'},
  {ProcessId:1,ParentProcessId:0,Name:'taskeng.exe',CommandLine:'taskeng.exe'},
 ];
 const chain=processLineage(processes,3);
 assert.equal(chain[0].role,'LOCAL_CYCLE');
 assert.equal(chain[0].publish,true);
 assert.equal(routeAssessment(chain),'CORE_VBS_TO_PUBLISH_CYCLE_OBSERVED');
});
test('korea lane and core with no publish are not a writer publish route',()=>{
 let p=[{ProcessId:4,ParentProcessId:0,Name:'node.exe',CommandLine:'node local-cycle.mjs --korea --publish'}];
 assert.equal(routeAssessment(processLineage(p,4)),'KOREA_LANE_NO_CORE_PUBLICATION');
 p=[{ProcessId:5,ParentProcessId:0,Name:'node.exe',CommandLine:'node local-cycle.mjs'}];
 assert.equal(routeAssessment(processLineage(p,5)),'CORE_LANE_WITHOUT_PUBLISH_FLAG');
});
test('does not falsely identify a direct writer as a cycle',()=>{
 const p=[{ProcessId:9,ParentProcessId:0,Name:'node.exe',CommandLine:'node run-local.mjs --publish'}];
 assert.equal(routeAssessment(processLineage(p,9)),'NO_CYCLE_IN_LINEAGE');
});
test('refuses a parent PID that Windows reused after the child started',()=>{
 const p=[
  {ProcessId:21,ParentProcessId:18,Name:'node.exe',CommandLine:'node local-cycle.mjs --publish',CreationDate:'2026-10-29T14:00:00Z'},
  {ProcessId:18,ParentProcessId:0,Name:'wscript.exe',CommandLine:'wscript.exe run-local-core.vbs',CreationDate:'2026-10-29T14:05:00Z'},
 ];
 assert.equal(processLineage(p,21).length,1);
 assert.equal(routeAssessment(processLineage(p,21)),'CORE_PUBLISH_CYCLE_PARENT_UNCONFIRMED');
});
