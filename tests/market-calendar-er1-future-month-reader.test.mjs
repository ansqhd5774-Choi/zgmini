import test from 'node:test';
import assert from 'node:assert/strict';
import {earningsDisplaySnapshot,earningsDisplayResponse} from
 '../lib/earnings-api-display.mjs';
import {ER1_METHOD} from '../lib/market-calendar-er1-earnings-score.mjs';
import {FORECAST_METHOD} from '../lib/market-calendar-er1-forecast-score.mjs';

const nextDay=(day,delta)=>new Date(Date.parse(day+'T00:00:00Z')+delta*86400000)
 .toISOString().slice(0,10);
const event=(ticker,date)=>({ticker,company:ticker,date,marketSession:'after_market',
 time:null,priority:false,verification:'VENDOR_UNVERIFIED',source:'earnings-api'});
const display=(start,events)=>earningsDisplaySnapshot({status:'READY_PRIVATE',
 scope:'PC_PRIVATE',publicDisplay:false,redistribution:false,
 publicationStatus:'HELD_UNCONFIRMED',checkedAt:start+'T00:00:00Z',
 coveredDays:Array.from({length:14},(_,i)=>nextDay(start,i)),
 recordCount:events.length,priorityCount:0,events});
const cohort=(asOf,entries,method=FORECAST_METHOD)=>({
 status:'READY_ER1_PUBLIC',method,asOf,threshold:97,
 coverage:{inputSymbols:entries.length,observedIssuers:entries.length,
  scoreableIssuers:entries.length,unscoreableReasons:{}},
 recordCount:entries.length,star3Count:entries.filter(([,score])=>score>=97).length,
 scores:entries.map(([ticker,score])=>({issuerId:ticker,tickers:[ticker],score}))
});
const request=(start,end,importance)=>
 `https://zgmini.kr/api/earnings-calendar-display?start=${start}&end=${end}`+
 (importance===undefined?'':`&importance=${importance}`);
const at=async(day,fn)=>{
 const original=Date.now;
 try{Date.now=()=>Date.parse(day+'T23:00:00Z');return await fn();}
 finally{Date.now=original;}
};

test('any newly published 2027 month uses the same 97/85 score-only star bands and R36 filters',async()=>{
 for(const day of ['2027-01-05','2027-06-15']){
  await at(nextDay(day,1),async()=>{
   const values=[['TRIPLE',97],['DOUBLE',96.995],['EIGHTY5',85],
    ['SINGLE',84.995],['ZERO',0]];
   const source=display(day,[...values.map(([ticker])=>event(ticker,day)),
    event('UNSCORED',day)]);
   const month=day.slice(0,7),published=cohort(day,values);
   const byMonth={[month]:published};
   const all=earningsDisplayResponse(source,request(day,day),null,null,null,byMonth);
   assert.equal(all.status,200);
   assert.equal(all.headers.get('x-display-count'),'6');
   const html=await all.text();
   assert.equal((html.match(/>★★★<\/div>/g)??[]).length,1);
   assert.equal((html.match(/>★★<\/div>/g)??[]).length,2);
   assert.equal((html.match(/>★<\/div>/g)??[]).length,2);
   assert.equal((html.match(/기업 실적 점수 없음">-<\/div>/g)??[]).length,1);
   assert.match(html,/96\.99점/); // The display must not round 96.995 to 97.
   assert.match(html,/기업 실적 점수 0\.00점/); // Zero is scored, not missing.
   for(const [level,count] of [[3,1],[2,2],[1,2],['1,2,3',5]]){
    const filtered=earningsDisplayResponse(source,request(day,day,level),
     null,null,null,byMonth);
    assert.equal(filtered.headers.get('x-display-count'),String(count));
    assert.doesNotMatch(await filtered.text(),/UNSCORED/);
   }
  });
 }
});

test('2027 actual-only scores cannot leak into an earlier day, even within one published month',async()=>{
 const earlier='2027-06-14',later='2027-06-15';
 await at('2027-06-16',async()=>{
  const source=display(earlier,[event('PIT',earlier),event('PIT',later)]);
  const byMonth={'2027-06':cohort(earlier,[['PIT',99]],ER1_METHOD)};
  const old=await earningsDisplayResponse(source,request(earlier,earlier),
   null,null,null,byMonth).text();
  assert.match(old,/기업 실적 점수 없음">-<\/div>/);
  assert.doesNotMatch(old,/★★★/);
  const newHtml=await earningsDisplayResponse(source,request(later,later),
   null,null,null,byMonth).text();
  assert.match(newHtml,/>★★★<\/div>/);
 });
});

test('a future forecast cohort never rewrites events before its as-of observation',async()=>{
 await at('2027-01-07',async()=>{
  const earlier='2027-01-05',later='2027-01-06';
  const source=display(earlier,[event('PIT',earlier),event('PIT',later)]);
  const byMonth={'2027-01':cohort(later,[['PIT',97]])};
  const old=await earningsDisplayResponse(source,request(earlier,earlier),
   null,null,null,byMonth).text();
  assert.match(old,/기업 실적 점수 없음">-<\/div>/);
  const current=await earningsDisplayResponse(source,request(later,later),
   null,null,null,byMonth).text();
  assert.match(current,/>★★★<\/div>/);
 });
});

test('future year boundary selects each month cohort independently without cross-month score leakage',async()=>{
 await at('2028-01-02',async()=>{
  const december='2027-12-31',january='2028-01-01';
  const source=display('2027-12-26',[event('CROSS',december),event('CROSS',january)]);
  const byMonth={
   '2027-12':cohort(december,[['CROSS',97]]),
   '2028-01':cohort(january,[['CROSS',85]])
  };
  const old=await earningsDisplayResponse(source,request(december,december),
   null,null,null,byMonth).text();
  assert.match(old,/>★★★<\/div>/);
  assert.doesNotMatch(old,/>★★<\/div>/);
  const newer=await earningsDisplayResponse(source,request(january,january),
   null,null,null,byMonth).text();
  assert.match(newer,/>★★<\/div>/);
  assert.doesNotMatch(newer,/>★★★<\/div>/);
  assert.equal(earningsDisplayResponse(source,request(december,january,3),
   null,null,null,byMonth).headers.get('x-display-count'),'1');
  assert.equal(earningsDisplayResponse(source,request(december,january,2),
   null,null,null,byMonth).headers.get('x-display-count'),'1');
 });
});

test('a malformed future snapshot never supplies fabricated stars or prior-month scores',async()=>{
 await at('2027-01-06',async()=>{
  const day='2027-01-05',source=display(day,[event('PIT',day)]);
  const bad={...cohort(day,[['PIT',97]]),threshold:85};
  const html=await earningsDisplayResponse(source,request(day,day),
   null,null,null,{'2027-01':bad}).text();
  assert.match(html,/기업 실적 점수 없음">-<\/div>/);
  assert.doesNotMatch(html,/★/);
 });
});
