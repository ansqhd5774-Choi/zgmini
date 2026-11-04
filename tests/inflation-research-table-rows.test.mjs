import assert from 'node:assert/strict';
import test from 'node:test';
import {buildResearchInputRows,RESEARCH_INPUTS_SCHEMA} from '../lib/inflation-research-table-rows.mjs';
import {INFLATION_CAUSAL_19} from '../lib/inflation-causal-public-catalog.mjs';
const row=m=>({id:m.id,series:m.series,unit:m.unit,status:'READY',
 value:0,previousValue:1,observationDate:'2026-09',previousObservationDate:'2026-08',
 history:[{date:'2026-08',value:1},{date:'2026-09',value:0}]});
const data=()=>({schemaVersion:RESEARCH_INPUTS_SCHEMA,status:'READY',
 indicators:INFLATION_CAUSAL_19.map(row)});
test('19 research rows remain independent, raw zero is preserved, score never fabricated',()=>{
 const r=buildResearchInputRows(data());
 assert.equal(r.length,19);
 assert.equal(new Set(r.map(x=>x.id)).size,19);
 assert.equal(r[0].id,'research-1');
 assert.equal(r[0].value,0);
 assert.equal(r[0].score,null);
 assert.equal(r[0].observationDate,'2026-09');
 assert.equal(r[0].history.at(-1).date,'2026-09');
 assert(r.every(x=>x.status==='READY'&&x.score===null&&typeof x.criterionLabel==='string'&&x.criterionLabel.length>=16&&typeof x.sourceDisplay==='string'&&x.sourceDisplay.length>0));
 assert.equal(r[0].previousValue,1);
 assert.equal(r[0].previousObservationDate,'2026-08');
 assert.equal(r[0].sourceDisplay,'FRED/EIA');
});
test('wrong schema, missing input and wrong series show missing, no synthetic numerical values',()=>{
 const bad=data();bad.indicators[0].series='WRONG';
 let r=buildResearchInputRows(bad);
 assert.equal(r[0].status,'PENDING');assert.equal(r[0].value,null);
 assert.equal(r[1].status,'READY');
 r=buildResearchInputRows({schemaVersion:'BAD',status:'READY',indicators:bad.indicators});
 assert(r.every(x=>x.status==='PENDING'&&x.value===null&&x.score===null));
});
test('1Y values bounded, invalid history never reaches chart',()=>{
 const p=data();p.indicators[0].history=[{date:'2026-08',value:1},{date:'bad',value:7},{date:'2026-09',value:0}];
 let r=buildResearchInputRows(p);assert.equal(r[0].history.length,2);
 p.indicators[0].history=Array.from({length:14},(_,i)=>({date:'2025-'+String(i+1).padStart(2,'0'),value:i}));
 r=buildResearchInputRows(p);assert.equal(r[0].history.length,0);
});

test('all 19 inputs expose an individual non-scoring criterion without inventing thresholds',()=>{
 const rows=buildResearchInputRows(data());
 assert.equal(new Set(rows.map(x=>x.criterionLabel)).size,19);
 assert(rows.every(x=>!x.criterionLabel.includes('원자료 · 점수 미산출')));
 assert.match(rows.find(x=>x.id==='research-18')?.criterionLabel??'',/조건부/);
 assert.match(rows.find(x=>x.id==='research-21')?.criterionLabel??'',/공급망/);
 assert(rows.every(x=>x.score===null));
});
