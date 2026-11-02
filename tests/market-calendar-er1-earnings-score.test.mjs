import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreER1Issuers, ER1_METHOD, ER1_STAR3_THRESHOLD} from
  '../lib/market-calendar-er1-earnings-score.mjs';

const days=['2025-10-30','2026-01-29','2026-04-30','2026-07-30'];
const row=(id, revenues=[100,100,100,100], eps=[1,1,1,1])=>({
  eligible:true, issuerId:id, tickers:[id], earningsSymbol:id,
  releases:days.map((date,i)=>({date,symbol:id,revenue:revenues[i],eps:eps[i]})),
});
const run=(rows,expectedEligibleIssuers=rows.length)=>scoreER1Issuers(rows,{
  asOf:'2026-11-02',expectedEligibleIssuers,
});

test('ER1 fixed 97 threshold uses cross-sectional revenue percentiles, never forces 5%',()=>{
  const rows=Array.from({length:100},(_,i)=>row(`T${i+1}`,Array(4).fill(i+1)));
  const result=run(rows);
  assert.equal(result.method,ER1_METHOD);
  assert.equal(result.threshold,ER1_STAR3_THRESHOLD);
  assert.equal(result.star3Count,5);
  assert.deepEqual(result.rankings.slice(0,5).map(r=>r.issuerId),
    ['T100','T99','T98','T97','T96']);
  const lossRows=rows.map(r=>r.issuerId==='T100'?row('T100',[100,100,100,100],[-1,-1,-1,-1]):r);
  const lossResult=run(lossRows);
  assert.equal(lossResult.status,'READY_SHADOW');
  assert.equal(lossResult.star3Count,4);
  assert.ok(lossResult.rankings.find(r=>r.issuerId==='T100').score<97);
});

test('one missing release metric keeps company scoreable without a fake actual',()=>{
  const result=run([row('AAA',[100,null,120,140],[1,null,2,3])]);
  assert.equal(result.status,'READY_SHADOW');
  assert.equal(result.coverage.earnings,1);
  assert.equal(result.rankings[0].epsReleases,3);
  assert.equal(result.rankings[0].revenueReleases,3);
  assert.equal(result.rankings[0].score,70);
});

test('two missing release metrics use the two real values, including loss-making EPS',()=>{
  const result=run([row('AAA',[100,null,140,null],[-1,null,2,null])]);
  assert.equal(result.status,'READY_SHADOW');
  assert.equal(result.rankings[0].epsReleases,2);
  assert.equal(result.rankings[0].revenueReleases,2);
  assert.ok(Math.abs(result.rankings[0].score-(30+40*(.5*(1+.5/1.5))))<1e-10);
});

test('one actual EPS and one actual revenue are enough; four releases are not required',()=>{
  const one=run([row('AAA',[null,null,null,140],[null,null,null,2])]);
  assert.equal(one.status,'READY_SHADOW');
  assert.equal(one.rankings[0].epsReleases,1);
  assert.equal(one.rankings[0].revenueReleases,1);
  const onlyOneDated={...row('AAA'),releases:row('AAA').releases.slice(-1)};
  const sparse=run([onlyOneDated]);
  assert.equal(sparse.status,'READY_SHADOW');
  assert.equal(sparse.rankings[0].epsReleases,1);
  assert.equal(sparse.rankings[0].revenueReleases,1);
  assert.equal(sparse.rankings[0].score,70);
});

test('one metric absent in all reports is not filled by an estimate',()=>{
  const base=row('AAA',[null,null,null,null],[null,null,null,2]);
  base.releases[3].revenueEstimate=1e12;
  const result=run([base]);
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reason,'ER1_NO_SCOREABLE_ISSUERS');
  assert.equal(result.coverage.unscoreableReasons.ER1_METRIC_OBSERVATIONS_INSUFFICIENT,1);
  assert.deepEqual(result.rankings,[]);
});

test('zero is a real EPS or revenue observation; missing is only explicit null',()=>{
  const zero=run([row('AAA',[0,0,0,0],[0,0,0,0])]);
  assert.equal(zero.status,'READY_SHADOW');
  assert.equal(zero.rankings[0].score,50);
  assert.throws(()=>run([row('AAA',[100,100,100,undefined])]),/ER1_RELEASE_VALUE_INVALID/);
  assert.throws(()=>run([row('AAA',[100,100,100,-1])]),/ER1_RELEASE_VALUE_INVALID/);
});

test('a missing approved issuer or unverified eligibility cannot be hidden in ranking',()=>{
  const result=run([row('AAA')],2);
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reason,'ER1_APPROVED_UNIVERSE_INCOMPLETE');
  assert.throws(()=>run([{...row('AAA'),eligible:'PENDING'}]),/ER1_APPROVED_ISSUER_REQUIRED/);
  assert.throws(()=>run([row('AAA'),row('AAA')]),/ER1_APPROVED_ISSUER_REQUIRED/);
});

test('same-company share classes are not silently counted as independent issuers',()=>{
  const alphabet={...row('ALPHABET'),tickers:['GOOG','GOOGL'],
    earningsSymbol:'GOOG',releases:row('ALPHABET').releases.map(x=>({...x,symbol:'GOOG'}))};
  assert.equal(run([alphabet]).coverage.reviewedEligibleIssuers,1);
  assert.throws(()=>run([
    {...row('A'),tickers:['GOOG'],earningsSymbol:'GOOG',
      releases:row('A').releases.map(x=>({...x,symbol:'GOOG'}))},
    {...row('B'),tickers:['GOOGL'],earningsSymbol:'GOOGL',
      releases:row('B').releases.map(x=>({...x,symbol:'GOOGL'}))},
  ]),/ER1_SHARE_CLASS_SPLIT/);
});

test('one to three releases score; irregular, same-day and future dates are guarded',()=>{
  const input=row('AAA');
  const few=run([{...input,releases:input.releases.slice(1)}]);
  assert.equal(few.status,'READY_SHADOW');
  assert.equal(few.rankings[0].epsReleases,3);
  const future=run([{...input,releases:input.releases.map((q,i)=>i===0?
    {...q,date:'2026-12-31'}:q)}]);
  assert.equal(future.status,'READY_SHADOW');
  assert.equal(future.rankings[0].epsReleases,3);
  const irregular=run([{...input,releases:input.releases.map((q,i)=>i===0?
    {...q,date:'2025-01-01'}:q)}]);
  assert.equal(irregular.status,'BLOCKED');
  assert.equal(irregular.coverage.unscoreableReasons.ER1_RELEASE_SEQUENCE_INVALID,1);
  const onlyToday=run([{...input,releases:[{date:'2026-11-02',symbol:'AAA',eps:99,revenue:1e12}]}]);
  assert.equal(onlyToday.status,'BLOCKED');
  assert.equal(onlyToday.coverage.unscoreableReasons.ER1_RELEASE_HISTORY_INSUFFICIENT,1);
});

test('four internally valid announcements from years ago are stale',()=>{
  const stale=row('AAA');
  const oldDays=['2015-10-30','2016-01-29','2016-04-30','2016-07-30'];
  stale.releases=stale.releases.map((q,i)=>({...q,date:oldDays[i]}));
  const result=run([stale]);
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.coverage.unscoreableReasons.ER1_STALE_RELEASE_WINDOW,1);
});

test('missing actuals remain missing and cannot veto scored issuers of a reviewed universe',()=>{
  const rows=Array.from({length:100},(_,i)=>row(`T${i+1}`));
  for(let i=0;i<3;i++)rows[i]=row(`T${i+1}`,[null,null,null,null],[null,null,null,null]);
  const result=run(rows);
  assert.equal(result.coverage.earnings,.97);
  assert.equal(result.status,'READY_SHADOW');
  assert.equal(result.coverage.reviewedEligibleIssuers,100);
  assert.equal(result.rankings.length,97);
  assert.equal(result.star3Count,0);
});

test('838 saved actuals within 2634 completely reviewed issuers yield 838 rankings, 1796 missing',()=>{
  const reported=Array.from({length:838},(_,i)=>row(`A${i+1}`,[i+1,i+1,i+1,i+1]));
  const notReported=Array.from({length:2634-838},(_,i)=>({...row(`M${i+1}`),releases:[]}));
  const result=run([...reported,...notReported],2634);
  assert.equal(result.status,'READY_SHADOW');
  assert.equal(result.coverage.universe,1);
  assert.equal(result.coverage.scoreableIssuers,838);
  assert.equal(result.coverage.earnings,838/2634);
  assert.equal(result.coverage.unscoreableReasons.ER1_RELEASE_HISTORY_INSUFFICIENT,1796);
  assert.equal(result.rankings.length,838);
  assert.equal(result.star3Count,42);
  assert.equal(result.rankings.some(r=>r.issuerId==='M1'),false);
});

test('latest four completed dated records exclude fifth event and current-day estimate',()=>{
  const base=row('AAA');
  const older={date:'2025-07-30',symbol:'AAA',eps:999,revenue:999999};
  const today={date:'2026-11-02',symbol:'AAA',eps:100,revenue:1e12};
  const later={date:'2026-11-04',symbol:'AAA',eps:null,revenue:null,
    epsEstimate:5,revenueEstimate:1e12};
  const result=run([{...base,releases:[today,older,later,...base.releases.reverse()]}]);
  assert.equal(result.status,'READY_SHADOW');
  assert.equal(result.rankings[0].epsReleases,4);
  assert.equal(result.rankings[0].score,run([row('AAA')]).rankings[0].score);
});

test('a null-null past report remains a latest-four slot, never shifted to fifth',()=>{
  const base=row('AAA');
  const recent={date:'2026-10-29',symbol:'AAA',eps:null,revenue:null,
    epsEstimate:1e5,revenueEstimate:1e15};
  const reportSet=[recent,...base.releases];
  const result=run([{...base,releases:reportSet}]);
  assert.equal(result.status,'READY_SHADOW');
  assert.equal(result.rankings[0].epsReleases,3);
  assert.equal(result.rankings[0].revenueReleases,3);
  const missing=[recent,...base.releases.map((r,i)=>i===3?{
    ...r,eps:null,revenue:null}:r)];
  const two=run([{...base,releases:missing}]);
  assert.equal(two.rankings[0].epsReleases,2);
  assert.equal(two.rankings[0].revenueReleases,2);
});

test('duplicate identical release dates deduplicate; contradictory actuals fail closed',()=>{
  const base=row('AAA');
  const duplicate=[base.releases[0],...base.releases];
  assert.equal(run([{...base,releases:duplicate}]).status,'READY_SHADOW');
  const conflicting=[{...base.releases[0],eps:3},...base.releases];
  assert.throws(()=>run([{...base,releases:conflicting}]),/ER1_RELEASE_DUPLICATE_CONFLICT/);
});

test('actual field validation rejects estimates, unrecognized source, or quarterEnd alias',()=>{
  const base=row('AAA');
  assert.throws(()=>run([{...base,releases:base.releases.map((x,i)=>i===0?{
    ...x,eps:undefined}:x)}]),/ER1_RELEASE_VALUE_INVALID/);
  assert.throws(()=>run([{...base,releases:base.releases.map((x,i)=>i===0?{
    ...x,symbol:'OTHER'}:x)}]),/ER1_RELEASE_RECORD_INVALID/);
  assert.throws(()=>run([{...base,earningsSymbol:'OTHER'}]),/ER1_RELEASE_SOURCE_REQUIRED/);
  assert.throws(()=>run([{...base,releases:undefined,quarters:[]}]),/ER1_RELEASE_SOURCE_REQUIRED/);
});

test('2634 synthetic issuers: 97-point threshold, loss-maker and missing-data stress',()=>{
  const n=2634;
  const base=Array.from({length:n},(_,i)=>row(`S${i+1}`,[i+1,i+1,i+1,i+1]));
  const original=run(base);
  assert.equal(original.star3Count,132);
  const oneMissing=base.map(r=>({...r,releases:r.releases.map((x,i)=>i===1?
    {...x,eps:null,revenue:null}:x)}));
  const twoMissing=base.map(r=>({...r,releases:r.releases.map((x,i)=>i===1||i===2?
    {...x,eps:null,revenue:null}:x)}));
  const threeMissing=base.map(r=>({...r,releases:r.releases.slice(-1)}));
  for(const sample of [oneMissing,twoMissing,threeMissing]){
    const result=run(sample);
    assert.equal(result.status,'READY_SHADOW');
    assert.equal(result.star3Count,132);
    assert.equal(result.coverage.earnings,1);
  }
  const loss=base.map((r,i)=>i===n-1?row(`S${i+1}`,[n,n,n,n],[-1,-1,-1,-1]):r);
  assert.equal(run(loss).star3Count,131);
  const equal=base.map((r,i)=>row(`S${i+1}`));
  assert.equal(run(equal).star3Count,0);
});

test('the mandatory 98% approved-population gate cannot be weakened via options',()=>{
  assert.throws(()=>scoreER1Issuers([row('AAA')],{
    asOf:'2026-11-02',expectedEligibleIssuers:100,minCoverage:.2,
  }),/ER1_INPUT_CONFIG_INVALID/);
  const overflow=run([row('AAA'),row('BBB')],1);
  assert.equal(overflow.status,'BLOCKED');
  assert.equal(overflow.reason,'ER1_APPROVED_UNIVERSE_INCOMPLETE');
});
