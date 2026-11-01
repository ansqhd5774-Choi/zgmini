import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {
 buildEarningsAsOfComparison,
 E1_R5_ASOF_IDS,
 E1_R5_ASOF_OBSERVATION_BASIS,
} from '../lib/market-score/earnings-e1-r5-observation-series.mjs';
import {scoreEarningsE1R5Raw} from '../lib/market-score/earnings-e1-r5.mjs';

const iso='2026-10-16T21:24:31.000Z';
const dates=['2025-12-01','2026-03-05','2026-06-05','2026-09-04','2026-10-19'];
const observations=values=>dates.map((date,i)=>({date,value:values[i]}));
const build=(id,values)=>buildEarningsAsOfComparison({
 id,asOfDate:'2026-10-19',currentValue:values.at(-1),
 observations:observations(values),sourceVersion:'E1-R5-PRODUCTION-CYCLE-R1',sourceStoredAt:iso,
});
test('all 11 previously omitted indicator IDs retain their own exact as-of series and source provenance',()=>{
 assert.deepEqual(E1_R5_ASOF_IDS,['S1','S2','S3','S4','S5','S7','S8','S9','S10','S12','S13']);
 for(const id of E1_R5_ASOF_IDS){
  const row=build(id,[1,2,3,4,5]);
  assert.equal(row.historyKind,E1_R5_ASOF_OBSERVATION_BASIS);
  assert.equal(row.previousValue,4);
  assert.equal(row.previousPeriodEnd,'2026-09-04');
  assert.deepEqual(row.sourceHistory1Y,observations([1,2,3,4,5]));
  assert.equal(row.historySourceStoredAt,iso);
 }
});
test('raw signed indices and normalized S12 remain distinct; reject fake/missing values',()=>{
 assert.equal(build('S10',[-2,-1,0,1,-3]).previousValue,1);
 assert.equal(build('S13',[-.6,-.3,0,.2,-.1]).sourceHistory1Y.at(-1).value,-.1);
 assert.equal(build('S12',[35,43,55,60,74]).previousValue,60);
 assert.equal(build('S12',[35,43,55,60,101]),null);
 assert.equal(build('S12',[35,43,55,60,-1]),null);
 assert.equal(build('S4',[1,2,null,4,5]),null);
 assert.equal(build('S6',[1,2,3,4,5]),null);
});
test('reject wrong current observation, date anchor, provenance, duplicate and descending dates',()=>{
 const base={id:'S1',asOfDate:'2026-10-19',currentValue:5,
  observations:observations([1,2,3,4,5]),sourceVersion:'E1-R5-PRODUCTION-CYCLE-R1',sourceStoredAt:iso};
 const check=x=>buildEarningsAsOfComparison({...base,...x});
 assert.equal(check({currentValue:4}),null);
 assert.equal(check({observations:[...base.observations.slice(0,4),{date:'2026-10-18',value:5}]}),null);
 assert.equal(check({observations:[base.observations[1],base.observations[1],...base.observations.slice(2)]}),null);
 assert.equal(check({observations:[{date:'2026-02-30',value:1},...base.observations.slice(1)]}),null);
 assert.equal(check({sourceVersion:'UNKNOWN'}),null);
 assert.equal(check({sourceStoredAt:null}),null);
 assert.equal(check({observations:[{date:'2024-10-01',value:1},...base.observations]}).sourceHistory1Y.length,5);
});
test('S12 production scorer recomputes historical normalized 4:3 composite from prior-only inputs',()=>{
 const prev=scoreEarningsE1R5Raw({raw:{S12A:.4,S12B:2},histories:{S12A:[.1,.2],S12B:[1,1.5]}});
 assert.equal(typeof prev.components.S12,'number');
 const manual=(4*prev.forwardScores.S12A+3*prev.forwardScores.S12B)/7;
 assert.equal(prev.components.S12,manual);
 const current=scoreEarningsE1R5Raw({raw:{S12A:.5,S12B:2.1},histories:{S12A:[.1,.2,.4],S12B:[1,1.5,2]}});
 assert.equal(typeof current.components.S12,'number');
 const accepted=buildEarningsAsOfComparison({id:'S12',asOfDate:'2026-10-19',currentValue:current.components.S12,
  observations:[{date:'2026-06-05',value:prev.components.S12},{date:'2026-10-19',value:current.components.S12}],
  sourceVersion:'E1-R5-PRODUCTION-CYCLE-R1',sourceStoredAt:iso});
 assert.ok(accepted);
});
const module={exports:{}};
new Function('exports',ts.transpileModule(fs.readFileSync('worker/projection-builders/earningsRecession.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(module.exports);
const buildProjection=module.exports.buildProjection;
test('projection permits verified 11 AS-OF rows plus S6/S11 and rejects tampered row and private fields',()=>{
 const ids=Array.from({length:13},(_,i)=>'S'+(i+1));
 const producer=ids.map(id=>{
  const value=id==='S12'?73.5:id==='S13'?-.2:5;
  const values=id==='S12'?[10,25,45,60,value]:id==='S13'?[-.6,-.4,-.3,-.1,value]:[1,2,3,4,value];
  const history=buildEarningsAsOfComparison({id,asOfDate:'2026-10-19',currentValue:value,
    observations:observations(values),sourceVersion:'E1-R5-PRODUCTION-CYCLE-R1',sourceStoredAt:iso});
  return {id,score:50,value,unit:id==='S12'?'점':'%',status:'READY',source:'TEST',asOfDate:'2026-10-19',privateFile:'SECRET',...history};
 });
 const e1={methodologyVersion:'E1-R5',status:'READY',score:73.5,indicators:producer};
 const result=buildProjection({snapshot:{body:{asOfDate:'2026-10-19',diagnostics8:{earningsRecessionDefense:{status:'READY',score:84.6875}}}},e1,nowIso:'2026-10-19T00:00:00Z'}).storedE1.indicators;
 assert.equal(result.length,13);
 assert.equal(result.filter(x=>x.historyKind===E1_R5_ASOF_OBSERVATION_BASIS).length,11);
 for(const id of E1_R5_ASOF_IDS){
  const row=result.find(x=>x.id===id);
  assert.equal(row.sourceHistory1Y.length,5);
  assert.equal('privateFile' in row,false);
 }
 for(const id of ['S6','S11'])assert.equal(result.find(x=>x.id===id).sourceHistory1Y,undefined);
 const tampered=producer.map(x=>x.id==='S2'?{...x,previousValue:777}:x);
 const rejected=buildProjection({snapshot:{body:{diagnostics8:{earningsRecessionDefense:{status:'READY',score:84.7}}}},e1:{...e1,indicators:tampered},nowIso:'2026-10-19T00:00:00Z'}).storedE1.indicators;
 assert.equal(rejected.find(x=>x.id==='S2').sourceHistory1Y,undefined);
});
test('writer and mobile/desktop render are wired with no E1 scoring/weights edits',()=>{
 const writer=fs.readFileSync('scripts/pc-writer/earnings-r5-production-cycle-r1.mjs','utf8');
 const ui=fs.readFileSync('app/earnings-recession/earnings-recession-panel.tsx','utf8');
 assert.match(writer,/E1_R5_SOURCE_OBSERVATION_PRESENTATION_VERSION='E1-R5-SOURCE-OBSERVATION-R43'/);
 assert.match(writer,/for\(const id of E1_R5_ASOF_IDS\)/);
 assert.match(writer,/asOfById\.set\('S12',s12Observations\)/);
 assert.match(writer,/asOfById\.set\('S13'/);
 assert.match(ui,/hasIndicatorHistory\(r\)/);
 assert.equal((ui.match(/points=\{hasIndicatorHistory\(r\)\?r\?\.sourceHistory1Y:undefined\}/g)||[]).length,2);
});

test('S12 1Y history uses existing R2 guidance anchors while current score remains R1 production basis',()=>{
 const writer=fs.readFileSync('scripts/pc-writer/earnings-r5-production-cycle-r1.mjs','utf8');
 assert.match(writer,/forward=trendForwardHistory\.find\(row=>row\.date===item\.date\)/);
 assert.match(writer,/priorA=trendForwardHistory\.filter\(row=>row\.date<item\.date&&finite\(row\.s12aRaw\)\)/);
 assert.match(writer,/const currentForward=guidanceAsOf\(productionTimeline,currentDate\)/);
 assert.match(writer,/if\(finite\(row\.s12aRaw\)\)histories\.S12A\.push\(row\.s12aRaw\)/);
 const dates=['2025-12-01','2026-03-05','2026-06-05','2026-09-04'];
 const grid=dates.map((date,i)=>({date,s12b:2+i*.25}));
 const productionGuidance=[{date:dates[3],s12aRaw:.6}];
 const trendGuidance=dates.map((date,i)=>({date,s12aRaw:.2+i*.1}));
 const history=grid.map((item,index)=>{
  const forward=trendGuidance.find(row=>row.date===item.date);
  const priorA=trendGuidance.filter(row=>row.date<item.date).map(row=>row.s12aRaw);
  const priorB=grid.slice(0,index).map(row=>row.s12b);
  return {date:item.date,value:scoreEarningsE1R5Raw({
   raw:{S12A:forward.s12aRaw,S12B:item.s12b},
   histories:{S12A:priorA,S12B:priorB},asOfDate:item.date,
  }).components.S12};
 }).filter(row=>Number.isFinite(row.value));
 assert.equal(productionGuidance.length,1,'production history is too sparse for historical display');
 assert.equal(history.length,3,'R2 saved history provides prior normalized composite points');
 const currentRaw={S12A:.8,S12B:3.1};
 const productionScore=scoreEarningsE1R5Raw({
  raw:currentRaw,histories:{S12A:productionGuidance.map(x=>x.s12aRaw),S12B:grid.map(x=>x.s12b)},
  asOfDate:'2026-10-19',
 }).components.S12;
 assert.equal(typeof productionScore,'number');
 const display=buildEarningsAsOfComparison({
  id:'S12',observations:[...history,{date:'2026-10-19',value:productionScore}],
  asOfDate:'2026-10-19',currentValue:productionScore,
  sourceVersion:'E1-R5-PRODUCTION-CYCLE-R1',sourceStoredAt:iso,
 });
 assert.ok(display);
 assert.equal(display.sourceHistory1Y.length,4);
 assert.equal(display.sourceHistory1Y.at(-1).value,productionScore);
});
