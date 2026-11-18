import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validRollingPublic,readRollingPublic,THEME_ETF_ROLLING_KEY} from '../worker/theme-etf-rolling-public.mjs';
const names=['로봇·자동화','클라우드·SaaS','자율주행','원전·SMR','방산','핀테크','사이버보안'];
const now=Date.parse('2026-10-21T12:00:00Z');
const dates=Array.from({length:252},(_,i)=>new Date(Date.parse('2026-10-16T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
function seed(){return{status:'READY',observationDate:'2026-10-16',themes:names.map(theme=>({theme,etfs:['BOTZ','ROBO'],history:dates.map(date=>({date,score:42}))}))}}
function rolling(base){const p={status:'READY',version:'THEME_ETF_ROLLING_R178',phase:'PROVISIONAL',methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',baseObservationDate:'2026-10-16',observationDate:'2026-10-16',confirmedObservationDate:'2026-10-16',asOf:'2026-10-21T10:00:00Z',sourceStoredAt:'2026-10-21T10:00:00Z',publicationAuthorized:true,upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,sourcePriceReconciled:true,individualStocksUsed:0,sourceVersion:'R178',coverage:{etfs:13,benchmark:'SPY',complete:true},themes:base.themes.map(x=>({...x,score:42})),provisional:{asOf:'2026-10-21T10:00:00Z',points:[{date:'2026-10-19',scores:Object.fromEntries(names.map(n=>[n,56]))}]},lineage:{confirmedPrimaryCount:0,secondaryPendingCount:1,latestCompletedSession:'2026-10-19',primarySource:'GETMARKETHISTORY_1H_CLOSE',secondarySource:'MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED'}};
 p.baseHash=createHash('sha256').update(JSON.stringify(base.themes.map(t=>({theme:t.theme,etfs:t.etfs,history:t.history})))).digest('hex');return p}
test('old mixed-provider rolling is rejected even with all old approval flags',async()=>{
 const b=seed(),p=rolling(b);
 assert.equal(await validRollingPublic(p,b,{now}),false);
 p.privateBars=[101,102];
 const db={prepare(sql){assert.match(sql,/^SELECT /);return{bind(key){assert.equal(key,THEME_ETF_ROLLING_KEY);return{first:async()=>({body:JSON.stringify(p),stored_at:now-500})}}}}};
 assert.equal(await readRollingPublic(db,b,{now}),null);
});

test('confirmed GMH-only rolling does not require an unavailable provisional provider',async()=>{
 const b=seed(),p=rolling(b);
 p.phase='CONFIRMED';p.provisional.points=[];
 p.lineage={confirmedPrimaryCount:0,secondaryPendingCount:0,latestCompletedSession:p.observationDate,
  primarySource:'GETMARKETHISTORY_1H_CLOSE',secondarySource:null};
 assert.equal(await validRollingPublic(p,b,{now}),true);
});
test('unaltered immutable seed is required',async()=>{
 const b=seed(),p=rolling(b);p.themes[0].history[0].score=99;
 assert.equal(await validRollingPublic(p,b,{now}),false);
});
test('rights and provenance fail closed',async()=>{
 const b=seed(),p=rolling(b);p.upstreamCommercialRightsVerified=false;
 assert.equal(await validRollingPublic(p,b,{now}),false);
});
test('more than two provisional dates rejected',async()=>{
 const b=seed(),p=rolling(b),scores=p.provisional.points[0].scores;
 p.provisional.points=[{date:'2026-10-19',scores},{date:'2026-10-20',scores},{date:'2026-10-21',scores}];
 assert.equal(await validRollingPublic(p,b,{now}),false);
});
test('not-yet-stored rolling output is optional, not a base read blocker',async()=>{
 const b=seed(),db={prepare(){return{bind(){return{first:async()=>null}}}}};
 assert.equal(await readRollingPublic(db,b,{now}),null);
});

test('optional rolling overlay is fail-closed for missing seed or corrupt nested score records',async()=>{
 const goodSeed=seed(),goodRolling=rolling(goodSeed);
 const cases=[
  {label:'missing confirmed seed',base:null,payload:goodRolling},
  {label:'malformed confirmed seed',base:{},payload:goodRolling},
  {label:'missing seed theme entry',base:{...goodSeed,themes:[null]},payload:goodRolling},
  {label:'corrupt rolling theme entry',base:goodSeed,
   payload:{...goodRolling,themes:[null,...goodRolling.themes.slice(1)]}},
 ];
 for(const c of cases){
  const db={prepare(sql){assert.match(sql,/^SELECT /);return{bind(key){
   assert.equal(key,THEME_ETF_ROLLING_KEY);
   return{first:async()=>({body:JSON.stringify(c.payload),stored_at:now-500})};
  }}}};
  assert.equal(await readRollingPublic(db,c.base,{now}),null,c.label);
 }
});

test('R178 confirmed session cannot be future or newer than its GMH source request',async()=>{
 const base=seed(),r=rolling(base);
 const later='2026-10-22',days=Array.from({length:252},(_,i)=>
  new Date(Date.parse(later+'T00:00:00Z')-(251-i)*86400000).toISOString().slice(0,10));
 r.phase='CONFIRMED';
 r.provisional.points=[];
 r.observationDate=later;
 r.confirmedObservationDate=later;
 r.themes=r.themes.map(t=>({...t,history:days.map(date=>({date,score:42}))}));
 r.lineage={confirmedPrimaryCount:252,secondaryPendingCount:0,
  latestCompletedSession:later,primarySource:'GETMARKETHISTORY_1H_CLOSE',
  secondarySource:null};
 // A fresh D1 row and all rights flags cannot manufacture tomorrow's price.
 assert.equal(await validRollingPublic(r,base,{now}),false);
 let reads=0;
 const db={prepare(sql){assert.match(sql,/^SELECT /);return{bind(key){
  assert.equal(key,THEME_ETF_ROLLING_KEY);return{first:async()=>{
   reads++;return {body:JSON.stringify(r),stored_at:now-500};}};
 }}}};
 assert.equal(await readRollingPublic(db,base,{now}),null);
 assert.equal(reads,1);
 // Clock now catches up, but the *old GMH request* still predates the session.
 const followingDay=Date.parse('2026-10-23T12:00:00Z');
 assert.equal(await validRollingPublic(r,base,{now:followingDay}),false);
 // A genuinely later source receipt permits the same immutable scores/contract.
 r.sourceStoredAt='2026-10-22T20:30:00Z';
 r.asOf=r.sourceStoredAt;
 assert.equal(await validRollingPublic(r,base,{now:followingDay}),true);
});
