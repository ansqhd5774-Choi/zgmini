import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseR70KoreanRunTime,summarizeR70Evidence,compareR70LogsToTasks} from
  '../scripts/pc-writer/theme-nine-r70-cycle-correlation-readonly.mjs';

test('Korean local scheduled time is safely converted to UTC',()=>{
  assert.equal(parseR70KoreanRunTime('2026-10-29-목 오전 11:44:50'),'2026-10-29T02:44:50.000Z');
  assert.equal(parseR70KoreanRunTime('2026-10-29-목 오후 1:30:01'),'2026-10-29T04:30:01.000Z');
  assert.equal(parseR70KoreanRunTime('2026-10-29-목 오후 13:30:01'),null);
});

test('only approved date, number, status tokens leave raw logs',()=>{
  const data='REPORT=PRIVATE\n"benchmarkDate":"2026-10-27"\n'+
    '"providerCalls":16,"d1Writes":0,"secret":"dont-emit"\n'+
    '"status":"WAIT_WINDOW_ALREADY_CHECKED"\nRESULT=EXECUTED_CHECK_JSON_STATUS\n';
  const result=summarizeR70Evidence(data);
  assert.equal(result.dates.benchmarkDate,'2026-10-27');
  assert.equal(result.numbers.providerCalls,16);
  assert.ok(result.statuses.includes('WAIT_WINDOW_ALREADY_CHECKED'));
  assert.equal(result.cmdResult,'EXECUTED_CHECK_JSON_STATUS');
  assert.equal(JSON.stringify(result).includes('dont-emit'),false);
});

test('existing Windows 29 October private log mismatch exposed without declaring failure cause',()=>{
  const tasks=[{task:'ZGMINI-PC-Theme-Nine-R47-Private',verbose:{
    lastRun:'2026-10-29-목 오전 11:44:50',lastResult:null}}];
  const logs={R48:{logs:[{modifiedAt:'2026-10-28T17:16:15.465Z'}]},
    R47:{logs:[{modifiedAt:'2026-10-28T17:16:12.465Z'}]}};
  const result=compareR70LogsToTasks(tasks,logs)[0];
  assert.equal(result.lastLogConsistentWithRun,false);
  assert.equal(result.minutesLogAfterRun,-569);
  assert.equal(result.lastResult,null);
});

test('public log within same minute is consistent but not proof of publication',()=>{
  const tasks=[{task:'ZGMINI-PC-Theme-Nine-R54-Public',verbose:{
    lastRun:'2026-10-29-목 오후 1:30:01',lastResult:'0'}}];
  const logs={R54:{logs:[{modifiedAt:'2026-10-29T04:30:19.561Z'}]}};
  const result=compareR70LogsToTasks(tasks,logs)[0];
  assert.equal(result.lastLogConsistentWithRun,true);
  assert.equal(result.minutesLogAfterRun,0);
});
