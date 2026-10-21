import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const iran=read("app/outbreak-beginner-iran-r54.tsx");
const rate=read("app/outbreak-beginner-fed-r53.tsx");
const css=read("app/outbreak-iran-parity-r55.css");
const evidence=read("tests/outbreak-scenarios-browser-r51.mjs");

test("approved R53 layout is applied to Iran without extending to other event pages",()=>{
 for(const klass of ["ob-beginner-detail","ob53-title","ob53-intro-grid","ob53-score-card","ob53-metric-row","ob53-current","ob53-week","ob53-asof","ob53-explain","ob53-main-grid","ob53-beginner-stack","ob53-guide"]){
  assert.ok(rate.includes(klass),"Rate source missing "+klass);
  assert.ok(iran.includes(klass),"Iran must reuse "+klass);
 }
 assert.match(iran,/ob55-iran-parity/);
 assert.match(iran,/ob55-score-card[\s\S]*?<Scale score=\{score\}\/>/);
 assert.match(iran,/ob55-intro[\s\S]*?ob54-meaning/);
 assert.match(iran,/ob55-main[\s\S]*?<Trend view=\{view\}\/>/);
 assert.match(css,/\.ob55-iran-parity/);
 assert.doesNotMatch(css,/\.zg-dashboard-secondary|\.zg-community-chat|\.ob-summary-card/);
});

test("Iran source values, provisional timeline and factual status remain untouched",()=>{
 assert.match(iran,/score===null\?"—":score\.toFixed\(1\)/);
 assert.match(iran,/확정 비교값 미제공/);
 assert.match(iran,/view\.relations\?\.\[key\]/);
 assert.match(iran,/view\.overallEnded\?"확인":"미확인"/);
 assert.match(iran,/end-13\*DAY_MS/);
 assert.match(iran,/strokeDasharray=\{carried\(p\)\?"5 5":undefined\}/);
 assert.match(iran,/비공개 세부 산식은 공개하지 않습니다/);
 assert.doesNotMatch(iran,/19\.0|13\.0|2026-10-21|Math\.random/);
});

test("PC and mobile use matching R53 proportions and accessibility",()=>{
 assert.match(css,/grid-template-columns:minmax\(0,1\.62fr\) minmax\(245px,1fr\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1\.5fr\) minmax\(245px,1fr\)/);
 assert.match(css,/@media\(max-width:1240px\)/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(iran,/aria-labelledby="ob54-meaning"/);
 assert.match(iran,/aria-labelledby="ob54-guide"/);
 assert.match(evidence,/Iran uses the same grid breakpoints as the approved rate detail/);
});
