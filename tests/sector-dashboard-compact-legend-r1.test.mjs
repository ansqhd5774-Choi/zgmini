import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const chart=readFileSync('components/sector-sentiment-chart.tsx','utf8');
const css=readFileSync('components/sector-sentiment-chart.css','utf8');

test('dashboard sector card and historical chart keep their original heights',()=>{
 assert.match(css,/\.zg-sector-chart\{height:232px;/);
 assert.match(css,/\.zg-sector-chart-plot\{position:relative;height:120px;/);
 assert.match(css,/\.zg-sector-chart-legend\.zg-sector-compact-legend button\{height:32px;/);
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
