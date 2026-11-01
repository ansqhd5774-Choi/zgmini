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
test('valid derived scores; no primary/backup bar data in API output',async()=>{
 const b=seed(),p=rolling(b);
 assert.equal(await validRollingPublic(p,b,{now}),true);
 p.privateBars=[101,102];
 const db={prepare(sql){assert.match(sql,/^SELECT /);return{bind(key){assert.equal(key,THEME_ETF_ROLLING_KEY);return{first:async()=>({body:JSON.stringify(p),stored_at:now-500})}}}}};
 const body=await readRollingPublic(db,b,{now});assert.equal(body.phase,'PROVISIONAL');assert.equal(body.themes.length,7);
 assert.equal(body.provisional.points[0].date,'2026-10-19');assert.equal('privateBars'in body,false);
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
