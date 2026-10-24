import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../components/economic-terrain.css',import.meta.url),'utf8');
const component=fs.readFileSync(new URL('../components/economic-terrain.tsx',import.meta.url),'utf8');
const revised=css.split('/* Economic terrain axis R4: put ticks above the zones; remove lower tick gutter. */')[1];

test('axis aligns centered labels with bars and shrinks by 21 pixels',()=>{
 assert.ok(revised);
 assert.match(revised,/\.zg-terrain-axis\{height:59px\}/);
 assert.match(revised,/\.zg-terrain-axis-label\{box-sizing:border-box;height:59px;padding-top:14px\}/);
 assert.match(revised,/\.zg-terrain-axis-plot\{display:flex;flex-direction:column\}/);
});

test('six boundary ticks appear above unchanged five color zones',()=>{
 assert.match(revised,/\.zg-terrain-axis-ticks\{order:-1;flex:0 0 14px;height:14px\}/);
 assert.match(revised,/\.zg-terrain-axis-bands\{order:0;flex:0 0 45px;height:45px\}/);
 assert.match(component,/\[0,25,45,55,75,100\]/);
 for(const pct of [25,20,10,20,25])assert.ok(component.includes(`width:${pct},color:`));
});

test('mobile keeps precise tick positions while removing bottom gutter',()=>{
 assert.match(revised,/@media\(max-width:510px\)\{\.zg-terrain-axis\{height:59px\}/);
 assert.match(revised,/\.zg-terrain-axis-ticks\{height:14px;font-size:9px\}/);
 assert.match(css,/\.zg-terrain-line\{border-bottom:2px dashed var\(--terrain-accent\);opacity:\.94\}/);
});
