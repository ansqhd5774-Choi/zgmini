import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateR16Schedule} from '../scripts/iran-progress/news-display-scheduled-verify-r16.mjs';

const install=Date.parse('2026-10-27T09:41:00.000Z');
const run=Date.parse('2026-10-27T15:00:00.000Z');
const news=Date.parse('2026-10-27T15:05:00.000Z');
const now=Date.parse('2026-10-27T16:30:00.000Z');
const statusRecord={version:'IRAN_NEWS_AUTO_R15',status:'PUBLISHED_D1_VERIFIED',
 completedAtKst:'2026-10-28 00:04:59',publicItemCount:10,newArticles:0,
 duplicatesPreserved:10,d1Publication:'UNCHANGED',scoreLedgerModified:false};
const cache={version:'IRAN_NEWS_PC_DISPLAY_R1',updatedAt:news,items:Array(10).fill({})};
const fixture={runnerMtimeMs:install,lastRunMs:run,lastResultCode:0,
 statusRecord,statusMtimeMs:news,cache,cacheMtimeMs:news,now};
const status=override=>evaluateR16Schedule({...fixture,...override});

test('R16 requires the normal R13 task AFTER the R15 install',()=>{
 assert.equal(status({lastRunMs:install-60000,statusRecord:null}).status,'PENDING_R16_NEXT_NORMAL_R13_RUN');
 assert.equal(status({lastRunMs:null}).status,'NEEDS_REVIEW_R16_TASK_TIME');
 assert.equal(status({lastRunMs:now+70000}).status,'NEEDS_REVIEW_R16_TASK_TIME');
});

test('R16 verifies the D1-verified output tied to the actual normal cycle',()=>{
 const report=status();
 assert.equal(report.status,'PASS_R16_NORMAL_R13_AUTO_NEWS_D1_VERIFIED');
 assert.equal(status({statusRecord:{...statusRecord,d1Publication:'VERIFIED'}}).status,
  'PASS_R16_NORMAL_R13_AUTO_NEWS_D1_VERIFIED');
 assert.equal(status({lastResultCode:0x41301}).status,'PENDING_R16_R13_TASK_FINISH');
 assert.equal(status({lastResultCode:1}).status,'NEEDS_REVIEW_R16_R13_SCORE_TASK');
});

test('R16 preserves pending while an ordinary new job is still running',()=>{
 assert.equal(status({statusRecord:null,now:run+5*60000}).status,'PENDING_R16_NEWS_STATUS');
 assert.equal(status({statusRecord:null}).status,'NEEDS_REVIEW_R16_NEWS_STATUS_MISSING');
 assert.equal(status({statusMtimeMs:install,now:run+5*60000}).status,'PENDING_R16_NEWS_STATUS');
 assert.equal(status({statusMtimeMs:install}).status,'NEEDS_REVIEW_R16_STALE_NEWS_STATUS');
});

test('R16 never treats a score-task success as proof of news D1 publication',()=>{
 const failed={...statusRecord,status:'FAILED_SCORE_UNAFFECTED',
  reason:'NEWS_AUTO_CONFIGURED_D1_TOKEN_EXPIRED_OR_UNAVAILABLE'};
 assert.deepEqual(status({statusRecord:failed}),{
  status:'NEEDS_REVIEW_R16_NEWS_AUTO_FAILED',reason:failed.reason});
 assert.equal(status({statusRecord:{...statusRecord,d1Publication:'NOT_VERIFIED'}}).status,
  'NEEDS_REVIEW_R16_NEWS_PUBLICATION');
 assert.equal(status({statusRecord:{...statusRecord,completedAtKst:'2026-10-27 16:00:00'}}).status,
  'NEEDS_REVIEW_R16_STATUS_RUN_MISMATCH');
 assert.equal(status({cache:{...cache,items:[]}}).status,'NEEDS_REVIEW_R16_PC_NEWS_CACHE');
 assert.equal(status({statusMtimeMs:run+4*3600000,now:run+5*3600000}).status,
  'NEEDS_REVIEW_R16_STATUS_RUN_MISMATCH');
});
