import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {usIexPublicPercentOnly} from '../lib/market-breadth/us-provisional-r1.mjs';

// Run the real UI admission function at a fixed NY trading-session clock.
const source=readFileSync(new URL('../app/market-breadth-strip.tsx',import.meta.url),'utf8');
const start=source.indexOf('const validPercent =');
const end=source.indexOf('function normalizedCounts(',start);
assert.ok(start>=0&&end>start,'IEX provisional UI gate was not found');
const compiled=ts.transpileModule(source.slice(start,end),{
 compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}
}).outputText;
const now=Date.parse('2026-11-18T16:05:00.000Z');
class NYClock extends Date {
 constructor(value){super(value===undefined?now:value);}
 static now(){return now;}
}
const accepted=new Function('Date',compiled+'\nreturn currentIexProvisional;')(NYClock);
const baseline={
 version:1,phase:'PROVISIONAL',status:'PROVISIONAL',market:'usa',
 universe:'SP500',source:'ALPACA_IEX_15MIN_SPLIT',
 referenceSource:'ALPACA_IEX_1DAY_SPLIT',
 methodologyVersion:'OBSERVED_ISSUE_DIRECTION_COUNTS_R1',
 observationDate:'2026-11-18',priorDate:'2026-11-17',
 slotEndUtc:'2026-11-18T16:00:00.000Z',
 collectedAt:'2026-11-18T16:02:00.000Z',
 expectedCount:500,sessionPriceObservedCount:0,
 referenceObservedCount:500,observedCount:0,missingCount:500,
 freshWithin30m:0,coverage:0,
 counts:{rising:0,unchanged:0,falling:0},
 collectionStatus:'INCOMPLETE_PAGINATION',
};

test('W06 #38 valid-but-zero-observed public IEX row must show missing, not three genuine 0% values',()=>{
 const published=usIexPublicPercentOnly(baseline);
 assert.ok(published,'existing stored reader permits 100% unobserved rows');
 assert.deepEqual(
  [published.risingPct,published.unchangedPct,published.fallingPct,published.unobservedPct],
  [0,0,0,100]);
 assert.equal(accepted(published),false,'no observed securities means missing, not 0% three ways');
});
test('W06 #38 actual zero rising with observed declining equity stays a valid 0%',()=>{
 const observed={...baseline,sessionPriceObservedCount:1,observedCount:1,
  missingCount:499,freshWithin30m:1,coverage:1/500,
  counts:{rising:0,unchanged:0,falling:1}};
 const published=usIexPublicPercentOnly(observed);
 assert.ok(published);
 assert.equal(published.risingPct,0);
 assert.equal(published.fallingPct,0.2);
 assert.ok(Math.abs(published.unobservedPct-99.8)<1e-9,'IEX percentages retain floating-point precision');
 assert.equal(accepted(published),true,'genuine observed 0% must not be treated as missing');
});
test('W06 #38 rights mismatch and stale provisional records remain unavailable',()=>{
 const wrongSource=usIexPublicPercentOnly({...baseline,source:'MARKETPARQUET_FREE_SAMPLE'});
 assert.equal(wrongSource,null);
 const observed={...baseline,sessionPriceObservedCount:1,observedCount:1,
  missingCount:499,freshWithin30m:1,coverage:1/500,
  counts:{rising:0,unchanged:0,falling:1}};
 const published=usIexPublicPercentOnly(observed);
 assert.equal(accepted({...published,slotEndUtc:'2026-11-18T15:00:00.000Z'}),false);
 assert.equal(accepted({...published,source:'MARKETPARQUET_FREE_SAMPLE'}),false);
});
