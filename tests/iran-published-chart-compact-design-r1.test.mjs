import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const chart=readFileSync(new URL('../components/iran-published-chart.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../components/iran-published-chart.css',import.meta.url),'utf8');

test('homepage Iran chart restores the original compact sparkline geometry',()=>{
 assert.ok(chart.includes('viewBox={compact?"0 0 170 68":"0 0 350 136"}'));
 assert.ok(chart.includes('preserveAspectRatio="xMidYMid meet"'));
 assert.ok(!chart.includes('preserveAspectRatio={compact?"none"'));
 assert.ok(chart.includes('is-compact ob-summary-chart'));
 assert.ok(chart.includes('compact?54-v*.44:112-v'));
 assert.ok(css.includes('is-compact{display:block;flex:0 0 68px;height:68px;min-height:0'));
});

test('compact decoration does not remove published records or detail interactions',()=>{
 for(const part of ['data-series="daily-estimate-area"','data-series="daily-estimate"','data-series="actual-publications"',"role={compact?undefined:'button'}",'compact?[0,13]:[0,4,8,13]'])assert.ok(chart.includes(part),part);
 assert.ok(css.includes('.zg-iran-update-note{display:none}'));
 assert.ok(chart.includes('!compact&&<div className="zg-iran-update-reading"'));
});
