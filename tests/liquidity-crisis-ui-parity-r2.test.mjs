import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const panel=readFileSync("app/liquidity-crisis/liquidity-crisis-panel.tsx","utf8");
const style=readFileSync("app/liquidity-crisis/liquidity-indicator-r2.css","utf8");
const favorite=readFileSync("app/liquidity-crisis/liquidity-favorite-button.tsx","utf8");
const builder=readFileSync("worker/projection-builders/liquidityCrisis.ts","utf8");
test("all thirteen saved liquidity indicators and five pending candidates retained",()=>{
 assert.match(panel,/Primary Dealer Financing/);
 assert.match(panel,/bond30y/);
 assert.match(panel,/const order=\["sofrIorb","obfrIorb","repoGap"/);
 assert.match(panel,/const dev=\[/);
 assert.match(panel,/\{order\.map\(id=>/);
 assert.match(panel,/\{dev\.map\(item=>/);
 assert.match(builder,/const indicators=\[/);
});
test("liquidity detail uses same ten columns as inflation and only stored values",()=>{
 for(const s of ["즐겨찾기","지표","내용","기준","이전","현재","발표","판단","미니차트(1Y)"])assert.ok(panel.includes(s),s);
 assert.match(panel,/useStoredIndex<Payload>\('\/api\/liquidity-crisis-detail'\)/);
 assert.match(panel,/points=\{row\?\.trend\}/);
 assert.match(panel,/fmtValue\(row\?\.previousValue,row\?\.unit\)/);
 assert.doesNotMatch(panel,/내부점수 /);
 assert.doesNotMatch(panel,/metaDate=\{dateLabel\(payload\?\.asOfDate\)\}/);
 assert.ok(style.includes("min-width:1080px!important"));
});
test("favorite reorder stays in liquidity and keeps development indicators last",()=>{
 assert.match(favorite,/zgmini:liquidity:favorites:v1/);
 assert.match(favorite,/liquidity-r2-indicators tbody/);
 assert.match(favorite,/leftDevelopment!==rightDevelopment/);
 assert.doesNotMatch(favorite,/zgmini:recession:favorites:v1/);
});
test("no formula or remote data fetch introduced into liquidity UI",()=>{
 assert.match(builder,/liquidityCrisisDefense\(/);
 assert.match(builder,/historyMode:"STORED_PUBLIC_SCORE_HISTORY_NO_INTERPOLATION"/);
 assert.doesNotMatch(panel,/fetch\(/);
});
