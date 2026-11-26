import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const orb=readFileSync(new URL('../app/market-score-orb.tsx',import.meta.url),'utf8');
const panel=readFileSync(new URL('../app/inflation/inflation-panel.tsx',import.meta.url),'utf8');

test('W01 R2 risk hero shows stored score on first render, not animation zero',()=>{
 assert.match(panel,/<MarketScoreOrb score=\{loading\|\|score===null\?"—":score\.toFixed\(1\)\}/);
 assert.match(panel,/variant="hero" startScoreFromZero=\{false\}/);
 assert.match(orb,/startScoreFromZero = true,/);
 assert.match(orb,/startScoreFromZero\?: boolean;/);
 assert.match(orb,/duration: 950,\s*startFromZero: startScoreFromZero,/);
 assert.match(orb,/return display \?\? target;/);
});
test('other gauges retain their existing animation and R2 chart still uses published points',()=>{
 assert.match(orb,/startScoreFromZero = true,/);
 assert.match(orb,/enabled: variant === 'hero',\s*duration: 950,/);
 assert.match(panel,/inflationR2VisibleTrend\(\{/);
 assert.match(panel,/latestPoint=\{latestPoint\}/);
});
