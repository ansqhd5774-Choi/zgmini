import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const css=readFileSync("components/dashboard-side-rails.css","utf8");
const rails=readFileSync("components/dashboard-side-rails.tsx","utf8");
const preview=readFileSync("components/dashboard-favorite-preview.ts","utf8");

test("favorite card uses title / number / state / date information hierarchy",()=>{
 assert.match(rails,/zg-dashboard-favorite-card-head/);
 assert.match(rails,/zg-dashboard-favorite-reading/);
 assert.match(rails,/zg-dashboard-favorite-metric/);
 assert.match(rails,/zg-dashboard-favorite-status/);
 assert.match(rails,/zg-dashboard-favorite-context/);
 assert.match(rails,/data-tone=\{tone\}/);
 assert.match(rails,/aria-label=\{item\.label\+" 상세 보기"\}/);
 assert.match(rails,/\{metricKind\}/);
 assert.match(rails,/\{metricValue\}/);
 assert.match(rails,/\{date&&<time>\{date\}<\/time>\}/);
 assert.doesNotMatch(rails,/<ChevronRight|onclick=|onMouseEnter=/);
});

test("data values are only separated from their already validated unit prefix",()=>{
 assert.match(rails,/value\.startsWith\("현재 "\)/);
 assert.match(rails,/value\.startsWith\("평가 "\)/);
 assert.match(rails,/value\.startsWith\("예시 "\)/);
 assert.match(rails,/value\.slice\(metricKind\.length\+1\)/);
 assert.match(rails,/const detail=previews\[item\.key\]/);
 assert.match(preview,/if\(!value\)return null/);
 assert.match(rails,/const judgement=detail\?\.judgement/);
});

test("new styles are scoped to dashboard, readable, accessible and non-animated when requested",()=>{
 assert.match(css,/\.zg-dashboard-side-rails-root \.zg-risk-side-link\.zg-dashboard-favorite-link/);
 assert.match(css,/\.zg-dashboard-favorite-metric>b/);
 assert.match(css,/font-size:16px/);
 assert.match(css,/\.zg-dashboard-favorite-status-dot/);
 assert.match(css,/data-tone="positive"/);
 assert.match(css,/data-tone="negative"/);
 assert.match(css,/data-tone="neutral"/);
 // Neutral follows the site's established dark-theme neutral tokens, never yellow.
 assert.match(css,/\.zg-dashboard-favorite-status\[data-tone="neutral"\]\{color:var\(--zg-neutral-text,#C4CFDC\)\}/);
 assert.match(css,/\.zg-dashboard-favorite-status\[data-tone="neutral"\] \.zg-dashboard-favorite-status-dot\{background:var\(--zg-neutral-fill,#93A7BE\)\}/);
 assert.doesNotMatch(css,/data-tone="neutral"[^\n]*#e8cf90/);
 assert.match(css,/\.zg-dashboard-favorite-count/);
 assert.match(css,/background:#f5bc45;color:#071a2d/);
 assert.match(css,/\.zg-dashboard\[data-view="dashboard"\]>\.zg-container/);
 assert.match(css,/@media\(max-width:1649px\)/);
 assert.doesNotMatch(css,/\.zg-risk-side-rails-root\+main/);
});
