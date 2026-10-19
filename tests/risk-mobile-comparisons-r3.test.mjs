import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {liquidityStoredScoreComparisons} from "../worker/projection-builders/liquidity-stored-history.mjs";
const read=p=>readFileSync(p,"utf8");
test("liquidity and credit mobile score/chart reuse compact 132px side-by-side inflation geometry only",()=>{
 const s=read("app/risk-liquidity-credit-mobile-parity-r3.css");
 for(const topic of ["liquidity-crisis","credit-risk"]){
  const p=read("app/"+topic+"/"+topic+"-panel.tsx");
  assert.match(p,/import "\.\.\/risk-liquidity-credit-mobile-parity-r3\.css";/);
  assert.ok(s.includes("."+topic+"-target-card"));
 }
 for(const fragment of ["grid-template-columns:10px minmax(0,40%) 6px minmax(0,1fr) 10px","grid-template-rows:auto 132px auto",".fg-content-slot{display:contents}",".fg-analysis-slot",".fg-score-slot",".fg-footer-slot","height:132px"]){
  assert.ok(s.includes(fragment),fragment);
 }
 assert.match(s,/@media\(max-width:767px\)/);
 assert.doesNotMatch(s,/\.inflation-target-card|\.earnings-recession-target-card/);
});
test("last three indicator heroes do not render duplicate observation date below period-change row",()=>{
 for(const topic of ["asset-bubble","debt-risk","supply-shock"]){
  const p=read("app/"+topic+"/"+topic+"-panel.tsx");
  assert.match(p,/<MarketCardHeader[^\n]*dateLabel=/);
  assert.doesNotMatch(p,/metaDate=\{dateLabel\(payload\?\.asOfDate\)\}/);
  assert.match(p,/<MarketScoreOrb[^\n]*comparisonItems=\{scoreComparisonItems\}/);
 }
});
test("asset and supply reuse approved stored-score comparisons only when publisher field absent",()=>{
 for(const topic of ["asset-bubble","supply-shock"]){
  const p=read("app/"+topic+"/"+topic+"-panel.tsx");
  assert.match(p,/const storedComparison=payload\?\.scoreComparisons\?\?liquidityStoredScoreComparisons\(payload\?\.trend\?\?\[\],payload\?\.asOfDate\?\?"",score\)/);
  for(const key of ["week","month","threeMonth","sixMonth","year"])assert.ok(p.includes("value:storedComparison?."+key+"??null"));
 }
 const points=[{label:"2025-12-31",value:63},{label:"2026-03-31",value:53},{label:"2026-06-30",value:23}];
 assert.deepEqual(liquidityStoredScoreComparisons(points,"2026-10-19",23),{week:null,month:null,threeMonth:-30,sixMonth:-40,year:null});
 assert.deepEqual(liquidityStoredScoreComparisons(points,"2026-10-19",22),{week:null,month:null,threeMonth:null,sixMonth:null,year:null});
 assert.deepEqual(liquidityStoredScoreComparisons([],"2026-10-19",23),{week:null,month:null,threeMonth:null,sixMonth:null,year:null});
});
test("earnings diagnostic and debt without comparable stored score must not show invented delta",()=>{
 const earnings=read("app/earnings-recession/earnings-recession-panel.tsx");
 const debt=read("app/debt-risk/debt-risk-panel.tsx");
 assert.match(earnings,/const earningsDiagnosticComparisons=\[/);
 assert.match(debt,/value:payload\?\.scoreComparisons\?\.week\?\?null/);
 assert.doesNotMatch(debt,/liquidityStoredScoreComparisons/);
});
