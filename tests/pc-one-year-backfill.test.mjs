import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {shiftDateMonths,earningsAnchors} from '../scripts/pc-writer/backfill-one-year.mjs';

test('one-year backfill date helpers keep calendar dates bounded',()=>{
 assert.equal(shiftDateMonths('2026-03-31',-1),'2026-02-28');
 assert.equal(shiftDateMonths('2024-03-31',-1),'2024-02-29');
 assert.deepEqual(earningsAnchors('2026-10-07'),[
  '2026-10-07','2026-07-07','2026-04-07','2026-01-07','2025-10-07',
 ]);
});

test('one-year backfill is local-only, quota guarded and keeps approved formulas untouched',()=>{
 const src=fs.readFileSync(new URL('../scripts/pc-writer/backfill-one-year.mjs',import.meta.url),'utf8');
 assert.match(src,/EMPLOYMENT_CLAIMS_WEEKS=108/);
 assert.match(src,/EARNINGS_QUARTERS=5/);
 assert.match(src,/collectClaimsHistoricalCurrent/);
 assert.match(src,/persistConsumptionC1R3AcceptedSeed/);
 assert.match(src,/createQuotaFetch\(\{base,originalFetch,mode:'enforce'\}\)/);
 assert.match(src,/noPublish:true/);
 assert.doesNotMatch(src,/publishMarket|--publish|remote\.request|remote\.query/);
});
