import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(path,"utf8");

test("inflation indicator R2 shows previous/current/release and mobile no-overflow layout",()=>{
  const panel=read("app/inflation/inflation-panel.tsx");
  const css=read("app/inflation/inflation-indicator-r2.css");
  const builder=read("worker/projection-builders/inflation.mjs");

  assert.match(panel,/<th>이전<\/th><th>현재<\/th><th>발표<\/th><th>판단<\/th>/);
  assert.match(panel,/previousAvailableAt/);
  assert.match(panel,/previousValue/);
  assert.match(panel,/releaseSchedules/);
  assert.match(panel,/D-\$\{days\}/);
  assert.match(panel,/inflation-r2-mobile-list/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.inflation-r2-indicators \.inflation-indicator-table-r2 th,[\s\S]*\.inflation-r2-indicators \.inflation-indicator-table-r2 td\{text-align:center\}/);
  assert.match(css,/\.inflation-r2-indicators \.inflation-indicator-table-r2 td\.inflation-r2-release small\{[^}]*color:#f4c34e;[^}]*font-weight:900/);
  assert.match(css,/\.inflation-r2-mobile-metrics>div:last-child small\{[^}]*color:#f4c34e;[^}]*font-weight:900/);

  assert.match(css,/\.inflation-target-card:has\(\.cnn-score-orb\[aria-label\*="안정"\]\)\{--inflation-r2-score-color:#45d99f\}/);
  assert.match(css,/\.inflation-target-card:has\(\.cnn-score-orb\[aria-label\*="중립"\]\)\{--inflation-r2-score-color:#94a3b8\}/);
  assert.match(css,/\.inflation-target-card:has\(\.cnn-score-orb\[aria-label\*="압력"\]\)\{--inflation-r2-score-color:#ff7076\}/);
  assert.match(css,/\.inflation-target-card \.cnn-spectrum-center \.cnn-score-value,[\s\S]*color:var\(--inflation-r2-score-color,#94a3b8\)!important/);
  assert.match(css,/\.inflation-target-card \.recharts-area-curve\{stroke:var\(--inflation-r2-score-color,#94a3b8\)\}/);
  assert.match(css,/#inflation-fill stop:first-child\{stop-color:var\(--inflation-r2-score-color,#94a3b8\)\}/);
  assert.match(css,/\.inflation-target-card \.cnn-latest-point circle,[\s\S]*fill:var\(--inflation-r2-score-color,#94a3b8\)/);
  assert.match(css,/\.inflation-target-card \.cnn-source small\{display:none\}/);
  assert.match(css,/\.inflation-target-card \.cnn-score-observed-date\{display:none\}/);
  assert.match(css,/\.inflation-target-card \.fg-header-slot \.cnn-panel-heading\{grid-template-columns:minmax\(0,1fr\) auto;align-items:start;column-gap:10px\}/);
  assert.match(css,/\.inflation-target-card \.cnn-source\{align-self:start;align-items:flex-end;max-width:none;text-align:right;white-space:nowrap\}/);

  assert.match(css,/@media\(max-width:767px\)/);
  assert.match(css,/\.inflation-target-card\{[\s\S]*grid-template-columns:12px minmax\(0,42%\) 8px minmax\(0,1fr\) 12px;[\s\S]*grid-template-rows:auto 156px auto/);
  assert.match(css,/\.inflation-target-card \.fg-score-slot\{grid-column:2;grid-row:2;[^}]*height:156px/);
  assert.match(css,/\.inflation-target-card \.fg-analysis-slot\{grid-column:4;grid-row:2;[^}]*height:156px/);
  assert.match(css,/\.inflation-target-card \.cnn-spectrum-gauge\{width:min\(100%,150px\);max-width:150px\}/);
  assert.match(css,/\.inflation-target-card \.cnn-score-comparisons\{height:32px;min-height:32px;max-height:32px\}/);
  assert.match(css,/\.inflation-target-card \.cnn-panel-note\{min-height:32px;padding:7px 12px;font-size:10px/);
  assert.match(css,/\.inflation-r2-indicators \.inflation-r2-table-wrap\{display:none\}/);
  assert.match(css,/\.inflation-r2-mobile-list\{display:grid/);

  assert.match(builder,/previousFeatureRow/);
  assert.match(builder,/previousObservationDate/);
  assert.match(builder,/previousAvailableAt/);
  assert.match(builder,/previousValue/);
});
