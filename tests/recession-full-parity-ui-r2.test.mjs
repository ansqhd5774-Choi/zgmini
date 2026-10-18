import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const panel=read("app/recession/recession-panel.tsx");
const css=read("app/recession/recession-indicator-parity-r2.css");
const favoriteCss=read("app/recession/recession-favorite-r2.css");
const hero=read("app/recession/recession-hero-parity-r2.css");
const page=read("app/recession/page.tsx");
const notes=read("app/detail-investor-notes.tsx");
const favorite=read("app/recession/recession-favorite-button.tsx");
const history=read("app/beginner-risk-guide.tsx");

test("recession five periods use published stored R13 history and do not invent missing data",()=>{
 const builder=read("worker/projection-builders/recession.ts");
 const helper=read("worker/projection-builders/recession-stored-history.mjs");
 for(const [label,field] of [["1주","week"],["1개월","month"],["3개월","threeMonth"],["6개월","sixMonth"],["1년","year"]]){
  assert.ok(panel.includes('{label:"'+label+'",value:payload?.scoreComparisons?.'+field+'??null}'),label);
 }
 assert.match(builder,/const scoreComparisons=recessionStoredScoreComparisons\(trend,latestDate,current\.score\)/);
 assert.match(builder,/historyMode:"STORED_INPUTS_CURRENT_VINTAGE",lookAheadSafe:false,trend,scoreComparisons,components,supplementals/);
 assert.match(helper,/return \{week:null,month:difference\(1\),threeMonth:difference\(3\),sixMonth:difference\(6\),year:difference\(12\)\}/);
 assert.match(panel,/comparisonItems=\{scoreComparisonItems\}/);
 assert.doesNotMatch(panel,/<MarketScoreOrb[^\n]*metaDate=/,"recession score widget must not render a duplicate observation date");
 assert.doesNotMatch(panel,/dayDelta=\{/);
 assert.match(panel,/MarketFearGreedChart showExtrema data=\{trend\}/);
 assert.match(hero,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(hero,/\.recession-target-card \.zg-chart-extremum text/);
});

test("no source contract or missing value is fabricated while rendering parity indicator table",()=>{
 for(const label of ["즐겨찾기","이전","현재","발표","판단","미니차트(1Y)"])assert.ok(panel.includes(label),label);
 assert.match(panel,/useStoredIndex<Payload>\('\/api\/recession-detail'\)/);
 assert.match(panel,/const componentMeta:Record/);
 assert.match(panel,/const supplementalMeta:Record/);
 assert.match(panel,/const developmentCandidates=/);
 assert.match(panel,/return fmt\(row\?\.previousValue,unit\)/);
 assert.match(panel,/date:row\.nextReleaseDate\?dateLabel\(row\.nextReleaseDate\):"일정 미정"/);
 assert.match(panel,/points=\{row\?\.trend\}/);
 assert.match(panel,/points=\{row\.trend\}/);
 assert.doesNotMatch(panel,/recession-data-availability/);
 assert.match(panel,/「—」는 0이 아닙니다/); // The existing ⓘ tooltip keeps the missing-value explanation.
 assert.match(panel,/현재 개정 통계 · 경기침체 확률 아님/);

 assert.match(css,/recession-r2-mobile-spark/);
 assert.match(css,/text-overflow:clip/);
});
test("recession desktop table fits available width and keeps mini charts inside their cells",()=>{
 assert.match(css,/min-width:1090px;table-layout:fixed/);
 assert.match(favoriteCss,/min-width:1090px!important/);
 assert.doesNotMatch(css,/min-width:1280px/);
 assert.doesNotMatch(favoriteCss,/min-width:1152px/);
 assert.ok(css.includes(".recession-r2-spark-cell .inflation-mini-chart{width:112px;max-width:100%;height:32px}"));
 assert.ok(css.includes(".recession-r2-spark-cell .inflation-mini-chart-empty{min-width:0;max-width:100%}"));
});
test("favorite UI is isolated from inflation, with mobile and desktop accessibility",()=>{
 assert.match(panel,/RecessionFavoriteHeaderIcon/);
 assert.match(panel,/recession-r2-mobile-title/);
 assert.match(panel,/<RecessionFavoriteButton id=\{id\} label=\{meta\.label\}\/>/);
 assert.match(favorite,/zgmini:recession:favorites:v1/);
 assert.doesNotMatch(favorite,/zgmini:inflation:favorites:v1/);
 assert.match(favorite,/aria-pressed=\{active\}/);
 assert.match(favorite,/container\.appendChild\(node\)/);
});
test("recession beginner panels keep approved highlight, Current Vintage and verified methodology history",()=>{
 assert.match(page,/variant="beginner"/);
 assert.match(page,/highlight:"높은 쪽이 경기 방어에 유리"/);
 assert.match(page,/highlight:"현재 확보한 개정 통계\(Current Vintage\)"/);
 assert.match(page,/import "\.\.\/inflation\/inflation-beginner-reading-r1\.css"/);
 assert.match(notes,/topic==="inflation"\|\|topic==="recession"/);
 assert.match(history,/recession:\[/);
 assert.match(history,/version:"RECESSION_R13_CURRENT_VINTAGE",date:"2026-10-18"/);
 assert.match(history,/근거: GitHub PR #395/);
 assert.match(history,/item\.version===currentVersion/);
 assert.doesNotMatch(panel,/fetch\([^\n]*\/api\/collect/);
});
