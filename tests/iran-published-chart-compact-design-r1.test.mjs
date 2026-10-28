import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const chart=readFileSync(new URL('../components/iran-published-chart.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../components/iran-published-chart.css',import.meta.url),'utf8');
const axisCss=readFileSync(new URL('../components/chart-axis-labels.css',import.meta.url),'utf8');

test('homepage Iran chart matches rate sentiment axis, gradient and endpoint styling',()=>{
 assert.ok(chart.includes('viewBox={compact?"0 0 170 68":"0 0 350 180"}'));
 assert.ok(chart.includes('preserveAspectRatio={compact?"none":"xMidYMid meet"}'));
 assert.ok(chart.includes('className="zg-chart-fixed-axis"'));
 assert.ok(axisCss.includes('.ob-summary-chart-frame>svg text{display:none}'));
 assert.ok(chart.includes('is-compact ob-summary-chart ob-summary-chart-frame'));
 assert.ok(chart.includes('is-compact ob-summary-chart'));
 assert.ok(chart.includes('compact?54-v*.44:148-v*1.4'));
 assert.ok(chart.includes('axisDateY=compact?66:169'));
 assert.ok(chart.includes('axisRight=compact?158:336'));
});

test('compact decoration does not remove published records or detail interactions',()=>{
 for(const part of ['data-series="daily-estimate-area"','data-series="daily-estimate"','data-series="actual-publications"',"role={compact?undefined:'button'}",'!compact&&[0,2,4,6,8,10,13].map(day=>'])assert.ok(chart.includes(part),part);
 assert.ok(css.includes('.zg-iran-update-note{display:none}'));
 assert.ok(chart.includes('className="ob-chart-endpoint"'));
 assert.ok(chart.includes('strokeDasharray={compact?undefined:"4 3"}'));
 assert.ok(chart.includes('const compactLine=['));
 assert.ok(chart.includes('!compact&&<div className="zg-iran-update-reading"'));
 assert.ok(chart.includes('!compact&&<div className="zg-iran-chart-legend"'));
 assert.ok(chart.includes('!compact&&<p className="zg-iran-update-note"'));
 assert.ok(css.includes('height:75px'));
 assert.ok(css.includes('.ob58-mini-trend .zg-iran-published-chart.is-compact>.zg-chart-fixed-axis'));
});

test('detail-only styling keeps the actual publication history and honest score axis',()=>{
 assert.ok(chart.includes('viewBox={compact?"0 0 170 68":"0 0 350 180"}'));
 assert.ok(chart.includes('data-series="detail-score-area"'));
 assert.ok(chart.includes('data-series="score-zone"'));
 assert.ok(chart.includes('data-series="left-axis-label"'));
 assert.ok(chart.includes('[0,25,50,75,100].map(v=>'));
 assert.ok(chart.includes('[0,2,4,6,8,10,13].map(day=>'));
 assert.ok(chart.includes('data-mobile-skip='));
 assert.ok(chart.includes('const detailArea=!compact&&daily.length>1&&daily.every(validDaily)'));
 assert.ok(chart.includes('return compact?\'L\''));
 assert.equal((chart.match(/level:"(?:very-negative|negative|neutral|positive|very-positive)"/g)??[]).length,5);
 assert.ok(chart.includes('data-series="selected-publication-halo"'));
 assert.ok(chart.includes('stroke={compact?"#ef4444":"#29d3bc"}'));
 assert.ok(chart.includes('onClick={compact?undefined:()=>setSelected(p.at)}'));
 assert.ok(chart.includes("!compact&&<div className=\"zg-iran-update-reading\""));
 assert.ok(css.includes('.zg-iran-published-chart:not(.is-compact) .zg-iran-chart-legend'));
 assert.ok(css.includes('.zg-iran-published-chart:not(.is-compact) .zg-iran-update-reading'));
});
