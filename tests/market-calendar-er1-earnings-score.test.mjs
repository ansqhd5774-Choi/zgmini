import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreER1Issuers, ER1_METHOD, ER1_STAR3_THRESHOLD} from
  '../lib/market-calendar-er1-earnings-score.mjs';

const days=['2025-12-31','2026-03-31','2026-06-30','2026-09-30'];
const row=(id, revenues=[100,100,100,100], eps=[1,1,1,1])=>({
  eligible:true, issuerId:id, tickers:[id],
  quarters:days.map((quarterEnd,i)=>({quarterEnd,revenue:revenues[i],eps:eps[i]})),
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

test('one missing quarter keeps company scoreable without generating a fake actual',()=>{
  const result=run([row('AAA',[100,null,120,140],[1,null,2,3])]);
  assert.equal(result.status,'READY_SHADOW');
  assert.equal(result.coverage.earnings,1);
  assert.equal(result.rankings[0].epsQuarters,3);
  assert.equal(result.rankings[0].revenueQuarters,3);
  assert.equal(result.rankings[0].score,70);
});

test('two missing quarters use the two real values, including loss-making EPS',()=>{
  const result=run([row('AAA',[100,null,140,null],[-1,null,2,null])]);
  assert.equal(result.status,'READY_SHADOW');
  assert.equal(result.rankings[0].epsQuarters,2);
  assert.equal(result.rankings[0].revenueQuarters,2);
  assert.ok(Math.abs(result.rankings[0].score-(30+40*(.5*(1+.5/1.5))))<1e-10);
});

test('one available quarter blocks publication and does not generate any grades',()=>{
  const result=run([row('AAA',[null,null,null,140],[null,null,null,2])]);
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reason,'ER1_QUARTER_COVERAGE_INSUFFICIENT');
  assert.equal(result.star3Count,0);
  assert.deepEqual(result.rankings,[]);
});

test('zero is a real EPS or revenue observation; missing is only explicit null',()=>{
  const zero=run([row('AAA',[0,0,0,0],[0,0,0,0])]);
  assert.equal(zero.status,'READY_SHADOW');
  assert.equal(zero.rankings[0].score,50);
  assert.throws(()=>run([row('AAA',[100,100,100,undefined])]),/ER1_QUARTER_VALUE_INVALID/);
  assert.throws(()=>run([row('AAA',[100,100,100,-1])]),/ER1_QUARTER_VALUE_INVALID/);
});

test('a missing approved issuer or unverified eligibility cannot be hidden in ranking',()=>{
  const result=run([row('AAA')],2);
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.reason,'ER1_APPROVED_UNIVERSE_INCOMPLETE');
  assert.throws(()=>run([{...row('AAA'),eligible:'PENDING'}]),/ER1_APPROVED_ISSUER_REQUIRED/);
  assert.throws(()=>run([row('AAA'),row('AAA')]),/ER1_APPROVED_ISSUER_REQUIRED/);
});

test('same-company share classes are not silently counted as independent issuers',()=>{
  const alphabet={...row('ALPHABET'),tickers:['GOOG','GOOGL']};
  assert.equal(run([alphabet]).coverage.reviewedEligibleIssuers,1);
  assert.throws(()=>run([
    {...row('A'),tickers:['GOOG']},
    {...row('B'),tickers:['GOOGL']},
  ]),/ER1_SHARE_CLASS_SPLIT/);
});

test('bad quarter sequence and future quarter values fail closed',()=>{
  const input=row('AAA');
  assert.throws(()=>run([{...input,quarters:input.quarters.slice(0,3)}]),
    /ER1_FOUR_QUARTER_SLOTS_REQUIRED/);
  assert.throws(()=>run([{...input,quarters:input.quarters.map((q,i)=>i===0?
    {...q,quarterEnd:'2026-12-31'}:q)}]),/ER1_QUARTER_DATE_INVALID/);
  assert.throws(()=>run([{...input,quarters:input.quarters.map((q,i)=>i===0?
    {...q,quarterEnd:'2024-01-01'}:q)}]),/ER1_QUARTER_SEQUENCE_INVALID/);
});

test('four internally valid quarters from years ago are stale, not READY_SHADOW',()=>{
  const stale=row('AAA');
  const oldDays=['2015-12-31','2016-03-31','2016-06-30','2016-09-30'];
  stale.quarters=stale.quarters.map((q,i)=>({...q,quarterEnd:oldDays[i]}));
  assert.throws(()=>run([stale]),/ER1_STALE_QUARTER_WINDOW_STOP/);
});

test('metric coverage below 98% blocks instead of publishing a shortened population',()=>{
  const rows=Array.from({length:100},(_,i)=>row(`T${i+1}`));
  for(let i=0;i<3;i++)rows[i]=row(`T${i+1}`,[null,null,null,10],[null,null,null,1]);
  const result=run(rows);
  assert.equal(result.coverage.earnings,.97);
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.star3Count,0);
});
