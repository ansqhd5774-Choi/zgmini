import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('R3 local sector output is prepared inside the auxiliary stage before changed-input final publication',()=>{
 const cycle=fs.readFileSync('scripts/pc-writer/local-cycle.mjs','utf8');
 const sector=cycle.indexOf("sector-fear-greed-r3-local-cycle.mjs");
 const auxiliary=cycle.indexOf('collectAuxiliary:async()=>');
 assert.ok(sector>=0);
 assert.ok(auxiliary>=0&&sector>auxiliary);
 assert.match(cycle,/await progressivePublication\(/);
 assert.match(cycle,/checkpoint:\(\)=>auxiliaryInputCheckpoint\(base\)/);
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

test('sector comparison chart uses guarded stored refresh only for the automatic sector feed',()=>{
 const chart=fs.readFileSync('components/sector-sentiment-chart.tsx','utf8');
 assert.match(chart,/useStoredIndex<SectorFearGreedStoredPayload>\('\/api\/sector-fear-greed',null,autoStored\)/);
 assert.match(chart,/autoStored&&payload\?\.status==='READY'&&Array\.isArray\(payload\.history\)\?payload\.history:\[\]/);
 const hook=fs.readFileSync('components/use-stored-index.ts','utf8');
 assert.ok(hook.indexOf('if(!enabled)return;')<hook.indexOf('startStoredRefresh(async'));
 assert.match(hook,/acceptsStoredUpdate\(accepted,body\)/);
 assert.doesNotMatch(chart,/SECTOR_FEAR_GREED_STORED_UNAVAILABLE.*makeSeries/s);
});
