import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const css=readFileSync("app/outbreak-scenarios-r51.css","utf8");
const source=readFileSync("app/outbreak-events.tsx","utf8");
const iran=readFileSync("app/iran-progress.tsx","utf8");

test("desktop scenario workspace uses a dedicated compact list and a data-first analysis panel",()=>{
 assert.match(css,/@media\(min-width:1100px\)/);
 assert.match(css,/grid-template-columns:252px minmax\(0,1fr\)/);
 assert.match(css,/\.ob-events>\.ob-cards\{/);
 assert.match(css,/\.ob-events>\.ob-selected-event-panel\{/);
 assert.match(css,/\.ob-events \.ob-card>p\{display:none\}/);
 assert.match(css,/\.ob-events \.ob-chart-empty\{height:228px/);
 assert.match(css,/@media\(min-width:701px\) and \(max-width:1099px\)/);
 assert.match(css,/@media\(max-width:700px\)/);
});
test("event scores and units remain stored and missing is never inferred",()=>{
 assert.match(source,/const rate=useRateSentiment\(\)/);
 assert.match(source,/const iran=useIranProgress\(\)/);
 assert.match(source,/const value=item\.id==="fed"&&rate\?rate\.score:item\.id==="iran"\?iran\.score:null/);
 assert.match(source,/value===null\?"—":value\.toFixed\(1\)/);
 assert.match(source,/const unit=item\.id==="ukraine"\?"%":"점"/);
 assert.match(source,/event\.id==='iran'\?<IranDetail view=\{iran\}\/>/);
 assert.match(iran,/잠정 추정 차트/);
 assert.doesNotMatch(source,/Math\.random|fakeScore|demoProbability/);
});
test("neutral rate series color reuses approved five-band state semantics",()=>{
 assert.match(source,/const rateChartColor=rate===null\?'#94a3b8':rate\.score<25\?'#ef4444':rate\.score<40\?'#f59e0b':rate\.score<60\?'#94a3b8':rate\.score<75\?'#22c55e':'#10b981'/);
 assert.match(source,/stroke=\{rateChartColor\}/);
 assert.match(source,/fill=\{rateChartColor\}/);
 assert.doesNotMatch(source,/stroke="#22c55e" strokeWidth="2\.5"/);
});
test("secondary explanations remain accessible, not removed or published elsewhere",()=>{
 assert.match(source,/<details className="ob-definition ob-definition-disclosure">/);
 assert.match(source,/분석 질문 · 판정 기준/);
 assert.match(source,/발생 판정 기준/);
 assert.match(source,/ob-method-disclosure/);
 assert.match(source,/금리 심리 점수는 FedWatch 확률이 아니며/);
 assert.match(css,/\.ob-definition-disclosure>summary:focus-visible/);
 assert.doesNotMatch(css,/\.ob-summary-card|\.zg-dashboard-secondary|\.zg-community-chat/);
});
