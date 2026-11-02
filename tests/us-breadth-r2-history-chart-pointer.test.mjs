import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const r2 = fs.readFileSync(new URL('../app/market-breadth-r2-history-chart.tsx', import.meta.url), 'utf8');
const r1 = fs.readFileSync(new URL('../app/market-breadth-history-chart.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../app/market-breadth-strip.module.css', import.meta.url), 'utf8');
const strip = fs.readFileSync(new URL('../app/market-breadth-strip.tsx', import.meta.url), 'utf8');

test('R2 confirmed history uses percent-only points and leaves existing R1 chart intact', () => {
  assert.match(r2, /history\.points/);
  assert.match(r2, /focused\.risingPct\.toFixed\(1\)/);
  assert.match(r2, /focused\.fallingPct\.toFixed\(1\)/);
  assert.match(r2, /focused\.unchangedPct\.toFixed\(1\)/);
  assert.doesNotMatch(r2, /focused\.counts|eligibleCount|countLabel/);
  assert.match(r1, /history\.records/);
  assert.match(r1, /focused\.counts/);
  assert.match(strip, /from "\.\/market-breadth-r2-history-chart"/);
});

test('R2 chart keeps main pointer, touch and keyboard behavior with no range slider', () => {
  assert.doesNotMatch(r2, /type=["']range["']|historySlider/);
  assert.doesNotMatch(css, /\.historySlider/);
  for (const handler of ['onPointerEnter', 'onPointerMove', 'onPointerDown', 'onPointerLeave'])
    assert.ok(r2.includes(handler + '='), handler);
  for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End'])
    assert.ok(r2.includes("case '" + key + "'"));
  assert.match(r2, /pointerEvents="all"/);
  assert.match(r2, /tabIndex=\{0\}/);
  assert.match(r2, /getBoundingClientRect\(\)/);
  assert.match(css, /touch-action:\s*pan-y/);
  assert.match(css, /\.historyTooltip\s*\{/);
});

test('R2 plot stays stored-only and mobile percentages remain readable', () => {
  assert.doesNotMatch(r2, /fetch\(/);
  assert.match(css, /\.percent\s*\{\s*font-size:\s*11px/);
  assert.match(strip, /phase=\$\{phase\}/);
  assert.match(r2, /const indexByDate = new Map\(records\.map/);
});
