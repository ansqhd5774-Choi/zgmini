import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const chart = read('app/market-breadth-history-chart.tsx');
const css = read('app/market-breadth-strip.module.css');

test('breadth chart replaces the redundant range input with direct mouse and touch inspection', () => {
  assert.doesNotMatch(chart, /type=["']range["']/);
  assert.doesNotMatch(chart, /historySlider/);
  for (const handler of ['onPointerEnter', 'onPointerMove', 'onPointerDown', 'onPointerLeave']) {
    assert.ok(chart.includes(handler + '='), handler);
  }
  assert.match(chart, /getBoundingClientRect\(\)/);
  assert.match(chart, /pointerEvents="all"/);
});

test('tooltip shows the actual stored date plus all three absolute counts and percentages', () => {
  assert.match(chart, /focused\.observationDate/);
  for (const key of ['rising','unchanged','falling']) {
    assert.ok(chart.includes('countLabel.format(focused.counts.' + key + ')'));
    assert.ok(chart.includes("asPct(focused, '" + key + "').toFixed(1)"));
  }
  assert.match(chart, /setSelected\(nearest\)/);
  assert.match(chart, /records\[i\]\.observationDate/);
  assert.doesNotMatch(chart, /fetch\(/);
});

test('keyboard users can inspect the same actual trading dates and mobile vertical scroll remains available', () => {
  for (const key of ['ArrowLeft','ArrowRight','Home','End']) {
    assert.ok(chart.includes("case '" + key + "'"));
  }
  assert.match(chart, /tabIndex=\{0\}/);
  assert.match(chart, /aria-describedby=\{selected !== null \? tooltipId : undefined\}/);
  assert.match(css, /touch-action:\s*pan-y/);
  assert.match(css, /\.historyTooltip\s*\{/);
  assert.doesNotMatch(css, /\.historySlider/);
});

test('existing chart geometry and no-invented-gap line construction remain unchanged', () => {
  assert.match(chart, /const plot = \{left: 8, right: 592, top: 12, bottom: 146\}/);
  assert.match(chart, /dayGap > 5 \? 'M' : 'L'/);
  assert.match(chart, /history\.records/);
  assert.match(chart, /eligibleCount/);
});
