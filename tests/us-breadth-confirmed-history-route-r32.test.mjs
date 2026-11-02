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

test('R2 route reads native CORE D1 before legacy DB, without a HISTORY or R1 fallback',()=>{
 assert.match(route,/const native=env as unknown as \{DB_CORE\?:D1Database;DB\?:D1Database\}/);
 assert.match(route,/const db=native\.DB_CORE\?\?native\.DB;/);
 assert.match(route,/if\(!db\)return Response\.json\(\{reason:'FULL_MARKET_PERCENT_HISTORY_CORE_DATABASE_UNAVAILABLE'\}/);
 assert.match(route,/status:503,headers:\{'Cache-Control':'no-store'\}/);
 assert.match(route,/db\.prepare\('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=\?'\)/);
 assert.doesNotMatch(route,/(?:native|env)\.DB_HISTORY|US_BREADTH_CURRENT_KEY|US_BREADTH_DAILY_KEY_PREFIX/);
});
