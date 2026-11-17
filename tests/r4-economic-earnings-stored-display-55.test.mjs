import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {E1_R5_SCORE_KEYS,E1_R5_WEIGHTS} from '../lib/market-score/earnings-e1-r5.mjs';
import {
 verifiedEconomicEarningsScore,verifiedEconomicEarningsChart,
 isEconomicEarningsChartCurrent,economicEarningsSourceDate,
} from '../lib/economic-earnings-stored-display-r4.mjs';

const asOf='2026-11-17',current='2026-11-16';
const makeR5=()=>{
 const indicators=E1_R5_SCORE_KEYS.map((id,i)=>({id,name:id,status:'READY',score:40+i,asOfDate:current,source:id==='S6'?'BEA NIPA':id==='S11'?'BLS':'SEC EDGAR'}));
 const score=indicators.reduce((sum,row)=>sum+row.score*E1_R5_WEIGHTS[row.id],0);
 return {id:'earnings',status:'READY',methodologyVersion:'E1-R5',score,missingFactors:[],indicators,
  trend:[{label:'2026-03-31',value:score-5},{label:'2026-06-30',value:score-2},{label:current,value:score}]};
};
const makeR4=()=>{
 const indicators=[['EPS 성장률',45],['매출 성장률',70],['이익 성장 종목 비율',50],['영업이익률',40]]
  .map(([name,score])=>({name,score,status:'READY',asOfDate:'2026-06-30'}));
 return {id:'earnings',status:'READY',methodologyVersion:'E1-R4',score:49.75,
  financialPeriodEnd:'2026-06-30',missingFactors:[],indicators,
  trend:[{label:'2025-12-31',value:42},{label:'2026-03-31',value:45},{label:'2026-06-30',value:49.75}]};
};

test('approved R5 13 factor weights sum to one and verified stored score/current date survives',()=>{
 const d=makeR5();
 assert.equal(E1_R5_SCORE_KEYS.length,13);
 assert.ok(Math.abs(Object.values(E1_R5_WEIGHTS).reduce((a,b)=>a+b,0)-1)<1e-12);
 assert.equal(verifiedEconomicEarningsScore(d,asOf),d.score);
 assert.equal(economicEarningsSourceDate(d,asOf),current);
 const chart=verifiedEconomicEarningsChart(d,asOf,d.score);
 assert.equal(chart.length,3);
 assert.equal(chart.at(-1).date,current);
 assert.equal(isEconomicEarningsChartCurrent(chart,d,asOf,d.score),true);
});

test('complete historical E1-R4 remains visible without mistaken R5-only gate',()=>{
 const d=makeR4();
 assert.equal(verifiedEconomicEarningsScore(d,asOf),d.score);
 const chart=verifiedEconomicEarningsChart(d,asOf,d.score);
 assert.equal(chart.at(-1).date,'2026-06-30');
 assert.equal(isEconomicEarningsChartCurrent(chart,d,asOf,d.score),true);
});

test('candidate/legacy/other methodology is not promoted to published E1 score',()=>{
 for(const methodologyVersion of [null,'E1-R3','E1-R5-CANDIDATE']){
  assert.equal(verifiedEconomicEarningsScore({...makeR5(),methodologyVersion},asOf),null);
 }
 for(const patch of [{status:'PARTIAL'},{status:'STALE'},{missingFactors:['S12']},{score:null},{score:101}]){
  assert.equal(verifiedEconomicEarningsScore({...makeR5(),...patch},asOf),null);
 }
});

test('13 of 13 required: reject missing, duplicated, and partial SEC/BEA/BLS/CFO factors',()=>{
 for(const change of [
  d=>d.indicators.pop(),
  d=>d.indicators[12]=d.indicators[11],
  d=>d.indicators[12].status='PARTIAL',
  d=>d.indicators[5].score=null,
  d=>d.indicators[9].score=101,
  d=>d.indicators[0].id='S0',
 ]){
  const d=makeR5();change(d);
  assert.equal(verifiedEconomicEarningsScore(d,asOf),null);
 }
});

test('one new official eligible factor cannot pass a mismatched 13-factor weighted score',()=>{
 const d=makeR5();d.indicators[0].score+=10;
 assert.equal(verifiedEconomicEarningsScore(d,asOf),null);
});

test('zero is valid, null is not zero, missing factors never cause weight renormalization',()=>{
 const zero=makeR5();zero.indicators=zero.indicators.map(r=>({...r,score:0}));zero.score=0;
 assert.equal(verifiedEconomicEarningsScore(zero,asOf),0);
 const missing=makeR5();missing.indicators[0].score=null;
 assert.equal(verifiedEconomicEarningsScore(missing,asOf),null);
});

test('no evaluation date is fabricated from query day; impossible/future factor dates are refused',()=>{
 for(const date of ['2026-11-18','2026-02-30','2026-11-15']){
  const d=makeR5();d.indicators[0].asOfDate=date;
  assert.equal(verifiedEconomicEarningsScore(d,asOf),null);
 }
 const d=makeR5();d.indicators.forEach(row=>row.asOfDate='2026-11-18');
 assert.equal(verifiedEconomicEarningsScore(d,asOf),null);
});

test('R4 quarter end and all four actual factors are required',()=>{
 for(const change of [
  d=>d.financialPeriodEnd='2026-07-01',
  d=>d.financialPeriodEnd='2026-09-30',
  d=>d.indicators.pop(),
  d=>d.indicators[0].status='PARTIAL',
  d=>d.indicators[0].score=50,
  d=>d.indicators[2].asOfDate='2026-03-31',
 ]){
  const d=makeR4();change(d);assert.equal(verifiedEconomicEarningsScore(d,asOf),null);
 }
});

test('R5 stored observation dates are preserved; future and impossible dates excluded',()=>{
 const d=makeR5();d.trend.unshift({label:'2024-01-01',value:22});
 d.trend.push({label:'2026-11-18',value:100},{label:'2026-02-30',value:77});
 const chart=verifiedEconomicEarningsChart(d,asOf,d.score);
 assert.equal(chart.length,3);assert.equal(chart.at(-1).date,current);
});

test('same-date conflicting stored score refuses chart rather than choosing arbitrary last point',()=>{
 const d=makeR5();d.trend.push({label:current,value:d.score+1});
 assert.deepEqual(verifiedEconomicEarningsChart(d,asOf,d.score),[]);
});

test('an earlier last saved point is not quietly cloned to current evaluation date',()=>{
 const d=makeR5();d.trend.pop();
 const chart=verifiedEconomicEarningsChart(d,asOf,d.score);
 assert.equal(chart.length,2);
 assert.equal(isEconomicEarningsChartCurrent(chart,d,asOf,d.score),false);
});

test('if saved current period contradicts published score, no false current line is shown',()=>{
 const d=makeR4();d.trend.at(-1).value=20;
 assert.deepEqual(verifiedEconomicEarningsChart(d,asOf,d.score),[]);
});

test('historical missing is a null gap and may not overwrite valid current',()=>{
 const d=makeR5();d.trend[1]={label:'2026-06-30',score:null,value:70,status:'PARTIAL'};
 const chart=verifiedEconomicEarningsChart(d,asOf,d.score);
 assert.equal(chart[1].score,null);
 assert.equal(isEconomicEarningsChartCurrent(chart,d,asOf,d.score),true);
});

test('economic detail page uses source guards for headline, history, comparisons and rows',()=>{
 const panel=readFileSync(new URL('../app/economic-indicators/economic-detail-panel.tsx',import.meta.url),'utf8');
 for(const term of [
  'id==="earnings"?verifiedEconomicEarningsScore(domain,payload?.asOfDate)',
  'verifiedEconomicEarningsChart(domain,payload?.asOfDate,score)',
  'isEconomicEarningsChartCurrent(earningsChart,domain,payload?.asOfDate,score)',
  'id==="earnings"?earningsChart',
  'id!=="earnings"||(score!==null&&earningsChartCurrent)',
  'id==="earnings"&&(score===null||!earningsChartCurrent)',
  'economicEarningsSourceDate(domain,payload?.asOfDate)',
 ])assert.ok(panel.includes(term),term);
});
