import test from 'node:test';
import assert from 'node:assert/strict';
import {checkTreasuryTawsPcReceipt} from '../lib/market-calendar-taws-pc-receipt.mjs';

const src='a'.repeat(40),digest='b'.repeat(64);
const expected={requestId:'pc-read-calendar-r62-only-once',jobId:'run-123456789-1-seat-3',
 controlSourceSha:src,expectedToDate:'2026-11-09'};
const receipt=()=>({schema:'ZGMINI_PC_RESULT_V1',jobId:expected.jobId,
 requestId:expected.requestId,controlRepository:'ansqhd5774-Choi/zgmini-pc-control',
 controlSourceSha:src,actualExecutionSha:src,operation:'source-inventory-runtime-readonly',
 seat:3,status:'PASS',code:'SOURCE_INVENTORY_STORED_READONLY',exitCode:0,
 lastPass:'ALLOWLISTED_OPERATION_COMPLETED',firstFail:null,protectedStateUnchanged:true,
 protectedBeforeSha256:digest,protectedAfterSha256:digest,providerCalls:0,d1Writes:0,operationalWrites:0,
 result:{status:'PASS',code:'SOURCE_INVENTORY_STORED_READONLY',sqliteOpened:true,
  providerCalls:0,d1Writes:0,operationalWrites:0,
  core:{status:'PASS',sqliteOpened:true,treasuryTawsInput:{status:'OBSERVED',
   storedAt:1794255759536,fromDate:'2025-11-10',toDate:'2026-11-09',rawRowCount:500,
   storedAwardedCount:436,eligibleAwardedRows:436,eligibleCountMatchesStored:true,
   textBytes:130000,textSha256:digest,scope:'ELIGIBLE_RESULT_COUNT_NOT_FULL_PARSER_REVALIDATION'}}}});
const txt=r=>['schema','jobId','requestId','controlRepository','controlSourceSha','operation','seat',
 'status','code','lastPass','firstFail','actualExecutionSha','protectedStateUnchanged',
 'protectedBeforeSha256','protectedAfterSha256','providerCalls','d1Writes','operationalWrites',
 'exitCode'].map(k=>k+'='+String(r[k])).join('\r\n')+'\r\n';

test('matching Runner JSON/TXT and independent checkpoint return metadata-only, never final completion',()=>{
 const r=receipt(),v=checkTreasuryTawsPcReceipt(r,txt(r),expected);
 assert.equal(v.status,'METADATA_PASS');
 assert.equal(v.receiptVerified,true);
 assert.equal(v.readyForFinalCompletion,false);
 assert.doesNotMatch(JSON.stringify(v),/textSha256|rawRowCount|secret/);
});
test('wrong operation, issue request and run seat are rejected',()=>{
 for(const field of ['operation','requestId','seat']){
  const r=receipt();r[field]=field==='seat'?4:'wrong';
  assert.equal(checkTreasuryTawsPcReceipt(r,txt(r),expected).code,'PC_JOB_IDENTITY_OR_STATUS_MISMATCH');
 }
});
test('GitHub source SHA differs from actual PC installed SHA: fail closed',()=>{
 const r=receipt();r.actualExecutionSha='c'.repeat(40);
 assert.equal(checkTreasuryTawsPcReceipt(r,txt(r),expected).code,'PC_INSTALLED_SHA_UNVERIFIED');
});
test('mismatched TXT status, missing field and duplicate key are rejected',()=>{
 const r=receipt();
 for(const bad of [txt(r).replace('status=PASS','status=BLOCKED'),txt(r).replace('code=SOURCE_INVENTORY_STORED_READONLY\r\n',''),txt(r)+'jobId=duplicate\n'])
  assert.equal(checkTreasuryTawsPcReceipt(r,bad,expected).code,'PC_JSON_TXT_PAIR_UNVERIFIED');
});
test('write or modified protected hash is never accepted',()=>{
 const r=receipt();r.operationalWrites=1;
 assert.equal(checkTreasuryTawsPcReceipt(r,txt(r),expected).code,'PC_PROTECTION_OR_READONLY_UNVERIFIED');
 const q=receipt();q.protectedAfterSha256='c'.repeat(64);
 assert.equal(checkTreasuryTawsPcReceipt(q,txt(q),expected).code,'PC_PROTECTION_OR_READONLY_UNVERIFIED');
});
test('PC PASS with missing TA_WS raw input does not become audit success',()=>{
 const r=receipt();r.result.core.treasuryTawsInput={status:'NOT_STORED'};
 const v=checkTreasuryTawsPcReceipt(r,txt(r),expected);
 assert.equal(v.receiptVerified,true);
 assert.equal(v.code,'TAWS_NOT_STORED');
 assert.equal(v.readyForFinalCompletion,false);
});
test('wrong or missing independently certified date prevents metadata success',()=>{
 const r=receipt();
 assert.equal(checkTreasuryTawsPcReceipt(r,txt(r),{...expected,expectedToDate:undefined}).code,
  'COLLECTION_CHECKPOINT_DATE_UNVERIFIED');
 assert.equal(checkTreasuryTawsPcReceipt(r,txt(r),{...expected,expectedToDate:'2026-11-10'}).code,
  'COLLECTION_CHECKPOINT_DATE_UNVERIFIED');
});
test('untrusted result cannot forge PASS and no private contents are echoed',()=>{
 const r=receipt();r.result.status='STATE_UNKNOWN';r.result.privateData='SECRET_CUSIP';
 const v=checkTreasuryTawsPcReceipt(r,txt(r),expected);
 assert.equal(v.code,'READER_OR_SQLITE_NOT_PASS');
 assert.doesNotMatch(JSON.stringify(v),/SECRET_CUSIP/);
});
