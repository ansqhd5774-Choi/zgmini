import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync(new URL('./page.tsx',import.meta.url),'utf8');
const panel=readFileSync(new URL('./earnings-companion-panel.tsx',import.meta.url),'utf8');
const risk=readFileSync(new URL('./earnings-risk-only-panel.tsx',import.meta.url),'utf8');

test('R4-C BLS companion appears on earnings page independently of eight-risk scores',()=>{
 assert.ok(page.includes('<EarningsCompanionPanel/>'));
 assert.ok(panel.includes('"/api/earnings-recession-indicators"'));
 assert.ok(panel.includes('earnings-companion-c-r4-v1'));
 for(const id of ['bls_ppi_final_demand_yoy_sa','bls_ppi_final_demand_index',
 'bls_ppi_goods_yoy_sa','bls_ppi_goods_index','bls_unit_labor_cost_yoy'])assert.ok(panel.includes(id));
 assert.ok(panel.includes('row.freshness?.status==="FRESH"'));
 assert.ok(panel.includes('value:number|null'));
 assert.ok(!risk.includes('earnings-recession-indicators'),'risk score must remain independent of R4-C');
});
