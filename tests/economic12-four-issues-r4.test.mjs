import test from "node:test";import assert from "node:assert/strict";import{readFileSync}from"node:fs";
const page=readFileSync("app/economic-indicators/economic-detail-page.tsx","utf8"),panel=readFileSync("app/economic-indicators/economic-detail-panel.tsx","utf8"),css=readFileSync("app/economic-indicators/economic-detail.css","utf8");
test("economic inflation uses its own market domain, never the risk inflation panel",()=>{
 assert.ok(page.includes('<EconomicDetailPanel id={id}/>'));
 assert.doesNotMatch(page,/<InflationPanel|<BeginnerRiskGuide|<RiskDetailBeginnerLayout/);
 assert.ok(panel.includes('useStoredIndex<Snapshot>("/api/market-score")'));
 assert.ok(panel.includes('domain=payload?.domains?.find(item=>item.id===id)'));
 const risk=readFileSync("app/inflation/inflation-panel.tsx","utf8");
 assert.ok(risk.includes("useStoredIndex<InflationPayload>('/api/inflation-detail')"));
});
test("all remaining eleven pages share dashboard 0-25-40-60-75 score color/meaning",()=>{
 assert.ok(panel.includes('score<25?"#ef4444":score<40?"#f59e0b":score<60?"#94a3b8":score<75?"#22c55e":"#10b981"'));
 assert.ok(panel.includes('score<25?"위험":score<40?"주의":score<60?"중립":score<75?"양호":"안정"'));
 assert.ok(panel.includes("color={color}"));
});
test("unmatched score histories never fabricate period change",()=>{
 assert.ok(panel.includes("periodSourceMismatch"));
 assert.ok(panel.includes("Math.abs(lastSavedHistory.value-score)>1e-6"));
 assert.ok(panel.includes("liquidityStoredScoreComparisons(history,lastSavedHistory?.label??\"\",score)"));
 assert.ok(panel.includes("기간별 비교 보류"));
});
test("score-only saved constituents show evaluation score and disclose missing source values",()=>{
 for(const token of ["currentPresentation(item)","저장 평가점수 · 원자료 미제공","indicatorDescription(item,name)","technicalSource(item.source)","data-value-kind={present.type}"])assert.ok(panel.includes(token),token);
 assert.doesNotMatch(panel,/item\.content\?\?item\.description\?\?"저장된 구성지표"/);
});
test("return link uses same CTA as original inflation, no development/design reference link",()=>{
 assert.ok(panel.includes('className="cnn-return-cta economic-back-button" href="/"'));
 assert.equal((panel.match(/cnn-return-cta economic-back-button/g)||[]).length,1,"one standard return button");
 assert.doesNotMatch(panel,/economic-links/,"remove additional unrelated footer links");
 assert.ok(!panel.includes("인플레이션 상세 디자인 기준 ↗"));
 assert.ok(css.includes("ECONOMIC12 R4"));
});
