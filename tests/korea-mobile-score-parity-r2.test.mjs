import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(path,"utf8");

test("Korea detailed card alone opts into USA-style score statistics",()=>{
 const detail=read("app/fear-greed/korea/data-panel.tsx");
 const home=read("app/country-fear-greed.tsx");
 const card=read("app/korea-composite-view.tsx");
 assert.match(detail,/<KoreanCountryCard detail\/>/);
 assert.match(home,/<KoreanCountryCard\s+showBreadth\s*\/>/);
 assert.match(card,/scoreAside=\{detail \?/);
 assert.match(card,/showHeaderDate=\{detail\}/);
 assert.match(card,/mobileInlineDayDelta:detail/);
 assert.match(card,/52주 최고/);
 assert.match(card,/52주 최저/);
 for(const period of ["1W","1M","3M","6M","1Y"])assert.ok(card.includes('"'+period+'"'));
});

test("Korea score statistics reject partial 52-week coverage and missing baselines",()=>{
 const card=read("app/korea-composite-view.tsx");
 assert.match(card,/historyInWindow\.length<180/);
 assert.match(card,/historyInWindow\[0\]\.time>start\+7\*86400000/);
 assert.match(card,/historicalBaseline\(allHistory,targetPeriodTime/);
 assert.match(card,/baseline!==null\?score-baseline:null/);
 assert.match(card,/point\?point\.score\.toFixed\(1\):"—"/);
});

test("Korea score-card layout is mobile only; desktop keeps old comparison UI",()=>{
 const css=read("app/fear-greed/korea/korea-layout-parity-r1.css");
 const orb=read("app/market-score-orb.tsx");
 const shell=read("app/fear-greed-card-shell.tsx");
 assert.match(css,/R2 mobile Korea\/USA score-card parity/);
 assert.match(css,/\.korea-target-card \.korea-score-stats,\s*\.zg-fg-korea[^\n]+\.cnn-score-inline-day-mobile \{\s*display: none;/);
 assert.match(css,/@media \(max-width: 760px\) \{[\s\S]*?\.korea-score-stats \{\s*display: grid;/);
 assert.match(css,/\.cnn-score-comparisons,\s*\.zg-fg-korea[^\n]+\.cnn-score-observed-date \{ display: none; \}/);
 assert.match(orb,/mobileInlineDayDelta = false/);
 assert.match(shell,/mobileInlineDayDelta=\{score\.mobileInlineDayDelta\}/);
});
