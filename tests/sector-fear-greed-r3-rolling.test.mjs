import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SECTOR_FEAR_GREED_R3_AXIS_WEIGHTS,
  SECTOR_FEAR_GREED_R3_REFERENCE_OBSERVATIONS,
} from '../lib/market-score/sector-fear-greed-r3-five-axis-complete.mjs';
import {
  SECTOR_FEAR_GREED_R3_ROLLING_SOURCE_STATUS,
  SECTOR_FEAR_GREED_R3_ROLLING_SOURCE_VERSION,
} from '../lib/market-score/sector-fear-greed-r3-rolling.mjs';
import {
  buildSectorFearGreedR3Public,
  SECTOR_FEAR_GREED_R3_SECTORS,
} from '../lib/market-score/sector-fear-greed-r3-public.mjs';

test('rolling source keeps the approved five-axis weights and 756 reference',()=>{
 assert.deepEqual(SECTOR_FEAR_GREED_R3_AXIS_WEIGHTS,{
  trend:4/17,breadth:4/17,demand:3/17,relativeStrength:3/17,volatility:3/17,
 });
 assert.equal(SECTOR_FEAR_GREED_R3_REFERENCE_OBSERVATIONS,756);
});

test('validated rolling 252 source is accepted by the unchanged public transform',()=>{
 const start=Date.parse('2025-01-01T00:00:00Z');
 const rows=Array.from({length:252},(_,i)=>({date:new Date(start+i*86400000).toISOString().slice(0,10),score:42.5}));
 const source={
  version:SECTOR_FEAR_GREED_R3_ROLLING_SOURCE_VERSION,
  generatedAt:'2026-10-16T00:00:00.000Z',
  status:SECTOR_FEAR_GREED_R3_ROLLING_SOURCE_STATUS,
  approvedR1ReferenceRequirement:756,
  summary:{allReady252:true},
  sectors:Object.fromEntries(SECTOR_FEAR_GREED_R3_SECTORS.map(({id})=>[id,{fiveRaw:rows}])),
 };
 const body=buildSectorFearGreedR3Public(source,{now:Date.parse('2026-10-16T00:00:00Z')});
 assert.equal(body.referenceObservations,756);
 assert.equal(body.history.length,252);
 assert.equal(body.sectors.length,11);
 assert.equal(body.sectors[0].score,50);
 assert.equal(body.sourceVersion,SECTOR_FEAR_GREED_R3_ROLLING_SOURCE_VERSION);
});

test('collection owns provider transport while rolling calculation remains stored-only',()=>{
 const collection=fs.readFileSync('scripts/pc-writer/collect-local.mjs','utf8');
 const local=fs.readFileSync('scripts/pc-writer/sector-fear-greed-r3-local-cycle.mjs','utf8');
 const rolling=fs.readFileSync('scripts/pc-writer/sector-fear-greed-r3-rolling-local.mjs','utf8');
 assert.match(collection,/collectSectorFearGreedR3EtfIncremental/);
 assert.doesNotMatch(local,/\bfetch\s*\(/);
 assert.doesNotMatch(local,/APCA_API_KEY/);
 assert.doesNotMatch(rolling,/\bfetch\s*\(/);
 assert.doesNotMatch(rolling,/APCA_API_KEY/);
});

test('ETF collector is bounded and does not alter scheduler or public storage directly',()=>{
 const source=fs.readFileSync('scripts/pc-writer/sector-fear-greed-r3-etf-incremental.mjs','utf8');
 assert.match(source,/const MAX_REQUESTS=4/);
 assert.match(source,/const CACHE_MS=20\*60\*60\*1000/);
 assert.match(source,/publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false/);
 assert.doesNotMatch(source,/wrangler|cron|schedule/i);
});
