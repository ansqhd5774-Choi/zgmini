import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const risk=readFileSync(new URL("./earnings-risk-only-panel.tsx",import.meta.url),"utf8");
const scoring=readFileSync(new URL("../../worker/projection-builders/earningsRecession.ts",import.meta.url),"utf8");

test("BEA S6 stored observation is appended to the existing earnings table and mobile list",()=>{
 assert.ok(risk.includes('payload?.storedE1?.methodologyVersion==="E1-R5"'));
 assert.ok(risk.includes('row.id==="S6"'));
 assert.ok(risk.includes('row.source===BEA_SOURCE'));
 assert.ok(risk.includes('row.historyKind==="CURRENT_VINTAGE_SOURCE_PERIOD_END"'));
 assert.ok(risk.includes('const beaReady=beaUsable(beaIndicator)'));
 assert.equal((risk.match(/data-source="bea-s6"/g)||[]).length,2);
 assert.ok(risk.indexOf('data-source="bea-s6"')>risk.indexOf('costIndicators.map(meta=>'));
 assert.ok(risk.includes('id="bea_corporate_profits_symmetric_yoy"'));
 assert.ok(risk.includes('aria-label={label}'));
 assert.ok(risk.includes('https://www.bea.gov/data/income-saving/corporate-profits'));
});

test("BEA reference observation remains isolated from the four-factor diagnostic",()=>{
 assert.ok(risk.includes('const score=payload?.status==="READY"&&validScore(payload?.score)?payload.score:null;'));
 assert.ok(risk.includes('const ids=["epsGrowth","margin","revenueGrowth","earningsGrowthBreadth"] as const;'));
 assert.ok(risk.includes('const beaDelta=beaReady?beaIndicator!.value!-beaIndicator!.previousValue!:null;'));
 assert.ok(risk.includes('대칭 변화율'));
 assert.ok(risk.includes('점수 미반영'));
 assert.ok(scoring.includes('const R4_IDS=["epsGrowth","margin","revenueGrowth","earningsGrowthBreadth"]'));
});
