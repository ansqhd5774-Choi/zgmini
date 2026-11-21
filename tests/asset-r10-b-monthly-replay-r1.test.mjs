import test from 'node:test';
import assert from 'node:assert/strict';
import {isMarketSession} from '../lib/market-score/breadth-b1-r3-calendar.mjs';
import {pairedBreadthScore} from '../lib/market-score/asset-r10-breadth-contract.mjs';
import {replayStoredR10BMonthly} from '../scripts/pc-writer/asset-r10-b-monthly-replay-r1.mjs';

const sessions=(start,end)=>{
 const out=[];
 for(let date=new Date(start+'T00:00:00Z');date.toISOString().slice(0,10)<=end;
  date.setUTCDate(date.getUTCDate()+1)){
  const d=date.toISOString().slice(0,10);
  if(d!=='2025-01-09'&&isMarketSession(d))out.push(d);
 }
 return out;
};
function fixture(){
 const observations=sessions('2024-09-03','2026-09-30');
 const sp500Rows=sessions('2023-08-01','2026-10-30').map((date,i)=>({
  observationDate:date,value:3000+0.75*i+38*Math.sin(i/17),
 }));
 const qualityRows=observations.map((date,i)=>{
  const members=500,valid200=493,above200=225+(i%50);
  return {observationDate:date,members,valid200,above200,
   coverage:valid200/members,participation:above200/valid200};
 });
 return {qualityRows,sp500Rows,asOfDate:'2026-11-02'};
}
const assess=(obj)=>replayStoredR10BMonthly(obj);
function noWrites(x){
 assert.equal(x.readOnly,true);assert.equal(x.canPromote,false);
 assert.equal(x.productionEligible,false);
 for(const field of ['providerRequests','approvedInputWrites','releaseWrites',
  'sqliteWrites','d1Writes'])assert.equal(x[field],0);
}

test('real market-session daily quality replays three complete 2025-Q4 months and preserves early nulls',()=>{
 const x=fixture(),snapshot=structuredClone(x);
 const r=assess(x);noWrites(r);
 assert.equal(r.status,'RESEARCH_B_REPLAY_NO_APPROVED_BASELINE');
 assert.equal(r.pairedObservationCount,x.qualityRows.length);
 assert.ok(r.scoredObservationCount>260);
 assert.match(r.qualityRowsSha256,/^[a-f0-9]{64}$/);
 assert.match(r.benchmarkRowsSha256,/^[a-f0-9]{64}$/);
 assert.equal(r.quarters.find(x=>x.quarter==='2025-Q2').breadthDivergence,null);
 assert.equal(r.quarters.find(x=>x.quarter==='2025-Q3').breadthDivergence,null);
 assert.equal(r.quarters.find(x=>x.quarter==='2025-Q4').status,'READY');
 assert.equal(r.quarters.find(x=>x.quarter==='2026-Q1').status,'READY');
 assert.equal(r.quarters.find(x=>x.quarter==='2026-Q2').status,'READY');
 assert.equal(r.quarters.find(x=>x.quarter==='2026-Q4').status,'PARTIAL');
 assert.deepEqual(x,snapshot);
});

test('locked approved five quarters match independent daily replay without mutating scores',()=>{
 const x=fixture(),initial=assess(x);
 const approvedBHistory=initial.quarters.filter(q=>q.quarter>='2025-Q2'&&q.quarter<='2026-Q2')
  .map(({quarter,breadthDivergence})=>({quarter,breadthDivergence}));
 assert.equal(approvedBHistory.length,5);
 assert.equal(assess({...x,approvedBHistory}).status,
  'RESEARCH_B_REPLAY_BASELINE_MATCH_NOT_AUTOPROMOTABLE');
 const forged=structuredClone(approvedBHistory);
 forged.at(-1).breadthDivergence+=0.01;
 const y=assess({...x,approvedBHistory:forged});
 assert.equal(y.status,'STOP_APPROVED_B_QUARTER_REPLAY_DRIFT');
 assert.equal(y.firstMismatchQuarter,'2026-Q2');
});

test('month-end missing cannot manufacture the third quarterly B month',()=>{
 const x=fixture(),before=assess(x).quarters.find(q=>q.quarter==='2025-Q4');
 assert.equal(before.validMonths,3);
 x.qualityRows=x.qualityRows.filter(r=>r.observationDate!=='2025-12-31');
 const r=assess(x);
 assert.equal(r.quarters.find(q=>q.quarter==='2025-Q4').status,'PARTIAL');
 assert.equal(r.quarters.find(q=>q.quarter==='2025-Q4').breadthDivergence,null);
 assert.equal(r.months.find(x=>x.month==='2025-12').status,'PARTIAL');
});

test('first 251 paired observations cannot become a score',()=>{
 const x=fixture();
 x.qualityRows=x.qualityRows.slice(0,251);
 x.asOfDate='2025-11-01';
 x.sp500Rows=x.sp500Rows.filter(r=>r.observationDate<=x.asOfDate);
 const r=assess(x);
 assert.equal(r.status,'RESEARCH_B_REPLAY_NO_APPROVED_BASELINE');
 assert.equal(r.scoredObservationCount,0);
 assert.ok(r.quarters.every(q=>q.breadthDivergence===null));
});

test('R10 approved midrank and 100-gap formula remains the calculation primitive',()=>{
 const returns=Array.from({length:252},(_,i)=>i%16);
 const p=Array.from({length:252},(_,i)=>((i*13)%37)/100);
 const actual=pairedBreadthScore(returns,p);
 assert.equal(actual.breadthGap,Math.max(0,actual.returnRank-actual.participationRank));
 assert.equal(actual.score,100-actual.breadthGap);
 assert.equal(pairedBreadthScore(returns.slice(1),p.slice(1)),null);
});

test('coverage must retain the full member denominator and actual above-200 count',()=>{
 const a=fixture();a.qualityRows[0].coverage=1;
 assert.equal(assess(a).status,'STOP_REPLAY_DAILY_QUALITY_INVALID');
 const b=fixture();b.qualityRows[0].above200=500;
 assert.equal(assess(b).status,'STOP_REPLAY_DAILY_QUALITY_INVALID');
 const c=fixture();c.qualityRows[0].participation=1;
 assert.equal(assess(c).status,'STOP_REPLAY_DAILY_QUALITY_INVALID');
 const d=fixture();d.qualityRows[0].valid200=489;
 assert.equal(assess(d).status,'STOP_REPLAY_DAILY_QUALITY_INVALID');
});

test('missing coverage is null, not a zero or silently shrinking member denominator',()=>{
 const x=fixture();
 x.qualityRows[0]={...x.qualityRows[0],valid200:480,above200:220,
  coverage:480/500,participation:null};
 const r=assess(x);
 assert.equal(r.status,'RESEARCH_B_REPLAY_NO_APPROVED_BASELINE');
 assert.equal(r.pairedObservationCount,x.qualityRows.length-1);
});

test('eligible 98% participation cannot be silently dropped as a null',()=>{
 const x=fixture();x.qualityRows[3].participation=null;
 assert.equal(assess(x).status,'STOP_REPLAY_DAILY_QUALITY_INVALID');
 const y=fixture();y.qualityRows[3].participation=undefined;
 assert.equal(assess(y).status,'STOP_REPLAY_DAILY_QUALITY_INVALID');
});

test('non-session, duplicate and future quality dates fail closed',()=>{
 const a=fixture();a.qualityRows[0].observationDate='2024-09-07';
 assert.equal(assess(a).status,'STOP_REPLAY_DAILY_QUALITY_INVALID');
 const b=fixture();b.qualityRows[1].observationDate=b.qualityRows[0].observationDate;
 assert.equal(assess(b).status,'STOP_REPLAY_DAILY_QUALITY_INVALID');
 const c=fixture();c.qualityRows.at(-1).observationDate='2027-01-04';
 assert.equal(assess(c).status,'STOP_REPLAY_DAILY_QUALITY_INVALID');
});

test('benchmark duplicate, zero and backward dates fail before score calculation',()=>{
 const a=fixture();a.sp500Rows[0].value=0;
 assert.equal(assess(a).status,'STOP_REPLAY_SP500_BENCHMARK_INVALID');
 const b=fixture();b.sp500Rows[1].observationDate=b.sp500Rows[0].observationDate;
 assert.equal(assess(b).status,'STOP_REPLAY_SP500_BENCHMARK_INVALID');
 const c=fixture();c.sp500Rows.at(-1).observationDate='2027-01-04';
 assert.equal(assess(c).status,'STOP_REPLAY_SP500_BENCHMARK_INVALID');
});

test('non-market benchmark observation never contributes a fabricated 12-month return',()=>{
 const x=fixture();
 x.sp500Rows[0].observationDate='2023-08-05';
 assert.equal(assess(x).status,'STOP_REPLAY_SP500_BENCHMARK_INVALID');
 const y=fixture();
 const index=y.sp500Rows.findIndex(r=>r.observationDate==='2025-01-10');
 y.sp500Rows[index].observationDate='2025-01-09';
 assert.equal(assess(y).status,'STOP_REPLAY_SP500_BENCHMARK_INVALID');
});

test('February 29 replay retains the legacy last-observation prior-year boundary',()=>{
 const qualityRows=[{observationDate:'2024-02-29',members:500,valid200:500,
  above200:250,coverage:1,participation:0.5}];
 const sp500Rows=[
  {observationDate:'2023-02-28',value:100},
  {observationDate:'2023-03-01',value:999},
  {observationDate:'2024-02-29',value:200},
 ];
 const result=assess({qualityRows,sp500Rows,asOfDate:'2024-04-01'});
 assert.equal(result.status,'RESEARCH_B_REPLAY_NO_APPROVED_BASELINE');
 assert.equal(result.pairedObservationCount,1);
 assert.equal(result.firstScoredObservationDate,null);
 assert.ok(result.quarters.every(q=>q.breadthDivergence===null));
});

test('historic baseline with a manufactured early B value is rejected',()=>{
 const x=fixture();
 const approvedBHistory=[{quarter:'2025-Q2',breadthDivergence:44}];
 const r=assess({...x,approvedBHistory});
 assert.equal(r.status,'STOP_APPROVED_B_QUARTER_REPLAY_DRIFT');
 assert.equal(r.firstMismatchQuarter,'2025-Q2');
});

test('malformed as-of and duplicate baseline quarters cannot be used as a receipt',()=>{
 const x=fixture();
 assert.equal(assess({...x,asOfDate:'2026-11-31'}).status,'STOP_REPLAY_ASOF_DATE_INVALID');
 assert.equal(assess({...x,approvedBHistory:[
  {quarter:'2026-Q1',breadthDivergence:null},
  {quarter:'2026-Q1',breadthDivergence:null},
 ]}).status,'STOP_APPROVED_B_HISTORY_INVALID');
});
