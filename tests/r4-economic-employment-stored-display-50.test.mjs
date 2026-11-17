import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EMPLOYMENT_R54_METHOD,EMPLOYMENT_R54_WEIGHTS,EMPLOYMENT_R54_INDICATORS} from '../lib/market-score/employment-r54-candidate.mjs';
import {verifiedEconomicEmploymentScore,verifiedEconomicEmploymentChart,isEconomicEmploymentChartCurrent} from '../lib/economic-employment-stored-display-r4.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
import {buildCompositeMarketScore} from '../lib/market-score/composite-model-r1.mjs';
const panel=readFileSync(new URL('../app/economic-indicators/economic-detail-panel.tsx',import.meta.url),'utf8');
const date='2026-11-17',weights=Object.values(EMPLOYMENT_R54_WEIGHTS);
const base=()=>({id:'employment',methodologyVersion:EMPLOYMENT_R54_METHOD,status:'READY',
 asOfDate:date,score:63,missingFactors:[],
 indicators:EMPLOYMENT_R54_INDICATORS.map(({id},i)=>({id,status:'READY',score:63,
 observationDate:i<2?'2026-10-01':'2026-11-13'})),
 trend:[{label:'2026-08-01',value:59},{label:'2026-09-01',value:61},{label:'2026-10-01',value:62}]});
test('CM-R1 R54 four-factor published score respects approved BLS30/30 DOL20/20',()=>{
 const p=base();assert.deepEqual(weights,[.30,.30,.20,.20]);
 assert.equal(verifiedEconomicEmploymentScore(p,date),63);
 assert.deepEqual(verifiedEconomicEmploymentChart(p,date,63),
  p.trend.map(({label,value})=>({date:label,score:value})));
});
test('new DOL weekly factor changes current stored score without forcing BLS dates to update',()=>{
 const p=base();p.indicators[2].score=73;p.score=65;
 assert.equal(verifiedEconomicEmploymentScore(p,date),65);
 const chart=verifiedEconomicEmploymentChart(p,date,65);
 assert.equal(chart.at(-1).date,'2026-10-01');
 assert.equal(isEconomicEmploymentChartCurrent(chart,date,65),false);
});
test('actual CM-R1 composite omits employment.methodologyVersion but preserves R54 factor lineage',()=>{
 const p=base();
 p.interpretation='Employment R54 candidate: 실업률 30% + 비농업고용 3M 평균 증감 30% + 신규 실업수당 4W 평균 20% + 주 실업수당 개선 비율 20%. 백분위 산식은 저장된 과거 데이터만 사용하며 결측 가중치 재배분은 하지 않습니다.';
 const publicEmployment=buildCompositeMarketScore(buildCmR1DomainResults({employment:p}),{updatedAt:date+'T00:00:00.000Z'}).domains.find(d=>d.id==='employment');
 assert.equal(publicEmployment.methodologyVersion,undefined,'old publisher omits this metadata');
 assert.equal(publicEmployment.status,'READY');
 assert.equal(verifiedEconomicEmploymentScore(publicEmployment,date),63,
  'must not hide existing correctly stored original four-factor public score');
 const spoofed={...publicEmployment,interpretation:'Employment R6 current version'};
 assert.equal(verifiedEconomicEmploymentScore(spoofed,date),null);
 const explicitWrong={...publicEmployment,methodologyVersion:'EMPLOYMENT_R6_29_FACTOR'};
 assert.equal(verifiedEconomicEmploymentScore(explicitWrong,date),null);
});
test('R6 detail 29 features cannot become R54 approved 4-factor numeric score',()=>{
 for(const methodologyVersion of ['EMPLOYMENT_R6_29_FACTOR_R1','EMPLOYMENT_R53_8',null]){
  const p={...base(),methodologyVersion};
  assert.equal(verifiedEconomicEmploymentScore(p,date),null);
  assert.deepEqual(verifiedEconomicEmploymentChart(p,date,63),[]);
 }
});
test('PARTIAL and missing factor remain missing, even if headline has a number',()=>{
 for(const status of ['PARTIAL','STALE','UNAVAILABLE',null])
  assert.equal(verifiedEconomicEmploymentScore({...base(),status},date),null);
 const p=base();p.missingFactors=['employment-43'];
 assert.equal(verifiedEconomicEmploymentScore(p,date),null);
});
test('wrong factor IDs, count, status, observation date and mismatched aggregate cannot pass',()=>{
 const mutations=[p=>p.indicators.pop(),p=>p.indicators[1].id='employment-99',
 p=>p.indicators[2].status='PARTIAL',
 p=>p.indicators[3].observationDate='2026-11-18',
 p=>p.indicators[0].observationDate='2026-02-30',
 p=>p.indicators[3].score=10,
 p=>p.score=65];
 for(const mutate of mutations){const p=base();mutate(p);assert.equal(verifiedEconomicEmploymentScore(p,date),null);}
});
test('valid 0 and 100 and a zero factor remain numeric, not missing',()=>{
 for(const value of [0,100]){
  const p=base();p.indicators.forEach(r=>r.score=value);p.score=value;
  assert.equal(verifiedEconomicEmploymentScore(p,date),value);
 }
 const p=base();p.indicators[0].score=0;p.score=63-63*.30;
 assert.equal(verifiedEconomicEmploymentScore(p,date),p.score);
});
test('NaN, negative, null, string and future as-of do not coerce to current score',()=>{
 for(const score of [NaN,Infinity,-1,101,null,undefined,'63'])
  assert.equal(verifiedEconomicEmploymentScore({...base(),score},date),null);
 assert.equal(verifiedEconomicEmploymentScore(base(),'2026-02-30'),null);
 assert.equal(verifiedEconomicEmploymentScore(base(),'2026-11-18'),null);
});
test('duplicate contradicting monthly stored score clears chart, not verified headline',()=>{
 const p=base();p.trend.push({label:'2026-10-01',value:70});
 assert.equal(verifiedEconomicEmploymentScore(p,date),63);
 assert.deepEqual(verifiedEconomicEmploymentChart(p,date,63),[]);
});
test('invalid/future/out-of-year observations excluded, legitimate monthly history sorted',()=>{
 const p=base();p.trend=[{label:'2026-12-01',value:10},{label:'2026-02-30',value:10},
  {label:'2025-09-01',value:70},...p.trend.slice().reverse()];
 assert.deepEqual(verifiedEconomicEmploymentChart(p,date,63),
  base().trend.map(({label,value})=>({date:label,score:value})));
});
test('explicit current-day matching history is current; contradictory day never used',()=>{
 const p=base();p.trend.push({label:date,value:63});
 const trend=verifiedEconomicEmploymentChart(p,date,63);
 assert.equal(isEconomicEmploymentChartCurrent(trend,date,63),true);
 const conflict=base();conflict.trend.push({label:date,value:60});
 assert.deepEqual(verifiedEconomicEmploymentChart(conflict,date,63),[]);
});
test('null/invalid score history and empty series do not invent a current snapshot point',()=>{
 const p=base();p.trend=[{label:'2026-10-01',value:null},
  {label:'2026-10-02',value:NaN}];
 assert.deepEqual(verifiedEconomicEmploymentChart(p,date,63),[]);
 assert.equal(isEconomicEmploymentChartCurrent([],date,63),false);
});
test('real page keeps R54-only headline and independent R6 29-row GET',()=>{
 assert.match(panel,/id==="employment"\?verifiedEconomicEmploymentScore\(domain,payload\?\.asOfDate\)/);
 assert.match(panel,/verifiedEconomicEmploymentChart\(domain,payload\?\.asOfDate,score\)/);
 assert.match(panel,/id==="employment"\?employmentListRows\(employmentData\?\.indicators\?\?\[\]\):observations/);
 assert.match(panel,/useStoredIndex<EmploymentR6Display>\("\/api\/employment-r6\/observations"/);
 assert.match(panel,/isEconomicEmploymentChartCurrent\(employmentChart,payload\?\.asOfDate,score\)/);
 assert.match(panel,/id==="employment"\?employmentChart:/);
});
