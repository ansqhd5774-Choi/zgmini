import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {supplyR10FactorMiniHistories} from '../lib/diagnostic-layer/supply-r10-factor-mini-history.mjs';
import {combineRisk,percentile,predictOls,monthly,calculateCandidate} from '../lib/diagnostic-layer/supply-r10-candidate.mjs';
test('weighted risk endpoints and contributions',()=>{assert.equal(combineRisk({G:0,E:0,O:0,P:0,I:0}).score,100);assert.equal(combineRisk({G:100,E:100,O:100,P:100,I:100}).score,0);assert.equal(combineRisk({G:100,E:0,O:0,P:0,I:0}).score,65);});
test('zero is valid and missing is partial',()=>{assert.equal(combineRisk({G:0,E:0,O:0,P:null,I:0}).status,'PARTIAL');assert.equal(combineRisk({G:0,E:0,O:0,P:0,I:0}).status,'READY');});
test('percentile uses past values only and stable ties',()=>{assert.equal(percentile([...Array(60).fill(2),2],60),50);assert.equal(percentile([...Array(60).fill(2),3,999],60),100);assert.equal(percentile([...Array(59).fill(2),3],59),null);});
test('OLS recovers known relationship and refuses singular variables',()=>{const data=Array.from({length:120},(_,i)=>({x:[i],y:3+2*i}));assert.ok(Math.abs(predictOls(data,[121])-245)<1e-8);assert.equal(predictOls(data.map(r=>({x:[1],y:r.y})),[1]),null);});
test('weekly aggregation refuses incomplete month and handles stock vs flow',()=>{const dates=['2026-01-02','2026-01-09','2026-01-16','2026-01-23','2026-01-30'];const rows=dates.map((observationDate,i)=>({observationDate,value:i+1}));assert.equal(monthly(rows,{weekly:true}).get('2026-01'),3);assert.equal(monthly(rows,{weekly:true,stock:true}).get('2026-01'),5);assert.equal(monthly(rows.slice(1),{weekly:true}).get('2026-01'),null);});
test('duplicate dates are rejected and missing domains cannot generate a score',()=>{assert.throws(()=>monthly([{observationDate:'2026-01-01',value:1},{observationDate:'2026-01-01',value:2}]),/DUPLICATE/);assert.equal(calculateCandidate({gscpi:[{observationDate:'2026-01-01',value:0}]}).latest,null);});
test('day-weighted weekly flows allocate boundary weeks and require full coverage',()=>{const dates=['2026-01-02','2026-01-09','2026-01-16','2026-01-23','2026-01-30','2026-02-06'];const rows=dates.map((observationDate,i)=>({observationDate,value:i+1}));assert.equal(monthly(rows,{weekly:true,dayWeighted:true}).get('2026-01'),106/31);assert.equal(monthly(rows.slice(0,-1),{weekly:true,dayWeighted:true}).get('2026-01'),null);});


test('R10 five factor minis use saved monthly own-factor safety scores without copying overall',()=>{
 const risk=(G,E,O,P,I)=>({G,E,O,P,I});
 const rows=[
  {month:'2026-06',status:'READY',scores:risk(20,50,0,100,60),score:99},
  {month:'2026-07',status:'READY',scores:risk(30,55,10,0,50),score:80},
  {month:'2026-08',status:'READY',scores:risk(35,60,20,50,45),score:70},
  {month:'2026-09',status:'READY',scores:risk(40,65,30,60,40),score:65},
 ];
 const actual=supplyR10FactorMiniHistories(rows,'2026-09');
 assert.deepEqual(Object.keys(actual),['G','E','O','P','I']);
 assert.deepEqual(Object.fromEntries(Object.entries(actual).map(([id,points])=>[id,points.at(-1).value])),
  {G:60,E:35,O:70,P:40,I:60});
 assert.equal(actual.O[0].value,100);
 assert.equal(actual.P[1].value,100);
 for(const points of Object.values(actual)){
  assert.equal(points.length,4);
  assert.deepEqual(points.map(row=>row.date),['2026-06-01','2026-07-01','2026-08-01','2026-09-01']);
  assert.equal(points.every(row=>!Object.hasOwn(row,'score')&&!Object.hasOwn(row,'raw')),true);
 }
});

test('R10 partial months break the mini line; true zero is valid and future dates excluded',()=>{
 const all={G:20,E:40,O:0,P:100,I:60};
 const src=[
  {month:'2025-08',status:'READY',scores:all}, // outside 13 actual months
  {month:'2026-06',status:'READY',scores:all},
  {month:'2026-07',status:'PARTIAL',scores:{G:null}},
  {month:'2026-08',status:'READY',scores:all},
  {month:'2026-09',status:'READY',scores:all},
  {month:'2026-10',status:'READY',scores:all}, // future relative to common latest
  {month:'2026-13',status:'READY',scores:all}, // invalid calendar month
 ];
 const trends=supplyR10FactorMiniHistories(src,'2026-09');
 assert.deepEqual(trends.G,[
  {date:'2026-06-01',value:80},
  {date:'2026-08-01',value:80,breakBefore:true},
  {date:'2026-09-01',value:80},
 ]);
 assert.equal(trends.O[0].value,100);
 assert.equal(trends.P[0].value,0);
 assert.equal(Object.values(trends).every(points=>points.every(p=>p.date<='2026-09-01')),true);
});

test('R10 duplicate month and conflicting vintages fail closed for every mini',()=>{
 const row={month:'2026-09',status:'READY',scores:{G:10,E:20,O:30,P:40,I:50}};
 const out=supplyR10FactorMiniHistories([row,{...row,scores:{...row.scores,G:11}}],'2026-09');
 assert.deepEqual(out,{G:[],E:[],O:[],P:[],I:[]});
 assert.deepEqual(supplyR10FactorMiniHistories([row],'2026-09'),{
  G:[{date:'2026-09-01',value:90}],E:[{date:'2026-09-01',value:80}],
  O:[{date:'2026-09-01',value:70}],P:[{date:'2026-09-01',value:60}],
  I:[{date:'2026-09-01',value:50}],
 });
});

test('R10 Writer wires existing optional per-factor trend slot without changing R10 source or weights',()=>{
 const writer=readFileSync(new URL('../scripts/pc-writer/supply-r10.mjs',import.meta.url),'utf8');
 assert.ok(writer.includes('supplyR10FactorMiniHistories(evaluated.rows,latest.month)'));
 assert.ok(writer.includes('trend:factorTrends[id]'));
 assert.ok(writer.includes("methodologyVersion:'SUPPLY_SHOCK_R10'"));
 assert.ok(writer.includes("inputCount:12"));
});
