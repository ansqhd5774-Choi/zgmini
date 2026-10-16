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
  assert.match(css,/\.inflation-r2-release small\{[^}]*color:#f4c34e;[^}]*font-weight:900/);
  assert.match(css,/\.inflation-r2-mobile-metrics>div:last-child small\{[^}]*color:#f4c34e;[^}]*font-weight:900/);

  assert.match(css,/@media\(max-width:767px\)/);
  assert.match(css,/\.inflation-r2-indicators \.inflation-r2-table-wrap\{display:none\}/);
  assert.match(css,/\.inflation-r2-mobile-list\{display:grid/);

  assert.match(builder,/previousFeatureRow/);
  assert.match(builder,/previousObservationDate/);
  assert.match(builder,/previousAvailableAt/);
  assert.match(builder,/previousValue/);
});
