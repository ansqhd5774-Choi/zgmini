import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GROWTH_R2_METHOD,GROWTH_R2_FEATURES,GROWTH_R2_FEATURE_IDS,GROWTH_R2_WEIGHTS,validateGrowthR2Contract} from '../lib/market-score/growth-r2-contract.mjs';
import {buildStoredGrowthR2Domain} from '../lib/market-score/growth-r2-worker-domain-r1.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
import {buildCompositeMarketScore} from '../lib/market-score/composite-model-r1.mjs';
import {verifiedEconomicGrowthScore,verifiedEconomicGrowthChart,isEconomicGrowthChartCurrent} from '../lib/economic-growth-stored-display-r4.mjs';
const source=readFileSync(new URL('../app/economic-indicators/economic-detail-panel.tsx',import.meta.url),'utf8');
const asOf='2026-06-01';
const interpretation='Growth R2: 24/24 stored feature history -> expanding percentile -> approved W2 weights; no missing reweight';
const base=()=>({id:'growth',status:'READY',score:60,methodologyVersion:GROWTH_R2_METHOD.methodologyVersion,
 freshness:'STORED_D1_HISTORY_ONLY',interpretation,missingFactors:[],
 indicators:GROWTH_R2_FEATURES.map(f=>({id:f.featureId,source:f.provider,status:'READY',
  score:60,observationDate:'2026-04-01',availableAt:'2026-05-05T00:00:00.000Z'})),
 trend:[{label:'2026-04-01',value:55},{label:'2026-05-01',value:57},{label:asOf,value:60}]});
function fixture(){
 const records=[];
 for(const [i,id] of GROWTH_R2_FEATURE_IDS.entries())for(let m=1;m<=4;m++)records.push({
  candidateId:id,observationDate:`2026-0${m}-01`,
  availableAt:`2026-0${m+1}-05T00:00:00.000Z`,
  pitEligible:true,harmonizedValue:i*10+m,sourceHash:`${id}-${m}`,frequency:'MONTHLY'
 });
 return records;
}
test('contract exactly 24 required G16 input identities and sum of approved family weights',()=>{
 assert.equal(validateGrowthR2Contract(),true);
 assert.equal(GROWTH_R2_FEATURE_IDS.length,24);
 assert.equal(GROWTH_R2_FEATURE_IDS.includes('G041'),false);
 assert.equal(GROWTH_R2_METHOD.requiredCoverage,24);
 assert.ok(Math.abs(Object.values(GROWTH_R2_WEIGHTS).reduce((a,b)=>a+b,0)-1)<1e-12);
});
test('actual stored growth R2 calculator to public adapter and composite: worker publishes approved G16 marker',async()=>{
 const stored=await buildStoredGrowthR2Domain(fixture(),{asOf});
 assert.equal(stored.status,'READY');assert.equal(stored.coverage,24);
 const composed=buildCompositeMarketScore(buildCmR1DomainResults({publicDomains:{growth:stored}}),{updatedAt:asOf+'T00:00:00.000Z'});
 const publicGrowth=composed.domains.find(d=>d.id==='growth');
 // The active worker overlays this marker only on its READY G16 domain.
 const published={...publicGrowth,methodologyVersion:stored.methodologyVersion};
 assert.equal(published.indicators.length,24);
 assert.equal(verifiedEconomicGrowthScore(published,asOf),stored.score);
 assert.equal(isEconomicGrowthChartCurrent(verifiedEconomicGrowthChart(published,asOf,published.score),asOf,published.score),true);
});
test('fully valid 24/24 published current scores and stored native chart points pass',()=>{
 const p=base();
 assert.equal(verifiedEconomicGrowthScore(p,asOf),60);
 assert.deepEqual(verifiedEconomicGrowthChart(p,asOf,60),
  p.trend.map(row=>({date:row.label,score:row.value})));
});
test('legacy D2 numeric READY fallback is not a G16 24-factor release',()=>{
 const p={...base(),methodologyVersion:null,indicators:[
  {id:'G010',status:'READY',score:60},{id:'G019',status:'READY',score:60}]};
 assert.equal(verifiedEconomicGrowthScore(p,asOf),null);
 assert.deepEqual(verifiedEconomicGrowthChart(p,asOf,60),[]);
});
test('one newly eligible G16 factor cannot promote missing other 23 to READY',()=>{
 for(const count of [1,23]){
  const p=base();p.indicators=p.indicators.slice(0,count);
  assert.equal(verifiedEconomicGrowthScore(p,asOf),null);
 }
 for(const missingFactors of [['G010'],['G010','G041'],null]){
  const p={...base(),missingFactors};
  assert.equal(verifiedEconomicGrowthScore(p,asOf),null);
 }
});
test('invalid methodology, freshness, status or provenance never displays READY',()=>{
 for(const patch of [{methodologyVersion:'GROWTH_R2_G16_SHADOW'},{status:'PARTIAL'},{status:'NOT_READY'},
  {freshness:'OUTDATED'},{interpretation:'G16 pending'}]){
  const p={...base(),...patch};assert.equal(verifiedEconomicGrowthScore(p,asOf),null,JSON.stringify(patch));
 }
});
test('all 24 IDs in exact contract order and approved provider identity required',()=>{
 for(const change of [p=>p.indicators.reverse(),p=>p.indicators[0].id='G041',
   p=>p.indicators[1].source='SYNTHETIC',p=>p.indicators[4].status='PARTIAL']){
  const p=base();change(p);assert.equal(verifiedEconomicGrowthScore(p,asOf),null);
 }
});
test('source availableAt future, missing and two-month expired observations fail closed',()=>{
 for(const availableAt of ['2026-07-01T00:00:00.000Z',null,'2026-01-05T00:00:00.000Z','bad']){
  const p=base();p.indicators[0].availableAt=availableAt;
  assert.equal(verifiedEconomicGrowthScore(p,asOf),null);
 }
 const p=base();p.indicators[0].observationDate='2026-07-01';
 assert.equal(verifiedEconomicGrowthScore(p,asOf),null);
});
test('true zero and hundred factor score remain numbers; missing is not zero',()=>{
 for(const score of [0,100]){
  const p=base();p.indicators.forEach(x=>x.score=score);p.score=score;
  assert.equal(verifiedEconomicGrowthScore(p,asOf),score);
 }
 const p=base();p.indicators[0].score=0;
 p.score=60-60*GROWTH_R2_WEIGHTS[p.indicators[0].id];
 assert.equal(verifiedEconomicGrowthScore(p,asOf),p.score);
 for(const score of [null,NaN,Infinity,-1,101,'60'])
  assert.equal(verifiedEconomicGrowthScore({...base(),score},asOf),null);
});
test('one of 24 changed scored factors requires exact original W2 weighted total',()=>{
 const p=base();p.indicators[6].score=40;
 assert.equal(verifiedEconomicGrowthScore(p,asOf),null);
 p.score=60-20*GROWTH_R2_WEIGHTS[p.indicators[6].id];
 assert.equal(verifiedEconomicGrowthScore(p,asOf),p.score);
});
test('chart keeps only actual dated history, excludes future/unparseable/old and never invents as-of',()=>{
 const p=base();p.trend=[
  {label:'2024-03-01',value:33},{label:'2026-02-30',value:33},
  {label:'2026-07-01',value:90},{label:'2026-04-01',value:55},{label:'2026-05-01',value:57}
 ];
 assert.deepEqual(verifiedEconomicGrowthChart(p,asOf,60),
  [{date:'2026-04-01',score:55},{date:'2026-05-01',score:57}]);
 assert.equal(isEconomicGrowthChartCurrent(verifiedEconomicGrowthChart(p,asOf,60),asOf,60),false);
});
test('same-day conflicting final G16 point is suppressed without fabricating replacement',()=>{
 const p=base();p.trend.at(-1).value=61;
 assert.deepEqual(verifiedEconomicGrowthChart(p,asOf,60),[]);
 assert.equal(verifiedEconomicGrowthScore(p,asOf),60);
});
test('identical repeated same-day points collapse, mixed contradictory points suppress chart',()=>{
 const p=base();p.trend=[...p.trend.slice().reverse(),...p.trend.slice(-1)];
 assert.equal(verifiedEconomicGrowthChart(p,asOf,60).length,3);
 p.trend.push({label:'2026-05-01',value:25});
 assert.deepEqual(verifiedEconomicGrowthChart(p,asOf,60),[]);
});
test('missing and null scores in history do not become false zero value or current point',()=>{
 const p=base();p.trend=[{label:'2026-05-01',value:null},{label:'2026-05-04',value:NaN}];
 assert.deepEqual(verifiedEconomicGrowthChart(p,asOf,60),[]);
 assert.equal(isEconomicGrowthChartCurrent([],asOf,60),false);
});
test('page uses strict growth gate while preserving credit, rate, employment and inflation controls',()=>{
 assert.match(source,/id==="growth"\?verifiedEconomicGrowthScore\(domain,payload\?\.asOfDate\)/);
 assert.match(source,/verifiedEconomicGrowthChart\(domain,payload\?\.asOfDate,score\)/);
 assert.match(source,/isEconomicGrowthChartCurrent\(growthChart,payload\?\.asOfDate,score\)/);
 assert.match(source,/id==="credit"\?creditChart:id==="growth"\?growthChart/);
 assert.match(source,/id==="growth"\?observations.length\+"\/24"/);
 assert.match(source,/useStoredIndex<EmploymentR6Display>\("\/api\/employment-r6\/observations"/);
});
