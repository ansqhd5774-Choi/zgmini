import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../components/economic-terrain.css',import.meta.url),'utf8');
const component=fs.readFileSync(new URL('../components/economic-terrain.tsx',import.meta.url),'utf8');

function rule(selector){
 const body=css.split(selector+'{')[1]?.split('}')[0];
 assert.ok(body,selector+' 스타일 누락');
 return body;
}

test('selected detail copy, badges and buttons have a readable font floor',()=>{
 for(const [selector,size] of [
  ['.zg-terrain-detail-explain>p',13],
  ['.zg-terrain-components li',12],
  ['.zg-terrain-components>span',12],
  ['.zg-terrain-chart-heading button',12],
  ['.zg-terrain-history figcaption',11],
  ['.zg-terrain-detail-explain>a',13],
 ]){
  assert.match(rule(selector),new RegExp('font-size:'+size+'px'),selector);
 }
});

test('chart annotations are HTML overlay so mobile SVG scaling cannot shrink text',()=>{
 assert.match(component,/className="zg-terrain-history-labels"/);
 assert.match(component,/className="zg-terrain-history-tick"/);
 assert.match(component,/className="zg-terrain-history-date is-start"/);
 assert.match(css,/\.zg-terrain-history-labels\{[^}]*font-size:12px/);
 assert.doesNotMatch(component,/<text\s/);
});

test('mobile rows are not reduced to eleven-pixel names',()=>{
 assert.match(css,/@media\(max-width:530px\)\{[^\n]*\.zg-terrain-row-name\{font-size:13px\}/);
 assert.match(css,/@media\(max-width:750px\)\{[^\n]*\.zg-terrain-row-name\{font-size:14px\}/);
 assert.match(css,/@media\(max-width:390px\)\{\.zg-terrain-axis-bands span\{display:none\}/);
});

test('indicator heading and row labels use the same centered alignment',()=>{
 assert.match(rule('.zg-terrain-axis-label span:first-child'),/text-align:center/);
 assert.match(rule('.zg-terrain-row-name'),/text-align:center/);
});

test('five score bands have enlarged labels and narrow-screen unclipped names',()=>{
 assert.match(rule('.zg-terrain-axis-bands strong'),/font-size:15px/);
 assert.match(rule('.zg-terrain-axis-bands span'),/font-size:12px/);
 assert.match(css,/@media\(max-width:750px\)\{\.zg-terrain-axis\{height:80px\}\.zg-terrain-axis-bands\{height:49px\}\.zg-terrain-axis-bands strong\{font-size:13px\}\.zg-terrain-axis-bands span\{font-size:11px\}\}/);
 assert.match(css,/@media\(max-width:510px\)\{\.zg-terrain-axis\{position:relative;height:80px;padding-top:25px\}/);
 assert.match(css,/\.zg-terrain-axis-bands\{height:22px\}\.zg-terrain-axis-bands span\{display:none\}/);
 assert.match(css,/\.zg-terrain-axis-bands span\{display:none\}\.zg-terrain-axis-bands strong\{position:absolute;top:5px;width:20%;font-size:14px;text-align:center\}/);
 for(const [n,left] of [[1,'0'],[2,'20%'],[3,'40%'],[4,'60%'],[5,'80%']]){
  assert.ok(css.includes(`.zg-terrain-axis-bands>div:nth-child(${n}) strong{left:${left}}`));
 }
});
