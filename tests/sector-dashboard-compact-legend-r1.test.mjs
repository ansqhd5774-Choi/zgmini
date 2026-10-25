import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const chart=readFileSync('components/sector-sentiment-chart.tsx','utf8');
const css=readFileSync('components/sector-sentiment-chart.css','utf8');

test('dashboard sector card and historical chart keep their original heights',()=>{
 assert.match(css,/\.zg-sector-chart\{height:232px;/);
 assert.match(css,/\.zg-sector-chart-plot\{position:relative;height:120px;/);
 assert.match(css,/\.zg-sector-chart\.zg-sector-score-card\{padding-block:11px\}/);
 assert.match(css,/\.zg-sector-chart-legend\.zg-sector-compact-legend button\{height:42px;/);
 assert.match(css,/@media\(max-width:600px\)\{\.zg-sector-chart\.zg-sector-score-card\{padding:10px 12px\}/);
});

test('illustrative divider bars are removed, labels and color swatches remain readable',()=>{
 assert.match(chart,/zg-sector-score-card/);
 assert.match(css,/\.zg-sector-legend-name\{max-width:100%;font-size:11px;line-height:13px;/);
 assert.match(css,/\.zg-sector-legend-color\{width:calc\(100% - 6px\);height:4px;/);
 assert.match(css,/\.zg-sector-legend-score\{font-size:14px;/);
 assert.doesNotMatch(css,/\.zg-sector-chart-legend\.zg-sector-compact-legend button\{[^}]*border-top:/);
 assert.doesNotMatch(css,/\.zg-sector-chart-legend\.zg-sector-compact-legend button\{[^}]*border-bottom:/);
 assert.match(css,/\.zg-sector-chart-legend\.zg-sector-compact-legend button\[aria-pressed=false\] \.zg-sector-legend-color\{opacity:\.9\}/);
});

test('sector score is a rounded display of the latest stored observation, with honest missing values',()=>{
 assert.match(chart,/const latestSectorRow=rows\.at\(-1\);/);
 assert.match(chart,/const compactSectorScores=!themePicker&&series===SECTORS;/);
 assert.match(chart,/const value=latestSectorRow\?\.\[sector\.id\]/);
 assert.match(chart,/typeof value==='number'&&Number\.isFinite\(value\)\?String\(Math\.round\(value\)\):'—'/);
 assert.match(chart,/\.map\(\(row,i\)=>\(\{/);
 assert.match(chart,/v=typeof value==='number'&&Number\.isFinite\(value\)&&value>=0&&value<=100\?value:null/);
});

test('all eleven sector toggles keep their existing controls, while theme picker remains separate',()=>{
 assert.match(chart,/export const SECTORS=\[/);
 assert.match(chart,/aria-pressed=\{!hidden\.has\(sector\.id\)\} onClick=\{\(\)=>toggle\(sector\.id\)\}/);
 assert.match(chart,/className="zg-sector-legend-color" style=\{\{backgroundColor:sector\.color\}\}/);
 assert.match(chart,/className="zg-sector-legend-score"/);
 assert.match(chart,/themePicker\?<>/);
 assert.match(css,/\.zg-theme-picker-legend \.zg-sector-chart-legend/);
});

test('sector legend dynamically ranks displayed integer scores high to low without changing chart line order',()=>{
 assert.match(chart,/const legendSeries=compactSectorScores\?series\.map\(\(sector,index\)=>\{/);
 assert.match(chart,/score:typeof value==='number'&&Number\.isFinite\(value\)\?Math\.round\(value\):-1/);
 assert.match(chart,/\.sort\(\(a,b\)=>b\.score-a\.score\|\|a\.index-b\.index\)/);
 assert.match(chart,/\.map\(\(\{sector\}\)=>sector\):series;/);
 assert.match(chart,/\{legendSeries\.map\(sector=>\{/);
 assert.match(chart,/const latestSectorRow=rows\.at\(-1\);/);
 assert.match(chart,/\{series\.map\(sector=>hasProvisional\?\[/);
});

test('dashboard sector selects the highest latest score once, without overriding manual selection',()=>{
 assert.match(chart,/const legendSeries=compactSectorScores\?series\.map/);
 assert.match(chart,/\.sort\(\(a,b\)=>b\.score-a\.score\|\|a\.index-b\.index\)/);
 assert.match(chart,/const highest=legendSeries\.at\(0\);/);
 assert.match(chart,/if\(!highest\|\|typeof latestSectorRow\[highest\.id\]!=='number'\|\|!Number\.isFinite\(latestSectorRow\[highest\.id\]\)\)return;/);
 assert.match(chart,/setHidden\(new Set\(series\.filter\(\(\{id\}\)=>id!==highest\.id\)\.map\(\(\{id\}\)=>id\)\)\);/);
 assert.match(chart,/if\(!compactSectorScores\|\|dashboardSectorDefaultApplied\.current\|\|!latestSectorRow\)return;/);
 assert.match(chart,/const toggle=\(id:string\)=>\{if\(compactSectorScores\)dashboardSectorDefaultApplied\.current=true;/);
 assert.doesNotMatch(chart,/const rightmost=legendSeries\.at\(-1\)/);
});

test('theme and sector OFF legends share the same readable contrast without changing ON styling',()=>{
 assert.match(css,/\.zg-sector-chart-legend\.zg-sector-compact-legend button\[aria-pressed=false\]\{opacity:1\}/);
 assert.match(css,/\.zg-sector-legend-score\{opacity:\.55\}/);
 assert.match(css,/\.zg-sector-legend-color\{opacity:\.9\}/);
 assert.match(css,/button\.zg-theme-selected-label\.has-score\[aria-pressed=false\]\{opacity:1;background:transparent\}/);
 assert.match(css,/\.zg-theme-legend-score\{opacity:\.55\}/);
 assert.match(css,/\.zg-theme-legend-color\{opacity:\.9\}/);
 assert.match(css,/\.zg-theme-selected-label\{[^}]*background:#102b3b;color:#e2e8f0;/);
});

test('hover tooltip stays compact for one visible series and grows only for multiple series',()=>{
 assert.match(css,/\.zg-sector-tooltip\{width:max-content;min-width:160px;max-width:min\(220px,calc\(100vw - 32px\)\)/);
 assert.match(css,/\.zg-sector-tooltip:has\(li:nth-child\(2\)\)\{width:min\(320px,calc\(100vw - 32px\)\);max-width:none\}/);
 assert.match(css,/\.zg-sector-tooltip:has\(li:nth-child\(2\)\) ul\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
 assert.match(css,/\.zg-sector-tooltip li::before\{content:"";width:6px;height:6px;border-radius:50%;flex:none;background:currentColor\}/);
 assert.match(css,/\.zg-sector-tooltip strong\{flex:none;color:#fff;font-size:14px;/);
 assert.match(css,/\.zg-sector-tooltip p\{margin:0 0 6px;color:#b8ccd9;font-size:14px;/);
 assert.match(css,/\.zg-sector-tooltip li span\{[^}]*font-size:14px;/);
 assert.match(chart,/className="zg-sector-held-tooltip zg-sector-tooltip"/);
 assert.match(chart,/className="zg-sector-tooltip" role="status"/);
});

test('one selected real latest point shows an endpoint score; multi-series and missing values do not',()=>{
 assert.match(chart,/const currentSeries=shownSeries\.length===1\?shownSeries\[0\]:null;/);
 assert.match(chart,/const currentRow=visibleRows\.at\(-1\);/);
 assert.match(chart,/currentSeries&&currentRow&&typeof currentValue==='number'&&Number\.isFinite\(currentValue\)/);
 assert.match(chart,/currentPoint&&<ReferenceDot key=\{'current-'/);
 assert.match(chart,/shape=\{<ChartCurrentPoint value=\{currentPoint\.value\}/);
 assert.match(chart,/const x=axisRight\?cx-width-7:cx\+7;/);
 assert.match(chart,/currentPoint&&!mobileAxisRight\?58:12/);
 assert.match(chart,/aria-label=\{`현재 점수 \$\{score\}점/);
 assert.match(chart,/const extrema=shownSeries\.length===1\?/);
});
