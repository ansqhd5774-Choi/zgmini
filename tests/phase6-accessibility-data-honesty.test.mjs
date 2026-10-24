import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("U10 accessibility contracts stay explicit", async () => {
  const [panel, periods, css, orb, chart] = await Promise.all([
    read("app/fear-greed/usa/cnn-panel.tsx"),
    read("app/market-period-controls.tsx"),
    read("app/globals.css"),
    read("app/market-score-orb.tsx"),
    read("app/market-fear-greed-chart.tsx"),
  ]);

  assert.match(panel, /<MarketFearGreedChart/);
  assert.match(chart, /<AreaChart[^>]*accessibilityLayer/);
  assert.match(chart, /isAnimationActive=\{animate && !compact && !prefersReducedMotion\}/);
  assert.match(chart, /MarketChartAnimationContext=createContext\(true\)/);
  assert.match(await read("app/country-fear-greed.tsx"), /<MarketChartAnimationContext.Provider value=\{false\}>/);
  assert.match(chart, /<Tooltip[\s\S]*?isAnimationActive="auto"/);

  assert.match(periods, /aria-pressed=/);
  assert.match(periods, /aria-label=\{`\$\{item\.label\} 보기`\}/);
  assert.match(periods, /ArrowRight/);
  assert.match(periods, /ArrowLeft/);
  assert.match(periods, /ArrowDown/);
  assert.match(periods, /ArrowUp/);
  assert.match(periods, /Home/);
  assert.match(periods, /End/);

  assert.match(css, /\.cnn-period-button:focus-visible/);
  assert.match(css, /touch-action:manipulation/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);

  assert.match(orb, /role="group"/);
  assert.match(orb, /aria-label=\{ariaLabel\}/);
  assert.match(orb, /\{state\}/);
});

test("U11 rejects fabricated fallback data and derives changes/insight from verified data", async () => {
  const [panel, route, chart] = await Promise.all([
    read("app/fear-greed/usa/cnn-panel.tsx"),
    read("app/api/fear-greed/route.ts"),
    read("app/market-fear-greed-chart.tsx"),
  ]);

  assert.doesNotMatch(route, /finica\.io/i);
  assert.doesNotMatch(route, /score\s*<\s*45/);
  assert.doesNotMatch(route, /score\s*>\s*55/);
  assert.match(route, /readPublicFeed\(env\.DB, "fear-greed"\)/);
  assert.match(await read("worker/public-feed-store.mjs"), /unavailable/);
  assert.doesNotMatch(route, /fetch\(/);

  assert.doesNotMatch(panel, /payload\?\.insight/);
  assert.doesNotMatch(panel, /payload\?\.previous/);
  assert.match(panel, /previousHistoryBaseline\(allHistory,\s*payload\?\.observedAt\)/);
  assert.match(panel, /historicalBaseline\(allHistory,\s*targetTime\)/);
  assert.match(panel, /const marketInsight = buildMarketInsight\(/);

  // User-requested chart cleanup: keep the semantic 25 guide area/line,
  // but do not render "25" as a Y-axis tick label.
  assert.match(chart, /ticks=\{\[0,\s*25,\s*50,\s*75,\s*100\]\}/);
  assert.match(chart, /domain=\{\[0,\s*100\]\}/);
});
