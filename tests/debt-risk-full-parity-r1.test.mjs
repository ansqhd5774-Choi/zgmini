import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const p=read("app/debt-risk/debt-risk-panel.tsx"),page=read("app/debt-risk/page.tsx"),css=read("app/debt-risk/debt-indicator-r2.css"),fav=read("app/debt-risk/debt-favorite-button.tsx"),guide=read("app/detail-investor-notes.tsx");
const ids=["dsr","debtGdp","rateBurden","creditStress","debtServiceCapacity"];
test("debt retains five approved indicator IDs and pending candidates",()=>{
 const part=p.match(/const order=\[([^\]]+)\] as const;/)?.[1];assert.ok(part);assert.deepEqual([...part.matchAll(/"([^"]+)"/g)].map(x=>x[1]),ids);
 for(const text of ["가계 연체율","기업 부도율","Refinancing Wall","Interest Coverage Breadth"])assert.ok(p.includes(text));
 assert.equal((p.match(/order\.map\(/g)||[]).length,2);assert.equal((p.match(/dev\.map\(/g)||[]).length,2);
 assert.match(p,/useStoredIndex<Payload>\('\/api\/debt-risk-detail'\)/);
});
test("desktop ten columns and dedicated 390px cards are truly safe for missing previous data",()=>{
 assert.equal((p.match(/<col className="debt-col-/g)||[]).length,10);
 assert.match(p,/className="debt-r2-mobile-list"/);
 assert.equal((p.match(/points=\{row\?\.trend\}/g)||[]).length,2);
 assert.equal((p.match(/fmtValue\(row\?\.previousValue,row\?\.unit\)/g)||[]).length,2);
 assert.match(p,/value:payload\?\.scoreComparisons\?\.week\?\?null/);
 assert.doesNotMatch(p,/periodDelta=|dayDelta=/);assert.match(p,/<MarketFearGreedChart showExtrema/);
 assert.match(css,/min-width:1090px!important/);assert.match(css,/@media\(max-width:767px\)/);assert.match(css,/debt-r2-mobile-list\{display:grid/);
 assert.match(fav,/zgmini:debt:favorites:v1/);assert.match(fav,/leftDevelopment!==rightDevelopment/);
});
test("beginner reading four questions and all eight shared notes styles",()=>{
 assert.equal((page.match(/\{title:"[^"]+\?",text:/g)||[]).length,4);
 assert.match(page,/<BeginnerRiskGuide topic="debt-risk"\/>/);assert.match(page,/variant="beginner"/);
 assert.match(guide,/topic==="asset-bubble"\|\|topic==="debt-risk"\|\|topic==="supply-shock"\?"beginner"/);
});
