import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCnnPeriodChart,CNN_PERIOD_BUCKET_MINUTES} from '../lib/cnn-period-chart-r1.mjs';

const src=(at,score)=>({observedAt:'2026-11-'+at+'.000Z',score});
const day=(date,score)=>({date:'2026-11-'+date,score});
const make=(period,days,observedPoints,dailyPoints=[])=>buildCnnPeriodChart({period,days,observedPoints,dailyPoints});

test('calendar windows have fixed chart cadence, not 7 or 30 point limits',()=>{
 assert.deepEqual(CNN_PERIOD_BUCKET_MINUTES,{'1W':30,'1M':300,'3M':1440,'6M':1440,'1Y':1440});
 const source=[
  src('20T14:00:00',11),src('20T14:30:00',12),src('20T15:00:00',13),src('20T15:30:00',14),
  src('23T14:00:00',15),src('23T14:30:00',16),src('23T15:00:00',17),src('23T15:30:00',18),
  src('26T14:00:00',19),src('26T14:30:00',20),src('26T15:00:00',21),
 ];
 const daily=['20','21','22','23','24','25','26'].map((date,i)=>day(date,i+1));
 const result=make('1W',7,source,daily);
 assert.ok(result.length>7,'1W displays intraday observations beyond seven daily rows');
 assert.equal(result.filter(p=>p.kind==='observed').length,11);
 assert.equal(result.filter(p=>p.kind==='daily').length,4,'missing source days use genuine daily history');
 assert.deepEqual(result.map(p=>p.time),result.map(p=>p.time).sort((a,b)=>a-b));
 assert.ok(result.every(p=>p.kind==='observed'||p.kind==='daily'));
});

test('1W uses the last real observation inside each populated 30-minute bucket',()=>{
 const input=[src('26T14:00:00',10),src('26T14:05:00',20),src('26T14:29:00',30),
  src('26T14:30:00',40),src('26T15:01:00',0)];
 const rows=make('1W',7,input,[day('26',90)]);
 assert.deepEqual(rows.map(p=>p.score),[30,40,0]);
 assert.deepEqual(rows.map(p=>p.date),[input[2].observedAt,input[3].observedAt,input[4].observedAt]);
 assert.ok(!rows.some(p=>p.score===90),'a matching daily close does not duplicate real intraday values');
});

test('1M uses 5-hour source buckets across the whole calendar month',()=>{
 const input=[src('04T14:00:00',10),src('04T14:30:00',11),src('04T17:10:00',12),
  src('20T14:15:00',13),src('20T21:00:00',14),src('26T14:10:00',15)];
 const result=make('1M',31,input,[day('04',90),day('26',80)]);
 assert.deepEqual(result.map(p=>p.score),[11,12,13,14,15]);
 assert.equal(result.at(-1).date,input.at(-1).observedAt);
 assert.equal(make('1W',7,input).length,3,'1W does not show observations from 3 weeks ago');
});

test('3M, 6M and 1Y group real intraday observations by NY calendar day',()=>{
 const source=[
  {observedAt:'2026-11-23T23:30:00.000Z',score:20},
  {observedAt:'2026-11-24T01:00:00.000Z',score:30},
  {observedAt:'2026-11-24T16:00:00.000Z',score:40},
  {observedAt:'2026-11-26T14:30:00.000Z',score:50},
 ];
 for(const [period,days]of [['3M',93],['6M',186],['1Y',366]]){
  const actual=make(period,days,source,[day('23',1),day('24',2),day('25',3)]);
  assert.deepEqual(actual.map(p=>p.score),[30,40,3,50]);
  assert.equal(actual.filter(p=>p.kind==='observed').length,3,'no synthetic per-day candles');
 }
});

test('source archive authority, zero, invalid records, missing periods and input immutability',()=>{
 const input=[src('26T14:01:00',10),src('26T14:01:00',0),src('26T14:02:00',null),
  src('26T14:03:00',101),{observedAt:'invalid',score:1}];
 const snapshot=structuredClone(input);
 const result=make('1W',7,input,[day('25',3),day('26',55)]);
 assert.equal(result.at(-1).score,0);
 assert.deepEqual(input,snapshot);
 assert.ok(!result.some(p=>p.score===55||p.score===101));
 assert.deepEqual(make('1W',7,[],[]),[]);
 assert.throws(()=>make('1D',1,input),/CNN_PERIOD_CHART_INTERVAL_INVALID/);
 const noSource=make('1W',7,[],[day('20',5),day('23',6),day('26',7)]);
 assert.deepEqual(noSource.map(p=>p.score),[5,6,7],'daily-only fallback never fabricates 7 points');
});

test('New York evening source crossing UTC midnight removes only the matching daily session',()=>{
 const source={observedAt:'2026-11-26T01:59:59.000Z',score:15};
 const daily=[day('25',14),day('26',16),{date:'2026-11-26T00:30:00.000Z',score:17}];
 const rows=make('1W',7,[source],daily);
 assert.deepEqual(rows.map(p=>p.score),[16,15],'keep separate Nov26 daily and Nov25 late source');
 assert.ok(rows.some(p=>p.date===source.observedAt));
 assert.ok(!rows.some(p=>p.score===14||p.score===17),'do not duplicate November 25 from either timestamp form');
});

test('repeated PC verification is not a new CNN observedAt',()=>{
 const one=src('26T14:00:00',15);
 const rows=buildCnnPeriodChart({period:'1W',days:7,observedPoints:[one],
  dailyPoints:[],checkedPoints:[{checkedAt:'2026-11-26T14:30:00.000Z',sourceObservedAt:one.observedAt,score:15}]});
 assert.deepEqual(rows.map(p=>p.date),[one.observedAt]);
});
