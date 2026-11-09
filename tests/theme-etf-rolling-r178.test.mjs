import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validRollingPublic,readRollingPublic,THEME_ETF_ROLLING_KEY,THEME_ETF_GMH_ONLY_CANDIDATE_CONTRACT} from '../worker/theme-etf-rolling-public.mjs';
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
test('fresh GMH-only confirmed rolling can revive the immutable seed without an EOD provisional point',async()=>{
 const b=seed(),p=rolling(b),current=Date.parse('2026-11-08T04:00:00Z');
 const end=Date.parse('2026-11-06T00:00:00Z');
 const dates=Array.from({length:252},(_,i)=>new Date(end-(251-i)*86400000)
  .toISOString().slice(0,10));
 p.phase='CONFIRMED';p.observationDate='2026-11-06';
 p.confirmedObservationDate=p.observationDate;
 p.asOf='2026-11-08T03:00:00Z';p.sourceStoredAt=p.asOf;
 p.themes=p.themes.map(t=>({...t,score:42,
  history:dates.map(date=>({date,score:42}))}));
 p.provisional={asOf:p.asOf,points:[]};
 p.lineage.confirmedPrimaryCount=13;
 p.lineage.secondaryPendingCount=0;
 p.lineage.latestCompletedSession=p.observationDate;
 assert.equal(await validRollingPublic(p,b,{now:current}),true);
 const db={prepare(){return{bind(){return{first:async()=>({body:JSON.stringify(p),
  stored_at:current-1000})}}}}};
 const exposed=await readRollingPublic(db,b,{now:current});
 assert.equal(exposed.status,'READY');
 assert.equal(exposed.phase,'CONFIRMED');
 assert.equal(exposed.observationDate,'2026-11-06');
 assert.equal(Object.hasOwn(exposed,'provisional'),false);
 p.sourcePriceReconciled=false;
 assert.equal(await validRollingPublic(p,b,{now:current}),false);
});
test('future confirmed observation date cannot be published as already collected GMH data',async()=>{
 const b=seed(),p=rolling(b),future='2026-11-09';
 p.phase='CONFIRMED';
 p.observationDate=future;
 p.confirmedObservationDate=future;
 p.themes=p.themes.map(t=>({...t,history:[...t.history.slice(1),{date:future,score:42}]}));
 p.provisional={asOf:p.asOf,points:[]};
 p.lineage.confirmedPrimaryCount=13;
 p.lineage.secondaryPendingCount=0;
 p.lineage.latestCompletedSession=future;
 assert.equal(await validRollingPublic(p,b,{now}),false);
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

test('GMH-only confirmed candidate requires explicit opt-in and preserves score-only output',async()=>{
 const b=seed(),p=rolling(b);
 p.phase='CONFIRMED';p.provisional={asOf:p.asOf,points:[]};
 p.lineage.sourceContract=THEME_ETF_GMH_ONLY_CANDIDATE_CONTRACT;
 p.lineage.secondarySource=null;p.lineage.confirmedPrimaryCount=13;
 p.lineage.secondaryPendingCount=0;p.lineage.latestCompletedSession=p.observationDate;
 p.privateBars=[{close:123.45}];
 assert.equal(await validRollingPublic(p,b,{now}),false);
 assert.equal(await validRollingPublic(p,b,{now,allowGmhOnlyCandidate:true}),true);
 const db={prepare(){return{bind(){return{first:async()=>({body:JSON.stringify(p),stored_at:now-500})}}}}};
 assert.equal(await readRollingPublic(db,b,{now}),null);
 const publicResult=await readRollingPublic(db,b,{now,allowGmhOnlyCandidate:true});
 assert.equal(publicResult.status,'READY');
 assert.equal(publicResult.phase,'CONFIRMED');
 assert.equal('privateBars' in publicResult,false);
 assert.equal('lineage' in publicResult,false);
 assert.equal('provisional' in publicResult,false);
});
test('GMH-only candidate fails closed on rights, provenance, phase, coverage and expiry',async()=>{
 const b=seed(),p=rolling(b);
 p.phase='CONFIRMED';p.provisional={asOf:p.asOf,points:[]};
 p.lineage.sourceContract=THEME_ETF_GMH_ONLY_CANDIDATE_CONTRACT;
 p.lineage.secondarySource=null;p.lineage.confirmedPrimaryCount=13;
 p.lineage.secondaryPendingCount=0;p.lineage.latestCompletedSession=p.observationDate;
 const expectDenied=async patch=>{
  const candidate=structuredClone(p);patch(candidate);
  assert.equal(await validRollingPublic(candidate,b,{now,allowGmhOnlyCandidate:true}),false);
 };
 await expectDenied(p=>p.upstreamCommercialRightsVerified=false);
 await expectDenied(p=>p.derivedLicenseVerified=false);
 await expectDenied(p=>p.sourcePriceReconciled=false);
 await expectDenied(p=>p.publicationAuthorized=false);
 await expectDenied(p=>p.lineage.sourceContract='UNKNOWN');
 await expectDenied(p=>p.lineage.primarySource='UNVERIFIED');
 await expectDenied(p=>p.lineage.secondarySource='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED');
 await expectDenied(p=>p.lineage.confirmedPrimaryCount=12);
 await expectDenied(p=>p.phase='PROVISIONAL');
 await expectDenied(p=>p.coverage.complete=false);
 await expectDenied(p=>p.baseHash='0'.repeat(64));
 await expectDenied(p=>p.asOf='2026-10-01T00:00:00Z');
});
