import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateConsumptionR5,R5_WEIGHTS} from '../lib/market-score/consumption-r5.mjs';
import {projectConsumptionR5Public} from '../worker/consumption-r5-reader.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
import {buildCompositeMarketScore} from '../lib/market-score/composite-model-r1.mjs';
import {verifiedEconomicConsumptionScore,verifiedEconomicConsumptionChart} from '../lib/economic-consumption-stored-display-r4.mjs';

const AS_OF='2023-04-30';
const source=()=>{
 const series={};
 for(const id of ['realPce','realPcePerCapita','realIncome','employmentRatio','realPayroll',
  'savingRate','consumerDebtService','consumerDelinquency','realGoods','realServices','category1','category2']){
  series[id]=Array.from({length:160},(_,i)=>{
   const d=new Date(Date.UTC(2010,i,1)).toISOString().slice(0,10);
   return {observationDate:d,availableDate:d,value:100*Math.exp(i*.002)};
  });
 }
 return {series,categoryIds:['category1','category2']};
};
const evaluate=input=>calculateConsumptionR5(input,{asOfDate:AS_OF});
const projected=input=>projectConsumptionR5Public(evaluate(input),input);
const ready=()=>{const input=source();return {input,original:evaluate(input),public:projected(input)};};
const ids=['pce3','pce12','perCapita','income3','income12','employment','payroll',
 'saving','debt','delinquency','diffusion','goods','services'];

test('R5 only projects actual 13 score factor minis through the stored reader path',()=>{
 const {input,original,public:domain}=ready();
 assert.equal(original.status,'READY');
 assert.equal(domain.status,'READY');
 assert.equal(domain.methodologyVersion,'CONSUMPTION_R5');
 assert.equal(domain.score,original.score);
 assert.deepEqual(R5_WEIGHTS,{D:30,Y:25,L:15,H:20,B:10});
 assert.deepEqual(domain.areas,original.areas);
 assert.deepEqual(domain.trend,original.trend);
 assert.deepEqual(domain.missingFactors,original.missingFactors);
 assert.equal(Object.hasOwn(domain,'rows'),false,'private per-month raw results cannot be published');
 assert.deepEqual(domain.indicators.slice(0,13).map(x=>x.id),ids);
 assert.deepEqual(domain.indicators.slice(13).map(x=>x.id),['gap','acceleration']);
 assert.equal(domain.indicators.length,15);
 for(let i=0;i<13;i++){
  const factor=domain.indicators[i];
  assert.equal(factor.score,original.indicators[i].score);
  assert.equal(factor.weight,original.indicators[i].weight);
  assert.equal(factor.trend.length,13,factor.id);
  assert.equal(factor.trend.at(-1).label,'2023-04-01');
  assert.equal(factor.trend.at(-1).value,factor.score);
  assert.equal(factor.trend.at(-1).status,'READY');
  assert.equal(factor.availableAt,'2023-04-01');
  assert.equal(factor.releaseCadence,['debt','delinquency'].includes(factor.id)?'분기':'월간');
  for(const point of factor.trend){
   const sourceMonth=original.rows.find(row=>row.date===point.label);
   assert.ok(sourceMonth);
   assert.equal(point.value,sourceMonth.indicators[i].score);
   assert.deepEqual(Object.keys(point).sort().filter(k=>k!=='breakBefore'),['label','status','value']);
   assert.ok(point.label<=AS_OF);
   assert.equal(Object.hasOwn(point,'raw'),false);
   assert.equal(Object.hasOwn(point,'source'),false);
   assert.equal(Object.hasOwn(point,'availableDate'),false);
  }
 }
 for(const d of domain.indicators.slice(13)){
  assert.equal(d.score,null);
  assert.equal(d.weight,0);
  assert.deepEqual(d.trend,[],'unscored diagnostics must not masquerade as 0-100 factor scores');
  assert.equal(d.availableAt,'2023-04-01');
 }
 assert.equal(domain.indicators.slice(0,13).reduce((s,x)=>s+x.weight,0),100);
});

test('R5 public economic composite and W06 guard preserve existing score/history while showing 13 minis',()=>{
 const {public:domain,original}=ready();
 const sourceDomain={...domain,freshness:'STORED_MONTHLY_R5'};
 const adapter=buildCmR1DomainResults({publicDomains:{consumption:sourceDomain}});
 const composite=buildCompositeMarketScore(adapter,{updatedAt:AS_OF+'T00:00:00.000Z'});
 const output={...composite.domains.find(x=>x.id==='consumption'),
  methodologyVersion:'CONSUMPTION_R5',asOfDate:AS_OF,historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false};
 assert.equal(output.score,original.score);
 assert.equal(output.weight,7);
 assert.equal(output.indicators.length,15);
 assert.ok(output.indicators.slice(0,13).every(x=>x.trend.length===13));
 assert.equal(verifiedEconomicConsumptionScore(output,AS_OF),original.score);
 assert.equal(verifiedEconomicConsumptionChart(output,AS_OF,original.score).length,13);
});

test('R5 factor-specific monthly partial stays null and does not connect across the gap',()=>{
 const input=source();
 input.series.savingRate.find(x=>x.observationDate==='2022-11-01').value=null;
 const result=evaluate(input);
 assert.equal(result.status,'READY','a historical incomplete month must not poison current valid month');
 const publicDomain=projectConsumptionR5Public(result,input);
 const trend=publicDomain.indicators.find(x=>x.id==='saving').trend;
 const hole=trend.find(x=>x.label==='2022-11-01');
 assert.deepEqual(hole,{label:'2022-11-01',value:null,status:'PARTIAL'});
 assert.equal(trend.find(x=>x.label==='2022-12-01').breakBefore,true);
 assert.equal(publicDomain.trend.find(x=>x.date==='2022-11-01').value,null);
 assert.equal(publicDomain.trend.at(-1).value,result.score);
});

test('R5 preserves real scored zero and never maps missing into a synthetic 0',()=>{
 const {input,original}=ready();
 const a=structuredClone(original);
 const old=a.rows.find(x=>x.date==='2023-01-01');
 old.indicators[0].score=0;
 old.indicators[0].status='READY';
 const p=projectConsumptionR5Public(a,input);
 assert.deepEqual(p.indicators[0].trend.find(x=>x.label==='2023-01-01'),
  {label:'2023-01-01',value:0,status:'READY'});
 old.indicators[0].score=null;
 old.indicators[0].status='PARTIAL';
 const q=projectConsumptionR5Public(a,input);
 assert.equal(q.indicators[0].trend.find(x=>x.label==='2023-01-01').value,null);
 assert.equal(q.indicators[0].trend.find(x=>x.label==='2023-02-01').breakBefore,true);
});

test('R5 ambiguous months, future months, wrong versions and mismatched latest scores suppress mini histories',()=>{
 const {input,original}=ready();
 const scenarios=[
  a=>a.rows.push(structuredClone(a.rows.at(-1))),
  a=>a.rows.push({...structuredClone(a.rows.at(-1)),date:'2023-05-01'}),
  a=>a.rows.at(-1).score+=10,
  a=>a.methodologyVersion='CONSUMPTION_R4',
  a=>a.status='PARTIAL',
 ];
 for(const change of scenarios){
  const x=structuredClone(original);change(x);
  const p=projectConsumptionR5Public(x,input);
  assert.equal(Object.hasOwn(p,'rows'),false);
  assert.ok(p.indicators.every(factor=>factor.trend.length===0));
 }
 const incompatible=structuredClone(original);
 incompatible.rows.at(-1).indicators[0].score+=10;
 const projected=projectConsumptionR5Public(incompatible,input);
 assert.equal(projected.indicators[0].trend.length,0);
 assert.equal(projected.indicators[1].trend.length,13);
});

test('R5 release is the validated saved input availability, never a forecast or GET date',()=>{
 const input=source();
 input.series.realPce.at(-1).availableDate='2023-04-15';
 const domain=projected(input);
 assert.equal(domain.indicators.find(x=>x.id==='pce3').availableAt,'2023-04-15');
 assert.equal(domain.indicators.find(x=>x.id==='pce12').availableAt,'2023-04-15');
 assert.equal(domain.indicators.find(x=>x.id==='saving').availableAt,'2023-04-01');
 assert.equal(domain.indicators.find(x=>x.id==='gap').availableAt,'2023-04-15');
 assert.equal(domain.indicators.find(x=>x.id==='acceleration').availableAt,'2023-04-15');
 assert.equal(domain.indicators.find(x=>x.id==='debt').releaseCadence,'분기');
 assert.ok(domain.indicators.every(x=>!Object.hasOwn(x,'nextReleaseDate')));
 assert.ok(domain.indicators.every(x=>!Object.hasOwn(x,'sourcePublishedDate')));
 const invalid=source();
 const bad=projectConsumptionR5Public(evaluate(invalid),invalid);
 invalid.series.realPce.at(-1).availableDate='2023-06-01';
 const declined=projectConsumptionR5Public(evaluate(source()),invalid);
 assert.equal(declined.indicators.find(x=>x.id==='pce3').availableAt,null);
 assert.equal(declined.indicators.find(x=>x.id==='pce12').availableAt,null);
 assert.equal(bad.indicators.find(x=>x.id==='pce3').availableAt,'2023-04-01');
});

test('R5 pure projection does not request external providers or mutate stored calculated rows',()=>{
 const input=source();
 const original=evaluate(input);
 const before=JSON.stringify(original),sourceBefore=JSON.stringify(input);
 projectConsumptionR5Public(original,input);
 assert.equal(JSON.stringify(original),before);
 assert.equal(JSON.stringify(input),sourceBefore);
});
