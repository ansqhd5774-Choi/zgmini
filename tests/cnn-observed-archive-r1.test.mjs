import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeCnnArchivedDay,groupVerifiedCnnObservations,CNN_OBSERVED_ARCHIVE_VERSION} from '../lib/cnn-observed-archive-r1.mjs';
import {sampleCnnObservedPoints} from '../lib/cnn-observed-sampling-r1.mjs';
import {publishCnnObservedArchive} from '../scripts/pc-writer/cnn-observed-archive-publication-r1.mjs';
import {refreshPublicFeeds} from '../worker/public-feed-refresh.mjs';

const point=(observedAt,score)=>({observedAt,score});
const verified=(observedAt,score,extra=[])=>({
 status:'verified',score,observedAt,history:[{timestamp:observedAt,score}],intradayObservations:extra,
});

test('archives only verified timestamps, deduplicates repeated polling, preserves real changes',()=>{
 const now=Date.parse('2026-10-31T20:00:00Z');
 const date='2026-10-31';
 const points=[point('2026-10-31T15:00:00Z',17.9),point('2026-10-31T15:15:00Z',18.5)];
 const one=mergeCnnArchivedDay(null,date,points,now);
 assert.equal(one.changed,true);
 assert.equal(one.body.version,CNN_OBSERVED_ARCHIVE_VERSION);
 const duplicate=mergeCnnArchivedDay(one.body,date,points,now);
 assert.equal(duplicate.changed,false);
 assert.equal(duplicate.body.observations.length,2);
 const revised=mergeCnnArchivedDay(duplicate.body,date,[point('2026-10-31T15:15:00Z',18.6)],now);
 assert.deepEqual(revised.body.observations.map(x=>x.score),[17.9,18.6]);
 assert.throws(()=>mergeCnnArchivedDay(null,date,[point('2026-10-31T16:00:00Z',101)],now),/INVALID/);
 assert.throws(()=>mergeCnnArchivedDay(null,date,[point('2026-11-01T16:00:00Z',30)],now),/INVALID/);
});

test('no synthetic quarter-hour points between CNN observations',()=>{
 const now=Date.parse('2026-10-31T22:00:00Z');
 const output=verified('2026-10-31T20:00:00Z',30,[point('2026-10-31T15:00:00Z',17.9)]);
 const byDate=groupVerifiedCnnObservations(output,now);
 const day=mergeCnnArchivedDay(null,'2026-10-31',byDate.get('2026-10-31'),now);
 assert.deepEqual(day.body.observations.map(x=>x.observedAt),['2026-10-31T15:00:00.000Z','2026-10-31T20:00:00.000Z']);
 assert.throws(()=>groupVerifiedCnnObservations({status:'unavailable',score:null}),/INVALID/);
});

test('one year later early dates are retained instead of expiring at day eight',()=>{
 const start=mergeCnnArchivedDay(null,'2026-10-31',[point('2026-10-31T15:00:00Z',17.9)],Date.parse('2026-10-31T20:00:00Z'));
 const after=mergeCnnArchivedDay(start.body,'2026-10-31',[],Date.parse('2027-11-01T20:00:00Z'));
 assert.equal(after.changed,false);
 assert.equal(after.body.observations[0].score,17.9);
});

test('1Y chart sampling stays within display limit while retaining actual minima/maxima',()=>{
 const start=Date.parse('2026-11-01T00:00:00Z');
 const rows=Array.from({length:365*96},(_,i)=>point(new Date(start+i*900000).toISOString(),50));
 rows[1200].score=1; rows[29000].score=100;
 const sample=sampleCnnObservedPoints(rows);
 assert.ok(sample.length<=1200);
 assert.equal(sample[0].observedAt,rows[0].observedAt);
 assert.equal(sample.at(-1).observedAt,rows.at(-1).observedAt);
 assert.ok(sample.some(x=>x.score===1));
 assert.ok(sample.some(x=>x.score===100));
 assert.equal(rows.length,35040);
});

test('publish only score archive daily rows with verified D1 readback',async()=>{
 const t=Date.parse('2026-10-31T20:00:00Z');
 const payload=JSON.stringify(mergeCnnArchivedDay(null,'2026-10-31',[point('2026-10-31T20:00:00Z',17.9)],t).body);
 const remoteRows=new Map();
 const local={prepare(){return {bind(){return this},async all(){return {results:[{snapshot_key:'2026-10-31',body:payload,stored_at:t}]}}}}};
 const remote={
  async query(db,sql,params){
   if(sql.includes('SELECT snapshot_key,stored_at'))return {results:[...remoteRows].map(([snapshot_key,row])=>({snapshot_key,stored_at:row.stored_at}))};
   return {results:remoteRows.has(params[1])?[remoteRows.get(params[1])]:[]};
  },
  async request(db,statements){
   const p=statements[0].params;
   remoteRows.set(p[1],{body:p[2],stored_at:p[3]});
  },
 };
 const first=await publishCnnObservedArchive(local,remote,'core');
 assert.deepEqual(first,{status:'VERIFIED',storedDays:1,publishedDays:1,deferredDays:0});
 const second=await publishCnnObservedArchive(local,remote,'core');
 assert.equal(second.publishedDays,0);
 assert.equal(remoteRows.get('2026-10-31').body,payload);
});

test('current source feed archives first, then advances the current snapshot; Korea untouched',async()=>{
 const events=[];
 const outputs=new Map();
 let now=Date.parse('2026-10-31T15:00:00Z'), score=17.9;
 const store={
  initialize:async()=>{},readOutput:async k=>outputs.get(k)??null,readAttempt:async()=>null,
  writeAttempt:async()=>{},
  appendVerifiedObservations:async()=>{events.push('archive')},
  writeOutput:async(k,body,t)=>{events.push('current');outputs.set(k,{body,storedAt:t})},
 };
 const locks={claim:async()=>1,finish:async()=>{}};
 const collectors={'fear-greed':async()=>Response.json(verified(new Date(now).toISOString(),score))};
 await refreshPublicFeeds({store,locks,collectors,now,maxFeedsPerRun:1});
 assert.deepEqual(events,['archive','current']);
 events.length=0;now+=15*60000;score=20;
 await refreshPublicFeeds({store,locks,collectors,now,maxFeedsPerRun:1});
 assert.deepEqual(events,['archive','current']);
 assert.equal(outputs.size,1);
});

test('integration keeps current output, 15-minute cadence and read-only visitor route',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 assert.match(read('worker/public-feed-store.mjs'),/appendVerifiedObservations/);
 assert.match(read('worker/public-feed-store.mjs'),/FEED_STORAGE_LIMIT/);
 assert.match(read('worker/public-feed-store.mjs'),/intervalMs:15\*60000/);
 assert.match(read('scripts/pc-writer/run-local.mjs'),/publishCnnObservedArchive/);
 assert.match(read('app/api/fear-greed/observations/route.ts'),/SELECT snapshot_key,body/);
 assert.doesNotMatch(read('app/api/fear-greed/observations/route.ts'),/fetch\(['"]https:\/\//);
 assert.match(read('app/fear-greed/usa/cnn-panel.tsx'),/\/api\/fear-greed\/observations\?period=/);
 assert.doesNotMatch(read('app/korea-composite-view.tsx'),/\/api\/fear-greed\/observations/);
});
