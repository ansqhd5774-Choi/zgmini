import test from "node:test";import assert from "node:assert/strict";import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const panel=read("app/economic-indicators/economic-detail-panel.tsx"),chart=read("app/market-fear-greed-chart.tsx"),css=read("app/economic-indicators/economic-detail.css"),page=read("app/economic-indicators/economic-detail-page.tsx");
test("only twelve economic market detail charts adopt dashboard score-zone colors and guide thresholds",()=>{
 assert.ok(chart.includes("marketScoreBands = false"),"unrelated risk charts remain unchanged");
 assert.ok(chart.includes("marketScoreBands?: boolean"));
 for(const color of ["#ef4444","#f59e0b","#94a3b8","#22c55e","#10b981"])assert.ok(chart.includes('fill="'+color+'"'),color);
 for(const tick of ["y={40}","y={60}"])assert.ok(chart.includes(tick),tick);
 assert.match(chart,/marketScoreBands\?\(tooltipValue===null/);
 assert.ok(panel.includes("formatTooltipLabel={dateLabel} marketScoreBands"));
 assert.ok(panel.includes('score<25?"#ef4444":score<40?"#f59e0b":score<60?"#94a3b8"'));
});
test("five displayed comparison slots fallback only to validated same-lineage saved series",()=>{
 assert.match(panel,/liquidityStoredScoreComparisons\(history,lastSavedHistory\?\.label\?\?"",score\)/);
 assert.match(panel,/const producer=domain\?\.scoreComparisons/);
 for(const prop of ["week","month","threeMonth","sixMonth","year"])assert.ok(panel.includes(prop+":producer?."+prop+"??computed."+prop),prop);
 const guard=read("worker/projection-builders/liquidity-stored-history.mjs");
 assert.ok(guard.includes("Math.abs(current.value-score)>1e-6"),"no mismatched history interpolation");
 assert.ok(panel.includes("periodSourceMismatch"));
});
test("economic detail shows all stored indicators, Growth 24/24, and no invented raw values",()=>{
 assert.ok(panel.includes("const observations=(domain?.indicators??[])"));
 assert.ok(panel.includes('{id==="growth"?observations.length+"/24":observations.length}개'));
 assert.ok(panel.includes('observations.length!==24'),"incomplete 24-factor release is visible, not misreported as complete");
 assert.ok(!panel.includes("24개 전체 가중요인이 아닌 공개된 대표 4개"));
 assert.ok(panel.includes("indicatorLabel(item,id,i)"));
 assert.ok(panel.includes("currentPresentation(item)"));
 assert.ok(page.includes('<EconomicDetailPanel id={id}/>'));
 assert.doesNotMatch(page,/<InflationPanel/);
 assert.ok(panel.includes('marketScoreBands={id!=="inflation"}'),"original inflation gauge thresholds retained; other eleven use market zones");
});
test("one simple return button matches original inflation detail, no extra development navigation",()=>{
 assert.ok(panel.includes('<a className="cnn-return-cta economic-back-button" href="/">'));
 assert.doesNotMatch(panel,/<nav className="economic-links"/);
 assert.doesNotMatch(panel,/인플레이션 상세 디자인 기준/);
 assert.ok(css.includes(".economic-detail-page>.economic-back-button"));
 assert.ok(read("app/inflation/inflation-panel.tsx").includes('<a className="cnn-return-cta" href="/">'));
});
