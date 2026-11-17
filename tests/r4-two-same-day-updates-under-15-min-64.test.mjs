import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {DOMAIN_WEIGHTS,buildCompositeMarketScore} from '../lib/market-score/composite-model-r1.mjs';
import {
 COMPOSITE_OBSERVED_INTERVAL_MS,COMPOSITE_OBSERVED_PREFIX,
 mergeCompositeObservedDay,compositeSampleFromVerified,
} from '../lib/composite-observed-history-r1.mjs';
import {
 appendCompositeObservedFromCurrent,publishCompositeObservedArchive,
} from '../scripts/pc-writer/composite-observed-archive-r1.mjs';

// W06 R4 #64 — Characterization, NOT approval to change sampling:
// Current main intentionally suppresses intermediate changed scores for 15m.
// Demonstrate with actual calculator + actual PC local writer + D1 publisher.
// Pending owner Draft PR #1185 alters this contract; do not merge it here.
const DATE='2026-11-16';
const clock=s=>Date.parse(DATE+'T'+s+'Z');
const domains=(rates=50,credit=50)=>DOMAIN_WEIGHTS.map(s=>({
 id:s.id,status:'READY',score:s.id==='rates'?rates:s.id==='credit'?credit:50,
 asOfDate:DATE,methodologyVersion:s.id==='rates'?'RATE_R3':null,
 trend:[{label:DATE,value:s.id==='rates'?rates:s.id==='credit'?credit:50}],
}));
const current=(rates=50,credit=50)=>({
 status:'SUCCESS',asOfDate:DATE,
 ...buildCompositeMarketScore(domains(rates,credit),{updatedAt:DATE+'T00:00:00Z'}),
});
const archiveKey=COMPOSITE_OBSERVED_PREFIX+DATE;
const retrieve=async(db,key)=>db.prepare(
 'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',
).bind(key).first();
const writeCurrent=async(db,body,at)=>db.prepare(
 'INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at',
).bind('current',JSON.stringify(body),at).run();
const fixture=async t=>{
 const dir=mkdtempSync(join(tmpdir(),'zgmini-r4-64-snapshot-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const db=localDatabase(join(dir,'core.sqlite'));t.after(()=>db.close());
 await db.prepare('CREATE TABLE market_public_snapshots_v1(snapshot_key TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL)').run();
 return db;
};
const store=async(db,at,rates,credit)=>{
 const value=current(rates,credit);
 await writeCurrent(db,value,at);
 const result=await appendCompositeObservedFromCurrent(db,at);
 return {value,result};
};

test('R4 #64 uses approved 12-domain CM-R1 and existing 15-minute observed sampling, no new calculator',()=>{
 assert.equal(DOMAIN_WEIGHTS.length,12);
 assert.equal(DOMAIN_WEIGHTS.reduce((a,x)=>a+x.weight,0),100);
 assert.equal(COMPOSITE_OBSERVED_INTERVAL_MS,900000);
 assert.equal(current().overall.score,50);
 assert.equal(current(70).overall.score,52);
 assert.equal(current(70,60).overall.score,53);
});

test('FIRST FAIL reproduction: two different domains updated at +5m and +10m are stored as CURRENT but not as archived events',async t=>{
 const db=await fixture(t);
 const first=await store(db,clock('12:00:00'),50,50);
 const second=await store(db,clock('12:05:00'),70,50);
 const third=await store(db,clock('12:10:00'),70,60);
 assert.equal(first.result.status,'LOCAL_STORED');
 assert.equal(second.result.status,'UNCHANGED'); // known unresolved event loss, not success criterion
 assert.equal(third.result.status,'UNCHANGED');  // known unresolved event loss, not success criterion
 assert.equal(first.value.overall.score,50);
 assert.equal(second.value.overall.score,52);
 assert.equal(third.value.overall.score,53);
 const latest=await retrieve(db,'current');
 const saved=await retrieve(db,archiveKey);
 assert.equal(latest.stored_at,clock('12:10:00'));
 assert.equal(JSON.parse(latest.body).overall.score,53);
 const points=JSON.parse(saved.body).points;
 assert.deepEqual(points.map(p=>p.score),[50]);
 assert.deepEqual(points.map(p=>p.calculatedAt),[new Date(clock('12:00:00')).toISOString()]);
 // An observing GET cannot invent +5/+10 minutes from the remaining archive.
 assert.equal(points.some(p=>p.score===52||p.score===53),false);
});

test('real merge distinguishes genuine changes by signature yet interval rejects them, proving the exact owner policy conflict',()=>{
 const base=compositeSampleFromVerified(current(),clock('12:00:00'));
 const changedRate=compositeSampleFromVerified(current(70),clock('12:05:00'));
 const changedCredit=compositeSampleFromVerified(current(70,60),clock('12:10:00'));
 assert.equal(new Set([base.signature,changedRate.signature,changedCredit.signature]).size,3);
 let output=mergeCompositeObservedDay(null,DATE,base);
 assert.equal(output.changed,true);
 const second=mergeCompositeObservedDay(output.body,DATE,changedRate);
 const third=mergeCompositeObservedDay(output.body,DATE,changedCredit);
 assert.equal(second.changed,false);
 assert.equal(third.changed,false);
 assert.deepEqual(second.body.points,output.body.points);
 assert.equal(mergeCompositeObservedDay(output.body,DATE,
  compositeSampleFromVerified(current(70,60),clock('12:15:00'))).changed,true);
});

test('real local append accepts first new changed score at minute 15 but has no automatic recovery of minute 5 or 10',async t=>{
 const db=await fixture(t);
 await store(db,clock('12:00:00'),50,50);
 await store(db,clock('12:05:00'),70,50);
 await store(db,clock('12:10:00'),70,60);
 const fourth=await store(db,clock('12:15:00'),80,60);
 assert.equal(fourth.value.overall.score,54);
 assert.equal(fourth.result.status,'LOCAL_STORED');
 assert.equal(fourth.result.points,2);
 const points=JSON.parse((await retrieve(db,archiveKey)).body).points;
 assert.deepEqual(points.map(x=>x.score),[50,54]);
 assert.deepEqual(points.map(x=>x.calculatedAt),[
  new Date(clock('12:00:00')).toISOString(),new Date(clock('12:15:00')).toISOString(),
 ]);
 assert.equal(JSON.parse((await retrieve(db,'current')).body).overall.score,54);
});

test('actual D1 publisher verifies archival row as-is, including missing intermediate events; no fake history added',async t=>{
 const db=await fixture(t);
 await store(db,clock('12:00:00'),50,50);
 await store(db,clock('12:05:00'),70,50);
 await store(db,clock('12:10:00'),70,60);
 const localArchive=await retrieve(db,archiveKey);
 const latest=await retrieve(db,'current');
 const remoteSnapshot=new Map();
 const remote={
  async query(_,sql,params=[]){
   if(sql.includes("WHERE snapshot_key='current'"))return {results:[{stored_at:latest.stored_at}]};
   if(sql.includes('SELECT snapshot_key,stored_at'))return {results:[...remoteSnapshot].map(([snapshot_key,row])=>({snapshot_key,stored_at:row.stored_at}))};
   return {results:remoteSnapshot.has(params[0])?[remoteSnapshot.get(params[0])]:[]};
  },
  async request(_,queries){
   assert.equal(queries.length,1);
   const [key,body,stored_at]=queries[0].params;
   remoteSnapshot.set(key,{body,stored_at});
  },
 };
 const out=await publishCompositeObservedArchive(db,remote,'core');
 assert.equal(out.status,'VERIFIED');
 assert.equal(out.publishedDays,1);
 const stored=remoteSnapshot.get(archiveKey);
 assert.equal(stored.body,localArchive.body);
 assert.equal(stored.stored_at,localArchive.stored_at);
 assert.deepEqual(JSON.parse(stored.body).points.map(x=>x.score),[50]);
 // This assertion documents the unresolved defect; no claim that #64 DONE.
 assert.notDeepEqual(JSON.parse(stored.body).points.map(x=>x.score),[50,52,53]);
});

test('read-only route may return all saved events but cannot recover a 15-minute-suppressed event',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const route=read('app/api/market-score/observations/route.ts');
 const producer=read('scripts/pc-writer/composite-observed-archive-r1.mjs');
 const policy=read('lib/composite-observed-history-r1.mjs');
 assert.match(route,/COMPOSITE_OBSERVED_PREFIX/);
 assert.match(route,/market_public_snapshots_v1/);
 assert.doesNotMatch(route,/INSERT INTO|UPDATE market_public_snapshots_v1|DELETE FROM market_public_snapshots_v1/);
 assert.match(producer,/appendCompositeObservedFromCurrent/);
 assert.match(producer,/publishCompositeObservedArchive/);
 assert.match(policy,/time-Date.parse\(prior.calculatedAt\)<COMPOSITE_OBSERVED_INTERVAL_MS/);
});
