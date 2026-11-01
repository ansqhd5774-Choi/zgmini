import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessIntradayIex,newYorkClock} from '../tools/us-market-breadth-r1/iex-provisional-intraday-pilot-r14.mjs';

const members=Array.from({length:500},(_,i)=>'T'+i);
const priorDate='2026-10-30',currentDate='2026-11-02';
const confirmedPriorRows=members.map(ticker=>({ticker,trade_date:priorDate,current_close:100,source:'MarketParquet Free Sample'}));
const bars=Object.fromEntries(members.map(t=>[t,[{t:priorDate+'T04:00:00Z',c:100,v:100},
  {t:currentDate+'T14:00:00Z',c:101,v:10}]]));

test('intraday date and session window use New York time after daylight-saving change',()=>{
  const clock=newYorkClock(Date.parse('2026-11-02T15:00:00Z'));
  assert.deepEqual(clock,{date:'2026-11-02',weekday:'Mon',minutes:600});
});
test('fully paired same-day bars and prior split basis pass feasibility',()=>{
  const result=assessIntradayIex({members,confirmedPriorRows,bars,priorDate,currentDate});
  assert.equal(result.status,'COVERAGE_AND_BASIS_PILOT_PASSED');
  assert.equal(result.countsDiagnostic.rising,500);
});
test('no observation does not fabricate an unchanged count',()=>{
  const incomplete={...bars};for(let i=0;i<11;i++)delete incomplete['T'+i];
  const result=assessIntradayIex({members,confirmedPriorRows,bars:incomplete,priorDate,currentDate});
  assert.equal(result.status,'INTRADAY_COVERAGE_BELOW_98_PCT');
  assert.equal(result.countsDiagnostic.unchanged,0);
});
test('mismatched prior price basis fails even at full coverage',()=>{
  const confirmedPriorRows=members.map(ticker=>({ticker,trade_date:priorDate,current_close:90,source:'MarketParquet Free Sample'}));
  const result=assessIntradayIex({members,confirmedPriorRows,bars,priorDate,currentDate});
  assert.equal(result.status,'SPLIT_BASIS_RECONCILIATION_REQUIRED');
});
test('pagination requires explicit review even when current coverage is sufficient',()=>{
  const result=assessIntradayIex({members,confirmedPriorRows,bars,priorDate,currentDate,hasNextPage:true});
  assert.equal(result.status,'INCOMPLETE_PAGINATION');
});
