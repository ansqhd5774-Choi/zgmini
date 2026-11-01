import {test} from 'node:test';
import assert from 'node:assert/strict';
import {replay15Min} from '../tools/us-market-breadth-r1/iex-intraday-replay-r15.mjs';

const members=Array.from({length:503},(_,i)=>'T'+i);
const confirmedRows=members.map(ticker=>({ticker,trade_date:'2026-10-30',
  previous_close:100,current_close:102,source:'MarketParquet Free Sample'}));
const bars=Object.fromEntries(members.map(ticker=>[ticker,[
  {t:'2026-10-30T13:30:00Z',c:101,v:10},
  {t:'2026-10-30T19:45:00Z',c:102,v:10}
]]));

test('replay observes 15-minute bars only after they have completed',()=>{
  const result=replay15Min({members,confirmedRows,bars});
  assert.equal(result.snapshots[0].observed,503);
  assert.equal(result.snapshots.at(-1).counts.rising,503);
  assert.equal(result.snapshots.at(-1).finalDirectionAgreement,503);
  assert.equal(result.diagnosticStatus,'REPLAY_READY_FOR_REVIEW');
});

test('unobserved tickers are not fabricated as unchanged',()=>{
  const incomplete={...bars};for(let i=0;i<20;i++)delete incomplete['T'+i];
  const result=replay15Min({members,confirmedRows,bars:incomplete});
  assert.equal(result.snapshots.at(-1).observed,483);
  assert.equal(result.snapshots.at(-1).counts.unchanged,0);
  assert.equal(result.diagnosticStatus,'FINAL_COVERAGE_BELOW_98_PCT');
});

test('replay remains explicitly incomplete when pagination is pending',()=>{
  const result=replay15Min({members,confirmedRows,bars,hasNextPage:true});
  assert.equal(result.diagnosticStatus,'INCOMPLETE_PAGINATION');
});

test('missing reference excludes tickers from direction counts',()=>{
  const result=replay15Min({members,confirmedRows:confirmedRows.slice(12),bars});
  assert.equal(result.snapshots.at(-1).observed,503);
  assert.equal(result.snapshots.at(-1).comparable,491);
  assert.equal(result.diagnosticStatus,'CONFIRMED_REFERENCE_INCOMPLETE');
});

test('future bar is never consumed in earlier snapshot',()=>{
  const futureOnly=Object.fromEntries(members.map(ticker=>[ticker,[
    {t:'2026-10-30T19:45:00Z',c:105,v:10}
  ]]));
  const result=replay15Min({members,confirmedRows,bars:futureOnly});
  assert.equal(result.snapshots[0].observed,0);
  assert.equal(result.snapshots.at(-1).observed,503);
});
