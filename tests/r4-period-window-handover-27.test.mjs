import test from 'node:test';
import assert from 'node:assert/strict';
import {marketTrendWindowR1} from '../lib/market-score/market-trend-window-r1.mjs';

// R4 #27: 1W..1Y window contracts on the unchanged common display-window
// helper. This is a *display* contract: a carry-forward boundary anchor is
// NOT a new source observation and must never be persisted as one.
const daily=[
 {label:'2026-10-05',value:41},
 {label:'2026-11-08',value:45},
 {label:'2026-11-12',value:44},
 {label:'2026-11-15',value:48},
 {label:'2026-11-16',value:50},
];
const periods=[['1W',7],['1M',30],['3M',90],['6M',180],['1Y',365]];
const realDates=new Set(daily.map(point=>point.label));

test('R4 #27 period windows end at the last actual publication day and are chronological',()=>{
 for(const [label,days] of periods){
  const points=marketTrendWindowR1(daily,days);
  assert.equal(points.at(-1).label,'2026-11-16',label);
  assert.equal(points.at(-1).value,50,label);
  assert.ok(points.every((point,i)=>i===0||point.label>=points[i-1].label),label);
  const intendedStart=new Date(Date.parse(points.at(-1).label)-days*86400000).toISOString().slice(0,10);
  if(daily.some(point=>point.label<intendedStart))
   assert.equal(points[0].label,intendedStart,label+' carried boundary');
  else
   assert.equal(points[0].label,daily[0].label,label+' available observations shorter than range');
 }
});

test('R4 #27 display boundary carry-forward is not mislabeled as a stored observation',()=>{
 const week=marketTrendWindowR1(daily,7);
 assert.deepEqual(week[0],{label:'2026-11-09',value:45});
 assert.equal(realDates.has(week[0].label),false,'viewport boundary is not an observed source date');
 assert.deepEqual(week.slice(1).map(point=>point.label),['2026-11-12','2026-11-15','2026-11-16']);
});

test('R4 #27 no unobserved interior days or artificial score values are generated',()=>{
 for(const [,days] of periods){
  const points=marketTrendWindowR1(daily,days);
  const real=points.filter(point=>realDates.has(point.label));
  assert.ok(real.every(point=>daily.some(src=>src.label===point.label&&src.value===point.value)));
  assert.equal(points.some(point=>point.label==='2026-11-13'),false);
  assert.equal(points.some(point=>point.label==='2026-11-14'),false);
 }
});

test('R4 #27 zero remains a valid score; missing/nonfinite points never become zero',()=>{
 const source=[{label:'2026-11-01',value:0},{label:'2026-11-12',value:null},
  {label:'2026-11-13',value:NaN},{label:'2026-11-16',value:75}];
 const result=marketTrendWindowR1(source,30);
 assert.ok(result.some(point=>point.label==='2026-11-01'&&point.value===0));
 assert.ok(!result.some(point=>['2026-11-12','2026-11-13'].includes(point.label)));
});

test('R4 #27 no archive or no valid data produces an empty curve instead of guessed history',()=>{
 assert.deepEqual(marketTrendWindowR1([],365),[]);
 assert.deepEqual(marketTrendWindowR1([{label:'2026-11-16',value:null}],7),[]);
 assert.deepEqual(marketTrendWindowR1([{label:'invalid',value:55}],7),[]);
});

test('R4 #27 period selection does not mutate verified source history',()=>{
 const initial=structuredClone(daily);
 for(const [,days] of periods)marketTrendWindowR1(daily,days);
 assert.deepEqual(daily,initial);
});
