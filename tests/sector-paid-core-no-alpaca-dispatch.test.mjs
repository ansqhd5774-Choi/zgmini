import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Guard only the approved Core call sites. Retained historical collectors may
// still be imported directly by archival tests; they must not run from Core.
test('Core no longer dispatches independent Alpaca provisional collection',()=>{
 const cycle=fs.readFileSync('scripts/pc-writer/local-cycle.mjs','utf8');
 assert.match(cycle,/collectPaidCurrent\(base\)/);
 assert.match(cycle,/sector-fear-greed-r3-local-cycle\.mjs/);
 assert.doesNotMatch(cycle,/spawnSync\([^\n]*sector-provisional-cycle\.mjs/);
 assert.match(cycle,/EXCLUDED_BY_USER/);
});

test('Core ETF lane retains paid inputs and makes no Alpaca ETF fetch',()=>{
 const collection=fs.readFileSync('scripts/pc-writer/collect-local.mjs','utf8');
 const paid=fs.readFileSync('scripts/pc-writer/sector-fear-greed-r3-rolling-local.mjs','utf8');
 assert.doesNotMatch(collection,/collectSectorFearGreedR3EtfIncremental/);
 assert.match(collection,/RETIRED_LEGACY_ALPACA/);
 assert.match(collection,/providerRequests:0/);
 assert.match(paid,/readPaidProjection\(base,'etf_daily',date\)/);
 assert.match(paid,/readPaidProjection\(base,'stock_daily',date\)/);
 assert.match(paid,/local-sector-fear-greed-r3-etf-incremental\.json/);
 assert.match(paid,/MARKETPARQUET_PAID_CONNECTION_REQUIRED/);
});
