import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const chart = readFileSync(new URL('../components/dashboard-summary-chart.tsx', import.meta.url), 'utf8');

test('desktop chart retains date and numeric score without reconstructed-history disclaimer', () => {
 assert.doesNotMatch(chart, /현행 산식 재구성 · 당시 실계산점 아님/);
 assert.match(chart, /const point=payload\[0\]\?\.payload/);
 assert.match(chart, /value\.toFixed\(1\)/);
 assert.match(chart, /\(point\.verifiedModelVersion\|\|point\.legacyCalculatedValue!==null\)&&<span>/);
});

test('mobile latest-point touch tooltip shows timestamp and score with no reconstructed-history disclaimer', () => {
 assert.match(chart, /data-w06-touch-tooltip-ready="true"/);
 assert.match(chart, /onTouchStart=\{event=>\{/);
 assert.match(chart, /distance<=24\?latest\.ts:null/);
 assert.match(chart, /data-testid="w06-touch-tooltip"/);
 assert.match(chart, /latest\.value\.toFixed\(1\)/);
 assert.match(chart, /\(latest\.verifiedModelVersion\|\|latest\.legacyCalculatedValue!==null\)&&<span>/);
 assert.doesNotMatch(chart, /현행 산식 재구성 · 당시 실계산점 아님/);
});

test('UI-only change preserves the historical chart series and does not invent a score', () => {
 assert.match(chart, /dataKey="reconstructedValue"/);
 assert.match(chart, /dataKey="legacyCalculatedValue"/);
 assert.match(chart, /dataKey="verifiedCalculatedValue"/);
 assert.match(chart, /const scaled=timeScaledTrend\(data,periodDays,currentPublished\)/);
});
