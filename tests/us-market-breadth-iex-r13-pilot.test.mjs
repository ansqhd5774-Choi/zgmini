import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessOneDayIexPilot} from '../tools/us-market-breadth-r1/iex-provisional-one-day-pilot-r13.mjs';

const members=['AAA','BBB','CCC'];
const confirmedRows=[
  {ticker:'AAA',trade_date:'2026-10-30',current_close:102,previous_close:100,source:'MarketParquet Free Sample'},
  {ticker:'BBB',trade_date:'2026-10-30',current_close:99,previous_close:100,source:'MarketParquet Free Sample'},
  {ticker:'CCC',trade_date:'2026-10-30',current_close:100,previous_close:100,source:'MarketParquet Free Sample'},
];
const dates=(prev,today)=>[{t:'2026-10-29T04:00:00Z',c:prev,v:1},{t:'2026-10-30T04:00:00Z',c:today,v:1}];

test('counts only observed two-day IEX pairs and compares confirmed directions without publishing',()=>{
  const result=assessOneDayIexPilot({members,confirmedRows,iexBars:{AAA:dates(100,101),BBB:dates(100,99),CCC:dates(100,100)}});
  assert.equal(result.diagnosticStatus,'COVERAGE_PILOT_PASSED');
  assert.equal(result.agreement,3);
  assert.deepEqual(result.iex,{rising:1,unchanged:1,falling:1});
  assert.equal(result.anchorUnder0_1pct,3);
});
test('missing a ticker remains a coverage failure; never infer unchanged',()=>{
  const result=assessOneDayIexPilot({members,confirmedRows,iexBars:{AAA:dates(100,101),BBB:dates(100,99)}});
  assert.equal(result.diagnosticStatus,'COVERAGE_BELOW_98_PCT');
  assert.equal(result.iexPairs,2);
  assert.equal(result.iex.unchanged,0);
});
test('pagination is an explicit incomplete result, not a successful universe',()=>{
  const result=assessOneDayIexPilot({members,confirmedRows,iexBars:{AAA:dates(100,101),BBB:dates(100,99),CCC:dates(100,100)},hasNextPage:true});
  assert.equal(result.diagnosticStatus,'INCOMPLETE_PAGINATION');
});
