import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const paths=["app/inflation/inflation-panel.tsx","app/recession/recession-panel.tsx","app/liquidity-crisis/liquidity-crisis-panel.tsx"];
const panels=paths.map(read);
const css=read("app/shared-risk-indicator-width-r1.css");
const sizes=[4,15,17,11,10,10,10,7,12,4];
test("all three detail panels share one 10-column width contract and mobile cards remain",()=>{
 for(const [i,p] of panels.entries()){
  assert.match(p,/import "\.\.\/shared-risk-indicator-width-r1\.css"/,paths[i]);
  assert.match(p,/<colgroup>/,paths[i]);
  assert.equal((p.match(/<colgroup>/g)||[]).length,1,paths[i]);
  assert.ok(p.includes("inflation-indicator-table"),paths[i]);
  assert.match(p,/mobile-list/,paths[i]);
 }
 assert.equal(sizes.reduce((sum,x)=>sum+x,0),100);
 for(const [i,n] of sizes.entries())assert.ok(css.includes(`col:nth-child(${i+1}){width:${n}%!important;}`),`column ${i+1}`);
 assert.match(css,/min-width:1090px!important/);
 assert.match(css,/overflow-x:auto/);
 assert.match(css,/width:auto!important/);
});
test("recession table header leads directly into table without extra explanation",()=>{
 assert.doesNotMatch(panels[1],/recession-data-availability/);
 assert.doesNotMatch(panels[1],/이전 값·1년 추이·발표 예정일은 저장된 자료가 있을 때만 표시합니다/);
 for(const p of panels)assert.match(p,/<section className="inflation-indicator-section/);
});
test("formula and published-value connectors remain unchanged",()=>{
 assert.match(panels[0],/useStoredIndex<Payload>\('\/api\/inflation-detail'\)/);
 assert.match(panels[1],/useStoredIndex<Payload>\('\/api\/recession-detail'\)/);
 assert.match(panels[2],/useStoredIndex<Payload>\('\/api\/liquidity-crisis-detail'\)/);
});
