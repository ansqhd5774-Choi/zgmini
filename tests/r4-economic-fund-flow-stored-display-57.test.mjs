import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildFundFlowR54,FUND_FLOW_R54_WEIGHTS} from '../lib/diagnostic-layer/open-resolution-r53-components.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
import {buildCompositeMarketScore,DOMAIN_WEIGHTS} from '../lib/market-score/composite-model-r1.mjs';
import {
 economicFundFlowSourceDate,verifiedEconomicFundFlowScore,
 verifiedEconomicFundFlowChart,isEconomicFundFlowChartCurrent,
} from '../lib/economic-fund-flow-stored-display-r4.mjs';

const snapshotDate='2026-11-17';
const rows=Array.from({length:32},(_,i)=>{
 const year=2024+Math.floor(i/12),month=String(i%12+1).padStart(2,'0');
 const allNetRatio=(i%7-3)/10;
 return {observationDate:`${year}-${month}-01`,value:allNetRatio,allNetRatio,
 indexNetRatio:allNetRatio+0.24,nonIndexNetRatio:allNetRatio-0.18,
 allOutflowRatio:-(2.2+(i%5)*0.11)};
});
const added={observationDate:'2026-09-01',value:10,allNetRatio:10,indexNetRatio:10.5,nonIndexNetRatio:9,allOutflowRatio:-0.5};
function build(input=rows,asOfDate=snapshotDate){
 const calculated=buildFundFlowR54(input,{asOfDate,minValid:12});
 const domain=buildCompositeMarketScore(
  buildCmR1DomainResults({fundFlows:calculated}),
  {updatedAt:asOfDate+'T12:00:00Z'},
 ).domains.find(x=>x.id==='fundFlows');
 return {calculated,domain};
}
const verified=domain=>verifiedEconomicFundFlowScore(domain,snapshotDate);
const chart=domain=>verifiedEconomicFundFlowChart(domain,snapshotDate,domain.score);

test('approved R54 weights, distinct four SEC monthly factors and fixed CM-R1 allocation',()=>{
 const {domain,calculated}=build();
 assert.equal(Object.values(FUND_FLOW_R54_WEIGHTS).reduce((a,b)=>a+b,0),1);
 assert.deepEqual(FUND_FLOW_R54_WEIGHTS,{allNet:.4,momentum:.25,participation:.2,redemption:.15});
 assert.equal(calculated.status,'READY');
 assert.equal(domain.weight,DOMAIN_WEIGHTS.find(x=>x.id==='fundFlows').weight);
 assert.deepEqual(domain.indicators.map(x=>x.id),['fund-flow-54-1','fund-flow-54-2','fund-flow-54-3','fund-flow-54-4']);
 assert.equal(verified(domain),calculated.score);
});

test('the last real SEC observation month survives adapter, composite and UI, never API retrieval date',()=>{
 const {domain,calculated}=build();
 assert.equal(calculated.observationDate,'2026-08-01');
 assert.equal(domain.observationDate,'2026-08-01');
 assert.equal(domain.updatedAt,'2026-08-01');
 assert.equal(economicFundFlowSourceDate(domain,snapshotDate),'2026-08-01');
 assert.equal(domain.methodologyVersion,'FUND_FLOW_R54_1');
 assert.notEqual(economicFundFlowSourceDate(domain,snapshotDate),snapshotDate);
});

test('one newly eligible monthly SEC row changes R54 score and last saved chart point',()=>{
 const before=build(),after=build([...rows,added]);
 assert.equal(before.calculated.status,'READY');
 assert.equal(after.calculated.status,'READY');
 assert.equal(before.domain.observationDate,'2026-08-01');
 assert.equal(after.domain.observationDate,'2026-09-01');
 assert.notEqual(after.domain.score,before.domain.score);
 assert.equal(verified(after.domain),after.domain.score);
 const points=chart(after.domain);
 assert.equal(points.at(-1).date,'2026-09-01');
 assert.equal(points.at(-1).score,after.domain.score);
 assert.equal(isEconomicFundFlowChartCurrent(points,after.domain,snapshotDate,after.domain.score),true);
});

test('merely querying on a later day without new official monthly row never adds another current point',()=>{
 const earlier=build(rows,'2026-10-18'),later=build(rows,snapshotDate);
 assert.equal(earlier.domain.score,later.domain.score);
 assert.equal(earlier.domain.observationDate,later.domain.observationDate);
 assert.deepEqual(earlier.domain.trend,later.domain.trend);
 assert.equal(chart(later.domain).at(-1).date,'2026-08-01');
 assert.equal(chart(later.domain).some(x=>x.date===snapshotDate),false);
});

test('retrieval timestamp metadata alone does not become an official release or new score observation',()=>{
 const {domain}=build();
 const changed={...domain,retrievedAt:'2026-11-17T13:30:00Z',sourceStoredAt:'2026-11-17T14:00:00Z'};
 assert.equal(verified(changed),verified(domain));
 assert.deepEqual(chart(changed),chart(domain));
});

test('the R54 total must exactly match the unrenormalized official four-factor weights',()=>{
 const {domain}=build();
 const expected=domain.indicators.reduce((v,row,i)=>v+row.score*[.4,.25,.2,.15][i],0);
 assert.ok(Math.abs(expected-domain.score)<1e-6);
 assert.equal(verified({...domain,score:domain.score+1}),null);
 const changed={...domain,indicators:domain.indicators.map(x=>({...x}))};
 changed.indicators[0].score+=5;
 assert.equal(verified(changed),null);
});

test('legacy R53, candidate, partial, missing and invalid current states are not declared as R54',()=>{
 const {domain}=build();
 for(const patch of [{methodologyVersion:'FUND_FLOW_R53_1'},{methodologyVersion:null},
  {status:'PARTIAL'},{status:'STALE'},{score:null},{score:'60'},
  {missingFactors:['fund-flow-54-4']}])assert.equal(verified({...domain,...patch}),null);
});

test('zero score is a valid observation while missing and malformed scores fail',()=>{
 const {domain}=build();
 const zero={...domain,score:0,indicators:domain.indicators.map(x=>({...x,score:0}))};
 assert.equal(verified(zero),0);
 for(const value of [undefined,null,NaN,Infinity,'0',-1,101]){
  assert.equal(verified({...domain,indicators:domain.indicators.map((x,i)=>i===0?{...x,score:value}:x)}),null);
 }
});

test('all four official factors are mandatory, no substitute or duplicated ID',()=>{
 const {domain}=build();
 for(const count of [0,1,2,3]){
  assert.equal(verified({...domain,indicators:domain.indicators.slice(0,count)}),null);
 }
 const duplicate={...domain,indicators:domain.indicators.map(x=>({...x}))};
 duplicate.indicators[3]=duplicate.indicators[0];
 assert.equal(verified(duplicate),null);
 const extra={...domain,indicators:[...domain.indicators,{id:'fund-flow-legacy',score:55,status:'READY'}]};
 assert.equal(verified(extra),null);
});

test('source name and original monthly observation period must match for all four rows',()=>{
 const {domain}=build();
 for(const edit of [
  r=>r[0].name='legacy flow',
  r=>r[1].source='unverified SEC',
  r=>r[2].status='PARTIAL',
  r=>r[3].observationDate='2026-07-01',
 ]){
  const r=domain.indicators.map(x=>({...x}));edit(r);
  assert.equal(verified({...domain,indicators:r}),null);
 }
});

test('future/impossible observations and inconsistent domain provenance fail',()=>{
 const {domain}=build();
 for(const patch of [
  {observationDate:'2026-12-01',updatedAt:'2026-12-01'},
  {observationDate:'2026-02-30',updatedAt:'2026-02-30'},
  {observationDate:'2026-08-02',updatedAt:'2026-08-02'},
  {observationDate:'2026-08-01',updatedAt:'2026-11-17'},
 ]){
  assert.equal(verified({...domain,...patch}),null);
 }
});

test('pre-metadata CM-R1 fund flows can use old observationDate-from-updatedAt only',()=>{
 const {domain}=build();
 const old={...domain,observationDate:null};
 assert.equal(verified(old),domain.score);
 assert.equal(economicFundFlowSourceDate(old,snapshotDate),domain.updatedAt);
 assert.equal(verified({...old,updatedAt:'2026-11-17'}),null);
});

test('saved score series uses its real monthly dates without new retrieval-date point',()=>{
 const {domain}=build();
 const points=chart(domain);
 assert.ok(points.length>=10);
 assert.equal(points.at(-1).date,'2026-08-01');
 assert.equal(points.at(-1).score,domain.score);
 assert.equal(isEconomicFundFlowChartCurrent(points,domain,snapshotDate,domain.score),true);
 assert.equal(points.some(x=>x.date===snapshotDate),false);
});

test('missing last official saved point never appears from API current score',()=>{
 const {domain}=build();
 const missing={...domain,trend:domain.trend.filter(r=>r.label!==domain.observationDate)};
 const points=chart(missing);
 assert.notEqual(points.at(-1)?.date,domain.observationDate);
 assert.equal(isEconomicFundFlowChartCurrent(points,missing,snapshotDate,domain.score),false);
});

test('contradictory latest score or duplicate monthly points are not silently resolved',()=>{
 const {domain}=build();
 const bad={...domain,trend:domain.trend.map(r=>r.label===domain.observationDate?{...r,value:r.value+1}:r)};
 assert.deepEqual(chart(bad),[]);
 const dup={...domain,trend:[...domain.trend,{label:domain.observationDate,value:domain.score+5}]};
 assert.deepEqual(chart(dup),[]);
});

test('future, malformed dates and partial points are not fabricated as zero',()=>{
 const {domain}=build();
 const current=domain.observationDate;
 const injected={...domain,trend:[...domain.trend,
  {label:'2026-12-01',value:50},{label:'2026-02-30',value:20},
  {label:'2026-05-01',value:null,status:'PARTIAL'}]};
 // An invalid contradictory duplicate month is rejected, never substituted with zero.
 assert.deepEqual(chart(injected),[]);
 const futureOnly={...domain,trend:[...domain.trend,
  {label:'2026-12-01',value:50},{label:'2026-02-30',value:20}]};
 const result=chart(futureOnly);
 assert.equal(result.at(-1).date,current);
 assert.equal(result.some(x=>x.date==='2026-12-01'||x.date==='2026-02-30'),false);
 const gap={...domain,trend:domain.trend.filter(x=>x.label!=='2026-05-01').concat({label:'2026-05-01',value:null,status:'PARTIAL'})};
 assert.equal(chart(gap).find(x=>x.date==='2026-05-01')?.score,null);
});

test('economic detail page gates R54 headline, chart, comparisons, 4 factors and source-month header',()=>{
 const panel=readFileSync(new URL('../app/economic-indicators/economic-detail-panel.tsx',import.meta.url),'utf8');
 for(const term of [
  'id==="fundFlows"?verifiedEconomicFundFlowScore(domain,payload?.asOfDate)',
  'verifiedEconomicFundFlowChart(domain,payload?.asOfDate,score)',
  'isEconomicFundFlowChartCurrent(fundFlowChart,domain,payload?.asOfDate,score)',
  'id==="fundFlows"?fundFlowChart',
  'id!=="fundFlows"||(score!==null&&fundFlowChartCurrent)',
  'id==="fundFlows"&&(score===null||!fundFlowChartCurrent)',
  'economicFundFlowSourceDate(domain,payload?.asOfDate)',
  '||id==="liquidity"||id==="fundFlows"||id==="breadth"||id==="dollarFx")&&score===null',
 ])assert.ok(panel.includes(term),term);
 const adapter=readFileSync(new URL('../lib/market-score/domain-adapter-r1.mjs',import.meta.url),'utf8');
 const composite=readFileSync(new URL('../lib/market-score/composite-model-r1.mjs',import.meta.url),'utf8');
 assert.ok(adapter.includes('observationDate:fundFlows?.observationDate??null'), 'observation metadata in adapter');
 assert.ok(composite.includes('spec.id==="fundFlows"?{'), 'monthly observation metadata in composite');
});
