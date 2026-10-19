import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const p=read("app/supply-shock/supply-shock-panel.tsx"),page=read("app/supply-shock/page.tsx"),css=read("app/supply-shock/supply-indicator-r2.css"),favorite=read("app/supply-shock/supply-favorite-button.tsx"),guide=read("app/detail-investor-notes.tsx");
test("supply preserves five G/E/O/P/I factor identities and four original development candidates",()=>{
 const part=p.match(/const order=\[([^\]]+)\] as const;/)?.[1];assert.ok(part);
 assert.deepEqual([...part.matchAll(/['"]([^'"]+)['"]/g)].map(x=>x[1]),["G","E","O","P","I"]);
 for(const x of ["운임지수","배송지연","반도체 공급","식품 원자재"])assert.ok(p.includes(x));
 assert.equal((p.match(/order\.map\(/g)||[]).length,2);assert.equal((p.match(/dev\.map\(/g)||[]).length,2);
 assert.match(p,/scoreObservationMonth/);assert.match(p,/date=\{payload\?\.scoreObservationMonth\?\?'—'\}/);
 assert.match(p,/asOfDate/);assert.match(p,/useStoredIndex<Payload>\('\/api\/supply-shock-detail'\)/);
});
test("ten-column desktop table, mobile cards and evidence-safe null comparison / real per-factor trends",()=>{
 assert.equal((p.match(/<col className="supply-col-/g)||[]).length,10);
 assert.match(p,/className="supply-r2-mobile-list"/);
 assert.equal((p.match(/points=\{row\?\.trend\}/g)||[]).length,2);
 assert.equal((p.match(/fmtValue\(row\?\.previousValue,row\?\.unit\)/g)||[]).length,2);
 assert.match(p,/value:payload\?\.scoreComparisons\?\.week\?\?null/);
 assert.doesNotMatch(p,/dayDelta=|periodDelta=/);assert.match(p,/<MarketFearGreedChart showExtrema/);
 assert.match(css,/min-width:1090px!important/);assert.match(css,/@media\(max-width:767px\)/);assert.match(css,/supply-r2-mobile-list\{display:grid/);
 assert.match(favorite,/zgmini:supply:favorites:v1/);assert.match(favorite,/leftDevelopment!==rightDevelopment/);
});
test("beginner reading retains four questions and already approved shared card topic variants",()=>{
 assert.equal((page.match(/\{title:"[^"]+\?",text:/g)||[]).length,4);
 assert.match(page,/<BeginnerRiskGuide topic="supply-shock"\/>/);assert.match(page,/variant="beginner"/);
 assert.match(guide,/topic==="asset-bubble"\|\|topic==="debt-risk"\|\|topic==="supply-shock"\?"beginner"/);
});
