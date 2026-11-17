import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {liquidityCrisisDefense} from '../lib/diagnostic-layer/model.mjs';
import {
 buildLiquidityActivePublicDomainR1,buildLiquidityDiagnosticTrendR1,
} from '../lib/market-score/liquidity-active-public-domain-r1.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
import {buildCompositeMarketScore,DOMAIN_WEIGHTS} from '../lib/market-score/composite-model-r1.mjs';
import {
 verifiedEconomicLiquidityScore,verifiedEconomicLiquidityChart,
 isEconomicLiquidityChartCurrent,
} from '../lib/economic-liquidity-stored-display-r4.mjs';

const asOf='2026-10-18';
const weights={fundingStress:.25,bankReserves:.25,tga:.15,onRrp:.15,m2:.10,bondVolatility:.10};
const input={fundingStress:50,bankReserves:60,tga:40,onRrp:70,m2:30,bondVolatility:80};
const dateFor=id=>id==='m2'?'2026-09-01':id==='fundingStress'||id==='bondVolatility'?'2026-10-15':'2026-10-17';
const r1For=scores=>{
 const components={};
 for(const [id,score] of Object.entries(scores)){
  components[id]={rows:[{observationDate:'2026-09-01',score:id==='m2'?score:50},
   ...(id==='m2'?[]:[{observationDate:dateFor(id),score}])]};
 }
 const latest={};
 for(const id of ['bankReserves','m2','tga','onRrp']){
  latest[id]={observationDate:dateFor(id),value:scores[id]};
 }
 return {components,latest};
};
function fixture(scores=input){
 const r1=r1For(scores),scored=liquidityCrisisDefense(scores);
 assert.equal(scored.status,'READY');
 const src=buildLiquidityActivePublicDomainR1({
  diagnostic:{snapshot:{diagnostics:{liquidityCrisisDefense:scored},r1}},
  storedTrend:[{label:'2026-10-10',value:54}],
  asOfDate:asOf,
 });
 const domain=buildCompositeMarketScore(
  buildCmR1DomainResults({publicDomains:{liquidity:src}}),
  {updatedAt:asOf+'T12:00:00Z'}
 ).domains.find(row=>row.id==='liquidity');
 const diag={status:'READY',score:scored.score,missingFactors:[]};
 return {r1,src,domain,diag};
}
const check=(f)=>verifiedEconomicLiquidityScore(f.domain,asOf,f.diag);

test('approved D3 six weights (25/25/15/15/10/10) remain fixed and composite keeps liquidity provenance',()=>{
 assert.equal(Object.values(weights).reduce((a,b)=>a+b,0),1);
 const f=fixture();assert.equal(f.src.score,55);
 assert.equal(f.domain.weight,DOMAIN_WEIGHTS.find(x=>x.id==='liquidity').weight);
 assert.equal(f.domain.methodologyVersion,'DIAGNOSTIC_SCORE_TRANSFORM_R1');
 assert.equal(f.domain.asOfDate,asOf);
 assert.equal(f.domain.score,55);
 assert.equal(check(f),55);
});

test('one daily reserve/TGA change recomputes D3 before a new monthly M2 release',()=>{
 const before=fixture(),changed=fixture({...input,bankReserves:80,tga:50});
 assert.equal(before.domain.score,55);
 assert.equal(changed.domain.score,61.5);
 assert.equal(changed.domain.score-before.domain.score,20*.25+10*.15);
 assert.equal(changed.domain.indicators[1].score,before.domain.indicators[1].score);
 assert.equal(changed.domain.indicators[1].asOfDate,'2026-09-01');
 assert.equal(check(changed),61.5);
 const rebuilt=buildLiquidityDiagnosticTrendR1(changed.r1,{asOfDate:asOf});
 assert.equal(rebuilt.find(row=>row.label==='2026-10-17').value,61.5);
});

test('four displayed indicators do not get reweighted to fabricate six-factor D3 aggregate',()=>{
 const f=fixture();
 const fourWeighted=f.domain.indicators.reduce((sum,row)=>sum+row.score,0)/4;
 assert.notEqual(fourWeighted,55);
 assert.equal(check(f),55);
 const divergent={...f,diag:{...f.diag,score:54}};
 assert.equal(check(divergent),null);
});

test('legacy explicit liquidity READY without active version cannot masquerade as D3',()=>{
 const f=fixture();
 for(const method of [null,'LIQUIDITY_R1','LIQUIDITY_D3_ACTIVE_PUBLIC_R1']){
  assert.equal(verifiedEconomicLiquidityScore({...f.domain,methodologyVersion:method},asOf,f.diag),null);
 }
});

test('partial, stale, missing score or incomplete six-factor diagnostic is not a current D3 score',()=>{
 const f=fixture();
 for(const patch of [{status:'PARTIAL'},{status:'UNAVAILABLE'},{score:null},
  {freshness:'OLD_HISTORY'},{missingFactors:['bondVolatility']},{interpretation:'LEGACY'}]){
  assert.equal(verifiedEconomicLiquidityScore({...f.domain,...patch},asOf,f.diag),null);
 }
 assert.equal(verifiedEconomicLiquidityScore(f.domain,asOf,{status:'PARTIAL',score:55,missingFactors:['m2']}),null);
});

test('all four UI evidence rows required, without inventing hidden six-factor input values',()=>{
 const f=fixture();
 for(const size of [0,1,3]){
  assert.equal(verifiedEconomicLiquidityScore({...f.domain,indicators:f.domain.indicators.slice(0,size)},asOf,f.diag),null);
 }
 assert.equal(verifiedEconomicLiquidityScore({...f.domain,indicators:[
  ...f.domain.indicators,{name:'UNAPPROVED',status:'READY',score:50,asOfDate:asOf}
 ]},asOf,f.diag),null);
 assert.deepEqual(f.domain.indicators.map(x=>x.name),['은행 준비금','M2 증가율','TGA 변화','ON RRP 변화']);
});

test('wrong names, duplicates, and swapped source provenance fail closed',()=>{
 const f=fixture();
 for(const modify of [
  p=>p.indicators[0].name='준비금 R2',
  p=>p.indicators[1]=p.indicators[0],
  p=>p.indicators[2].source='UNVERIFIED',
  p=>p.indicators[3].status='PARTIAL',
 ]){
  const p={...f.domain,indicators:f.domain.indicators.map(x=>({...x}))};
  modify(p);assert.equal(verifiedEconomicLiquidityScore(p,asOf,f.diag),null);
 }
});

test('actual mixed release dates are accepted; no requirement for monthly M2 to equal daily date',()=>{
 const f=fixture();
 assert.equal(f.domain.indicators[0].asOfDate,'2026-10-17');
 assert.equal(f.domain.indicators[1].asOfDate,'2026-09-01');
 assert.equal(f.domain.indicators[2].asOfDate,'2026-10-17');
 assert.equal(f.domain.indicators[3].asOfDate,'2026-10-17');
 assert.equal(check(f),55);
});

test('invalid, future, or mislabeled snapshot and constituent observation dates fail closed',()=>{
 const f=fixture();
 for(const changed of [
  {...f.domain,asOfDate:'2026-10-17'},
  {...f.domain,updatedAt:'2026-10-19'},
  {...f.domain,updatedAt:'2026-02-30'},
  {...f.domain,asOfDate:'2026-10-19'},
 ]){
  assert.equal(verifiedEconomicLiquidityScore(changed,asOf,f.diag),null);
 }
 const future={...f.domain,indicators:f.domain.indicators.map(x=>({...x}))};
 future.indicators[1].asOfDate='2026-10-19';
 assert.equal(verifiedEconomicLiquidityScore(future,asOf,f.diag),null);
});

test('score zero and 100 remain real values, never replace absent data with zero',()=>{
 for(const n of [0,100]){
  const f=fixture(Object.fromEntries(Object.keys(input).map(id=>[id,n])));
  assert.equal(check(f),n);
 }
 const f=fixture();
 for(const value of [null,undefined,'0',NaN,Infinity,-1,101]){
  assert.equal(verifiedEconomicLiquidityScore({...f.domain,score:value},asOf,f.diag),null);
 }
});

test('chart reads only actual published dates and reconciles current score without inventing dates',()=>{
 const f=fixture();
 const chart=verifiedEconomicLiquidityChart(f.domain,asOf,55,f.diag);
 assert.ok(chart.length>=3);
 assert.equal(chart.at(-1).date,asOf);
 assert.equal(chart.at(-1).score,55);
 assert.equal(isEconomicLiquidityChartCurrent(chart,f.domain,asOf,55,f.diag),true);
});

test('an absent last published evaluation date never becomes a synthetic chart point in UI guard',()=>{
 const f=fixture();
 const p={...f.domain,trend:f.domain.trend.filter(x=>x.label!==asOf)};
 const chart=verifiedEconomicLiquidityChart(p,asOf,55,f.diag);
 assert.equal(chart.some(x=>x.date===asOf),false);
 assert.equal(isEconomicLiquidityChartCurrent(chart,p,asOf,55,f.diag),false);
});

test('different current score and last saved score block chart rather than interpolate or overwrite',()=>{
 const f=fixture();
 const p={...f.domain,trend:f.domain.trend.map(x=>x.label===asOf?{...x,value:x.value+1}:x)};
 assert.deepEqual(verifiedEconomicLiquidityChart(p,asOf,55,f.diag),[]);
});

test('future dates, invalid days and older than one year are excluded, without changing stored rows',()=>{
 const f=fixture(),saved=[...f.domain.trend];
 const p={...f.domain,trend:[{label:'2025-01-01',value:90},
  {label:'2026-02-30',value:40},{label:'2026-10-19',value:99},...saved]};
 const chart=verifiedEconomicLiquidityChart(p,asOf,55,f.diag);
 assert.equal(chart.some(x=>x.date==='2026-10-19'||x.date==='2026-02-30'||x.date==='2025-01-01'),false);
 assert.equal(chart.at(-1).date,asOf);
 assert.deepEqual(f.domain.trend,saved);
});

test('contradictory duplicate-day values suppress chart; valid missing is a null gap, not a zero',()=>{
 const f=fixture();
 const conflict={...f.domain,trend:[...f.domain.trend,{label:asOf,value:77}]};
 assert.deepEqual(verifiedEconomicLiquidityChart(conflict,asOf,55,f.diag),[]);
 const gap={...f.domain,trend:[...f.domain.trend,{label:'2026-10-12',value:null,status:'PARTIAL'}]};
 const chart=verifiedEconomicLiquidityChart(gap,asOf,55,f.diag);
 assert.equal(chart.find(x=>x.date==='2026-10-12').score,null);
 assert.ok(chart.find(x=>x.date===asOf).score===55);
});

test('economic detail wires D3-only score, stored chart, date, comparisons and row gate',()=>{
 const ui=readFileSync(new URL('../app/economic-indicators/economic-detail-panel.tsx',import.meta.url),'utf8');
 const composite=readFileSync(new URL('../lib/market-score/composite-model-r1.mjs',import.meta.url),'utf8');
 const model=readFileSync(new URL('../lib/diagnostic-layer/model.mjs',import.meta.url),'utf8');
 for(const term of [
  'id==="liquidity"?verifiedEconomicLiquidityScore(domain,payload?.asOfDate,liquidityDiagnostic)',
  'verifiedEconomicLiquidityChart(domain,payload?.asOfDate,score,liquidityDiagnostic)',
  'isEconomicLiquidityChartCurrent(liquidityChart,domain,payload?.asOfDate,score,liquidityDiagnostic)',
  'id==="liquidity"?liquidityChart',
  'id!=="liquidity"||(score!==null&&liquidityChartCurrent)',
  'id==="liquidity"&&(score===null||!liquidityChartCurrent)',
  '||id==="earnings"||id==="liquidity")&&score===null',
 ])assert.ok(ui.includes(term),term);
 assert.ok(composite.includes('spec.id==="liquidity"?{'));
 for(const [name,weight] of Object.entries(weights)){
  assert.ok(model.includes('id: "'+name+'", score: input.'+name+', weight: '+weight.toFixed(2)),name);
 }
});
