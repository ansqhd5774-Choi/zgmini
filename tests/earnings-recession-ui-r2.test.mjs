import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const panel=readFileSync("app/earnings-recession/earnings-recession-panel.tsx","utf8");
const css=readFileSync("app/earnings-recession/earnings-indicator-r2.css","utf8");
const fav=readFileSync("app/earnings-recession/earnings-favorite-button.tsx","utf8");
test("earnings R2 keeps main diagnostic and stored E1 histories separate",()=>{
 assert.match(panel,/diagnosticScore=typeof payload\?\.score/);
 assert.match(panel,/storedScore=typeof stored\?\.score/);
 assert.match(panel,/진단점수와 별도/);
});
test("earnings R2 supports all approved R4 and R5 stored component IDs",()=>{
 assert.match(panel,/const r4Order=\["epsGrowth","margin","revenueGrowth","earningsGrowthBreadth"\]/);
 assert.match(panel,/const r5Order=\["S1","S2","S3","S4","S5","S6","S7","S8","S9","S10","S11","S12","S13"\]/);
 assert.match(panel,/activeMeta=isR5\?r5Meta:r4Meta/);
});
test("earnings R2 uses saved observations and explicit missing instead of fabricated history",()=>{
 assert.match(panel,/fmt\(r\)/);
 assert.match(panel,/dateLabel\(r\?\.observationDate\)/);
 assert.doesNotMatch(panel,/scoreComparisons/);
 assert.match(css,/cnn-score-comparisons\{display:none!important\}/);
});
test("earnings R2 renders desktop and mobile from identical source row IDs",()=>{
 assert.match(panel,/earnings-r2-table-wrap/);
 assert.match(panel,/earnings-r2-mobile-list/);
 assert.equal((panel.match(/activeOrder\.map\(id=>/g)||[]).length,2);
 assert.match(css,/overflow-x:auto/);
 assert.match(css,/@media\(max-width:767px\)/);
});
test("favorite reorder is earnings-only and development candidates stay below active",()=>{
 assert.match(fav,/zgmini:earnings:favorites:v1/);
 assert.match(fav,/earnings-r2-mobile-list/);
 assert.match(fav,/leftDevelopment!==rightDevelopment/);
 assert.doesNotMatch(fav,/zgmini:credit:favorites/);
});
test("earnings R2 suppresses unavailable comparison placeholders despite shared hero CSS",()=>{
 assert.match(css,/\.fg-card\.fg-shared-shell\.earnings-recession-target-card \.cnn-score-comparisons\{display:none!important\}/);
 assert.match(panel,/earnings-r2-chart-identity/);
 assert.match(panel,/\{stored\?\.financialPeriodEnd\?<span>/);
 assert.match(css,/earnings-r2-chart-identity/);
});

test("earnings 1Y chart preserves all stored observations but labels each month only once",()=>{
 assert.ok(panel.includes("axisTicks=[...new Map(trend.map(p=>[p.date.slice(0,7),p.date])).values()]"));
 const data=["2025-09-30","2025-12-31","2026-03-31","2026-06-30","2026-10-16","2026-10-17"];
 const ticks=[...new Map(data.map(date=>[date.slice(0,7),date])).values()];
 assert.equal(data.length,6);
 assert.deepEqual(ticks,["2025-09-30","2025-12-31","2026-03-31","2026-06-30","2026-10-17"]);
});

test("earnings R3 labels separately verified universe and eligible issuer counts",()=>{
 assert.match(panel,/universeCount\?:number\|null/);
 assert.match(panel,/분석 모집단 \{stored\.universeCount\.toLocaleString/);
 assert.match(panel,/유효 기업 \{stored\.issuerCount\.toLocaleString/);
 assert.doesNotMatch(panel,/대상 기업 \{stored\.issuerCount/);
});

test("R5 table and mobile show evaluation date instead of claiming a source observation date",()=>{
 assert.match(panel,/<th>\{isR5\?"평가 기준일":"관측일"\}<\/th>/);
 assert.match(panel,/<div><span>\{isR5\?"평가 기준일":"관측일"\}<\/span><strong>\{dateLabel\(r\?\.observationDate\)\}<\/strong><\/div>/);
 const notes=readFileSync("app/detail-investor-notes.tsx","utf8");
 assert.match(notes,/topic==="earnings-recession"\?"E1-R5 표의 평가 기준일은 저장된 실적 자료를 종합 평가한 날짜입니다/);
 assert.match(notes,/각각의 관측 기간이나 공식 발표일이 아닙니다/);
});
