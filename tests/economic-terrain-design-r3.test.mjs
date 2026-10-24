import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const component=fs.readFileSync(new URL('../components/economic-terrain.tsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../components/economic-terrain.css',import.meta.url),'utf8');
const design=css.split('/* Economic terrain score-map R3: centered header and continuous five-zone backdrop. */')[1];

test('economic terrain keeps the five agreed zones and numeric thresholds',()=>{
 assert.ok(component.includes("width:25,color:'#fa628b'"));
 assert.ok(component.includes("width:20,color:'#ffc64b'"));
 assert.ok(component.includes("width:10,color:'#a6bdd0'"));
 assert.ok(component.includes("width:20,color:'#2de0c4'"));
 assert.ok(component.includes("width:25,color:'#13bfa7'"));
 assert.match(component,/\[0,25,45,55,75,100\]/);
 for(const [i,color] of ['#fa628b','#ffc64b','#a6bdd0','#2de0c4','#13bfa7'].entries()){
  assert.ok(design.includes(`.zg-terrain-axis-bands>div:nth-child(${i+1}){background:${color}}`));
 }
});

test('axis header is centered and strengthened with a 100-point scale',()=>{
 assert.match(component,/className="zg-terrain-axis-label"><span>순위<\/span><span>경제 지표<\/span><span className="zg-terrain-axis-score-label">안정 점수<small>100점 기준<\/small>/);
 assert.ok(design);
 assert.match(design,/\.zg-terrain-axis-label\{height:45px;align-items:stretch/);
 assert.match(design,/\.zg-terrain-axis-label>span\{[^}]*align-items:center;justify-content:center/);
 assert.match(design,/\.zg-terrain-row-index\{[^}]*align-items:center;justify-content:center;padding:0/);
});

test('background spans five percentages while each score retains its dashed line and dot',()=>{
 assert.match(design,/rgba\(250,98,139,\.10\) 0 25%/);
 assert.match(design,/rgba\(255,198,75,\.10\) 25% 45%/);
 assert.match(design,/rgba\(166,189,208,\.10\) 45% 55%/);
 assert.match(design,/rgba\(45,224,196,\.10\) 55% 75%/);
 assert.match(design,/rgba\(19,191,167,\.10\) 75% 100%/);
 assert.match(component,/className="zg-terrain-line" style=\{\{width:`\$\{card.score\}%`\}\}/);
 assert.match(component,/className="zg-terrain-dot" style=\{\{left:`\$\{card.score\}%`\}\}/);
 assert.match(design,/\.zg-terrain-line\{border-bottom:2px dashed var\(--terrain-accent\)/);
});

test('compact screen keeps category names centered inside true band proportions',()=>{
 assert.ok(design.includes('@media(max-width:510px){.zg-terrain-axis{height:80px;padding-top:0}.zg-terrain-axis-plot,.zg-terrain-axis-bands>div{position:relative}'));
 assert.match(design,/\.zg-terrain-axis-bands strong\{position:static;width:auto;font-size:clamp/);
});

