import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('R3 local sector output is prepared before the existing publication writer',()=>{
 const cycle=fs.readFileSync('scripts/pc-writer/local-cycle.mjs','utf8');
 const sector=cycle.indexOf("sector-fear-greed-r3-local-cycle.mjs");
 const writer=cycle.indexOf("run-local.mjs");
 assert.ok(sector>=0);
 assert.ok(writer>sector);
 assert.match(cycle,/sector-fear-greed-r3-local-cycle\.mjs'\),'--write-local'/);
});

test('R3 local calculation and public route are stored-only with no provider transport',()=>{
 const local=fs.readFileSync('scripts/pc-writer/sector-fear-greed-r3-local-cycle.mjs','utf8');
 const route=fs.readFileSync('app/api/sector-fear-greed/route.ts','utf8');
 assert.doesNotMatch(local,/\bfetch\s*\(/);
 assert.doesNotMatch(local,/APCA_|FRED_|BLS_/);
 assert.match(route,/readSectorFearGreedR3\(env\.DB\)/);
 assert.doesNotMatch(route,/\bfetch\s*\(/);
});

test('sector comparison chart reads the stored R3 endpoint and keeps empty state on failure',()=>{
 const chart=fs.readFileSync('components/sector-sentiment-chart.tsx','utf8');
 assert.match(chart,/fetch\('\/api\/sector-fear-greed'/);
 assert.match(chart,/catch\(\(\)=>\{if\(active\)setStoredData\(\[\]\);\}\)/);
 assert.doesNotMatch(chart,/SECTOR_FEAR_GREED_STORED_UNAVAILABLE.*makeSeries/s);
});
