import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const dashboard=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../app/responsive.css',import.meta.url),'utf8');
const desktop=css.split('/* Desktop market overview: equal-width composite and risk panels.')[1];

test('desktop market overview keeps composite and 8 risk indicators side by side',()=>{
  assert.ok(desktop,'desktop market layout breakpoint is present');
  assert.match(desktop,/@container marketShell \(min-width:960px\)/);
  assert.match(desktop,/\.zg-r55-body\{\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(desktop,/\.zg-r55-summary\{\s*grid-column:1;\s*grid-row:1/);
  assert.match(desktop,/\.zg-r55-risk-panel\{\s*grid-column:2;\s*grid-row:1/);
  assert.match(desktop,/\.zg-r55-component-panel\{\s*grid-column:1 \/ -1;\s*grid-row:2/);
  assert.match(desktop,/\.zg-r55-risk-panel \.zg-r55-subscore-grid\{\s*grid-template-columns:repeat\(4,minmax\(0,1fr\)\);\s*grid-template-rows:repeat\(2,minmax\(60px,auto\)\)/);
  assert.match(dashboard,/className="zg-r55-summary" data-testid="composite-panel"/);
  assert.match(dashboard,/className="zg-r55-risk-panel" data-testid="risk-panel"/);
});

test('mobile market overview still stacks the independent panels',()=>{
  assert.match(css,/#market \.zg-r55-body\{grid-template-columns:minmax\(0,1fr\);grid-template-rows:auto auto auto\}/);
  assert.match(css,/@media \(max-width:959px\)/);
});
