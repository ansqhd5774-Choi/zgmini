import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {V9_METHOD,projectV9PublicDomain,overlayV9PublicScore,V9_PUBLIC_KEY} from '../worker/breadth-v9-public-view.mjs';
import {buildV9PublicRecord} from '../scripts/pc-writer/breadth-r10-v9-public-record.mjs';
import {publicationDecision,publishRecord} from '../scripts/pc-writer/breadth-r10-v9-publication.mjs';
const factors={F1:60,F2:51,F3:56,F4:54,F5:55};
const history=[{date:'2026-10-15',status:'CANDIDATE_READY',score:53,ema3:54},
 {date:'2026-10-16',status:'CANDIDATE_READY',score:50.703291367,ema3:55.243075316},
 {date:'2026-10-19',status:'NOT_READY',score:null,ema3:null,reason:'NO_STORED_UNIVERSE'}];
const latest={methodologyVersion:V9_METHOD,asOf:'2026-10-19',status:'SHADOW_STALE',
 display:{score:55.243075316,observationDate:'2026-10-16',lagSessions:1},
 sourceStoredAt:'2026-10-18T02:05:12.863Z',evaluation:{perDay:history}};
const verified={methodologyVersion:V9_METHOD,status:'SHADOW_READY',
 display:{score:55.243075316},evaluation:{scoreSummary:{latest:{date:'2026-10-16',rawScore:50.703291367,ema3:55.243075316,factors}}}};
const record=()=>buildV9PublicRecord({latest,verified});
test('correctly present latest US session while preserving actual observation date',()=>{
 const r=record();assert.equal(r.phase,'CARRY_FORWARD');
 assert.equal(r.asOfDate,'2026-10-19');assert.equal(r.observationDate,'2026-10-16');
 assert.equal(r.score,55.243075316);assert.deepEqual(r.trend.map(x=>x.label),['2026-10-15','2026-10-16']);
 assert.ok(!JSON.stringify(r).includes('formulaWeights'));assert.ok(!JSON.stringify(r).includes('provenance_json'));
});
test('public overlay uses V9 factor values, 5 indicator labels, date and ▲▽ delta',()=>{
 const d=projectV9PublicDomain(record());
 assert.equal(d.score,55.243075316);assert.equal(d.dataPhase,'CARRY_FORWARD');
 assert.equal(d.indicators.length,5);assert.equal(d.indicators[4].name,'20회 관측 수급폭');
 assert.equal(d.indicators.every(x=>x.observationDate==='2026-10-16'),true);
 assert.equal(d.scoreChange,1.243075316);assert.equal(d.previousObservationDate,'2026-10-15');
});
test('no fabricated 19th observation, unchanged market domains and overall score',()=>{
 const prior={status:'SUCCESS',overall:{score:48},domains:[
  {id:'breadth',score:59,methodologyVersion:'B1-R5'}, {id:'growth',score:41}]};
 const result=overlayV9PublicScore(prior,record());
 assert.equal(result.overall,prior.overall);assert.equal(result.domains[1],prior.domains[1]);
 assert.equal(result.domains[0].score,55.243075316);
 assert.equal(result.domains[0].trend.at(-1).label,'2026-10-16');
 assert.equal(prior.domains[0].score,59);
});
test('no V9 artifact means preserve existing B1-R5 public value',()=>{
 const prior={status:'SUCCESS',domains:[{id:'breadth',score:59}]};
 assert.equal(overlayV9PublicScore(prior,null),prior);
 assert.equal(overlayV9PublicScore(prior,{...record(),trend:[]}),prior);
 assert.equal(overlayV9PublicScore(prior,{...record(),phase:'OBSERVED'}),prior);
});
test('invalid score, missing factor, date inconsistency, gap fraud rejected',()=>{
 const r=record();
 assert.equal(projectV9PublicDomain({...r,score:NaN}),null);
 assert.equal(projectV9PublicDomain({...r,factors:{...r.factors,F5:null}}),null);
 assert.equal(projectV9PublicDomain({...r,trend:[...r.trend,{label:'2026-10-19',value:r.score}]}),null);
 assert.equal(projectV9PublicDomain({...r,observationDate:'2026-10-19'}),null);
 assert.equal(projectV9PublicDomain({...r,methodologyVersion:'B1-R5'}),null);
});
test('when newest 19th price is verified, replace carry-forward and keep valid prior for arrows',()=>{
 const now={...latest,asOf:'2026-10-19',status:'SHADOW_READY',evaluation:{perDay:[...history.slice(0,2),{date:'2026-10-19',status:'CANDIDATE_READY',score:56,ema3:55.5}]}};
 const good={...verified,display:{score:55.5},evaluation:{scoreSummary:{latest:{date:'2026-10-19',ema3:55.5,factors}}}};
 const d=projectV9PublicDomain(buildV9PublicRecord({latest:now,verified:good}));
 assert.equal(d.dataPhase,'OBSERVED');assert.equal(d.observationDate,'2026-10-19');
 assert.equal(d.scoreChange,0.256924684);
});
test('refuse candidate from mismatched verification, never weaken 98% formula',()=>{
 assert.equal(buildV9PublicRecord({latest,verified:{...verified,display:{score:40}}}),null);
 assert.equal(buildV9PublicRecord({latest:{...latest,evaluation:{perDay:history.slice(-1)}},verified}),null);
});
test('publication decision protects stale writers and remote later observations',()=>{
 const r=record();assert.equal(publicationDecision(r,null),'PUBLISH');
 assert.equal(publicationDecision(r,r),'UNCHANGED');
 assert.equal(publicationDecision(r,{...r,asOfDate:'2026-10-20'}),'REMOTE_ASOF_NEWER');
 assert.equal(publicationDecision(r,{...r,observationDate:'2026-10-19',phase:'OBSERVED',trend:[...r.trend,{label:'2026-10-19',value:56}],score:56}),'REMOTE_OBSERVATION_NEWER');
 assert.equal(publicationDecision({...r,score:0},r),'INVALID_CANDIDATE');
});
test('D1 isolated write is CAS guarded and readback-verified with no change to current market key',async()=>{
 let row=null,writeCount=0;
 const db='00000000-0000-0000-0000-000000000000',r=record();
 const remote={
  async query(_db,sql,params){assert.equal(_db,db);assert.match(sql,/SELECT body,stored_at/);
   assert.deepEqual(params,[V9_PUBLIC_KEY]);return {results:row?[row]:[]}},
  async request(_db,batch){assert.equal(_db,db);assert.equal(batch.length,1);
   const q=batch[0];assert.match(q.sql,/ON CONFLICT/);
   assert.equal(q.params[0],V9_PUBLIC_KEY);assert.equal(q.params[3],V9_PUBLIC_KEY);
   assert.equal(q.params[4],V9_PUBLIC_KEY);
   assert.ok(!q.sql.includes("snapshot_key='current'"));
   row={body:q.params[1],stored_at:q.params[2]};writeCount++;return {results:[]}},
 };
 const x=await publishRecord({remote,db,record:r,now:1792455000000});
 assert.equal(x.status,'VERIFIED');assert.equal(writeCount,1);
 const y=await publishRecord({remote,db,record:r,now:1792455000001});
 assert.equal(y.status,'UNCHANGED');assert.equal(writeCount,1);
});
test('UI only shows arrows for V9 breadth and does not clear last valid score',()=>{
 const p=fs.readFileSync(new URL('../app/economic-indicators/economic-detail-panel.tsx',import.meta.url),'utf8');
 assert.match(p,/id==="breadth"&&domain\?\.methodologyVersion===/);
 assert.match(p,/v9Pending\?"집계 중":"자료 반영"/);
 assert.match(p,/v9Delta>0\?"▲":"▽"/);
});
test('visitor API reads public score output only and leaves original response if absent',()=>{
 const p=fs.readFileSync(new URL('../app/api/market-score/route.ts',import.meta.url),'utf8');
 assert.match(p,/SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key/);
 assert.match(p,/overlayV9PublicScore/);
 assert.doesNotMatch(p,/fetch\(/);
 assert.doesNotMatch(p,/\bINSERT\b|\bUPDATE\b|\bDELETE\b/);
});
