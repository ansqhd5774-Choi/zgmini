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
 assert.match(css,/\.cnn-score-comparisons\.is-multi\{/);
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
test("earnings R47 shows explicit missing periods without manufacturing historical comparison values",()=>{
 assert.match(css,/\.earnings-recession-target-card \.cnn-score-comparisons\.is-multi\{/);
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
 assert.match(panel,/<th>이전<\/th><th>현재<\/th><th>발표<\/th><th>판단<\/th><th>미니차트\(1Y\)<\/th>/);
 assert.match(panel,/<small>\{isR5\?"평가 ":"관측 "\}\{dateLabel\(r\?\.observationDate\)\}<\/small>/);
 const notes=readFileSync("app/detail-investor-notes.tsx","utf8");
 assert.match(notes,/topic==="earnings-recession"\?"E1-R5 표의 평가 기준일은 저장된 실적 자료를 종합 평가한 날짜입니다/);
 assert.match(notes,/각각의 관측 기간이나 공식 발표일이 아닙니다/);
});

test("earnings UI parity: hero typography, compact question intro and four-question official-source guide are present",()=>{
 const intro=readFileSync("app/search-intent-intro.tsx","utf8");
 const page=readFileSync("app/earnings-recession/page.tsx","utf8");
 assert.match(intro,/if\(topic==="earnings-recession"\)/);
 assert.match(intro,/미국 기업 실적, <span className="text-sky-300">침체 신호는\?/);
 assert.match(css,/\.fg-card\.fg-shared-shell\.earnings-recession-target-card\{\s*--fg-title-size:20px/);
 assert.match(css,/@media\(max-width:767px\)/);
 assert.match(css,/--fg-title-size:16px/);
 assert.match(page,/DetailReadingGuide/);
 assert.match(page,/inflation-beginner-reading-r1\.css/);
 for(const question of ["메인 진단과 E1 저장 점수는 왜 다른가요?","점수가 높으면 실적 침체가 없다는 뜻인가요?","분석 모집단은 모두 유효한 기업인가요?","평가 기준일과 1년 차트는 어떻게 읽나요?"])assert.ok(page.includes(question),question);
 for(const source of ["https://www.sec.gov/edgar/search/","https://www.bea.gov/data/income-saving/corporate-profits","https://www.bls.gov/ppi/"])assert.ok(page.includes(source),source);
});
test("earnings parity: absent source-derived per-indicator prior, next release or one-year sparkline remain missing, never synthesized",()=>{
 const projection=readFileSync("worker/projection-builders/earningsRecession.ts","utf8");
 assert.match(projection,/observationDate:x\?\.asOfDate/);
 assert.match(projection,/trend:/);
 assert.doesNotMatch(panel,/new Date\(\).*nextReleaseDate|fakeMiniTrend|synthesizedPrior/);
 assert.match(panel,/InflationMiniChart/);
 assert.match(panel,/r\?\.historyKind==="CURRENT_VINTAGE_SOURCE_PERIOD_END"/);
 assert.match(panel,/dateLabel\(r\?\.observationDate\)/);
});

test("Earnings guide never hardcodes live score or universe count into evergreen descriptions",()=>{
 const page=readFileSync("app/earnings-recession/page.tsx","utf8");
 for(const value of ["84.7점은","73.5점은","500개는"])assert.ok(!page.includes(value),value);
 assert.match(page,/실적 버전에 따라 구성지표가 달라질 수 있어요/);
});


test("R12: E1-R5 reconstructed history is never presented as contemporaneously published trend",()=>{
 const page=readFileSync("app/earnings-recession/page.tsx","utf8");
 assert.match(panel,/사후 재구성 추이/);
 assert.match(panel,/재구성 평가 기준일 \$\{dateLabel\(value\)\}/);
 assert.match(panel,/formatTooltipLabel=\{value=>isR5\?/);
 assert.match(panel,/원자료의 공식 발표일이 아닙니다/);
 assert.equal((panel.match(/isR5=\{isR5\}/g)||[]).length,2);
 assert.match(page,/현재 보유 자료를 과거 평가 시점에 맞춰 사후 재구성한 결과예요/);
 assert.match(page,/당시 투자자가 알 수 있었던 신호로 해석하면 안 돼요/);
 assert.doesNotMatch(page,/차트는 저장된 실제 점만 표시하므로/);
});

test("all four earnings beginner emphasis phrases actually appear in their corresponding section text",()=>{
 const page=readFileSync("app/earnings-recession/page.tsx","utf8");
 const sections=[...page.matchAll(/\{title:"([^"]+)",text:"([^"]+)",highlight:"([^"]+)",bold:"([^"]+)"\}/g)];
 assert.equal(sections.length,4);
 for(const [,title,body,highlight,bold] of sections){
  assert.ok(body.includes(highlight),title+" highlight not in body");
  assert.ok(body.includes(bold),title+" bold not in body");
 }
 const health=readFileSync("scripts/seo-production-health.mjs","utf8");
 assert.match(health,/평가 기준일·사후 재구성 추이/);
});

test("R46 earnings hero uses real score polarity and dated extrema without inventing period comparisons",()=>{
 assert.match(panel,/data-score-tone=\{scoreTone\}/);
 assert.match(panel,/const scoreTone=judge\(diagnosticScore,payload\?\.status\)\.tone/);
 assert.match(panel,/const storedTrendColor=heroToneColor\(judge\(storedScore,stored\?\.status\)\.tone\)/);
 assert.match(panel,/MarketFearGreedChart showExtrema=\{trend\.length>=3\} color=\{storedTrendColor\} data=\{trend\}/);
 assert.match(panel,/return tone==="positive"\?"#45d99f":tone==="negative"\?"#ff7076":"#94a3b8"/);
 assert.match(css,/earnings-recession-target-card\[data-score-tone="positive"\] \.cnn-spectrum-center \.cnn-score-value/);
 assert.match(css,/earnings-recession-target-card\[data-score-tone="neutral"\] \.cnn-spectrum-center \.cnn-score-value/);
 assert.match(css,/earnings-recession-target-card\[data-score-tone="negative"\] \.cnn-spectrum-center \.cnn-score-value/);
 assert.match(panel,/earningsDiagnosticComparisons/);
 assert.match(css,/\.earnings-recession-target-card \.cnn-score-comparisons\.is-multi\{/);
 assert.doesNotMatch(panel,/scoreComparisons\?\.|fakeMiniTrend|synthesizedPrior|new Date\(\)\.getTime\(\).*score/);
 assert.match(panel,/진단점수와 별도/);
 assert.match(panel,/score=\{loading\|\|diagnosticScore===null\?"—":diagnosticScore\.toFixed\(1\)\}/);
 assert.match(panel,/storedScore\.toFixed\(1\)/);
});

test("R47 earnings detail shares five period cell geometry but has no synthetic diagnostic deltas",()=>{
 const items=panel.match(/const earningsDiagnosticComparisons=\[([\s\S]*?)\] as const;/)?.[1];
 assert.ok(items);
 const labels=[...items.matchAll(/\{label:"([^"]+)",value:null\}/g)].map(m=>m[1]);
 assert.deepEqual(labels,["1주","1개월","3개월","6개월","1년"]);
 assert.match(panel,/comparisonItems=\{earningsDiagnosticComparisons\}/);
 assert.doesNotMatch(panel,/dayDelta=\{|periodDelta=\{|scoreComparisons\?/);
 assert.match(css,/\.earnings-recession-target-card \.cnn-score-comparisons\.is-multi\{[\s\S]*?grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:767px\)\{[\s\S]*?\.earnings-recession-target-card \.cnn-score-comparisons\.is-multi/);
 assert.match(panel,/진단점수와 별도/);
});
test("R47 earnings factor ranks balance factual E1 top/bottom without affecting other topics",()=>{
 const guide=readFileSync("app/beginner-risk-guide.tsx","utf8");
 assert.match(guide,/const negative=useMemo\(\(\)=>factors\.filter\(x=>x\.score<45\)/);
 assert.match(guide,/const earningsRelativeBottom=useMemo\(\(\)=>\{/);
 assert.match(guide,/const displayedLower=topic==="earnings-recession"\?earningsRelativeBottom:negative/);
 assert.match(guide,/const highlighted=new Set\(positive\.map\(row=>row\.id\)\)/);
 assert.match(guide,/factors\.filter\(row=>!highlighted\.has\(row\.id\)\)\.sort\(\(a,b\)=>a\.score-b\.score\)\.slice\(0,3\)/);
 assert.match(guide,/negativeHeading:"E1 상대적 하위 지표"/);
 assert.match(guide,/topic==="earnings-recession"\?"bg-slate-800\/30 p-4":"bg-rose-950\/20 p-4"/);
 assert.match(guide,/E1 저장 지표별 평가입니다\. 메인 진단 점수의 구성요인과는 별개입니다/);
});
