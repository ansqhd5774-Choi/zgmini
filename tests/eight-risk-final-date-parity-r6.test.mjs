import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const pages=["inflation","recession","liquidity-crisis","credit-risk","earnings-recession","asset-bubble","debt-risk","supply-shock"];
const read=p=>readFileSync(p,"utf8");
test("eight risk hero cards display source/evaluation date once in header, never below five comparisons",()=>{
 for(const slug of pages){
  const panel=read("app/"+slug+"/"+slug+"-panel.tsx");
  assert.match(panel,/<MarketCardHeader[^\n]*dateLabel=/,slug);
  assert.doesNotMatch(panel,/metaDate=\{dateLabel\(/,slug);
  assert.match(panel,/<MarketScoreOrb[^\n]*comparisonItems=\{/,slug);
 }
});
test("earnings still distinguishes main diagnostic date, score, comparison absence, and separate E1 trend",()=>{
 const panel=read("app/earnings-recession/earnings-recession-panel.tsx");
 assert.match(panel,/dateLabel="진단 기준일" date=\{dateLabel\(payload\?\.asOfDate\)\}/);
 assert.match(panel,/comparisonAriaLabel="실적 침체 진단 기간별 비교 자료 미확보"/);
 assert.match(panel,/E1 저장 추이/);
 assert.match(panel,/진단점수와 별도/);
 assert.match(panel,/data=\{trend\}/);
});
