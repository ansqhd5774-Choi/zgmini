import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route=fs.readFileSync(new URL('../app/api/market-breadth-r2-history/route.ts',import.meta.url),'utf8');

test('R32 full-stock percentage-only history endpoint is isolated and read-only',()=>{
 assert.match(route,/readFullMarketPercentHistory\(/);
 assert.match(route,/market_public_snapshots_v1 WHERE snapshot_key=/);
 assert.match(route,/market'\)!=='usa'/);
 assert.doesNotMatch(route,/US_BREADTH_CURRENT_KEY|US_BREADTH_DAILY_KEY_PREFIX/);
 assert.doesNotMatch(route,/INSERT|UPDATE|DELETE|publish|wrangler|fetch\(/i);
 assert.doesNotMatch(route,/expectedCount|imputedUnchangedCount|eligibleCount|\.counts/);
});
