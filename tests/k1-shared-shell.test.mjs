import {marketChartSource} from './helpers/market-chart-source.mjs';
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("K1 extracts USA presentation into an opt-in shared shell", async () => {
  const [shell, panel, chart, insight, css] = await Promise.all([
    read("app/fear-greed-card-shell.tsx"),
    read("app/fear-greed/usa/cnn-panel.tsx"),
    marketChartSource(),
    read("app/market-card-insight.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(shell, /layoutVariant\?: 'legacy' \| 'shared'/);
  assert.match(shell, /layoutVariant === 'shared' \? 'fg-shared-shell' : ''/);
  assert.match(panel, /layoutVariant="shared"/);
  assert.match(panel, /<MarketFearGreedChart/);
  assert.match(panel, /<MarketCardInsight/);
  assert.doesNotMatch(panel, /from "recharts"/);
  assert.doesNotMatch(panel, /function AutoFitInsight/);
  assert.doesNotMatch(panel, /function usePrefersReducedMotion/);

  assert.match(chart, /accessibilityLayer/);
  assert.match(chart, /prefers-reduced-motion: reduce/);
  assert.match(chart, /ticks=\{\[0, 25, 50, 75, 100\]\}/);
  assert.match(chart, /ReferenceArea y1=\{0\} y2=\{25\}/);
  assert.match(chart, /ReferenceLine y=\{75\}/);
  assert.match(chart, /cnn-latest-point/);
  assert.match(chart, /cnn-history-tooltip/);
  assert.match(chart, /initialDimension=\{\{width:1,height:1\}\}/);

  assert.match(insight, /cnn-header-insight/);
  assert.match(insight, /ResizeObserver/);
  assert.match(insight, /aria-label=\{text\}/);

  assert.match(css, /\.fg-card\.fg-shared-shell/);
  assert.match(css, /container:\s*fg-shared\s*\/\s*inline-size/);
  assert.match(css, /@container fg-shared \(max-width:500px\)/);
  assert.match(css, /--fg-shared-header-h/);
  assert.match(css, /--fg-shared-score-stack-h/);
  assert.doesNotMatch(css, /\.usa-target-card/);
  assert.doesNotMatch(css, /usa-fg/);
  assert.doesNotMatch(css, /--u917-/);
  assert.doesNotMatch(css, /--u920-/);
});

test("K1 leaves USA data semantics in the USA adapter", async () => {
  const panel = await read("app/fear-greed/usa/cnn-panel.tsx");
  assert.match(panel, /import\s*\{useStoredIndex\}\s*from\s*['"]\.\.\/\.\.\/\.\.\/components\/use-stored-index['"]/);
  assert.match(panel, /useStoredIndex<IndexPayload>\("\/api\/fear-greed"\)/);
  assert.match(panel, /previousHistoryBaseline\(allHistory, payload\?\.observedAt\)/);
  assert.match(panel, /historicalBaseline\(allHistory, targetTime\)/);
  assert.match(panel, /const marketInsight = buildMarketInsight\(/);
  assert.match(panel, /score !== null && dayBaseline !== null \? score - dayBaseline : null/);
  assert.match(panel, /score !== null && periodBaseline !== null \? score - periodBaseline : null/);
});
