import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProjection,inflationR2TrendDates}
  from '../worker/projection-builders/inflation.mjs';
import {inflationR2VisibleTrend}
  from '../app/inflation/inflation-r2-trend-display-r1.mjs';

const MONTHLY_IDS=[
 'CPILFESL','MEDCPIM094SFRBCLE','TRMMEANCPIM094SFRBCLE',
 'EXPINF5YR','MCOILWTICO','GASREGCOVM','PPIFIS','WPSFD49116',
 'IREXFUELS','CES0500000003','ECIALLCIV','PRS85006111','INDPRO',
];

function rows(seed,pc1=false){
 return Array.from({length:83},(_,i)=>{
  const date=new Date(Date.UTC(2020,i,1)).toISOString().slice(0,10);
  const value=pc1?2.2+0.13*Math.sin(i/3+seed)+i*0.001:
   75+seed*4+i*0.65+i*i*0.005+2*Math.sin(i/4+seed);
  return {observationDate:date,availableAt:date,value};
 });
}
function storedInput(asOf){
 const series=Object.fromEntries(MONTHLY_IDS.map((key,i)=>[key,rows(i)]));
 return {asOf,
  pit:{status:'READY_STORED_PIT_HISTORY',series,lookAheadSafe:true,snapshots:{}},
  pc1:{missing:[],issues:[],snapshots:{},series:{
   PCEPILFE:rows(1,true),PCEPI:rows(2,true),
  }},
 };
}

test('W01 #1330 current midmonth is actual evaluation date, not future month end',()=>{
 const asOf='2026-11-18';
 const dates=inflationR2TrendDates(asOf);
 assert.equal(dates.length,12);
 assert.equal(dates[0],'2025-12-31');
 assert.equal(dates.at(-2),'2026-10-31');
 assert.equal(dates.at(-1),asOf);
 assert.ok(dates.every(d=>d<=asOf));
 assert.equal(new Set(dates).size,dates.length);
 const out=buildProjection(storedInput(asOf));
 assert.equal(out.status,'READY');
 assert.equal(out.asOfDate,asOf);
 assert.equal(out.trend.length,12);
 assert.deepEqual(out.trend.map(p=>p.label),dates);
 assert.equal(out.trend.at(-1).value,out.score);
 assert.ok(out.trend.every(p=>Number.isFinite(p.value)&&p.label<=asOf));
 assert.equal(out.indicators.length,4);
 assert.equal(Object.keys(out.axes).length,7);
 assert.equal(out.methodologyVersion,'INFLATION_R2_R29_56_IA');
 const ui=inflationR2VisibleTrend(out);
 assert.equal(ui.length,12);
 assert.equal(ui.at(-1).date,asOf);
 assert.equal(ui.at(-1).score,out.score);
});

test('W01 #1330 exact month end has one genuine terminal point',()=>{
 for(const asOf of ['2026-10-31','2024-02-29','2026-11-30']){
  const dates=inflationR2TrendDates(asOf);
  assert.equal(dates.length,12);
  assert.equal(dates.at(-1),asOf);
  assert.equal(new Set(dates).size,12);
  const out=buildProjection(storedInput(asOf));
  assert.equal(out.status,'READY');
  assert.deepEqual(out.trend.map(p=>p.label),dates);
  assert.equal(out.trend.at(-1).value,out.score);
 }
});

test('W01 #1330 leap-day and year rollover use preceding real month ends',()=>{
 assert.deepEqual(inflationR2TrendDates('2024-03-15',3),
  ['2024-01-31','2024-02-29','2024-03-15']);
 assert.deepEqual(inflationR2TrendDates('2026-01-03',3),
  ['2025-11-30','2025-12-31','2026-01-03']);
 assert.deepEqual(inflationR2TrendDates('2026-02-28',3),
  ['2025-12-31','2026-01-31','2026-02-28']);
 assert.deepEqual(inflationR2TrendDates('2026-11-18',1),['2026-11-18']);
 assert.deepEqual(inflationR2TrendDates('2026-02-30'),[]);
});

test('W01 #1330 missing stored PIT cannot fabricate a future or current trend',()=>{
 const input=storedInput('2026-11-18');
 input.pit.status='MISSING';
 const out=buildProjection(input);
 assert.equal(out.status,'PARTIAL');
 assert.equal(out.score,null);
 assert.deepEqual(out.trend,[]);
});
