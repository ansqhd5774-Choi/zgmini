import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../components/economic-terrain.css',import.meta.url),'utf8');
const component=fs.readFileSync(new URL('../components/economic-terrain.tsx',import.meta.url),'utf8');
const r6=css.split('/* R6: compact mobile expansion only; preserve real trend and desktop layout. */')[1];

test('mobile detail collapses duplicate score header and clips its chart',()=>{
 assert.ok(r6);
 assert.match(r6,/@media\(max-width:600px\)/);
 assert.match(r6,/\.zg-terrain-detail-summary\{display:none\}/);
 assert.match(r6,/\.zg-terrain-history-chart\{height:95px;overflow:hidden\}/);
 assert.match(r6,/\.zg-terrain-history svg\{height:95px;overflow:hidden\}/);
 assert.match(r6,/\.zg-terrain-components ul\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test('chart retains actual stored observations and period controls',()=>{
 assert.match(component,/historyRows\(domain,period\)/);
 assert.match(component,/\['1M','3M','6M','1Y'\]/);
 assert.match(component,/rows\.map\(p=>/);
});
