import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFullMarketConfirmedCandidate} from '../lib/market-breadth/us-marketparquet-confirmed-r2.mjs';
import {validUsBreadthRecord} from '../lib/market-breadth/us-public-r1.mjs';
import {validUsIexProvisional} from '../lib/market-breadth/us-provisional-r1.mjs';

const prev='2026-10-29',today='2026-10-30';
const rows=(date,size=6500)=>Array.from({length:size},(_,i)=>({date,asset_type:'Stock',symbol:`S${i}`,close:100,volume:1000}));
const calc=(currentRows,previousRows=rows(prev))=>calculateFullMarketConfirmedCandidate({
  observationDate:today,previousDate:prev,currentRows,previousRows});

test('all 6500 active MarketParquet stocks, no SP500 503 restriction',()=>{
  const current=rows(today);
  for(let i=0;i<3200;i++)current[i].close=101;
  for(let i=3200;i<6400;i++)current[i].close=99;
  const result=calc(current);
  assert.equal(result.status,'CALCULATED_UNPUBLISHED');
  assert.equal(result.expectedCount,6500);
  assert.equal(result.eligibleCount,6500);
  assert.deepEqual(result.counts,{rising:3200,unchanged:100,falling:3200});
  assert.equal(result.coverage,1);
  assert.equal(result.publicationAllowed,false);
  assert.equal(validUsBreadthRecord(result),false);
  assert.equal(validUsIexProvisional(result),false);
});

test('confirmed 98% coverage still applies to full source, never to provisional',()=>{
  const current=rows(today);
  const previous=rows(prev,6370); // 98% of 6500 exactly
  const passing=calc(current,previous);
  assert.equal(passing.eligibleCount,6370);
  assert.equal(passing.missingCount,130);
  assert.equal(passing.status,'CALCULATED_UNPUBLISHED');
  assert.equal(passing.counts.unchanged,6370);
  const failing=calc(current,previous.slice(0,-1));
  assert.equal(failing.eligibleCount,6369);
  assert.equal(failing.status,'INSUFFICIENT_CONFIRMED_COVERAGE');
  assert.equal(failing.counts,null);
});

test('ETF and delisted records excluded; missing previous prices never unchanged',()=>{
  const current=[...rows(today,3),{date:today,symbol:'ETF',asset_type:'ETF',close:100,volume:1},
    {date:today,symbol:'OLD-DELISTED',asset_type:'Stock',close:20,volume:0}];
  const previous=rows(prev,2);
  const result=calc(current,previous);
  assert.equal(result.expectedCount,3);
  assert.equal(result.eligibleCount,2);
  assert.equal(result.missingCount,1);
  assert.equal(result.counts,null);
  assert.equal(result.diagnostics.currentNonStocks,1);
  assert.equal(result.diagnostics.currentDelisted,1);
});

test('duplicate symbols, invalid dates and invalid prices fail closed',()=>{
  const current=rows(today);
  assert.equal(calc([...current,current[0]]).status,'DUPLICATE_SOURCE_SYMBOL');
  assert.equal(calc([...current,{...current[0],symbol:'EXTRA',date:prev}]).status,'WRONG_DATE_IN_SOURCE');
  const invalid=rows(today);invalid[0].close=null;
  const result=calc(invalid);
  assert.equal(result.expectedCount,6500);
  assert.equal(result.eligibleCount,6499);
  assert.equal(result.counts.unchanged,6499);
  assert.equal(result.diagnostics.currentInvalidPrices,1);
  const mismatched=calculateFullMarketConfirmedCandidate({observationDate:today,previousDate:'2026-10-28',
    currentRows:current,previousRows:rows('2026-10-28')});
  assert.equal(mismatched.status,'NON_ADJACENT_TRADING_SESSIONS');
});

test('pure candidate does not modify input source data',()=>{
  const current=rows(today,6500),previous=rows(prev,6500);
  const before=JSON.stringify({current,previous});
  calc(current,previous);
  assert.equal(JSON.stringify({current,previous}),before);
});
