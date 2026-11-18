import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newestUsIexPercentPublication} from '../lib/market-breadth/us-provisional-ui-r4.mjs';

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
