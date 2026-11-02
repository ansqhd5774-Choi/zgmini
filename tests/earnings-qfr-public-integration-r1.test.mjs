import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Census QFR public route, desktop/mobile rows and existing earnings score isolation',()=>{
  const router=read('worker/candidate-r52.ts');
  const reader=read('worker/earnings-companion-c-qfr-r1.mjs');
  const panel=read('app/earnings-recession/earnings-risk-only-panel.tsx');
  assert.match(router,/if\(path===QFR_ROUTE\)return readQfrCompanionResponse\(request,env.DB_CORE\)/);
  assert.match(reader,/export async function readQfrCompanionResponse/);
  assert.match(reader,/market_public_snapshots_v1/);
  assert.doesNotMatch(reader,/\bfetch\(/);
  assert.equal((panel.match(/data-source="census-qfr-margin"/g)??[]).length,2);
  assert.match(panel,/\/api\/earnings-recession-census-qfr-margin/);
  assert.match(panel,/Census QFR/);
  assert.match(panel,/계절조정 전\(NSA\)/);
  assert.match(panel,/PERCENTAGE_POINTS/);
  assert.match(panel,/점수 미반영/);
  assert.match(panel,/const ids=\["epsGrowth","margin","revenueGrowth","earningsGrowthBreadth"\]/);
  assert.doesNotMatch(reader,/cron|scheduled\(/i);
});
