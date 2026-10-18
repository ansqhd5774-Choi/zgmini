import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflationScoreComparisonDates} from '../worker/projection-builders/inflation.mjs';

const read=path=>readFileSync(path,'utf8');

test('inflation score comparison dates use exact 1W/1M/3M/6M/1Y calendar anchors',()=>{
 assert.deepEqual(inflationScoreComparisonDates('2026-10-18'),{
  week:'2026-10-11',
  month:'2026-09-18',
  threeMonth:'2026-07-18',
  sixMonth:'2026-04-18',
  year:'2025-10-18',
 });
 assert.equal(inflationScoreComparisonDates('2026-03-31').month,'2026-02-28');
 assert.equal(inflationScoreComparisonDates('2024-02-29').year,'2023-02-28');
});

test('inflation hero renders five centered stored-history score deltas',()=>{
 const builder=read('worker/projection-builders/inflation.mjs');
 const panel=read('app/inflation/inflation-panel.tsx');
 const orb=read('app/market-score-orb.tsx');
 const css=read('app/inflation/inflation-score-comparisons-r1.css');
 assert.match(builder,/buildInflationScoreComparisons\(history,asOf,current\.score\)/);
 assert.match(builder,/prior\.status==="READY"&&finite\(prior\.score\)\?currentScore-prior\.score:null/);
 assert.match(panel,/\{label:"1주",value:payload\?\.scoreComparisons\?\.week\?\?null\}/);
 assert.match(panel,/\{label:"1개월",value:payload\?\.scoreComparisons\?\.month\?\?null\}/);
 assert.match(panel,/\{label:"3개월",value:payload\?\.scoreComparisons\?\.threeMonth\?\?null\}/);
 assert.match(panel,/\{label:"6개월",value:payload\?\.scoreComparisons\?\.sixMonth\?\?null\}/);
 assert.match(panel,/\{label:"1년",value:payload\?\.scoreComparisons\?\.year\?\?null\}/);
 assert.match(panel,/comparisonItems=\{scoreComparisonItems\}/);
 assert.doesNotMatch(panel,/dayDelta=\{previousDelta\}/);
 assert.match(orb,/comparisonItems\?: readonly ScoreComparisonItem\[\]/);
 assert.match(orb,/ScoreComparisonCell key=\{item\.label\}/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/justify-content:center/);
 assert.match(css,/\.cnn-score-comparison\+\.cnn-score-comparison\{[\s\S]*border-left:1px solid/);
});

test('inflation top hero typography uses a scoped, stable hierarchy without resizing the score or chart',()=>{
 const panel=read('app/inflation/inflation-panel.tsx');
 const css=read('app/inflation/inflation-hero-typography-r1.css');
 assert.match(panel,/import "\.\/inflation-hero-typography-r1\.css";/);
 assert.match(css,/\.fg-card\.fg-shared-shell\.inflation-target-card\{/);
 for(const token of ['--fg-title-size:20px','--fg-subtitle-size:12px','--fg-meta-size:11px','--fg-meta-strong-size:13px','--fg-footer-size:10px']){
  assert.ok(css.includes(token),token);
 }
 assert.match(css,/\.cnn-market-title h2\{/);
 assert.match(css,/\.cnn-market-title p:last-child\{/);
 assert.match(css,/\.cnn-score-comparison>span\{/);
 assert.match(css,/\.cnn-score-comparison>strong\{/);
 assert.match(css,/@media\(max-width:767px\)/);
 assert.match(css,/--fg-title-size:16px/);
 assert.match(css,/--fg-subtitle-size:11px/);
 assert.match(css,/font-size:clamp\(8px,2\.45vw,10px\)/);
 assert.match(css,/font-size:clamp\(9\.5px,2\.8vw,11px\)/);
 assert.doesNotMatch(css,/--fg-score-size|--fg-shared-(?:gauge|content|header|comparison)|\.fg-chart-slot|\.fg-analysis-slot/);
 assert.doesNotMatch(css,/!important/);
});
