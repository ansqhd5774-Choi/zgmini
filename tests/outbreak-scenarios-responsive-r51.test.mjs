import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=readFileSync("app/outbreak-events.tsx","utf8");
const css=readFileSync("app/outbreak-scenarios-r51.css","utf8");
const page=readFileSync("app/page.tsx","utf8");
const iran=readFileSync("app/iran-progress.tsx","utf8");

test("redesign only scenarios view and leave the dashboard summary unchanged",()=>{
 assert.match(page,/view==='scenarios'&&<OutbreakEvents initialEvent=\{outbreakEvent\}\/>/);
 assert.match(src,/import '\.\/outbreak-scenarios-r51\.css';/);
 assert.match(css,/\.ob-events \.ob-cards/);
 assert.match(css,/\.ob-events \.ob-selected-event-panel/);
 assert.doesNotMatch(css,/\.ob-summary|\.zg-dashboard-secondary|\.ob-summary-track/);
 assert.match(src,/export function OutbreakSummary/);
 assert.match(src,/export default function OutbreakEvents/);
});
test("all three original choices and stored indicator semantics are preserved",()=>{
 for(const id of ["fed","iran","ukraine"])assert.ok(src.includes("id:'"+id+"'"));
 assert.match(src,/const rate=useRateSentiment\(\);/);
 assert.match(src,/const iran=useIranProgress\(\);/);
 assert.match(src,/value===null\?"—":value\.toFixed\(1\)/);
 assert.match(src,/item\.id==="ukraine"\?"%":"점"/);
 assert.match(src,/item\.id==="iran"\?iran\.score:null/);
 assert.match(src,/aria-pressed=\{selectedCard\}/);
 assert.match(src,/aria-controls="ob-selected-event-panel"/);
 assert.match(src,/event\.id==='iran'\?<IranDetail view=\{iran\}\/>/);
 assert.match(iran,/잠정 추정 차트/);
 assert.doesNotMatch(src,/Math\.random|mockScore|demoProbability/);
});
test("the selected analysis prioritizes actual trend, facts, then optional methodology",()=>{
 assert.match(src,/ob-standard-detail/);
 assert.match(src,/ob-method-disclosure/);
 assert.match(src,/<details className="ob-formula ob-method-disclosure">/);
 assert.match(src,/<summary className="ob-method-summary">/);
 assert.match(src,/className="ob-method-body"/);
 assert.match(css,/\.ob-standard-detail>\.ob-detail-grid\{order:1\}/);
 assert.match(css,/\.ob-standard-detail>\.ob-definition\{order:2\}/);
 assert.match(css,/\.ob-standard-detail>\.ob-method-disclosure\{order:3\}/);
 assert.match(src,/금리 심리 점수는 FedWatch 확률이 아니며/);
 assert.match(src,/현재는 화면 구성만 제공합니다/);
});
test("breakpoints, contrast tokens and keyboard focus remain scoped to the scenarios",()=>{
 assert.match(css,/@media\(max-width:980px\)/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(max-width:410px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.ob-card:focus-visible/);
 assert.match(css,/grid-template-columns:1fr/);
 assert.match(css,/--zg-neutral-fill/);
 assert.match(css,/--zg-gold-start/);
 assert.doesNotMatch(css,/\.zg-risk-side-rails-root|\.zg-r55-card|\.zg-community/);
});
