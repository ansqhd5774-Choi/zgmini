import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newestUsIexPercentPublication} from '../lib/market-breadth/us-provisional-ui-r4.mjs';
import {usIexPublicPercentOnly} from '../lib/market-breadth/us-provisional-r1.mjs';

const slotA='2026-11-18T15:45:00.000Z';
const slotB='2026-11-18T16:00:00.000Z';
const slotC='2026-11-18T16:15:00.000Z';
const row=(slotEndUtc,collectedAt,risingPct=40)=>({
 market:'usa',phase:'PROVISIONAL',status:'PROVISIONAL',
 source:'ALPACA_IEX_15MIN_SPLIT',observationDate:'2026-11-18',
 slotEndUtc,collectedAt,collectionStatus:'INCOMPLETE_PAGINATION',
 risingPct,fallingPct:20,unchangedPct:0,unobservedPct:80-risingPct,
});

test('W06 #38 older currently valid 15-minute publication cannot roll back newer public percentages',()=>{
 const current=row(slotB,'2026-11-18T16:02:00.000Z',60);
 const older=row(slotA,'2026-11-18T15:47:00.000Z',30);
 assert.equal(newestUsIexPercentPublication(current,older),current);
 assert.equal(newestUsIexPercentPublication(current,row(slotC,'2026-11-18T16:17:00.000Z',0)).risingPct,0,
  'a real newer 0% remains a valid public percentage');
 assert.equal(newestUsIexPercentPublication(null,current),current);
});

test('W06 #38 correction for same IEX slot respects actual collection time, not arrival order',()=>{
 const newer=row(slotB,'2026-11-18T16:07:00.000Z',35);
 const older=row(slotB,'2026-11-18T16:02:00.000Z',65);
 assert.equal(newestUsIexPercentPublication(newer,older),newer);
 assert.equal(newestUsIexPercentPublication(older,newer),newer);
 assert.equal(newestUsIexPercentPublication(newer,newer),newer);
});

test('W06 #38 unavailable, invalid and source-rejected responses still clear the UI state',()=>{
 const current=row(slotB,'2026-11-18T16:02:00.000Z');
 assert.equal(newestUsIexPercentPublication(current,null),null);
 const source=readFileSync(new URL('../app/market-breadth-strip.tsx',import.meta.url),'utf8');
 assert.match(source,/currentIexProvisional\(body\) \? body : null/);
 assert.match(source,/currentIexProvisional\(previous\) \? previous : null, incoming/);
 assert.match(source,/newestUsIexPercentPublication\(/);
 assert.match(source,/record\.source !== "ALPACA_IEX_15MIN_SPLIT"/);
 assert.match(source,/record\.status !== "PROVISIONAL"/);
 assert.match(source,/near100\(record\.risingPct, record\.fallingPct, record\.unchangedPct, record\.unobservedPct\)/);
 assert.match(source,/collected < stamp/);
 assert.match(source,/collected > Date\.now\(\) \+ 60_000/);
 assert.match(source,/const data = market === "usa" \? activeProvisional : normalizedCounts\(counts\)/);
 assert.match(source,/pct === undefined \? "—"/);
 assert.doesNotMatch(source,/confirmed-r2|lastHistory|activeConfirmed|MarketParquet/);
 assert.doesNotMatch(source,/data\?\.risingPct\s*\?\?/);
});


test('W06 #38 stored IEX Reader publishes only the three public shares plus explicit unobserved fraction',()=>{
 const stored={version:1,phase:'PROVISIONAL',status:'PROVISIONAL',market:'usa',universe:'SP500',
  source:'ALPACA_IEX_15MIN_SPLIT',referenceSource:'ALPACA_IEX_1DAY_SPLIT',
  methodologyVersion:'OBSERVED_ISSUE_DIRECTION_COUNTS_R1',
  observationDate:'2026-11-18',priorDate:'2026-11-17',
  slotEndUtc:slotB,collectedAt:'2026-11-18T16:02:00.000Z',
  expectedCount:500,sessionPriceObservedCount:350,referenceObservedCount:500,
  observedCount:350,missingCount:150,freshWithin30m:100,coverage:0.7,
  counts:{rising:100,unchanged:0,falling:250},collectionStatus:'INCOMPLETE_PAGINATION'};
 const published=usIexPublicPercentOnly(stored);
 assert.ok(published,'existing actual public Reader must accept the synthetic stored row');
 assert.deepEqual([published.risingPct,published.unchangedPct,published.fallingPct,published.unobservedPct],
  [20,0,50,30]);
 assert.equal('counts' in published,false,'no private member counts in visitor output');
 assert.equal('score' in published,false,'D03 percentage is not a 0–100 score');
 const later=usIexPublicPercentOnly({...stored,slotEndUtc:slotC,
  collectedAt:'2026-11-18T16:17:00.000Z',counts:{rising:0,unchanged:100,falling:250}});
 assert.ok(later);
 assert.equal(newestUsIexPercentPublication(later,published),later);
 assert.equal(later.risingPct,0,'zero percentage must remain visible');
 const retired=usIexPublicPercentOnly({...stored,source:'SP500_STORED_MARKETPARQUET_FREE_SAMPLE'});
 assert.equal(retired,null,'retired/unauthorized source is not converted to public percentages');
 assert.equal(newestUsIexPercentPublication(later,retired),null,'invalid source clears prior UI');
});
