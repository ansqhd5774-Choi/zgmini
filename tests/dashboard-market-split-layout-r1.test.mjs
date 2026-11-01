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


test('desktop market cards use content height without extra reserved bottom space',()=>{
  assert.match(desktop,/\.zg-r55-summary\{[^}]*min-height:0;/);
  assert.match(desktop,/\.zg-r55-risk-panel\{[^}]*min-height:0;/);
  assert.doesNotMatch(desktop,/min-height:152px/);
});

test('desktop risk title shares the composite heading row without taking card space',()=>{
  assert.match(dashboard,/const riskHeading=<h2><a href="\/risk-indicators\/">/);
  assert.match(dashboard,/className="zg-section-heading zg-r55-risk-heading zg-r55-risk-heading-desktop"/);
  assert.match(dashboard,/className="zg-section-heading zg-r55-risk-heading zg-r55-risk-heading-inline"/);
  assert.match(css,/#market \.zg-r55-risk-heading-desktop\{display:none\}/);
  assert.match(desktop,/#market \.zg-r55-heading\{\s*display:grid;\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(desktop,/#market \.zg-r55-heading>\.zg-r55-risk-heading-desktop\{\s*display:flex;\s*grid-column:2;\s*grid-row:1/);
  assert.match(desktop,/#market \.zg-r55-heading>\.zg-r55-header-controls\{\s*grid-column:2;\s*grid-row:1/);
  assert.match(desktop,/#market \.zg-r55-risk-panel \.zg-r55-risk-heading-inline\{\s*display:none;/);
});


test('mobile USA and Korea sentiment tooltips paint above the translated SVG without changing desktop styles',()=>{
  const mobileLayer=css.split('/* Mobile dashboard USA/Korea tooltip parity:')[1]?.split('/* Desktop market overview: equal-width composite and risk panels.')[0];
  assert.ok(mobileLayer,'mobile-only tooltip layer section exists');
  assert.match(mobileLayer,/@media \(max-width:959px\)\{/);
  assert.match(mobileLayer,/\.zg-dashboard\[data-view="dashboard"\] \.zg-country-panel-grid :is\(\.usa-target-card,\.korea-target-card\) \.recharts-tooltip-wrapper\{\s*z-index:5;\s*\}/);
  assert.doesNotMatch(mobileLayer,/recharts-surface|opacity|transform|pointer-events/);
  const sourceTooltip=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
  assert.match(sourceTooltip,/\.cnn-history-tooltip\{[^}]*background:#071a29;/);
});


test('mobile US and Korea fear greed charts restore the original 120px chart and score row',()=>{
 const block=css.split('@media(max-width:959px){').find(section=>section.includes('grid-template-rows:auto 120px auto') && section.includes('--fg-shared-left:124px'));
 assert.ok(block,'the compact mobile 120px layout exists');
 assert.match(block,/\.fg-card\.fg-shared-shell\{--fg-shared-content-h:120px;--fg-shared-left:124px;grid-template-rows:auto 120px auto\}/);
 assert.match(block,/\.fg-card\.fg-shared-shell \.fg-score-slot\{height:120px\}/);
 assert.match(block,/\.fg-card\.fg-shared-shell \.fg-chart-slot\{height:120px\}/);
 assert.doesNotMatch(block,/\.fg-card\.fg-shared-shell \.fg-chart-slot\{height:112px\}/);
 assert.match(css,/\.fg-card\.fg-shared-shell \.fg-chart-slot\{grid-column:4;grid-row:2;width:100%;height:120px;min-height:0\}/);
});

test('mobile breadth cards override the inline grid row variable without affecting desktop',()=>{
 const shell=readFileSync(new URL('../app/fear-greed-card-shell.tsx',import.meta.url),'utf8');
 assert.match(shell,/gridTemplateRows:'auto var\(--fg-shared-content-h\) auto auto'/);
 assert.match(css,/@media\(max-width:959px\)\{[\s\S]*?\.fg-card\.fg-shared-shell\{--fg-shared-content-h:120px;--fg-shared-left:124px;grid-template-rows:auto 120px auto\}/);
 const matched=css.match(/--fg-shared-content-h:120px/g)??[];
 assert.equal(matched.length,1,'exactly one scoped mobile override');
});
