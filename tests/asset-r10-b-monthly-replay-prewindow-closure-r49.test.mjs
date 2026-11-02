import test from 'node:test';
import assert from 'node:assert/strict';
import {isMarketSession} from '../lib/market-score/breadth-b1-r3-calendar.mjs';
import {replayStoredR10BMonthly} from '../scripts/pc-writer/asset-r10-b-monthly-replay-r1.mjs';

// Deterministic synthetic market observations. These are NOT real PIT, Alpaca,
// R10 approved values, or candidate publishing inputs.
const tradingDate=d=>d!=='2025-01-09'&&isMarketSession(d);
function dates(first,last){
 const result=[];
 for(let t=Date.parse(first+'T00:00:00Z');
     t<=Date.parse(last+'T00:00:00Z');t+=86400000){
  const date=new Date(t).toISOString().slice(0,10);
  if(tradingDate(date))result.push(date);
 }
 return result;
}
const syntheticQualityRow=(date,i)=>({
 observationDate:date,members:500,valid200:490,
 above200:Math.round(245+80*Math.sin(i/13)),coverage:.98,
 participation:Math.round(245+80*Math.sin(i/13))/490,
});
function fixture(){
 const sp500Rows=dates('2023-09-01','2026-06-30')
  .map((observationDate,i)=>({observationDate,value:3000+i*.5+60*Math.sin(i/44)}));
 const qualityRows=dates('2024-09-17','2026-06-30')
  .map((date,i)=>syntheticQualityRow(date,i));
 const clean=replayStoredR10BMonthly({qualityRows,sp500Rows,asOfDate:'2026-07-01'});
 assert.equal(clean.status,'RESEARCH_B_REPLAY_NO_APPROVED_BASELINE');
 const approvedBHistory=clean.quarters.filter(q=>q.quarter>='2025-Q2'&&q.quarter<='2026-Q2')
  .map(({quarter,breadthDivergence})=>({quarter,breadthDivergence}));
 return {qualityRows,sp500Rows,approvedBHistory,asOfDate:'2026-07-01'};
}
const closure=syntheticQualityRow('2025-01-09',35);
const withClosure=data=>({...data,qualityRows:[...data.qualityRows,{...closure}]
 .sort((a,b)=>a.observationDate.localeCompare(b.observationDate))});

test('R49 synthetic baseline has historical Q2/Q3 null and three later full quarters',()=>{
 const {approvedBHistory}=fixture();
 assert.equal(approvedBHistory.length,5);
 assert.deepEqual(approvedBHistory.slice(0,2).map(r=>r.breadthDivergence),[null,null]);
 assert.ok(approvedBHistory.slice(2).every(r=>Number.isFinite(r.breadthDivergence)));
});

test('R49 reproduction: ignored pre-window closure does not change any approved B quarterly score',()=>{
 const data=fixture(),clean=replayStoredR10BMonthly(data),historical=replayStoredR10BMonthly(withClosure(data));
 assert.equal(clean.status,'RESEARCH_B_REPLAY_BASELINE_MATCH_NOT_AUTOPROMOTABLE');
 assert.equal(historical.status,clean.status);
 assert.deepEqual(historical.quarters.filter(r=>r.quarter>='2025-Q2'),
  clean.quarters.filter(r=>r.quarter>='2025-Q2'));
 assert.equal(historical.scoredObservationCount,clean.scoredObservationCount);
 assert.equal(historical.providerRequests,0);
 assert.equal(historical.approvedInputWrites,0);
 assert.equal(historical.releaseWrites,0);
 assert.equal(historical.d1Writes,0);
 assert.equal(historical.canPromote,false);
});

test('R49 closure exception excludes non-session row only before approved baseline',()=>{
 const data=fixture(),stricter={...data,approvedBHistory:[
  {quarter:'2025-Q1',breadthDivergence:null},...data.approvedBHistory,
 ]};
 const result=replayStoredR10BMonthly(withClosure(stricter));
 assert.equal(result.status,'STOP_REPLAY_DAILY_QUALITY_INVALID');
 const noLockedBaseline=replayStoredR10BMonthly({...withClosure(data),approvedBHistory:null});
 assert.equal(noLockedBaseline.status,'STOP_REPLAY_DAILY_QUALITY_INVALID');
});

test('R49 rejects duplicate, forged and mismatched source rows',()=>{
 const data=fixture(),bad=withClosure(data);
 bad.qualityRows.push({...closure});
 assert.equal(replayStoredR10BMonthly(bad).status,'STOP_REPLAY_DAILY_QUALITY_INVALID');
 const badCoverage=withClosure(data);
 badCoverage.qualityRows.find(x=>x.observationDate===closure.observationDate).coverage=1.2;
 assert.equal(replayStoredR10BMonthly(badCoverage).status,'STOP_REPLAY_DAILY_QUALITY_INVALID');
 const tampered=withClosure(data);
 tampered.qualityRows.push(syntheticQualityRow('2025-01-20',36));
 tampered.qualityRows.sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
 assert.equal(replayStoredR10BMonthly(tampered).status,'STOP_REPLAY_DAILY_QUALITY_INVALID');
 const drift=withClosure(data);
 drift.approvedBHistory=drift.approvedBHistory.map((r,i)=>i===2?
  {...r,breadthDivergence:r.breadthDivergence+0.01}:r);
 assert.equal(replayStoredR10BMonthly(drift).status,'STOP_APPROVED_B_QUARTER_REPLAY_DRIFT');
});
