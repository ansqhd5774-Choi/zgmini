import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {E1_R5_SCORE_KEYS,E1_R5_WEIGHTS} from '../lib/market-score/earnings-e1-r5.mjs';
import {attachStoredEarningsFactorTrends} from '../scripts/pc-writer/market-snapshot-comparisons.mjs';

const score=(id,i,delta)=>i===9?0:i===12?100:Math.max(0,Math.min(100,35+i*4+delta));
const makeEarnings=(asOfDate,delta=0)=>{
 const indicators=E1_R5_SCORE_KEYS.map((id,i)=>({
  id,status:'READY',score:score(id,i,delta),asOfDate,
  source:id==='S6'?'BEA NIPA A051RC':id==='S11'?'BLS PRS85006111':id==='S12'?'SEC management guidance + CFO Survey':'SEC EDGAR Company Facts',
 }));
 const total=indicators.reduce((v,r)=>v+E1_R5_WEIGHTS[r.id]*r.score,0);
 return {id:'earnings',source:'EARNINGS_E1',status:'READY',methodologyVersion:'E1-R5',score:total,missingFactors:[],indicators};
};
const body=(date,earnings)=>({status:'SUCCESS',asOfDate:date,domains:[earnings]});
const saved=(date,earnings,storedAt=date+'T12:34:00Z')=>({
 date,storedAt:Date.parse(storedAt),body:body(date,earnings),
});
const get=(b,id)=>b.domains[0].indicators.find(r=>r.id===id);

test('13 scored mini histories reuse actual dated E1-R5 saved snapshots, no rescore or private rows',()=>{
 const current=body('2026-11-18',makeEarnings('2026-11-18',3));
 const previous=[
  saved('2026-10-11',makeEarnings('2026-10-11',-6)),
  saved('2026-11-05',makeEarnings('2026-11-05',-3)),
  saved('2026-11-17',makeEarnings('2026-11-17',1)),
 ];
 const origScore=current.domains[0].score,origRows=structuredClone(previous);
 assert.equal(attachStoredEarningsFactorTrends(current,previous),current);
 assert.deepEqual(previous,origRows);
 assert.equal(current.domains[0].score,origScore);
 assert.equal(current.domains[0].indicators.filter(r=>r.trend?.length===4).length,13);
 for(const id of E1_R5_SCORE_KEYS){
  const row=get(current,id);
  assert.deepEqual(row.trend.map(x=>x.label),['2026-10-11','2026-11-05','2026-11-17','2026-11-18']);
  assert.equal(row.trend.at(-1).value,row.score);
  assert.ok(row.trend.every(p=>p.value>=0&&p.value<=100));
  assert.deepEqual(Object.keys(row.trend[0]),['label','value']);
 }
 assert.equal(get(current,'S10').trend.at(-1).value,0,'real zero preserved');
 assert.equal(get(current,'S13').trend.at(-1).value,100,'real 100 preserved');
});

test('no prior completed same-method scored snapshot means no line and no imputed first point',()=>{
 const current=body('2026-11-18',makeEarnings('2026-11-18'));
 const invalid=[
  saved('2026-11-17',{...makeEarnings('2026-11-17'),methodologyVersion:'E1-R4'}),
  saved('2026-11-16',{...makeEarnings('2026-11-16'),status:'PARTIAL'}),
  saved('2026-11-15',{...makeEarnings('2026-11-15'),score:null}),
  {...saved('2026-11-14',makeEarnings('2026-11-14')),storedAt:null},
  {...saved('2026-11-13',makeEarnings('2026-11-13')),body:{status:'FAILED',asOfDate:'2026-11-13',domains:[makeEarnings('2026-11-13')]}},
 ];
 attachStoredEarningsFactorTrends(current,invalid);
 assert.equal(current.domains[0].indicators.some(row=>Object.hasOwn(row,'trend')),false);
});

test('reject changed factor source, incomplete rows, invalid scoring date and weighted-score tamper',()=>{
 const current=body('2026-11-18',makeEarnings('2026-11-18'));
 const changed=makeEarnings('2026-11-16');
 get({domains:[changed]},'S12').source='UNLICENSED_NEW_SOURCE';
 const incomplete=makeEarnings('2026-11-14');
 incomplete.indicators.pop();
 const badWeighted=makeEarnings('2026-11-13');
 badWeighted.score+=1;
 const badDate=makeEarnings('2026-11-12');
 for(const row of badDate.indicators)row.asOfDate='2026-02-30';
 attachStoredEarningsFactorTrends(current,[
  saved('2026-11-16',changed),
  saved('2026-11-14',incomplete),
  saved('2026-11-13',badWeighted),
  saved('2026-11-12',badDate),
 ]);
 assert.equal(get(current,'S12').trend,undefined,'source mismatch must not join');
 assert.deepEqual(get(current,'S1').trend.map(p=>p.label),['2026-11-16','2026-11-18']);
});

test('conflicting score revisions for one evaluation date fail closed instead of choosing a value',()=>{
 const current=body('2026-11-18',makeEarnings('2026-11-18'));
 const a=saved('2026-11-15',makeEarnings('2026-11-16',-4));
 const b=saved('2026-11-16',makeEarnings('2026-11-16',2));
 const c=saved('2026-11-17',makeEarnings('2026-11-17',0));
 attachStoredEarningsFactorTrends(current,[a,b,c]);
 for(const id of E1_R5_SCORE_KEYS){
  const labels=get(current,id).trend.map(p=>p.label);
  const varying=id==='S10'||id==='S13'?['2026-11-16','2026-11-17','2026-11-18']:['2026-11-17','2026-11-18'];
  assert.deepEqual(labels,varying,id);
 }
});

test('old raw/aggregate trend is never used as factor history and existing producer history is not overwritten',()=>{
 const earnings=makeEarnings('2026-11-18');
 earnings.trend=[{label:'2025-01-01',value:99}];
 earnings.indicators[0].trend=[{label:'2026-10-11',value:19}];
 const current=body('2026-11-18',earnings);
 const old=saved('2026-11-17',makeEarnings('2026-11-17'));
 attachStoredEarningsFactorTrends(current,[old]);
 assert.deepEqual(get(current,'S1').trend,[{label:'2026-10-11',value:19}]);
 assert.equal(get(current,'S2').trend.length,2);
 assert.equal(get(current,'S2').trend[0].value,old.body.domains[0].indicators[1].score);
});

test('production writer computes from stored snapshot history before local score and D1 publication',()=>{
 const writer=fs.readFileSync('scripts/pc-writer/run-local.mjs','utf8');
 const source=fs.readFileSync('scripts/pc-writer/market-snapshot-comparisons.mjs','utf8');
 assert.match(writer,/attachStoredEarningsFactorTrends\(body,storedHistory\)/);
 assert.ok(writer.indexOf('attachStoredEarningsFactorTrends(body,storedHistory)')<
  writer.indexOf('assertCompleteMarket(body);'));
 assert.ok(writer.indexOf('attachStoredEarningsFactorTrends(body,storedHistory)')<
  writer.indexOf('writeScore(body,now)'));
 assert.match(source,/sameVerifiedLineage\(current,previous\)/);
 assert.doesNotMatch(source,/collect.*Provider|fetch\(/);
});
