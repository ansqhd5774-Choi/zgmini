import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const iran=read("app/outbreak-beginner-iran-r54.tsx");
const css=read("app/outbreak-beginner-iran-r54.css");
const page=read("app/outbreak-events.tsx");
const source=read("app/iran-progress.tsx");
test("approved Iran beginner detail is selected while the prior data consumer and summary remain intact",()=>{
 assert.match(page,/import IranDetail from '\.\/outbreak-beginner-iran-r54'/);
 assert.match(page,/event\.id==='iran'\?<IranDetail view=\{iran\}\/>/);
 assert.match(source,/useStoredIndex<any>\('\/api\/iran-progress'\)/);
 assert.match(source,/function IranChart\(/);
 assert.match(source,/export function IranSummaryCard/);
 assert.doesNotMatch(iran,/\/api\/|fetch\(|Math\.random|setTimeout|publish\(/);
});
test("live 14-calendar-day history stays provisional, carried segments dotted, no fabricated observations",()=>{
 assert.match(iran,/end-13\*DAY_MS/);
 assert.match(iran,/p\.at>=start&&p\.at<=end!/);
 assert.match(iran,/strokeDasharray=\{carried\(p\)\?"5 5":undefined\}/);
 assert.match(iran,/if\(p\.at-prev\.at>DAY_MS\*1\.5\)return null/);
 assert.match(iran,/14일 추이/);
 assert.match(iran,/실제 과거 확정 관측값이 아닌/);
 assert.match(iran,/교전 중단을 뜻하지 않습니다/);
 assert.doesNotMatch(iran,/19\.0|13\.0|2026-10-20|2026-10-21/);
});
test("score bands follow existing five boundaries and neutral grey, not a new formula",()=>{
 for(const term of ["value<25","value<40","value<60","value<75","#ef4444","#f59e0b","#94a3b8","#22c55e","#10b981"])assert.ok(iran.includes(term),term);
 assert.match(css,/grid-template-columns:25fr 15fr 20fr 15fr 25fr/);
 assert.match(iran,/score===null\?"—":score\.toFixed\(1\)/);
 assert.match(iran,/확정 비교값 미제공/);
 assert.match(iran,/종전 확률이나 미래 종료 날짜를 뜻하지 않습니다/);
});
test("approved layout has actual beginner explanation, verifiable relation states and evidence disclosures",()=>{
 for(const x of ["이 숫자는 무슨 뜻인가요?","주식 초보자용 해석","교전 관계별 상태","점수 반영 이유","산식·근거 보기","최근 14일 확인된 공식 발표"]){
  assert.ok(iran.includes(x),x);
 }
 assert.match(iran,/relation\("IRN_ISR"\)/);
 assert.match(iran,/relation\("IRN_USA"\)/);
 assert.match(iran,/view\.overallEnded\?"확인":"미확인"/);
 assert.match(iran,/view\.events\.map/);
 assert.match(iran,/view\.facts\.map/);
 assert.match(iran,/target="_blank" rel="noreferrer"/);
 assert.match(iran,/비공개 세부 산식은 공개하지 않습니다/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(max-width:1240px\)/);
 assert.match(css,/\.ob54-disclosure summary:focus-visible/);
 assert.doesNotMatch(css,/\.zg-community-chat|\.zg-dashboard-secondary/);
});
