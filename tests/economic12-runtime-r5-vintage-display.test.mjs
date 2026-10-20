import test from "node:test";import assert from "node:assert/strict";import{readFileSync}from"node:fs";
const s=readFileSync("app/economic-indicators/economic-detail-panel.tsx","utf8");
const catalog=readFileSync("lib/market-score/detail-catalog.mjs","utf8");
test("runtime G16 factor IDs have approved labels, not raw G010 codes",()=>{
 const defs=[["G010","제조업 신규주문"],["G019","산업생산"],["G035","비농업고용 증감"],["G060","신규 사업체 신청"]];
 for(const [id,label] of defs){
  assert.ok(s.includes(id+':"'+label+'"'),id);
  assert.ok(catalog.includes("id:'"+id+"',label:'"+label+"'"),id);
 }
 assert.ok(s.includes("indicatorLabel(item,id,i)"));
 assert.ok(s.includes('source??"출처 미제공"'));
});
test("history mismatch explicitly shows last score and date, not a guessed change",()=>{
 assert.ok(s.includes("data-history-alignment="));
 assert.ok(s.includes("lastSavedHistory.value.toFixed(1)"));
 assert.ok(s.includes("dateLabel(lastSavedHistory.label)"));
 assert.ok(s.includes("기간별 비교 보류"));
 assert.ok(s.includes('liquidityStoredScoreComparisons(history,lastSavedHistory?.label??"",score)'));
});
test("API missing period fields and UI computed periods remain distinct concepts",()=>{
 assert.ok(s.includes("domain?.scoreComparisons??computed"));
 assert.ok(s.includes("const computed=liquidityStoredScoreComparisons"));
 assert.ok(s.includes("history=useMemo(()=>normalizeTrend(domain?.trend)"));
});