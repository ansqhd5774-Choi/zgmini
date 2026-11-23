import test from 'node:test';
import assert from 'node:assert/strict';
import {earningsProjectionReason,earningsInfoStatus} from '../lib/earnings-info-projection-status-r1.mjs';

test('W06 BEA and QFR only: exact HTTP 503 reasons remain distinct and unknown input is not exposed',()=>{
 const statuses=[
  ['STORED_PROJECTION_PENDING','게시 대기'],
  ['SOURCE_RETRIEVAL_EXPIRED','자료 갱신 지연'],
  ['OBSERVATION_EXPIRED','자료 갱신 지연'],
  ['PROJECTION_READ_UNAVAILABLE','조회 불가'],
  ['STORED_PROJECTION_INVALID','자료 오류'],
  ['FUTURE_SOURCE_OR_PERIOD','자료 시각 오류'],
 ];
 for(const [reason,label] of statuses){
  assert.equal(earningsProjectionReason(reason),reason);
  assert.equal(earningsInfoStatus({error:reason}),label);
 }
 assert.equal(earningsProjectionReason('AUTH_SECRET_NOT_FOR_UI'),'UPDATE_FAILED');
 assert.equal(earningsInfoStatus({error:'AUTH_SECRET_NOT_FOR_UI'}),'자료 조회 실패');
 assert.equal(earningsProjectionReason(null),'UPDATE_FAILED');
});

test('retained last valid 200 is explicitly distinguished from pending, unavailable and invalid refresh',()=>{
 for(const [reason,label] of [
  ['STORED_PROJECTION_PENDING','게시 대기'],
  ['PROJECTION_READ_UNAVAILABLE','조회 불가'],
  ['STORED_PROJECTION_INVALID','자료 오류'],
 ]){
  assert.equal(earningsInfoStatus({ready:true,error:reason}),'이전 유효자료 유지 · '+label);
 }
 // Any later verified 200 clears error in the existing stored-index hook.
 assert.equal(earningsInfoStatus({ready:true,error:null}),'연결 완료');
});

test('expired results must not look like restored success; missing and invalid are distinct',()=>{
 assert.equal(earningsInfoStatus({loading:true}),'연결 확인 중');
 assert.equal(earningsInfoStatus({error:'SOURCE_RETRIEVAL_EXPIRED',ready:false}),'자료 갱신 지연');
 assert.equal(earningsInfoStatus({error:'OBSERVATION_EXPIRED',ready:false}),'자료 갱신 지연');
 assert.equal(earningsInfoStatus({hasPayload:true,ready:false}),'자료 형식 확인 필요');
 assert.equal(earningsInfoStatus({hasPayload:false,ready:false}),'게시 대기');
 assert.equal(earningsInfoStatus({ready:true,loading:true}),'연결 완료');
});
