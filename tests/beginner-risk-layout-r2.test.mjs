import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const pages=[
 ['inflation','app/inflation/page.tsx'],
 ['recession','app/recession/page.tsx'],
 ['stagflation-risk','app/stagflation-risk/page.tsx'],
 ['credit-risk','app/credit-risk/page.tsx'],
 ['debt-risk','app/debt-risk/page.tsx'],
 ['asset-bubble','app/asset-bubble/page.tsx'],
 ['supply-shock','app/supply-shock/page.tsx'],
 ['earnings-recession','app/earnings-recession/page.tsx'],
];

test('all eight risk pages use shared beginner-first layout',()=>{
 for(const [topic,path] of pages){
  const source=read(path);
  assert.ok(source.includes('RiskDetailBeginnerLayout'));
  assert.ok(source.includes(`<BeginnerRiskGuide topic="${topic}"/>`));
  assert.match(source,/<RiskDetailBeginnerLayout>[\s\S]*Panel\/>[\s\S]*<BeginnerRiskGuide/);
 }
});

test('layout orders hero then beginner guide then explainer and full indicator table',()=>{
 const css=read('app/risk-detail-beginner-layout.module.css');
 assert.match(css,/cnn-reference-panel\)\{order:1\}/);
 assert.match(css,/beginner-risk-guide-.*order:2/s);
 assert.match(css,/inflation-explainer\)\{order:4\}/);
 assert.match(css,/inflation-indicator-section\)\{order:5\}/);
 assert.match(css,/cnn-return-cta\)\{order:6\}/);
});

test('layout does not hide or truncate existing detail sections',()=>{
 const css=read('app/risk-detail-beginner-layout.module.css');
 assert.ok(!/display\s*:\s*none/.test(css));
 assert.ok(!/max-height/.test(css));
 assert.ok(!/overflow\s*:\s*hidden/.test(css));
});
