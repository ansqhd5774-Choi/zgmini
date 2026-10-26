import test from 'node:test';
import assert from 'node:assert/strict';
import {csvFirstRow,parseTaskLocalDate,evaluateR8Timing} from '../scripts/iran-progress/news-display-scheduled-verify-r8.mjs';

test('R8 parses CSV with quoted commas and Korean scheduler timestamp',()=>{
 const row=csvFirstRow('"DESKTOP","\\ZGMINI-PC-Iran-Progress-R13","Next","Ready","Logon","2026-10-27 오후 6:00:00","0","Author, Test"\r\n');
 assert.equal(row.length,8);
 assert.equal(row[7],'Author, Test');
 assert.equal(parseTaskLocalDate(row[5]),Date.parse('2026-10-27T09:00:00Z'));
});

test('R8 parses alternate English date format without the host timezone',()=>{
 assert.equal(parseTaskLocalDate('10/27/2026 6:00:00 PM'),Date.parse('2026-10-27T09:00:00Z'));
 assert.equal(parseTaskLocalDate('2026-10-27 18:00:00'),Date.parse('2026-10-27T09:00:00Z'));
 assert.equal(parseTaskLocalDate('N/A'),null);
 assert.equal(parseTaskLocalDate('2026-02-30 18:00:00'),null);
});

test('R8 differentiates installed, pending, successful scheduled refresh, and failed task',()=>{
 const install=Date.parse('2026-10-27T08:00:00Z');
 const run=Date.parse('2026-10-27T09:00:00Z');
 const refresh=Date.parse('2026-10-27T09:03:00Z');
 const now=Date.parse('2026-10-27T10:00:00Z');
 const check=overrides=>evaluateR8Timing({runnerMtimeMs:install,cacheUpdatedAt:refresh,lastRunMs:run,lastResult:0,now,...overrides});
 assert.equal(check({}).status,'PASS_R8_NEXT_NORMAL_R13_NEWS_CACHE_REFRESH');
 assert.equal(check({cacheUpdatedAt:install-1000}).status,'PENDING_R8_NEXT_NORMAL_SCHEDULE');
 assert.equal(check({lastRunMs:install-1000}).status,'PENDING_R8_NEXT_NORMAL_SCHEDULE');
 assert.equal(check({lastResult:1}).status,'NEEDS_REVIEW_R8_R13_RESULT');
 assert.equal(check({cacheUpdatedAt:run-120000}).status,'NEEDS_REVIEW_R8_CACHE_RUN_MISMATCH');
 assert.equal(check({lastRunMs:null}).status,'NEEDS_REVIEW_R8_TASK_LAST_RUN_UNPARSEABLE');
});
