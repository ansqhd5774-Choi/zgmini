import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";

const page=readFileSync(new URL("./page.tsx",import.meta.url),"utf8");
const risk=readFileSync(new URL("./earnings-risk-only-panel.tsx",import.meta.url),"utf8");
const styles=readFileSync(new URL("./earnings-indicator-r2.css",import.meta.url),"utf8");

test("BLS observations are rendered inside the existing risk indicator table",()=>{
 assert.ok(page.includes("<EarningsRiskOnlyPanel/>"));
 assert.ok(!page.includes("EarningsCompanionPanel"));
 assert.ok(!existsSync(new URL("./earnings-companion-panel.tsx",import.meta.url)));
 assert.ok(!existsSync(new URL("./earnings-companion-panel.css",import.meta.url)));
 const table=risk.slice(risk.indexOf("<tbody>"),risk.indexOf("</tbody>"));
 assert.ok(table.includes("ids.map"));
 assert.ok(table.includes("costIndicators.map"));
 assert.ok(risk.includes('useStoredIndex<CostPayload>("/api/earnings-recession-indicators")'));
 assert.ok(risk.includes("earnings-companion-c-r4-v1"));
 for(const id of [
  "bls_ppi_final_demand_yoy_sa","bls_ppi_final_demand_index",
  "bls_ppi_goods_yoy_sa","bls_ppi_goods_index","bls_unit_labor_cost_yoy"
 ])assert.ok(risk.includes(id));
 assert.ok(risk.includes('row.freshness?.status==="FRESH"'));
 assert.ok(risk.includes("costFormat(row.value,row.unit)"));
 assert.ok(risk.includes("<CostSpark history={row.history}/>"));
 assert.ok(risk.includes("earnings-r2-cost-mobile-card"));
 assert.ok(styles.includes(".earnings-r2-cost-spark"));
});

test("BLS cost values do not modify the E1 risk score or diagnostics",()=>{
 assert.ok(risk.includes('const {payload,loading}=useStoredIndex<RiskPayload>("/api/earnings-recession-detail");'));
 assert.ok(risk.includes('const score=payload?.status==="READY"&&validScore(payload?.score)?payload.score:null;'));
 assert.ok(!risk.includes("costRows.get(id)"));
 assert.ok(!risk.includes("score+cost"));
 assert.ok(risk.includes("점수 미반영"));
});
