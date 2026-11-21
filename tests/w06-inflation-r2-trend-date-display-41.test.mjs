import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflationR2VisibleTrend} from '../app/inflation/inflation-r2-trend-display-r1.mjs';

const current={
 status:'READY',score:57.97005405261128,asOfDate:'2026-11-18',
 trend:[
  {label:'2026-09-30',value:71.40618148240469},
  {label:'2026-10-31',value:60.17413631411498},
  {label:'2026-11-30',value:57.97005405261128},
 ],
};

test('W06 #41 real 2026-11-18 public R2 month-end is relabeled to real asOf only, without a new score or row',()=>{
 const before=structuredClone(current);
 const out=inflationR2VisibleTrend(current);
 assert.deepEqual(out,[
  {date:'2026-09-30',score:current.trend[0].value},
  {date:'2026-10-31',score:current.trend[1].value},
  {date:'2026-11-18',score:current.score},
 ]);
 assert.equal(out.length,current.trend.length);
 assert.equal(out.at(-1).score,current.score);
 assert.ok(out.every(p=>p.date<=current.asOfDate));
 assert.deepEqual(current,before,'source published projection must remain unchanged');
});

test('W06 #41 future month-end with a different score is excluded, never silently relabeled to current',()=>{
 const out=inflationR2VisibleTrend({...current,
  trend:[...current.trend.slice(0,-1),{label:'2026-11-30',value:15}],
 });
 assert.equal(out.length,2);
 assert.equal(out.at(-1).date,'2026-10-31');
 assert.ok(!out.some(p=>p.score===current.score));
});

test('W06 #41 unusable status cannot turn future monthly evaluation into a valid observation',()=>{
 for(const status of ['PARTIAL','STALE','UNAVAILABLE',null,undefined]){
  const data=inflationR2VisibleTrend({...current,status});
  assert.equal(data.length,2,String(status));
  assert.equal(data.at(-1).date,'2026-10-31',String(status));
 }
});

test('W06 #41 legitimate 0 point is preserved, not mistaken for missing score',()=>{
 const data=inflationR2VisibleTrend({status:'READY',score:0,asOfDate:'2026-11-18',
  trend:[{label:'2026-10-31',value:7},{label:'2026-11-30',value:0}]});
 assert.deepEqual(data.at(-1),{date:'2026-11-18',score:0});
 assert.equal(data.length,2);
});

test('W06 #41 official full month-end and leap-day points are left unchanged',()=>{
 const data=inflationR2VisibleTrend({status:'READY',score:11,asOfDate:'2024-02-29',
  trend:[{label:'2024-01-31',value:15},{label:'2024-02-29',value:11}]});
 assert.deepEqual(data.map(p=>p.date),['2024-01-31','2024-02-29']);
});

test('W06 #41 Gregorian invalid/future/NaN/missing labels are excluded without imputation',()=>{
 const out=inflationR2VisibleTrend({status:'READY',asOfDate:'2026-11-18',score:35,
  trend:[
   {label:'2026-02-30',value:20},
   {label:'2026-11-19',value:35},
   {label:'2026-12-31',value:35},
   {label:'2026-10-31',value:null},
   {label:'2026-10-30',value:NaN},
   {label:'2026-10-29',value:Infinity},
   {label:'2026-09-30',value:0},
   {label:'2026-11-30',value:35},
  ]});
 assert.deepEqual(out,[
  {date:'2026-09-30',score:0},
  {date:'2026-11-18',score:35},
 ]);
 for(const invalid of ['2026-02-30','2026-13-01','2026-11-31','2026-11-18T00',null]){
  assert.deepEqual(inflationR2VisibleTrend({...current,asOfDate:invalid}),[],String(invalid));
 }
});

test('W06 #41 explicit asOf historical row takes precedence over a matching remapped future-month row',()=>{
 const data=inflationR2VisibleTrend({status:'READY',score:42,asOfDate:'2026-11-18',
  trend:[
   {label:'2026-11-18',value:41},
   {label:'2026-11-30',value:42},
  ]});
 assert.deepEqual(data,[{date:'2026-11-18',score:41}]);
});

test('W06 #41 history stays sorted, bounded to 12, and no data yields no fake line',()=>{
 const months=[];
 for(let year=2024;year<=2026;year++)
  for(let month=1;month<=12;month++){
   const last=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
   months.push({label:last,value:50});
  }
 const out=inflationR2VisibleTrend({status:'READY',score:50,asOfDate:'2026-11-18',
  trend:months.reverse()});
 assert.equal(out.length,12);
 assert.ok(out.every((p,i)=>i===0||out[i-1].date<p.date));
 assert.ok(out.every(p=>p.date<='2026-11-18'));
 assert.equal(out.at(-1).date,'2026-11-18');
 assert.deepEqual(inflationR2VisibleTrend({status:'READY',score:50,asOfDate:'2026-11-18',trend:[]}),[]);
});

test('W06 #41 actual React inflation detail consumes only guarded published trend, not raw future rows',()=>{
 const panel=readFileSync(new URL('../app/inflation/inflation-panel.tsx',import.meta.url),'utf8');
 assert.match(panel,/import \{inflationR2VisibleTrend\} from '\.\/inflation-r2-trend-display-r1\.mjs'/);
 assert.match(panel,/const trend:MarketFearGreedChartPoint\[\]=useMemo\(\(\)=>inflationR2VisibleTrend/);
 assert.match(panel,/MarketFearGreedChart showExtrema data=\{trend\}/);
 assert.doesNotMatch(panel,/allTrend\.slice\(-12\)/);
});
