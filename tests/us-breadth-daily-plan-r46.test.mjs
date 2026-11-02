import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {planUsBreadthDailySourceR46}
  from '../scripts/pc-writer/us-breadth-daily-plan-r46.mjs';

const ms=date=>Date.parse(date);
const checkpoint=(date,status='NOT_ATTEMPTED',attempts=0,lastAttemptAt=null)=>
  ({date,status,attempts,lastAttemptAt});
const verified={executionLane:'ISOLATED_NONBLOCKING_DAILY',
  approvedPcSourceVerified:true,coreTaskActionVerified:true};
const plan=(when,cp,options={})=>planUsBreadthDailySourceR46({
  now:ms(when),checkpoint:cp,...verified,...options});
const assertNoEffects=r=>{
  assert.equal(r.providerCalls,0);
  assert.equal(r.localWrites,0);
  assert.equal(r.d1Writes,0);
  assert.equal(r.coreTaskChanges,0);
  assert.equal(r.lockPidActions,0);
  assert.equal(r.sourceWriteAllowed,false);
  assert.equal(r.publicationAllowed,false);
};

test('R46 after Monday close proposes only R45 PLAN_ONLY with no I/O',()=>{
  const r=plan('2026-11-02T22:00:00Z',checkpoint('2026-11-02'));
  assert.equal(r.status,'LATEST_PAIR_MANIFEST_GET_MAY_BE_PROPOSED');
  assert.equal(r.latestCompletedDate,'2026-11-02');
  assert.equal(r.proposeProviderManifestGet,true);
  assert.equal(r.operation,'R45_PLAN_LATEST_PAIR_ONLY');
  assert.equal(r.collectionWindow,'DAILY_PAIR');
  assert.equal(r.nextAttempt,1);
  assertNoEffects(r);
});

test('R46 never proposes a provider call in NY IEX and safety buffers',()=>{
  for(const when of [
    '2026-11-02T14:00:00Z', // 09:00 EST, pre-open guard
    '2026-11-02T14:30:00Z', // 09:30 EST, open
    '2026-11-02T19:00:00Z', // 14:00 EST, intraday
    '2026-11-02T21:20:00Z', // 16:20 EST, post-close guard
    '2027-03-15T13:30:00Z', // 09:30 EDT, spring DST
    '2027-03-15T20:20:00Z', // 16:20 EDT
  ]){
    const r=plan(when,checkpoint(when.startsWith('2027')?'2027-03-15':'2026-11-02'));
    assert.equal(r.status,'IEX_PROTECTED_NY_WINDOW',when);
    assert.equal(r.proposeProviderManifestGet,false);
    assertNoEffects(r);
  }
  for(const [when,day] of [
    ['2026-11-02T21:31:00Z','2026-11-02'], // 16:31 EST
    ['2027-03-15T20:31:00Z','2027-03-15'], // 16:31 EDT
  ]){
    const r=plan(when,checkpoint(day));
    assert.equal(r.proposeProviderManifestGet,true,when);
    assertNoEffects(r);
  }
});

test('R46 weekend, DST rollback, early Monday and UTC rollover do not invent a new day',()=>{
  const friday=checkpoint('2026-10-30','COMPLETE',1,'2026-10-30T21:00:00.000Z');
  for(const when of [
    '2026-10-31T14:00:00Z', // Saturday
    '2026-11-01T20:00:00Z', // Sunday after DST rollback
    '2026-11-02T13:00:00Z', // Monday 08:00 EST before open
  ]){
    const r=plan(when,friday);
    assert.equal(r.latestCompletedDate,'2026-10-30');
    assert.equal(r.status,'ALREADY_COMPLETED_DATE');
    assertNoEffects(r);
  }
  const mon='2026-11-02T22:00:00Z';
  assert.equal(plan(mon,friday).status,'UNKNOWN_OR_MISMATCHED_CHECKPOINT_PRESERVED');
  assert.equal(plan(mon,checkpoint('2026-11-02')).nextAttempt,1);
  const night=plan('2026-11-03T03:00:00Z',checkpoint('2026-11-02'));
  assert.equal(night.latestCompletedDate,'2026-11-02',
    'UTC date rollover must not advance NY completed session');
  assert.equal(night.nextAttempt,1);
});

test('R46 retry failures and 429 use bounded exponential backoff, no 5-minute spin',()=>{
  const day='2026-11-02',t='2026-11-02T21:40:00.000Z';
  const failure=checkpoint(day,'RETRYABLE_FAILURE',1,t);
  const early=plan('2026-11-02T22:00:00Z',failure);
  assert.equal(early.status,'BOUNDED_BACKOFF_WAIT');
  assert.equal(early.nextEligibleAt,'2026-11-02T22:10:00.000Z');
  assert.equal(early.proposeProviderManifestGet,false);
  const ready=plan('2026-11-02T22:11:00Z',failure);
  assert.equal(ready.nextAttempt,2);
  assert.equal(ready.proposeProviderManifestGet,true);

  const limited=checkpoint(day,'RATE_LIMITED',1,t);
  const rateWait=plan('2026-11-02T22:11:00Z',limited);
  assert.equal(rateWait.status,'BOUNDED_BACKOFF_WAIT');
  assert.equal(rateWait.nextEligibleAt,'2026-11-02T22:40:00.000Z');
  assert.equal(plan('2026-11-02T22:41:00Z',limited).nextAttempt,2);
  const limitedAgain=checkpoint(day,'RATE_LIMITED',2,t);
  const wait2=plan('2026-11-02T22:41:00Z',limitedAgain);
  assert.equal(wait2.nextEligibleAt,'2026-11-02T23:40:00.000Z');
  assert.equal(wait2.proposeProviderManifestGet,false);
  assertNoEffects(wait2);
});

test('R46 stops on completed, in-progress, permanent and max attempts',()=>{
  const day='2026-11-02',stamp='2026-11-02T21:40:00.000Z';
  for(const [cp,expected] of [
    [checkpoint(day,'COMPLETE',1,stamp),'ALREADY_COMPLETED_DATE'],
    [checkpoint(day,'IN_PROGRESS',1,stamp),'IN_PROGRESS_NO_CONCURRENT_RETRY'],
    [checkpoint(day,'PERMANENT_FAILURE',1,stamp),'TERMINAL_FAILURE_PRESERVED'],
    [checkpoint(day,'RETRYABLE_FAILURE',3,stamp),'MAX_DAILY_ATTEMPTS_EXHAUSTED'],
    [checkpoint(day,'RATE_LIMITED',3,stamp),'MAX_DAILY_ATTEMPTS_EXHAUSTED'],
  ]){
    const r=plan('2026-11-02T22:30:00Z',cp);
    assert.equal(r.status,expected);
    assert.equal(r.proposeProviderManifestGet,false);
    assertNoEffects(r);
  }
});

test('R46 fails closed on unknown previous state, date mismatch and future checkpoint',()=>{
  const date='2026-11-02',stamp='2026-11-02T22:30:00.000Z';
  const unknown=[
    null,{},checkpoint('2026-10-30'),checkpoint('2026-11-03'),
    checkpoint(date,'BROKEN',1,stamp),checkpoint(date,'COMPLETE',0,null),
    checkpoint(date,'RETRYABLE_FAILURE',0,null),
    checkpoint(date,'NOT_ATTEMPTED',1,stamp),
    checkpoint(date,'RETRYABLE_FAILURE',1,'2026-11-02T23:00:00.000Z'),
    checkpoint(date,'RETRYABLE_FAILURE',4,stamp),
    {...checkpoint(date),unknown:'field'},
  ];
  for(const value of unknown){
    const r=plan('2026-11-02T22:40:00Z',value);
    assert.equal(r.status,'UNKNOWN_OR_MISMATCHED_CHECKPOINT_PRESERVED',JSON.stringify(value));
    assert.equal(r.proposeProviderManifestGet,false);
    assertNoEffects(r);
  }
});

test('R46 rejects Core hot path, ambiguous source/action and invalid time',()=>{
  const stamp=checkpoint('2026-11-02');
  for(const option of [
    {executionLane:'CORE_HOT_PATH'},
    {executionLane:'UNVERIFIED'},
    {executionLane:'ISOLATED_NONBLOCKING_DAILY',approvedPcSourceVerified:false},
    {executionLane:'ISOLATED_NONBLOCKING_DAILY',coreTaskActionVerified:false},
  ]){
    const r=plan('2026-11-02T22:00:00Z',stamp,option);
    assert.equal(r.proposeProviderManifestGet,false);
    assertNoEffects(r);
  }
  const bad=planUsBreadthDailySourceR46({now:Number.NaN,...verified,checkpoint:stamp});
  assert.equal(bad.status,'INVALID_NOW');
  assertNoEffects(bad);
});

test('R46 module has no network, disk write, scheduler or process imports',()=>{
  const source=fs.readFileSync(fileURLToPath(new URL(
    '../scripts/pc-writer/us-breadth-daily-plan-r46.mjs',import.meta.url)),'utf8');
  assert.doesNotMatch(source,/from ['"]node:(?:fs|child_process|http|https|net)['"]/);
  assert.doesNotMatch(source,/(?:fetch\(|writeFile|spawn\(|spawnSync|exec\(|schtasks|\.request\()/);
});
