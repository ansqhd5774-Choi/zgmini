import test from 'node:test';
import assert from 'node:assert/strict';
import {earningsDisplaySnapshot,earningsDisplayResponse} from
 '../lib/earnings-api-display.mjs';
import {FORECAST_METHOD} from '../lib/market-calendar-er1-forecast-score.mjs';
import {er1MonthlyPublicKey} from '../lib/market-calendar-er1-month-key.mjs';

const nextDay=(day,delta)=>new Date(Date.parse(day+'T00:00:00Z')+delta*86400000)
 .toISOString().slice(0,10);
const event=(ticker,date)=>({ticker,company:ticker,date,marketSession:'after_market',
 time:null,priority:false,verification:'VENDOR_UNVERIFIED',source:'earnings-api'});
const display=(start,events)=>earningsDisplaySnapshot({status:'READY_PRIVATE',
 scope:'PC_PRIVATE',publicDisplay:false,redistribution:false,
 publicationStatus:'HELD_UNCONFIRMED',checkedAt:start+'T00:00:00Z',
 coveredDays:Array.from({length:14},(_,i)=>nextDay(start,i)),
 recordCount:events.length,priorityCount:0,events});
const cohort=(asOf,entries)=>({status:'READY_ER1_PUBLIC',method:FORECAST_METHOD,
 asOf,threshold:97,coverage:{inputSymbols:entries.length,
 observedIssuers:entries.length,scoreableIssuers:entries.length,
 unscoreableReasons:{}},recordCount:entries.length,
 star3Count:entries.filter(([,score])=>score>=97).length,
 scores:entries.map(([ticker,score])=>({issuerId:ticker,tickers:[ticker],score}))
});
const url=(day,grade)=>`https://zgmini.kr/api/earnings-calendar-display?start=${day}&end=${day}`+
 (grade===undefined?'':`&importance=${grade}`);
const at=async(day,run)=>{
 const original=Date.now;
 try{Date.now=()=>Date.parse(day+'T23:00:00Z');return await run();}
 finally{Date.now=original;}
};

test('new dynamic derived-month keys include November and December while legacy publication keys remain separate',()=>{
 assert.equal(er1MonthlyPublicKey('2026-11'),
  'market-calendar:earnings-er1-score-2026-11-public');
 assert.equal(er1MonthlyPublicKey('2026-12'),
  'market-calendar:earnings-er1-score-2026-12-public');
 assert.equal(er1MonthlyPublicKey('2027-01'),
  'market-calendar:earnings-er1-score-2027-01-public');
 assert.equal(er1MonthlyPublicKey('2026-10'),null);
});

test('November newer valid dynamic forecast overrides legacy only for eligible as-of days',async()=>{
 await at('2026-11-12',async()=>{
  const previous='2026-11-09',current='2026-11-10';
  const source=display('2026-11-03',[event('PIT',previous),event('PIT',current),
   event('LEGACYONLY',current)]);
  const legacy=cohort('2026-11-04',[['PIT',97],['LEGACYONLY',97]]);
  const dynamic=cohort(current,[['PIT',85]]);
  const month={'2026-11':dynamic};
  const earlier=await earningsDisplayResponse(source,url(previous),null,null,legacy,month).text();
  assert.match(earlier,/>★★★<\/div>/,'earlier date retains verified legacy rank');
  const currentAll=await earningsDisplayResponse(source,url(current),null,null,legacy,month).text();
  assert.match(currentAll,/기업 실적 점수 85\.00점/);
  assert.match(currentAll,/>★★<\/div>/,'current date receives dynamic 85-point grade');
  assert.match(currentAll,/기업 실적 점수 없음">-<\/div>/,
   'an issuer missing from newer valid cohort cannot inherit old score');
  assert.equal(earningsDisplayResponse(source,url(previous,3),null,null,legacy,month)
   .headers.get('x-display-count'),'1');
  assert.equal(earningsDisplayResponse(source,url(current,2),null,null,legacy,month)
   .headers.get('x-display-count'),'1');
  assert.equal(earningsDisplayResponse(source,url(current,3),null,null,legacy,month)
   .headers.get('x-display-count'),'0');
 });
});

test('December dynamic publication updates eligible dates without retroactively erasing older legacy grades',async()=>{
 await at('2026-12-11',async()=>{
  const previous='2026-12-08',current='2026-12-09';
  const source=display('2026-12-05',[event('PIT',previous),event('PIT',current)]);
  const legacy=cohort('2026-12-06',[['PIT',60]]);
  const dynamic=cohort(current,[['PIT',97]]);
  const month={'2026-12':dynamic};
  const old=await earningsDisplayResponse(source,url(previous),null,legacy,null,month).text();
  assert.match(old,/>★<\/div>/);
  assert.doesNotMatch(old,/>★★★<\/div>/);
  const newer=await earningsDisplayResponse(source,url(current),null,legacy,null,month).text();
  assert.match(newer,/기업 실적 점수 97\.00점/);
  assert.match(newer,/>★★★<\/div>/);
  assert.equal(earningsDisplayResponse(source,url(previous,1),null,legacy,null,month)
   .headers.get('x-display-count'),'1');
  assert.equal(earningsDisplayResponse(source,url(current,3),null,legacy,null,month)
   .headers.get('x-display-count'),'1');
 });
});

test('invalid November dynamic output preserves previously verified legacy cohort for future days',async()=>{
 await at('2026-11-12',async()=>{
  const day='2026-11-10',source=display('2026-11-03',[event('PIT',day)]);
  const legacy=cohort('2026-11-04',[['PIT',97]]);
  const invalid={...cohort(day,[['PIT',85]]),threshold:85};
  const html=await earningsDisplayResponse(source,url(day),null,null,legacy,
   {'2026-11':invalid}).text();
  assert.match(html,/>★★★<\/div>/);
  assert.doesNotMatch(html,/>★★<\/div>/);
 });
});

test('rolling monthly output retains a past event grade from the verified dated vintage',async()=>{
 await at('2026-11-21',async()=>{
  const oldDay='2026-11-05',newDay='2026-11-16';
  const source=display('2026-11-03',[event('EARLY',oldDay),event('LATE',newDay)]);
  const old=cohort('2026-11-01',[['EARLY',97],['LATE',60]]);
  // A day-eight rolling current cohort omits the already elapsed EARLY event.
  const current=cohort('2026-11-08',[['LATE',85]]);
  const month={'2026-11':[current,old]};
  const earlier=await earningsDisplayResponse(source,url(oldDay),null,null,null,month).text();
  assert.match(earlier,/기업 실적 점수 97\.00점/);
  assert.match(earlier,/>★★★<\/div>/);
  const newer=await earningsDisplayResponse(source,url(newDay),null,null,null,month).text();
  assert.match(newer,/기업 실적 점수 85\.00점/);
  assert.match(newer,/>★★<\/div>/);
  assert.doesNotMatch(newer,/기업 실적 점수 60\.00점/);
  assert.equal(earningsDisplayResponse(source,url(oldDay,3),null,null,null,month)
   .headers.get('x-display-count'),'1');
  assert.equal(earningsDisplayResponse(source,url(newDay,2),null,null,null,month)
   .headers.get('x-display-count'),'1');
  assert.equal(earningsDisplayResponse(source,url(oldDay,2),null,null,null,month)
   .headers.get('x-display-count'),'0');
 });
});

test('a prior-month observation remains eligible for next-month events',async()=>{
 await at('2026-12-05',async()=>{
  const day='2026-12-03',source=display('2026-12-01',[event('CROSS',day)]);
  const observedInNovember=cohort('2026-11-29',[['CROSS',97]]);
  const futureCurrent=cohort('2026-12-04',[['CROSS',85]]);
  const html=await earningsDisplayResponse(source,url(day),null,null,null,
   {'2026-12':[futureCurrent,observedInNovember]}).text();
  assert.match(html,/>★★★<\/div>/);
  assert.doesNotMatch(html,/>★★<\/div>/);
 });
});
