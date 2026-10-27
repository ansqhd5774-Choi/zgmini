import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');

test('new BEA unit-profit data shares the existing earnings page without changing the score contract',()=>{
 const view=read('app/earnings-recession/earnings-risk-only-panel.tsx');
 const route=read('worker/candidate-r52.ts');
 const reader=read('worker/earnings-bea-unit-profit-r1.mjs');
 const writer=read('scripts/pc-writer/EARNINGS_BEA_UNIT_PROFIT_R1_ONCE.mjs');
 assert.match(view,/const ids=\["epsGrowth","margin","revenueGrowth","earningsGrowthBreadth"\]/);
 assert.equal((view.match(/data-source="bea-unit-profit"/g)??[]).length,2);
 assert.match(view,/비금융기업 단위이익/);
 assert.match(view,/점수 미반영/);
 assert.match(view,/USD_PER_REAL_GVA_UNIT/);
 assert.match(view,/\/api\/earnings-recession-bea-unit-profit/);
 assert.match(route,/if\(path===BEA_UNIT_ROUTE\)return readBeaUnitResponse\(request,env.DB_CORE\)/);
 assert.match(reader,/market_public_snapshots_v1/);
 assert.doesNotMatch(reader,/fetch\(/);
 assert.doesNotMatch(reader,/cron|scheduled\(/i);
 assert.match(writer,/--apply/);
 assert.match(writer,/--confirm-bea-unit-d1-write/);
 assert.doesNotMatch(writer,/ALTER TABLE|CREATE TABLE|DROP TABLE/);
});
