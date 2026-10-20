import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {V11_METHOD,V11_PUBLIC_KEY,projectV11PublicDomain,overlayV11PublicScore} from '../worker/breadth-v11-public-view.mjs';
import {V9_METHOD,V9_PUBLIC_KEY,projectV9PublicDomain} from '../worker/breadth-v9-public-view.mjs';
import {buildV11PublicRecord} from '../scripts/pc-writer/breadth-v11-public-record.mjs';
import {publicationDecisionV11,publishV11} from '../scripts/pc-writer/breadth-v11-publication.mjs';
const dates=Array.from({length:252},(_,i)=>new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10));
const round=x=>Math.round(x*1e9)/1e9;
const factors={F1:50,F2:50,F3:50,F4:50,F5:50};
function fixture(){
 let b=null;
 const perDay=dates.map((date,i)=>{
  if(i===248){b=null;return {date,status:'NOT_READY',score:null,ema3:null,reason:'SOURCE_MISSING',factors:null}}
  const score=i<248?50:70;
  b=round(b===null?score:b+.5*(score-b));
  return {date,status:'CANDIDATE_READY',score,ema3:b,reason:null,factors:{...factors}};
 });
 const latest={methodologyVersion:V9_METHOD,quality:{noImputation:true,pitOfficialIndependentlyVerified:false},
  asOf:dates.at(-1),sourceStoredAt:'2026-10-18T02:05:12.863Z',evaluation:{perDay}};
 const verified={methodologyVersion:V9_METHOD,status:'SHADOW_READY',
  display:{score:perDay.at(-1).ema3},evaluation:{scoreSummary:{latest:{date:dates.at(-1),ema3:perDay.at(-1).ema3,factors}}}};
 return {latest,verified};
}
test('V11 computes last verified score with EMA continuity, not synthesized gap',()=>{
 const r=buildV11PublicRecord(fixture());
 assert.equal(r.methodologyVersion,V11_METHOD);
 assert.equal(r.score,67.5); // prior 50 -> 60 -> 65 -> 67.5
 assert.equal(r.trend.at(-1).value,r.score);
 assert.equal(r.annualValidation.requiredSessions,252);
 assert.equal(r.annualValidation.observedSessions,251);
 assert.equal(r.annualValidation.missingSessions,1);
 assert.equal(r.annualValidation.completeYear,false);
 assert.equal(r.trend.some(x=>x.label===dates[248]),false);
 assert.equal(projectV9PublicDomain(r),null);
 const d=projectV11PublicDomain(r);
 assert.equal(d.score,67.5);
 assert.equal(d.methodologyVersion,V11_METHOD);
 assert.equal(d.indicators.length,5);
 assert.deepEqual(d.indicators.map(x=>x.releaseCadence),Array(5).fill('매 거래일'));
 assert.equal(d.indicators[0].previousValue,50);
 assert.equal(d.indicators[0].previousObservationDate,dates.at(-2));
 assert.equal(d.indicators[0].trend.length,251);
 assert.equal(d.indicators[0].trend[248].breakBefore,true);
 assert.ok(d.indicators[0].description.length>0);
 assert.ok(!d.indicators[0].source.includes('STORED_V11_FACTOR'));
 assert.equal(d.annualValidation.completeYear,false);
});
test('preserve all other market domains and B1-R5 fallback on bad V11',()=>{
 const prior={status:'SUCCESS',overall:{score:40},domains:[{id:'breadth',score:55,methodologyVersion:V9_METHOD},{id:'growth',score:39}]};
 const good=overlayV11PublicScore(prior,buildV11PublicRecord(fixture()));
 assert.equal(good.domains[0].score,67.5);
 assert.equal(good.domains[1],prior.domains[1]);
 assert.equal(good.overall,prior.overall);
 assert.equal(overlayV11PublicScore(prior,{...buildV11PublicRecord(fixture()),score:77}),prior);
 assert.equal(prior.domains[0].score,55);
});
test('strictly reject forged annual completeness, scores, source and method',()=>{
 const x=buildV11PublicRecord(fixture());
 assert.equal(projectV11PublicDomain({...x,annualValidation:{...x.annualValidation,completeYear:true}}),null);
 assert.equal(projectV11PublicDomain({...x,annualValidation:{...x.annualValidation,observedSessions:252}}),null);
 assert.equal(projectV11PublicDomain({...x,source:'IEX HIST'}),null);
 assert.equal(projectV11PublicDomain({...x,factorHistory:{...x.factorHistory,F1:x.factorHistory.F1.slice(1)}}),null);
 assert.equal(projectV11PublicDomain({...x,factorHistory:{...x.factorHistory,F3:x.factorHistory.F3.map((v,i)=>i===25?{...v,value:101}:v)}}),null);
 assert.equal(projectV11PublicDomain({...x,methodologyVersion:V9_METHOD}),null);
 assert.equal(projectV11PublicDomain({...x,trend:[...x.trend,{label:dates[248],value:70}]}),null);
});
test('V11 publisher rejects stale, alien or invalid output; distinct D1 key',async()=>{
 const r=buildV11PublicRecord(fixture());
 assert.equal(publicationDecisionV11(r,null),'PUBLISH');
 assert.equal(publicationDecisionV11(r,r),'UNCHANGED');
 assert.equal(publicationDecisionV11(r,{...r,methodologyVersion:V9_METHOD}),'EXISTING_OUTPUT_UNRECOGNIZED');
 assert.equal(publicationDecisionV11({...r,annualValidation:{...r.annualValidation,completeYear:true}},r),'INVALID_CANDIDATE');
 const prior={...r,observationDate:'2026-10-19'};
 assert.equal(publicationDecisionV11(r,prior),'EXISTING_OUTPUT_UNRECOGNIZED'); // inconsistent V11 record
 let row=null;
 const remote={
  async query(_db,sql,params){assert.match(sql,/SELECT body,stored_at/);assert.deepEqual(params,[V11_PUBLIC_KEY]);return {results:row?[row]:[]}},
  async request(_db,batch){const q=batch[0];assert.equal(q.params[0],V11_PUBLIC_KEY);assert.ok(!q.params.includes(V9_PUBLIC_KEY));row={body:q.params[1],stored_at:q.params[2]};},
 };
 assert.equal((await publishV11({remote,db:'test',record:r,now:1792455000000})).status,'VERIFIED');
 assert.equal((await publishV11({remote,db:'test',record:r,now:1792455000001})).status,'UNCHANGED');
 assert.notEqual(V11_PUBLIC_KEY,V9_PUBLIC_KEY);
});
test('visitor GET is read-only and tries verified V11 before unchanged V9 fallback',()=>{
 const api=fs.readFileSync(new URL('../app/api/market-score/route.ts',import.meta.url),'utf8');
 assert.ok(api.indexOf('key:V11_PUBLIC_KEY')<api.indexOf('key:V9_PUBLIC_KEY'));
 assert.match(api,/overlayV11PublicScore/);
 assert.doesNotMatch(api, /\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bfetch\(/);
 const ui=fs.readFileSync(new URL('../app/economic-indicators/economic-detail-panel.tsx',import.meta.url),'utf8');
 assert.match(ui,/저장 평가 · V11/);
 assert.match(ui,/v9Delta>0\?"▲":"▽"/);
});
test('PC V11 publication reads stored V9 raw daily scores with no change to five factor math',()=>{
 const pub=fs.readFileSync(new URL('../scripts/pc-writer/breadth-v11-publication.mjs',import.meta.url),'utf8');
 assert.match(pub,/historySessions:311/);
 assert.match(pub,/writeLocal:false/);
 assert.match(pub,/breadth-r10-v9-publication.lock/);
 assert.doesNotMatch(pub,/provider\.fetch|fetch\(/);
 const baseline=fs.readFileSync(new URL('../scripts/pc-writer/breadth-r10-v9-shadow/formula.mjs',import.meta.url),'utf8');
 assert.match(baseline,/F5:4\/15/);
 assert.match(baseline,/dailyCoverage:0\.98/);
});
