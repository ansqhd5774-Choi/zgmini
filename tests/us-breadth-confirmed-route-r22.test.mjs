import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const route=fs.readFileSync(new URL('../app/api/market-breadth/route.ts',import.meta.url),'utf8');

test('R2 confirmed is a separate stored-only read alias and default R1 503 route remains',()=>{
  assert.match(route,/if\(phase==='confirmed-r2'\)return fullMarketConfirmedR2GET\(\);/);
  assert.match(route,/readFullMarketPublicCurrent\(/);
  assert.match(route,/if\(phase==='provisional'\)return provisionalGET\(\);/);
  assert.match(route,/Response\.json\(usIexPublicPercentOnly\(record\)/);
  assert.match(route,/US_BREADTH_CURRENT_KEY/);
  assert.match(route,/validUsBreadthRecord\(record\)/);
  assert.match(route,/if\(phase!==null&&phase!=='confirmed'\)/);
  assert.doesNotMatch(route,/STAGING_KEY|publishFullMarketStaging|promoteVerifiedFullMarketStaging/);
});
