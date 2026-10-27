import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const risk=readFileSync(new URL("./earnings-risk-only-panel.tsx",import.meta.url),"utf8");
const adapter=readFileSync(new URL("./earnings-bea-s6-source.ts",import.meta.url),"utf8");
const scoring=readFileSync(new URL("../../worker/projection-builders/earningsRecession.ts",import.meta.url),"utf8");

test("BEA S6 stored observation is appended to the existing earnings table and mobile list",()=>{
 assert.ok(risk.includes('const beaIndicator=readBeaStoredS6(payload);'));
 assert.ok(adapter.includes('storedE1'));
 assert.ok(adapter.includes('methodologyVersion!=="E1-R5"'));
 assert.ok(adapter.includes('candidate)?.id==="S6"'));
 assert.ok(risk.includes('row.source===BEA_SOURCE'));
 assert.ok(risk.includes('row.historyKind==="CURRENT_VINTAGE_SOURCE_PERIOD_END"'));
 assert.doesNotMatch(risk,/storedE1|E1-R5|S1.*S13/);
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

test("BEA read-only adapter rejects missing and mismatched published source contracts",()=>{
 const compiled=ts.transpileModule(adapter,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m={exports:{}};
 new Function("exports","module",compiled)(m.exports,m);
 const read=m.exports.readBeaStoredS6;
 const row={id:"S6",status:"READY",source:"BEA NIPA A051RC",value:12.5};
 const snapshot={storedE1:{methodologyVersion:"E1-R5",status:"READY",indicators:[row]}};
 assert.equal(read(snapshot),row);
 assert.equal(read({...snapshot,storedE1:{...snapshot.storedE1,status:"PARTIAL"}}),undefined);
 assert.equal(read({...snapshot,storedE1:{...snapshot.storedE1,methodologyVersion:"E1-R4"}}),undefined);
 assert.equal(read({storedE1:{...snapshot.storedE1,indicators:[{id:"S5"}]}}),undefined);
 assert.equal(read(null),undefined);
});
