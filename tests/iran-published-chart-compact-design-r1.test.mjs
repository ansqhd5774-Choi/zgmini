import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const chart=readFileSync(new URL('../components/iran-published-chart.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../components/iran-published-chart.css',import.meta.url),'utf8');
const axisCss=readFileSync(new URL('../components/chart-axis-labels.css',import.meta.url),'utf8');

test('homepage Iran chart matches rate sentiment axis, gradient and endpoint styling',()=>{
 assert.ok(chart.includes('viewBox={compact?"0 0 170 68":"0 0 350 136"}'));
 assert.ok(chart.includes('preserveAspectRatio={compact?"none":"xMidYMid meet"}'));
 assert.ok(chart.includes('className="zg-chart-fixed-axis"'));
 assert.ok(axisCss.includes('.ob-summary-chart-frame>svg text{display:none}'));
 assert.ok(chart.includes('is-compact ob-summary-chart ob-summary-chart-frame'));
 assert.ok(chart.includes('is-compact ob-summary-chart'));
 assert.ok(chart.includes('compact?54-v*.44:112-v'));
 assert.ok(chart.includes('axisDateY=compact?66:131'));
 assert.ok(chart.includes('axisRight=compact?158:320'));
});

test('compact decoration does not remove published records or detail interactions',()=>{
 for(const part of ['data-series="daily-estimate-area"','data-series="daily-estimate"','data-series="actual-publications"',"role={compact?undefined:'button'}",'!compact&&[0,4,8,13].map(day=>'])assert.ok(chart.includes(part),part);
 assert.ok(css.includes('.zg-iran-update-note{display:none}'));
 assert.ok(chart.includes('className="ob-chart-endpoint"'));
 assert.ok(chart.includes('strokeDasharray={compact?undefined:"4 3"}'));
 assert.ok(chart.includes('const compactLine=['));
 assert.ok(chart.includes('!compact&&<div className="zg-iran-update-reading"'));
});

test('detail-only styling keeps the actual publication history and honest score axis',()=>{
 assert.ok(chart.includes('viewBox={compact?"0 0 170 68":"0 0 350 136"}'));
 assert.ok(chart.includes('data-series="detail-score-area"'));
 assert.ok(chart.includes('data-series="low-score-band"'));
 assert.ok(chart.includes('data-series="selected-publication-halo"'));
 assert.ok(chart.includes('stroke={compact?"#ef4444":"#29d3bc"}'));
 assert.ok(chart.includes('onClick={compact?undefined:()=>setSelected(p.at)}'));
 assert.ok(chart.includes("!compact&&<div className=\"zg-iran-update-reading\""));
 assert.ok(css.includes('.zg-iran-published-chart:not(.is-compact) .zg-iran-chart-legend'));
 assert.ok(css.includes('.zg-iran-published-chart:not(.is-compact) .zg-iran-update-reading'));
});
