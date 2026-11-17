import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculateConsumptionR5,CONSUMPTION_R5,R5_WEIGHTS} from '../lib/market-score/consumption-r5.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
import {buildCompositeMarketScore} from '../lib/market-score/composite-model-r1.mjs';
import {verifiedEconomicConsumptionScore,verifiedEconomicConsumptionChart,isEconomicConsumptionChartCurrent} from '../lib/economic-consumption-stored-display-r4.mjs';

const panel=readFileSync(new URL('../app/economic-indicators/economic-detail-panel.tsx',import.meta.url),'utf8');
const asOf='2023-04-30';
const input=()=>{
 const series={};
 for(const id of ['realPce','realPcePerCapita','realIncome','employmentRatio','realPayroll','savingRate','consumerDebtService','consumerDelinquency','realGoods','realServices','category1','category2'])
  series[id]=Array.from({length:160},(_,i)=>{
   const date=new Date(Date.UTC(2010,i,1)).toISOString().slice(0,10);
   return {observationDate:date,availableDate:date,value:100*Math.exp(i*.002)};
  });
 return {series,categoryIds:['category1','category2']};
};
const published=()=>{
 const original=calculateConsumptionR5(input(),{asOfDate:asOf});
 assert.equal(original.status,'READY');
 // Simulate the existing R5 stored reader and worker's public-method overlay,
 // without calling providers or persisting D1 data.
 const stored={...original,freshness:'STORED_MONTHLY_R5'};
 const domains=buildCmR1DomainResults({publicDomains:{consumption:stored}});
 const composite=buildCompositeMarketScore(domains,{updatedAt:asOf+'T00:00:00.000Z'});
 const domain={...composite.domains.find(x=>x.id==='consumption'),
  methodologyVersion:stored.methodologyVersion,asOfDate:asOf,
  historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false};
 return {original,domain};
};
test('approved R5 five-area weights equal 100, separate 13 scored factors + 2 nonscored signals',()=>{
 assert.deepEqual(R5_WEIGHTS,{D:30,Y:25,L:15,H:20,B:10});
 const {original,domain}=published();
 assert.equal(domain.indicators.length,15);
 assert.equal(original.indicators.filter(x=>x.area).length,13);
 assert.deepEqual(original.indicators.filter(x=>!x.area).map(x=>x.id),['gap','acceleration']);
 assert.equal(original.indicators.slice(0,13).reduce((s,x)=>s+x.weight,0),100);
 assert.equal(verifiedEconomicConsumptionScore(domain,asOf),original.score);
});
test('real R5 calculator to public economic12 composite preserves active 5 axes, score and monthly dates',()=>{
 const {domain,original}=published();
 assert.equal(domain.methodologyVersion,CONSUMPTION_R5);
 assert.equal(domain.updatedAt,'2023-04-01');
 assert.equal(verifiedEconomicConsumptionScore(domain,asOf),original.score);
 const chart=verifiedEconomicConsumptionChart(domain,asOf,original.score);
 assert.equal(chart.length,13);
 assert.equal(chart.at(-1).date,'2023-04-01');
 assert.equal(isEconomicConsumptionChartCurrent(chart,domain,asOf,original.score),true);
});
test('old 7-axis R4 numeric READY or wrong explicit version cannot masquerade as R5',()=>{
 for(const methodologyVersion of [null,'CONSUMPTION_R4','CONSUMPTION_R4_7AXIS']){
  const p={...published().domain,methodologyVersion};
  assert.equal(verifiedEconomicConsumptionScore(p,asOf),null);
 }
});
test('13 of 13 score factors required; a new monthly value cannot bypass one missing area',()=>{
 for(const n of [1,12,14]){
  const p=published().domain;p.indicators=p.indicators.slice(0,n);
  assert.equal(verifiedEconomicConsumptionScore(p,asOf),null);
 }
 const p=published().domain;p.indicators[12].status='PARTIAL';
 assert.equal(verifiedEconomicConsumptionScore(p,asOf),null);
});
test('PARTIAL, stale source, missingFactor and wrong provenance cannot display numeric R5 score',()=>{
 for(const patch of [{status:'PARTIAL'},{status:'UNAVAILABLE'},{freshness:'STORED_R4'},
 {missingFactors:['saving']},{interpretation:'old 7-axis consumer'}]){
  const p={...published().domain,...patch};
  assert.equal(verifiedEconomicConsumptionScore(p,asOf),null);
 }
});
test('source ID, area, approved weight and area weight are all verified',()=>{
 const bad=[p=>p.indicators[0].id='pce-old',p=>p.indicators[0].area='Y',
  p=>p.indicators[0].weight=20,p=>p.indicators[4].areaWeight=50,
  p=>p.indicators.reverse()];
 for(const change of bad){const p=published().domain;change(p);
  assert.equal(verifiedEconomicConsumptionScore(p,asOf),null);}
});
test('two zero-weight diagnostics cannot be scored as additional sixth or seventh axis',()=>{
 for(const change of [p=>p.indicators[13].score=0,p=>p.indicators[14].weight=10,
 p=>p.indicators[13].id='growth',p=>p.indicators[14].area='B']){
  const p=published().domain;change(p);
  assert.equal(verifiedEconomicConsumptionScore(p,asOf),null);}
});
test('valid zero and 100 factors preserved, but missing and invalid component score rejected',()=>{
 const p=published().domain;
 const weight=p.indicators[0].weight;
 for(const value of [0,100]){
  const x=published().domain;x.indicators[0].score=value;
  x.score=p.score+(value-p.indicators[0].score)*weight/100;
  assert.equal(verifiedEconomicConsumptionScore(x,asOf),x.score);
 }
 for(const value of [null,undefined,NaN,Infinity,-1,101,'50']){
  const x=published().domain;x.indicators[0].score=value;
  assert.equal(verifiedEconomicConsumptionScore(x,asOf),null);
 }
});
test('mismatched weighted public score cannot be shown even when all 13 factors READY',()=>{
 const p=published().domain;p.score+=1;
 assert.equal(verifiedEconomicConsumptionScore(p,asOf),null);
});
test('release as-of 2023-04-30 may legitimately show last available monthly 2023-04-01',()=>{
 const {domain,original}=published();
 assert.equal(verifiedEconomicConsumptionScore(domain,asOf),original.score);
 assert.equal(isEconomicConsumptionChartCurrent(verifiedEconomicConsumptionChart(domain,asOf,original.score),domain,asOf,original.score),true);
});
test('invalid/future/latest observationDate and invalid monthly updatedAt rejected',()=>{
 for(const date of ['2023-06-01','2023-02-30','2023-04-16']){
  const x=published().domain;x.indicators[1].observationDate=date;
  assert.equal(verifiedEconomicConsumptionScore(x,asOf),null);
 }
 const x=published().domain;x.updatedAt='2023-05-01';
 assert.equal(verifiedEconomicConsumptionScore(x,asOf),null);
});
test('actual monthly saved points only; future, wrong calendar, old dates do not become latest',()=>{
 const {domain,original}=published();
 domain.trend=[{date:'2025-05-01',value:60,status:'READY'},{date:'2023-02-30',value:50,status:'READY'},
  {date:'2020-01-01',value:50,status:'READY'},...domain.trend.slice().reverse()];
 const chart=verifiedEconomicConsumptionChart(domain,asOf,original.score);
 assert.equal(chart.length,13);assert.equal(chart.at(-1).date,'2023-04-01');
});
test('historical PARTIAL remains null gap, never numeric 0 and cannot count as verified current',()=>{
 const {domain,original}=published();domain.trend[5]={...domain.trend[5],status:'PARTIAL',value:null};
 const chart=verifiedEconomicConsumptionChart(domain,asOf,original.score);
 assert.equal(chart[5].score,null);
 assert.equal(isEconomicConsumptionChartCurrent(chart,domain,asOf,original.score),true);
 domain.trend.at(-1).status='PARTIAL';domain.trend.at(-1).value=null;
 assert.deepEqual(verifiedEconomicConsumptionChart(domain,asOf,original.score),[]);
});
test('same-month contradictory R5 score suppresses chart and unverified latest period comparisons',()=>{
 const {domain,original}=published();
 domain.trend.push({date:'2023-04-01',value:original.score+2,status:'READY'});
 assert.deepEqual(verifiedEconomicConsumptionChart(domain,asOf,original.score),[]);
 assert.equal(verifiedEconomicConsumptionScore(domain,asOf),original.score);
});
test('missing actual monthly current point never fabricates a new date or delta',()=>{
 const {domain,original}=published();domain.trend.pop();
 const chart=verifiedEconomicConsumptionChart(domain,asOf,original.score);
 assert.equal(chart.length,12);
 assert.equal(isEconomicConsumptionChartCurrent(chart,domain,asOf,original.score),false);
});
test('economic detail page gates consumer current score and 13-point chart, retains G16 and R6',()=>{
 assert.match(panel,/id==="consumption"\?verifiedEconomicConsumptionScore\(domain,payload\?\.asOfDate\)/);
 assert.match(panel,/verifiedEconomicConsumptionChart\(domain,payload\?\.asOfDate,score\)/);
 assert.match(panel,/isEconomicConsumptionChartCurrent\(consumptionChart,domain,payload\?\.asOfDate,score\)/);
 assert.match(panel,/id==="growth"\?growthChart:id==="consumption"\?consumptionChart/);
 assert.match(panel,/employmentListRows\(employmentData\?\.indicators\?\?\[\]\)/);
});
