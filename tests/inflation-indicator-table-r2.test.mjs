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
  assert.match(panel,/if\(days<=3\)return "imminent";/);
  assert.match(panel,/if\(days<=7\)return "week";/);
  assert.match(panel,/if\(days<=14\)return "fortnight";/);
  assert.match(panel,/if\(days<=30\)return "month";/);
  assert.match(panel,/release-\$\{release\.urgency\}/);
  assert.match(panel,/inflation-r2-mobile-list/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.inflation-r2-indicators \.inflation-indicator-table-r2 th,[\s\S]*\.inflation-r2-indicators \.inflation-indicator-table-r2 td\{text-align:center\}/);
  assert.match(css,/\.inflation-r2-indicators \.inflation-indicator-table-r2 td\.inflation-r2-release\.release-month small\{color:#60a5fa;font-weight:800\}/);
  assert.match(css,/\.inflation-r2-indicators \.inflation-indicator-table-r2 td\.inflation-r2-release\.release-fortnight small\{color:#22d3ee;font-weight:800\}/);
  assert.match(css,/\.inflation-r2-indicators \.inflation-indicator-table-r2 td\.inflation-r2-release\.release-week small\{color:#f4c34e;font-weight:900\}/);
  assert.match(css,/\.inflation-r2-indicators \.inflation-indicator-table-r2 td\.inflation-r2-release\.release-imminent small\{color:#fb7185;font-weight:900/);
  assert.match(css,/\.inflation-r2-mobile-metrics \.release-month small\{color:#60a5fa;font-weight:800\}/);
  assert.match(css,/\.inflation-r2-mobile-metrics \.release-fortnight small\{color:#22d3ee;font-weight:800\}/);
  assert.match(css,/\.inflation-r2-mobile-metrics \.release-week small\{color:#f4c34e;font-weight:900\}/);
  assert.match(css,/\.inflation-r2-mobile-metrics \.release-imminent small\{color:#fb7185;font-weight:900/);

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
  assert.match(css,/\.fg-card\.fg-shared-shell\.inflation-target-card\{[\s\S]*grid-template-columns:10px minmax\(0,40%\) 6px minmax\(0,1fr\) 10px;[\s\S]*grid-template-rows:auto 132px auto/);
  assert.match(css,/\.fg-card\.fg-shared-shell\.inflation-target-card \.fg-header-slot\{[\s\S]*height:48px;[\s\S]*min-height:48px/);
  assert.match(css,/\.fg-card\.fg-shared-shell\.inflation-target-card \.fg-score-slot\{[\s\S]*height:132px/);
  assert.match(css,/\.fg-card\.fg-shared-shell\.inflation-target-card \.fg-analysis-slot\{[\s\S]*height:132px/);
  assert.match(css,/\.fg-card\.fg-shared-shell\.inflation-target-card \.cnn-spectrum-gauge\{width:min\(100%,112px\);max-width:112px\}/);
  assert.match(css,/\.fg-card\.fg-shared-shell\.inflation-target-card \.cnn-score-whole\{font-size:36px\}/);
  assert.match(css,/\.fg-card\.fg-shared-shell\.inflation-target-card \.cnn-score-comparisons\{height:28px;min-height:28px;max-height:28px\}/);
  assert.match(css,/\.fg-card\.fg-shared-shell\.inflation-target-card \.cnn-panel-note\{[\s\S]*min-height:28px;[\s\S]*padding:5px 10px/);
  assert.match(css,/\.inflation-r2-indicators \.inflation-r2-table-wrap\{display:none\}/);
  assert.match(css,/\.inflation-r2-mobile-list\{display:grid/);

  assert.match(builder,/previousFeatureRow/);
  assert.match(builder,/previousObservationDate/);
  assert.match(builder,/previousAvailableAt/);
  assert.match(builder,/previousValue/);
});

test("inflation mobile provenance footer is 28px instead of the shared 40px minimum",()=>{
  const global=read("app/responsive.css");
  const css=read("app/inflation/inflation-indicator-r2.css");
  const mobile=css.slice(css.lastIndexOf("@media(max-width:767px){"));
  assert.match(global,/\.fg-card\.fg-shared-shell \.fg-footer-slot\{height:auto;min-height:2\.5rem\}/);
  assert.match(global,/\.fg-card\.fg-shared-shell \.fg-footer-slot \.cnn-panel-note\{height:auto;min-height:2\.5rem/);
  assert.match(mobile,/\.fg-card\.fg-shared-shell\.inflation-target-card \.fg-footer-slot\{\s*grid-column:1 \/ -1;\s*grid-row:3;\s*height:28px;\s*min-height:28px;\s*flex:0 0 28px;/);
  assert.match(mobile,/\.fg-card\.fg-shared-shell\.inflation-target-card \.fg-footer-slot \.cnn-panel-note\{\s*height:28px;\s*min-height:28px;\s*box-sizing:border-box;/);
  assert.match(mobile,/\.fg-card\.fg-shared-shell\.inflation-target-card \.cnn-panel-note\{\s*min-height:28px;\s*padding:5px 10px/);
  assert.doesNotMatch(css,/\.zg-dashboard\[/);
});

test("inflation landing intro uses compact emphasis without changing other topics",()=>{
  const intro=read("app/search-intent-intro.tsx");
  assert.match(intro,/if\(topic==="inflation"\)/);
  assert.match(intro,/border-l-\[3px\] border-sky-400\/80/);
  assert.match(intro,/text-\[18px\].*sm:text-\[22px\]/);
  assert.match(intro,/미국 물가, /);
  assert.match(intro,/안정되고 있을까\?/);
  assert.match(intro,/물가 안정 점수와 최근 1년 추세, 한눈에\./);
  assert.match(intro,/return <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base"/);
  assert.match(intro,/data-testid=\{`search-intent-intro-\$\{topic\}`\}/);
});
