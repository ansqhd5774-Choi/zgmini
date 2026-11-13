import test from 'node:test';
import assert from 'node:assert/strict';
import {judgeTreasuryTaws365Audit} from '../lib/market-calendar-taws-audit-verdict.mjs';

const date='2026-11-09';
function validReader(){
 return {status:'PASS',code:'SOURCE_INVENTORY_STORED_READONLY',sqliteOpened:true,
  providerCalls:0,d1Writes:0,operationalWrites:0,
  core:{status:'PASS',sqliteOpened:true,treasuryTawsInput:{
   status:'OBSERVED',storedAt:1794255759536,fromDate:'2025-11-10',toDate:date,
   rawRowCount:500,storedAwardedCount:436,eligibleAwardedRows:436,
   eligibleCountMatchesStored:true,textBytes:130000,textSha256:'a'.repeat(64),
   scope:'ELIGIBLE_RESULT_COUNT_NOT_FULL_PARSER_REVALIDATION'}}};
}
const verdict=(r,o={expectedToDate:date})=>judgeTreasuryTaws365Audit(r,o);

test('valid reader metadata never claims complete 365-day publication or duplicate audit',()=>{
 const v=verdict(validReader());
 assert.equal(v.status,'METADATA_PASS');
 assert.equal(v.readyForFinalCompletion,false);
 assert.equal(v.rawDuplicateAudit,'NOT_PROVIDED_BY_READER');
 assert.doesNotMatch(JSON.stringify(v),/CUSIP|rawRow|textSha256/);
});
test('NOT_STORED and missing input do not become zero-count success',()=>{
 for(const input of [{status:'NOT_STORED'},null]){
  const r=validReader();r.core.treasuryTawsInput=input;
  assert.equal(verdict(r).code,'TAWS_NOT_STORED');
 }
});
test('unreadable and unexpected input status are fail-closed',()=>{
 for(const input of [{status:'UNREADABLE_OR_INVALID'}, {status:'STATE_UNKNOWN'}]){
  const r=validReader();r.core.treasuryTawsInput=input;
  assert.equal(verdict(r).code,'TAWS_UNREADABLE_OR_UNKNOWN');
 }
});
test('WAL / SQLite unknown cannot pass even if a stale nested item is present',()=>{
 const r=validReader();r.status='STATE_UNKNOWN';r.core={status:'STATE_UNKNOWN',code:'WAL_SIDECARS_ABSENT_UNVERIFIED',sqliteOpened:false,treasuryTawsInput:r.core.treasuryTawsInput};
 assert.equal(verdict(r).code,'READER_OR_SQLITE_NOT_PASS');
});
test('one day, 364 days, or 366 days do not count as exact inclusive 365-day coverage',()=>{
 for(const start of ['2026-11-09','2025-11-11','2025-11-09']){
  const r=validReader();r.core.treasuryTawsInput.fromDate=start;
  assert.equal(verdict(r).code,'TAWS_WINDOW_NOT_EXACT_365_DAYS',start);
 }
});
test('nonexistent calendar dates are rejected',()=>{
 const r=validReader();r.core.treasuryTawsInput.fromDate='2025-02-30';
 assert.equal(verdict(r).code,'TAWS_DATES_INVALID');
});
test('checkpoint date must be supplied independently and match stored toDate',()=>{
 assert.equal(verdict(validReader(),{}).code,'COLLECTION_CHECKPOINT_DATE_UNVERIFIED');
 assert.equal(verdict(validReader(),{expectedToDate:'2026-11-10'}).code,'COLLECTION_CHECKPOINT_DATE_UNVERIFIED');
});
test('mismatched count is rejected despite OBSERVED status',()=>{
 const r=validReader();r.core.treasuryTawsInput.eligibleCountMatchesStored=false;
 assert.equal(verdict(r).code,'TAWS_AWARDED_COUNT_MISMATCH');
 const q=validReader();q.core.treasuryTawsInput.eligibleAwardedRows--;
 assert.equal(verdict(q).code,'TAWS_AWARDED_COUNT_MISMATCH');
});
test('invalid metadata and zero timestamps do not pass',()=>{
 const r=validReader();r.core.treasuryTawsInput.storedAt=null;
 assert.equal(verdict(r).code,'TAWS_COUNTS_OR_TIMESTAMP_INVALID');
 const q=validReader();q.core.treasuryTawsInput.eligibleAwardedRows=501;
 assert.equal(verdict(q).code,'TAWS_COUNTS_OR_TIMESTAMP_INVALID');
});
test('digest and independently bounded scope must both be valid',()=>{
 const r=validReader();r.core.treasuryTawsInput.textSha256='not-a-sha';
 assert.equal(verdict(r).code,'TAWS_DIGEST_OR_SCOPE_UNVERIFIED');
 const q=validReader();q.core.treasuryTawsInput.scope='FULL_PARSER_REVALIDATION';
 assert.equal(verdict(q).code,'TAWS_DIGEST_OR_SCOPE_UNVERIFIED');
});
test('read-only mutation indicators fail closed',()=>{
 const r=validReader();r.operationalWrites=1;
 assert.equal(verdict(r).code,'READ_ONLY_GUARD_NOT_VERIFIED');
});
test('global PASS is mandatory even with otherwise valid nested source metadata',()=>{
 const r=validReader();r.status='STATE_UNKNOWN';
 assert.equal(verdict(r).code,'READER_OR_SQLITE_NOT_PASS');
});
