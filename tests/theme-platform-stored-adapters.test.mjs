import test from 'node:test';
import assert from 'node:assert/strict';
import {planOperationalBatch,runOperationalPrivateBatch} from '../scripts/pc-writer/theme-platform-operational.mjs';
import {createStoredOperationalAdapters} from '../scripts/pc-writer/theme-platform-stored-adapters.mjs';

const fixtureDate='2026-10-28';
const history=Array.from({length:252},(_,i)=>({date:new Date(Date.UTC(2025,0,1)+i*86400000).toISOString().slice(0,10),score:50}));
history[251].date=fixtureDate;
const artifactSha256='e'.repeat(64);
const memory=()=>{let state;return {load:async()=>structuredClone(state),
 save:async(_,next,prior)=>{assert.equal(prior,state?.revision??0);state=structuredClone(next);}};};
const forRows=themes=>({artifactSha256,rows:themes.map(t=>({label:t.label,etfs:t.etfs,
 methodologyVersion:t.methodologyVersion,observationDate:fixtureDate,score:50,history,
 sourceVersion:'SAVED_GMH_SHA_VERIFIED'}))});

test('one R47 group calculation serves eight public themes, optional calculators once each',async()=>{
 const registry=planOperationalBatch().registry,counts={r37:0,dc:0,space:0};
 const a=createStoredOperationalAdapters({dataRoot:'fixture',calculators:{
  r37:()=>{counts.r37++;return forRows(registry.themes.slice(0,8));},
  'data-center':()=>{counts.dc++;return forRows([registry.themes[8]]);},
  space:()=>{counts.space++;return forRows([registry.themes[9]]);},
 }});
 const result=await runOperationalPrivateBatch({adapters:a,store:memory(),runKey:'stored-confirmed'});
 assert.equal(result.status,'PARTIAL');
 assert.deepEqual(counts,{r37:1,dc:1,space:1});
 assert.equal(result.results.filter(r=>r.kind==='confirmed'&&r.status==='COMPLETE').length,10);
 assert.equal(result.results.filter(r=>r.kind==='provisional'&&r.code==='THEME_STORED_PROVISIONAL_PUBLIC_BASE_REQUIRED').length,10);
});

test('one wrong saved projection is isolated; never claimed VERIFIED',async()=>{
 const registry=planOperationalBatch().registry;
 const calculators={
  r37:()=>{const rows=forRows(registry.themes.slice(0,8));rows.rows[0].methodologyVersion='WRONG';return rows;},
  'data-center':()=>forRows([registry.themes[8]]),
  space:()=>forRows([registry.themes[9]]),
 };
 const a=createStoredOperationalAdapters({dataRoot:'fixture',calculators});
 const result=await runOperationalPrivateBatch({adapters:a,store:memory(),runKey:'saved-mismatch'});
 assert.equal(result.results[0].code,'THEME_STORED_PROJECTION_MISMATCH');
 assert.equal(result.results.filter(r=>r.kind==='confirmed'&&r.status==='COMPLETE').length,9);
});

test('shared R47 source failure executes once; independent DC and space continue',async()=>{
 const registry=planOperationalBatch().registry;let r47=0;
 const a=createStoredOperationalAdapters({dataRoot:'fixture',calculators:{
  r37:()=>{r47++;throw Object.assign(Error(),{code:'SHA_MISMATCH'});},
  'data-center':()=>forRows([registry.themes[8]]),
  space:()=>forRows([registry.themes[9]]),
 }});
 const result=await runOperationalPrivateBatch({adapters:a,store:memory(),runKey:'shared-failed'});
 assert.equal(r47,1);
 assert.equal(result.results.filter(r=>r.kind==='confirmed'&&r.code==='SHA_MISMATCH').length,8);
 assert.equal(result.results.filter(r=>r.kind==='confirmed'&&r.status==='COMPLETE').length,2);
});

test('R47 group receives the supplied observation time and never replays for provisional',async()=>{
 const registry=planOperationalBatch().registry;
 const now=new Date('2026-10-29T22:00:00Z');
 const counts={r37:0,provisional:0};
 const adapters=createStoredOperationalAdapters({dataRoot:'fixture',now,calculators:{
  r37:args=>{counts.r37++;assert.equal(args.now,now);
   return forRows(registry.themes.slice(0,8));},
  'data-center':()=>forRows([registry.themes[8]]),
  space:()=>forRows([registry.themes[9]])},
  provisionalCalculator:({confirmedResult,now:received})=>{
   counts.provisional++;
   assert.equal(received,now);
   assert.equal(confirmedResult.artifactSha256,artifactSha256);
   return {artifactSha256,rows:confirmedResult.rows.map(row=>({label:row.label,etfs:row.etfs,
    methodologyVersion:row.methodologyVersion,observationDate:'2026-10-29',
    score:50,confirmedObservationDate:fixtureDate,
    points:[{date:'2026-10-29',score:50}]}))};
  }});
 const result=await runOperationalPrivateBatch({adapters,store:memory(),runKey:'provided-time'});
 assert.equal(result.status,'COMPLETE');
 assert.equal(counts.r37,1);
 assert.equal(result.results.filter(r=>r.kind==='provisional'&&r.status==='COMPLETE').length,10);
 assert.equal(counts.provisional,3);
});
