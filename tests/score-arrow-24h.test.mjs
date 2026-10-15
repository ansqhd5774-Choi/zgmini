import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import {nextArrowState,arrowVisible,startArrowClock,SCORE_ARROW_TTL_MS as DAY} from '../lib/market-score/score-arrow.mjs';
import {publishArrowState,publishCoreArrowState,ARROW_KEYS} from '../scripts/pc-writer/score-arrow-publication.mjs';
import {storedScoreArrowResponse} from '../worker/score-arrow-public.mjs';
const T=Date.parse('2026-10-15T03:00:00Z');
const sample=(score,sourceAt=T,method='R1')=>({score,sourceAt,method});
test('first observation has no fabricated change time; a real move expires exactly 24h later',()=>{
 const first=nextArrowState(null,{rate:sample(60)},T);
 assert.equal(first.entries.rate.changedAt,null);assert.equal(arrowVisible(first.entries.rate,60,T),false);
 const next=nextArrowState(first,{rate:sample(60.4,T+1000)},T+2000),entry=next.entries.rate;
 assert.equal(entry.changedAt,T+1000);
 assert.equal(arrowVisible(entry,60.4,T+1000),true);
 assert.equal(arrowVisible(entry,60.4,T+1000+DAY-1),true);
 assert.equal(arrowVisible(entry,60.4,T+1000+DAY),false);
 assert.equal(arrowVisible(entry,60.4,T+999),false);
 assert.equal(arrowVisible(entry,60.3,T+2000),false);
});
test('same score, refresh, serialization, delayed publication and older samples never renew the clock',()=>{
 let state=nextArrowState(null,{iran:sample(46.2)},T);
 state=nextArrowState(state,{iran:sample(46.6,T+100)},T+100);
 state=JSON.parse(JSON.stringify(state));
 state=nextArrowState(state,{iran:sample(46.6,T+DAY)},T+DAY);
 assert.equal(state.entries.iran.changedAt,T+100);
 assert.equal(arrowVisible(state.entries.iran,46.6,T+DAY+100),false);
 const ignored=nextArrowState(state,{iran:sample(10,T+50)},T+DAY+100);
 assert.deepEqual(ignored.entries,state.entries);
 const later=nextArrowState(state,{iran:sample(46.2,T+DAY+1000)},T+DAY+2000);
 assert.equal(later.entries.iran.changedAt,T+DAY+1000);
});
test('zero remains valid; missing/future input and methodology changes do not create market alerts',()=>{
 let state=nextArrowState(null,{rate:sample(1)},T);
 state=nextArrowState(state,{rate:sample(0,T+1)},T+1);
 assert.equal(arrowVisible(state.entries.rate,0,T+2),true);
 for(const bad of [sample(null,T+2),sample(NaN,T+2),sample(50,T+100),sample(101,T+2)])assert.deepEqual(nextArrowState(state,{rate:bad},T+2).entries,state.entries);
 const changed=nextArrowState(state,{rate:sample(40,T+3,'R2')},T+3);
 assert.equal(changed.entries.rate.changedAt,null);
 assert.equal(arrowVisible(changed.entries.rate,40,T+4),false);
});
test('expiry clock runs without fetching data and checks again after suspended tab focus',()=>{
 let now=T+10,callback,delay,display;const events=new EventTarget();
 const entries={a:{value:1,changedAt:T},b:{value:2,changedAt:T+5}};
 const stop=startArrowClock(entries,t=>{display=t},{now:()=>now,setTimer:(fn,ms)=>{callback=fn;delay=ms;return 1;},clearTimer:()=>{},target:events});
 assert.equal(delay,DAY-10);assert.equal(arrowVisible(entries.a,1,display),true);
 now=T+DAY;callback();assert.equal(arrowVisible(entries.a,1,display),false);assert.equal(delay,5);
 now=T+DAY+1000;events.dispatchEvent(new Event('focus'));assert.equal(arrowVisible(entries.b,2,display),false);stop();
});
function storage(){
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE market_public_snapshots_v1(snapshot_key TEXT PRIMARY KEY,body TEXT,stored_at INTEGER);CREATE TABLE public_feed_snapshots_v1(kind TEXT,feed_key TEXT,snapshot_key TEXT,body TEXT,stored_at INTEGER);');
 const remote={query:async(_db,sql,params=[])=>({results:db.prepare(sql).all(...params)}),request:async(_db,statements)=>{for(const s of statements)db.prepare(s.sql).run(...s.params);}};
 return {db,remote};
}
test('real SQLite publication/readback and read-only API keep Core/Iran partitions independent',async()=>{
 const {db,remote}=storage();
 try{
  await publishArrowState(remote,'db','core',{rate:sample(60)},T);
  await publishArrowState(remote,'db','iran',{iran:sample(46.2)},T);
  await publishArrowState(remote,'db','iran',{iran:sample(46.6,T+1)},T+1);
  await publishArrowState(remote,'db','core',{rate:sample(61,T+2)},T+2);
  const api=await storedScoreArrowResponse(new Request('https://example.test'),{db:{prepare:sql=>({all:async()=>({results:db.prepare(sql).all()})})}});
  const body=await api.json();assert.equal(api.headers.get('cache-control'),'no-store');
  assert.equal(body.entries.iran.changedAt,T+1);assert.equal(body.entries.rate.changedAt,T+2);
  await publishArrowState(remote,'db','iran',{iran:sample(46.6,T+100)},T+100);
  assert.equal(JSON.parse(db.prepare('SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?').get(ARROW_KEYS.iran).body).entries.iran.changedAt,T+1);
 }finally{db.close();}
});
test('Core metadata uses confirmed public outputs, not unpublished local calculations',async()=>{
 const {db,remote}=storage();
 const put=(key,body)=>db.prepare('INSERT INTO market_public_snapshots_v1 VALUES(?,?,?)').run(key,JSON.stringify(body),T);
 put('current',{overall:{status:'READY',score:51},domains:[{id:'prices',status:'READY',score:64},{id:'rates',status:'UNAVAILABLE',score:16}]});
 put('public:rate-sentiment:v1',{status:'READY',score:60.8,version:'R1'});
 put('public:korea-fear-greed:v1',{payload:{composite:{status:'READY',displayScore:33.4,methodologyVersion:'REV7'}}});
 db.prepare('INSERT INTO public_feed_snapshots_v1 VALUES(?,?,?,?,?)').run('output','fear-greed','current',JSON.stringify({status:'verified',score:32.4}),T);
 try{
  await publishCoreArrowState(remote,'db',T);
  const {entries}=JSON.parse(db.prepare('SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?').get(ARROW_KEYS.core).body);
  assert.deepEqual(Object.keys(entries).sort(),['composite','domain:prices','korea','rate','usa']);
  assert.equal(entries.composite.value,53.5);assert.equal(entries.composite.changedAt,null);
  db.prepare('UPDATE market_public_snapshots_v1 SET body=?,stored_at=? WHERE snapshot_key=?').run(JSON.stringify({overall:{status:'READY',score:51.2}}),T+1,'current');
  await publishCoreArrowState(remote,'db',T+1);
  const changed=JSON.parse(db.prepare('SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?').get(ARROW_KEYS.core).body).entries.composite;
  assert.equal(changed.value,54.2);assert.equal(changed.changedAt,T+1);
  assert.equal(arrowVisible(changed,54.2,T+DAY+1),false);
  assert.equal(entries.korea.value,33.4);assert.equal(entries.usa.value,32.4);
 }finally{db.close();}
});
test('failed public state read hides alerts without querying any provider',async()=>{
 const response=await storedScoreArrowResponse(new Request('https://example.test'),{db:{prepare(){throw Error('offline');}}});
 assert.equal(response.status,503);assert.deepEqual((await response.json()).entries,{});
});
test('public arrow API rejects writes before opening the database',async()=>{
 const response=await storedScoreArrowResponse(new Request('https://example.test',{method:'POST'}),{db:{prepare(){throw Error('must not open');}}});
 assert.equal(response.status,405);assert.equal(response.headers.get('allow'),'GET');
});
test('publication never reports success without exact readback',async()=>{
 const remote={query:async()=>({results:[]}),request:async()=>{}};
 await assert.rejects(publishArrowState(remote,'db','core',{rate:sample(60)},T),/ARROW_PUBLICATION_READBACK_FAILED/);
});
