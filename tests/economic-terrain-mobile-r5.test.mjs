import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../components/economic-terrain.css',import.meta.url),'utf8');
const component=fs.readFileSync(new URL('../components/economic-terrain.tsx',import.meta.url),'utf8');
const mobile=css.split('/* Economic terrain R5: 26px single-line mobile rows, score track aligned with five-band scale. */')[1];

test('all 12 mobile rows use 26px: rank, name, gauge, score, chevron',()=>{
 assert.ok(mobile);
 assert.match(mobile,/@media\(max-width:600px\)/);
 assert.match(mobile,/\.zg-terrain-row\{height:26px;min-height:26px;grid-template-rows:26px;padding:0\}/);
 assert.match(component,/const cards=ECONOMIC_CARDS\.map\(card=>/);
 assert.match(component,/\{shown\.map\(\(card,index\)=>/);
 assert.match(component,/className=\{`zg-terrain-row\$\{active\?' is-selected':''\}`\}/);
 assert.match(mobile,/\.zg-terrain-track\{grid-column:3;grid-row:1/);
 assert.match(mobile,/\.zg-terrain-row-score\{grid-column:4;grid-row:1/);
 assert.match(mobile,/\.zg-terrain-row-chevron\{grid-column:5;grid-row:1/);
 assert.match(mobile,/\.zg-terrain-axis-plot\{grid-column:3;grid-row:1/);
});

test('zone labels stay centered inside their original weighted colors',()=>{
 assert.match(mobile,/\.zg-terrain-axis-bands>div\{position:relative;justify-content:center;align-items:center/);
 assert.match(mobile,/\.zg-terrain-axis-bands strong\{position:static;width:auto;font-size:7\.5px/);
 for(const [name,width,color] of [['취약',25,'#fa628b'],['주의',20,'#ffc64b'],['중립',10,'#a6bdd0'],['양호',20,'#2de0c4'],['우수',25,'#13bfa7']]){
  assert.ok(component.includes(`name:'${name}'`));
  assert.ok(component.includes(`width:${width},color:'${color}'`));
 }
 assert.match(component,/useState<string\|null>\(null\)/);
});
