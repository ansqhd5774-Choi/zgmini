import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {liquidityReleaseInfo} from "../app/liquidity-crisis/liquidity-release-calendar.mjs";
const panel=readFileSync("app/liquidity-crisis/liquidity-crisis-panel.tsx","utf8");
const rows=["sofrIorb","obfrIorb","repoGap","sofrIorbRv20","bankEmergency","bankReserves","tga","onRrp","m2","bond2y","bond5y","bond10y","bond30y"];
test("exactly 13 liquidity release cells, no fabricated input observations",()=>{
 assert.deepEqual(rows.map(id=>liquidityReleaseInfo(id,"2026-10-18").next),[
 "2026-10-19","2026-10-19","2026-10-19","2026-10-19",
 "2026-10-22","2026-10-22","2026-10-22","2026-10-19","2026-10-27",
 "2026-10-19","2026-10-19","2026-10-19","2026-10-19"
 ]);
 assert.ok(rows.every(id=>liquidityReleaseInfo(id,"2026-10-18").next!==null));
});
test("official H6 calendar is distinguished from expected derived dates",()=>{
 assert.deepEqual(liquidityReleaseInfo("m2","2026-10-18"),{cadence:"월간",next:"2026-10-27",basis:"official",text:"10.27 · 공식"});
 assert.equal(liquidityReleaseInfo("m2","2026-10-28").next,"2026-11-24");
 assert.equal(liquidityReleaseInfo("m2","2026-11-25").next,"2026-12-22");
 assert.equal(liquidityReleaseInfo("m2","2027-01-01").basis,"expected");
 assert.equal(liquidityReleaseInfo("bankReserves","2026-10-18").basis,"expected");
});
test("source holidays and weekend closures are excluded",()=>{
 assert.equal(liquidityReleaseInfo("bond2y","2026-11-10").next,"2026-11-12");
 assert.equal(liquidityReleaseInfo("sofrIorb","2026-07-02").next,"2026-07-06");
 assert.equal(liquidityReleaseInfo("onRrp","2026-10-16").next,"2026-10-19");
 assert.equal(liquidityReleaseInfo("bankReserves","2026-11-25").next,"2026-11-27");
});
test("actual verified API date outranks expected; missing/out-of-range stays absent",()=>{
 const api=liquidityReleaseInfo("sofrIorb","2026-10-18","2026-10-20");
 assert.deepEqual(api,{cadence:"거래일",next:"2026-10-20",basis:"official",text:"10.20 · 공식"});
 assert.equal(liquidityReleaseInfo("sofrIorb","2028-12-30").next,null);
 assert.equal(liquidityReleaseInfo("bad","2026-10-18").text,"일정 미정");
});
test("same release helper powers desktop and mobile without score or writer edits",()=>{
 assert.equal((panel.match(/liquidityReleaseInfo\(id,today,row\?\.nextReleaseDate\)/g)||[]).length,2);
 assert.equal((panel.match(/\{release\.text\}/g)||[]).length,2);
 assert.match(panel,/useStoredIndex<Payload>\('\/api\/liquidity-crisis-detail'\)/);
 assert.doesNotMatch(panel,/\bfetch\s*\(/);
});
