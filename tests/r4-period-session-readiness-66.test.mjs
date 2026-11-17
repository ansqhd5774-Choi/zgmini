import test from 'node:test';
import assert from 'node:assert/strict';
import {
 verifiedEconomicConsumptionScore,verifiedEconomicConsumptionChart,
 isEconomicConsumptionChartCurrent,
} from '../lib/economic-consumption-stored-display-r4.mjs';
import {CONSUMPTION_R5,R5_WEIGHTS} from '../lib/market-score/consumption-r5.mjs';
import {
 economicEarningsSourceDate,verifiedEconomicEarningsScore,
 verifiedEconomicEarningsChart,isEconomicEarningsChartCurrent,
} from '../lib/economic-earnings-stored-display-r4.mjs';
import {
 economicBreadthSourceDate,verifiedEconomicBreadthScore,
} from '../lib/economic-breadth-stored-display-r4.mjs';
import {B1_R5_METHOD} from '../lib/market-score/breadth-b1-r5-contract.mjs';
import {
 isMarketSession,latestCompletedSession,countCompletedSessionsSince,
} from '../lib/market-score/breadth-b1-r3-calendar.mjs';
import {
 latestCompletedBreadthSession,countCompletedBreadthSessionsSince,
} from '../lib/market-score/breadth-b1-r3-freshness-calendar.mjs';

// W06 R4 #66. Synthetic public projections; import ACTIVE verification
// functions. These tests do not relax monthly/quarterly publication gates,
// replace calendar policy, or modify the originating calculation/PC Writer.
const asOf='2026-11-17',monthly='2026-10-01',quarter='2026-09-30';
const consumptionParts=[
 ['pce3','D',.40],['pce12','D',.35],['perCapita','D',.25],
 ['income3','Y',.60],['income12','Y',.40],
 ['employment','L',.50],['payroll','L',.50],
 ['saving','H',.25],['debt','H',.35],['delinquency','H',.40],
 ['diffusion','B',.50],['goods','B',.25],['services','B',.25],
];
const consumption=()=>({
 id:'consumption',status:'READY',score:50,
 methodologyVersion:CONSUMPTION_R5,freshness:'STORED_MONTHLY_R5',
 updatedAt:monthly,missingFactors:[],
 interpretation:'소비·소득·고용·가계 금융 여력·소비 확산의 종합 참고 지수.',
 indicators:[
  ...consumptionParts.map(([id,area,weight])=>({
   id,area,status:'READY',score:50,
   weight:R5_WEIGHTS[area]*weight,areaWeight:100*weight,
   observationDate:monthly,
  })),
  {id:'gap',score:null,weight:0},
  {id:'acceleration',score:null,weight:0},
 ],
 trend:[{date:'2026-09-01',status:'READY',value:48},{date:monthly,status:'READY',value:50}],
});
const earnings=()=>({
 id:'earnings',status:'READY',score:50,methodologyVersion:'E1-R4',
 financialPeriodEnd:quarter,missingFactors:[],
 indicators:['EPS 성장률','매출 성장률','이익 성장 종목 비율','영업이익률']
  .map(name=>({name,status:'READY',score:50,asOfDate:quarter})),
 trend:[{date:'2026-06-30',status:'READY',score:48},{date:quarter,status:'READY',score:50}],
});
const breadth=(observed,updated,freshness,snapshot)=>({
 id:'breadth',status:'READY',score:50,methodologyVersion:B1_R5_METHOD,
 asOfDate:snapshot,observationDate:observed,updatedAt:updated,
 freshness,missingFactors:[],
 indicators:['상승종목비율','상승거래대금비율','5일 수급 EMA','20일 수급 EMA']
  .map((name,i)=>({
   id:'breadth-'+(41+i),name,status:'READY',score:50,value:50,
   observationDate:observed,source:'stored-approved-B1-R5',
  })),
 trend:[{date:observed,score:50,status:'READY'}],
});

test('current monthly R5 score verifies 13 factors and two unscored diagnostics without new values',()=>{
 const value=consumption();
 assert.equal(verifiedEconomicConsumptionScore(value,asOf),50);
 const chart=verifiedEconomicConsumptionChart(value,asOf,50);
 assert.deepEqual(chart,[{date:'2026-09-01',score:48},{date:monthly,score:50}]);
 assert.equal(isEconomicConsumptionChartCurrent(chart,value,asOf,50),true);
 assert.equal(value.indicators.filter(x=>x.weight>0).length,13);
 assert.equal(value.indicators.filter(x=>x.weight===0).length,2);
});

test('an incomplete/future/non-month-end monthly observation is not promoted as current',()=>{
 const base=consumption();
 const cases=[
  {...base,updatedAt:'2026-11-17'},
  {...base,updatedAt:'2026-12-01'},
  {...base,status:'PARTIAL',score:null},
  {...base,status:'PROVISIONAL'},
  {...base,freshness:'STALE_MONTHLY'},
  {...base,methodologyVersion:'CONSUMPTION_R4'},
  {...base,missingFactors:['pce3']},
 ];
 for(const value of cases){
  assert.equal(verifiedEconomicConsumptionScore(value,asOf),null);
  assert.deepEqual(verifiedEconomicConsumptionChart(value,asOf,50),[]);
 }
 assert.equal(verifiedEconomicConsumptionScore(base,'2026-09-30'),null);
});

test('monthly source rejects invalid score and refuses a false last chart point',()=>{
 const value=consumption();
 const invalid={...value,indicators:value.indicators.map((row,i)=>i===0?{...row,score:null}:row)};
 assert.equal(verifiedEconomicConsumptionScore(invalid,asOf),null);
 const conflict={...value,trend:[...value.trend.slice(0,-1),{date:monthly,status:'READY',value:55}]};
 assert.deepEqual(verifiedEconomicConsumptionChart(conflict,asOf,50),[]);
});

test('approved completed fiscal quarter is distinct from the latest snapshot calendar day',()=>{
 const value=earnings();
 assert.equal(economicEarningsSourceDate(value,asOf),quarter);
 assert.equal(verifiedEconomicEarningsScore(value,asOf),50);
 const chart=verifiedEconomicEarningsChart(value,asOf,50);
 assert.deepEqual(chart,[{date:'2026-06-30',score:48},{date:quarter,score:50}]);
 assert.equal(isEconomicEarningsChartCurrent(chart,value,asOf,50),true);
});

test('not-yet-completed/future/non-quarter-end or provisional earnings are never promoted',()=>{
 const base=earnings();
 const cases=[
  {...base,financialPeriodEnd:'2026-12-31'},
  {...base,financialPeriodEnd:'2026-10-31'},
  {...base,status:'PARTIAL'},
  {...base,status:'PROVISIONAL'},
  {...base,missingFactors:['eps']},
  {...base,indicators:base.indicators.map((row,i)=>i===0?{...row,status:'PARTIAL'}:row)},
 ];
 for(const value of cases){
  assert.equal(verifiedEconomicEarningsScore(value,asOf),null);
  assert.deepEqual(verifiedEconomicEarningsChart(value,asOf,50),[]);
 }
});

test('NYSE Thanksgiving holiday and weekends are not treated as fresh completed sessions',()=>{
 assert.equal(isMarketSession('2026-11-25'),true);
 assert.equal(isMarketSession('2026-11-26'),false);
 assert.equal(isMarketSession('2026-11-28'),false);
 assert.equal(latestCompletedSession('2026-11-26T21:30:00Z'),'2026-11-25');
 assert.equal(latestCompletedSession('2026-11-27T18:10:00Z'),'2026-11-25');
});

test('official 2026 NYSE early close is recognized at 13:15 ET by the specialized calendar',()=>{
 const before='2026-11-27T18:14:00Z'; // Fri 13:14 EST
 const after='2026-11-27T18:16:00Z'; // Fri 13:16 EST
 assert.equal(latestCompletedBreadthSession(before),'2026-11-25');
 assert.equal(latestCompletedBreadthSession(after),'2026-11-27');
 assert.equal(countCompletedBreadthSessionsSince('2026-11-25',after),1);
});

test('KNOWN GAP: ACTIVE B1-R5 UI gate still uses generic 16:15 ET, not verified early close',()=>{
 const now='2026-11-27T18:16:00.000Z';
 // Source-validated official close already completed at 13:15 but generic
 // shared session calendar still reports 11/25 until NY 16:15.
 assert.equal(latestCompletedBreadthSession(now),'2026-11-27');
 assert.equal(latestCompletedSession(now),'2026-11-25');
 assert.equal(countCompletedSessionsSince('2026-11-25',now),0);
 const value=breadth('2026-11-27',now,'CURRENT','2026-11-27');
 assert.equal(economicBreadthSourceDate(value,'2026-11-27'),null);
 // The same stored 11/27 snapshot is later accepted by active UI display.
 const later={...value,updatedAt:'2026-11-27T21:16:00.000Z'};
 assert.equal(economicBreadthSourceDate(later,'2026-11-27'),'2026-11-27');
 assert.equal(verifiedEconomicBreadthScore(later,'2026-11-27'),50);
});

test('B1-R5 2-completed-session policy accepts its exact boundary, rejects third and provisional',()=>{
 const now='2026-11-25T21:20:00.000Z';
 const two=breadth('2026-11-23',now,'LAG_2_SESSIONS','2026-11-25');
 assert.equal(countCompletedSessionsSince('2026-11-23',now),2);
 assert.equal(economicBreadthSourceDate(two,'2026-11-25'),'2026-11-23');
 assert.equal(verifiedEconomicBreadthScore(two,'2026-11-25'),50);
 const three=breadth('2026-11-20',now,'LAG_3_SESSIONS','2026-11-25');
 assert.equal(countCompletedSessionsSince('2026-11-20',now),3);
 assert.equal(economicBreadthSourceDate(three,'2026-11-25'),null);
 assert.equal(verifiedEconomicBreadthScore({...two,status:'PROVISIONAL'},'2026-11-25'),null);
 assert.equal(verifiedEconomicBreadthScore({...two,freshness:'STALE'},'2026-11-25'),null);
});

test('KNOWN DEPENDENCY: monthly public R5 projection lacks source release timestamps to prove provider availability',()=>{
 const value=consumption();
 assert.equal(verifiedEconomicConsumptionScore(value,asOf),50);
 assert.equal(Object.hasOwn(value,'sourceReleaseAt'),false);
 assert.equal(Object.hasOwn(value,'availableAt'),false);
 assert.equal(value.indicators.every(x=>!Object.hasOwn(x,'availableAt')),true);
 // Contract trusts authenticated upstream R5 readiness; W06 must NOT
 // invent a release timestamp or promote a forecast/provisional source.
});
