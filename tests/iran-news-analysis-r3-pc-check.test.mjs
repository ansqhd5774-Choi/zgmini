import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyR3Preview,verifyR3PublisherLog}
 from '../scripts/iran-progress/news-analysis-r3-pc-check.mjs';

const first={id:'a',analysisStatus:'READY',keyPointKo:'이란에 관한 공식 발표가 있었습니다.',
 keyFactsKo:['공식 자료 첫째.','공식 자료 둘째.']};
const second={...first,id:'b'};

test('R3 preview requires every previously ready article and a grounded R2 shape',()=>{
 const before={items:[first]};
 const after={publishedAt:1793280000000,items:[first,second],pending:[{id:'c'}]};
 assert.deepEqual(verifyR3Preview(before,after),{status:'R3_PREVIEW_VALID',
  oldReady:1,newReady:2,newPending:1,newlyAnalyzed:1});
 assert.throws(()=>verifyR3Preview(before,{...after,items:[second]}),
  /R3_PREVIEW_FAILED_TO_PRESERVE_READY/);
 assert.throws(()=>verifyR3Preview(before,{...after,items:[first,{...second,keyFactsKo:[]}]}),
  /R3_PREVIEW_FAILED_TO_PRESERVE_READY/);
});

test('R3 D1 result accepts only verified readback or unchanged, never remote-newer',()=>{
 assert.equal(verifyR3PublisherLog('{"status":"VERIFIED","itemCount":2}',1).ready,2);
 assert.equal(verifyR3PublisherLog('{"status":"UNCHANGED","itemCount":2}',1).ready,2);
 assert.throws(()=>verifyR3PublisherLog('{"status":"REMOTE_NEWER_PRESERVED"}',1),
  /R3_D1_READBACK_NOT_VERIFIED/);
 assert.throws(()=>verifyR3PublisherLog('{"status":"VERIFIED","itemCount":0}',1),
  /R3_D1_READBACK_NOT_VERIFIED/);
});
