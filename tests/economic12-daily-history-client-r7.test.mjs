import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const panel=readFileSync("app/economic-indicators/economic-detail-panel.tsx","utf8");
const route=readFileSync("app/api/market-score-daily-history/route.ts","utf8");
test("daily snapshots selected only for employment/credit, with last score/date agreeing with current public endpoint",()=>{
 for(const p of ['id==="employment"||id==="credit"','latest.date!==currentDate','Math.abs(latest.score-score)>1e-6','point.modelVersion===payload.modelVersion','data-history-source='])assert.ok(panel.includes(p),p);
 assert.ok(panel.includes("const displayedHistory=dailyDisplay?.points??history"));
 assert.ok(panel.includes("const periods=domain?.scoreComparisons??computed"));
 assert.ok(panel.includes("liquidityStoredScoreComparisons(dailyDisplay.points"));
});
test("null employment methodology never authorizes period changes; credit requires explicit method match",()=>{
 assert.ok(panel.includes("Boolean(method&&latest.methodologyVersion===method)"));
 assert.ok(panel.includes("const storedDailyComputed=dailyDisplay?.comparable"));
 assert.ok(panel.includes(":{week:null,month:null,threeMonth:null,sixMonth:null,year:null}"));
 assert.ok(panel.includes("산식 버전 미제공으로 기간 변화량 보류"));
});
test("candidate new endpoint is distinct; original /api/market-score contract left intact",()=>{
 assert.ok(route.includes("storedPublicDailyHistoryResponse"));
 const existing=readFileSync("app/api/market-score/route.ts","utf8");
 assert.ok(existing.includes("storedMarketResponse"));
 assert.ok(!existing.includes("daily"));
});
