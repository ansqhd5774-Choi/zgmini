import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const summary=read('components/dashboard-summary-chart.tsx');
const market=read('app/market-fear-greed-chart-renderer.tsx');
const css=read('app/responsive.css');
const globals=read('app/globals.css');

test('composite and USA/Korea share the same opaque history tooltip card',()=>{
 assert.match(summary,/<div className="cnn-history-tooltip">/);
 assert.match(market,/<div className="cnn-history-tooltip">/);
 assert.match(globals,/\.cnn-history-tooltip\{[^}]*background:#071a29;/);
 assert.match(globals,/\.cnn-history-tooltip\{[^}]*border:1px solid var\(--zg-border\);/);
});

test('composite tooltip wrapper paints above chart stroke at desktop and mobile sizes',()=>{
 const layer=css.split('/* Composite tooltip layering parity with USA/Korea:')[1];
 assert.ok(layer,'composite tooltip stacking rule exists');
 assert.match(layer,/\.zg-dashboard\[data-view="dashboard"\] \.zg-r55-summary-mini-chart \.recharts-tooltip-wrapper\{\s*z-index:5;\s*\}/);
 assert.doesNotMatch(layer,/@media|opacity:|transform:|background:/,'the shared tooltip background and card layout must not be overridden');
 assert.match(summary,/className="zg-spark zg-r55-mini-chart zg-r55-summary-mini-chart"/);
 assert.match(summary,/data-testid="w06-touch-tooltip"/);
 assert.match(summary,/className="cnn-history-tooltip" style=\{\{position:'absolute'[^\n]*zIndex:5/);
});
