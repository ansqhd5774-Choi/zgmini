import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const panel=readFileSync("app/earnings-recession/earnings-recession-panel.tsx","utf8");
const css=readFileSync("app/earnings-recession/earnings-indicator-r2.css","utf8");
test("the 4-factor diagnostic hero cannot silently render the 13-factor E1-R5 chart",()=>{
 const hero=panel.split('data-testid="earnings-recession-detail-hero"')[1]?.split('  <section className="inflation-explainer"')[0]??"";
 assert.match(hero,/diagnosticScore\.toFixed\(1\)/);
 assert.match(hero,/동일한 산식의 검증된 과거 이력이 없습니다/);
 assert.doesNotMatch(hero,/data=\{trend\}/);
 assert.doesNotMatch(hero,/E1 저장 추이/);
});
test("E1-R5 trend remains intact in its own lower section",()=>{
 const lower=panel.split('aria-labelledby="earnings-stored-history-title"')[1]?.split('aria-labelledby="earnings-indicator-title"')[0]??"";
 assert.match(lower,/data=\{trend\}/);
 assert.match(lower,/instanceKey="earnings-stored"/);
 assert.match(lower,/storedScore\.toFixed\(1\)/);
 assert.match(lower,/진단점수와 별도/);
 assert.match(css,/earnings-r2-stored-chart/);
});
test("existing diagnostic weights, period comparison missing markers and E1 list stay untouched",()=>{
 assert.match(panel,/earningsDiagnosticComparisons/);
 assert.match(panel,/\{label:"1주",value:null\}/);
 assert.match(panel,/r5Order=\["S1","S2","S3","S4","S5","S6","S7","S8","S9","S10","S11","S12","S13"\]/);
});
