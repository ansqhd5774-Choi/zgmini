import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync('app/page.tsx','utf8');
const header=readFileSync('components/site-header.tsx','utf8');
const charts=readFileSync('components/deferred-dashboard-charts.tsx','utf8');
const css=readFileSync('app/globals.css','utf8');

test('dashboard retains sector and theme charts without the outbreak summary or menu',()=>{
 assert.doesNotMatch(page,/OutbreakSummary/);
 assert.match(page,/<div className="zg-dashboard-secondary">\s*<DeferredDashboardCharts\/>\s*<\/div>/);
 assert.match(charts,/<SectorSentimentChart showProvisionalNotice=\{false\}\/>/);
 assert.match(charts,/<ThemeSentimentDashboardChart\/>/);
 assert.doesNotMatch(header,/href="\/outbreak\/"/);
 assert.match(readFileSync('app/outbreak/page.tsx','utf8'),/<OutbreakEvents\/>/);
});

test('desktop uses the full width for two equal panels while mobile stacks full-width panels',()=>{
 const desktop=css.split('UI1_LAYOUT_ARCH_R1 — PC 1-screen dashboard owner')[1];
 assert.ok(desktop,'dashboard desktop layout rules exist');
 assert.match(desktop,/\.zg-dashboard\[data-view="dashboard"\] \.zg-dashboard-secondary\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(desktop,/\.zg-dashboard\[data-view="dashboard"\] \.zg-dashboard-secondary>\.zg-strength-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:767px\)\{\s*\.zg-strength-grid\{\s*grid-template-columns:1fr/);
 assert.match(css,/@media\(max-width:1023px\)\{[^\n]*\.zg-strength-grid\{grid-template-columns:1fr\}/);
});
