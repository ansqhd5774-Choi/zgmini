import test from 'node:test';
import assert from 'node:assert/strict';
import {publicFeedStore} from '../worker/public-feed-store.mjs';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {publishER1MonthlyVintages} from '../scripts/pc-writer/er1-monthly-vintage-publication.mjs';
import {FORECAST_METHOD} from '../lib/market-calendar-er1-forecast-score.mjs';

const key='market-calendar:earnings-er1-score-2026-11-public';
const stamp=day=>Date.parse(day+'T17:00:00Z');
const cohort=(asOf,score=97)=>({status:'READY_ER1_PUBLIC',method:FORECAST_METHOD,
 asOf,threshold:97,coverage:{inputSymbols:1,observedIssuers:1,scoreableIssuers:1,
 unscoreableReasons:{}},recordCount:1,star3Count:score>=97?1:0,
 scores:[{issuerId:'PIT',tickers:['PIT'],score}]});
const row=(asOf,score=97,snapshotKey=asOf)=>({feed_key:key,snapshot_key:snapshotKey,
 body:JSON.stringify(cohort(asOf,score)),stored_at:stamp(asOf)});

function fixtures(localRows,{remoteRows=[],failAfterWrite=false,failWithoutWrite=false}={}){
 const data=new Map(remoteRows.map(r=>[r.snapshot_key,r]));
 const local={prepare:()=>({bind:()=>({all:async()=>({results:localRows})})})};
 const remote={
  async query(_db,sql,params){
   if(sql.includes('snapshot_key=?')){
    const stored=data.get(params[1]);return {results:stored?[stored]:[]};
   }
   return {results:[...data.values()]};
  },
  async request(_db,statements){
   if(failWithoutWrite)throw Error('TRANSIENT_UNKNOWN');
   for(const {params} of statements){
    const [,snapshot_key,body,stored_at]=params;
    const previous=data.get(snapshot_key);
    if(!previous||previous.stored_at<stored_at)
     data.set(snapshot_key,{snapshot_key,body,stored_at});
   }
   if(failAfterWrite)throw Error('TRANSIENT_UNKNOWN');
  },
 };
 return {local,remote,data};
}

test('publicFeedStore keeps two NY observations on the same UTC calendar date',async()=>{
 const keys=[];
 const db={prepare:sql=>({bind:(...args)=>({sql,args,first:async()=>null})}),
  batch:async statements=>{keys.push(statements.map(s=>s.args[2]));}};
 const store=publicFeedStore(db);
 await store.writeOutput(key,cohort('2026-11-07'),Date.parse('2026-11-08T01:00:00Z'));
 await store.writeOutput(key,cohort('2026-11-08',85),Date.parse('2026-11-08T17:00:00Z'));
 assert.deepEqual(keys,[['2026-11-07','current'],['2026-11-08','current']]);
 await store.writeOutput('another-feature',{status:'OK'},Date.parse('2026-11-08T01:00:00Z'));
 assert.deepEqual(keys[2],['2026-11-08','current'],'other feeds retain UTC behavior');
});

test('ER1 atomically migrates a legacy UTC collision before writing the new NY day',async()=>{
 const old={body:JSON.stringify(cohort('2026-11-07')),
  stored_at:Date.parse('2026-11-08T01:00:00Z')};
 const batches=[];
 const db={prepare:sql=>({bind:(...args)=>({sql,args,
  first:async()=>args[1]==='2026-11-08'?old:null})}),
  batch:async statements=>{batches.push(statements.map(s=>s.args[2]));}};
 await publicFeedStore(db).writeOutput(key,cohort('2026-11-08',85),
  Date.parse('2026-11-08T17:00:00Z'));
 assert.deepEqual(batches,[['2026-11-07','2026-11-08','current']]);
});

test('consecutive legacy UTC collisions migrate oldest-first without losing any day',async()=>{
 const initial=[['2026-11-06','2026-11-05'],['2026-11-07','2026-11-06'],
  ['2026-11-08','2026-11-07']];
 const saved=new Map(initial.map(([utc,ny])=>[
  utc,{body:JSON.stringify(cohort(ny)),stored_at:Date.parse(utc+'T01:00:00Z')}
 ]));
 const db={prepare:sql=>({bind:(...args)=>({sql,args,
  first:async()=>saved.get(args[1])??null})}),
  batch:async statements=>{
   for(const statement of statements){
    const [, ,snapshot,body,stored_at]=statement.args;
    if(!saved.has(snapshot)||saved.get(snapshot).stored_at<=stored_at)
     saved.set(snapshot,{body,stored_at});
   }
  }};
 await publicFeedStore(db).writeOutput(key,cohort('2026-11-08',85),
  Date.parse('2026-11-08T17:00:00Z'));
 for(const day of ['2026-11-05','2026-11-06','2026-11-07'])
  assert.equal(JSON.parse(saved.get(day).body).asOf,day,`${day} PIT preserved`);
 assert.equal(JSON.parse(saved.get('2026-11-08').body).asOf,'2026-11-08');
 assert.equal(JSON.parse(saved.get('current').body).asOf,'2026-11-08');
});

test('actual PC SQLite batch retains a three-day legacy collision chain',async()=>{
 const sqlite=localDatabase(':memory:');
 try{
  const store=publicFeedStore(sqlite);await store.initialize();
  for(const [utc,ny] of [['2026-11-06','2026-11-05'],
   ['2026-11-07','2026-11-06'],['2026-11-08','2026-11-07']]){
   await sqlite.prepare("INSERT INTO public_feed_snapshots_v1 VALUES('output',?,?,?,?)")
    .bind(key,utc,JSON.stringify(cohort(ny)),Date.parse(utc+'T01:00:00Z')).run();
  }
  await store.writeOutput(key,cohort('2026-11-08',85),
   Date.parse('2026-11-08T17:00:00Z'));
  const rows=(await sqlite.prepare("SELECT snapshot_key,body FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? ORDER BY snapshot_key")
   .bind(key).all()).results;
  assert.deepEqual(rows.map(r=>[r.snapshot_key,JSON.parse(r.body).asOf]),[
   ['2026-11-05','2026-11-05'],['2026-11-06','2026-11-06'],
   ['2026-11-07','2026-11-07'],['2026-11-08','2026-11-08'],
   ['current','2026-11-08']]);
 }finally{sqlite.close();}
});

test('public reader uses bounded stored-only dated rows with a fixed feed key',async()=>{
 const reads=[];
 const db={prepare:sql=>({bind:(...params)=>{
  reads.push({sql,params});
  return {all:async()=>({results:[{snapshot_key:'2026-11-01',
   body:JSON.stringify(cohort('2026-11-01')),stored_at:stamp('2026-11-01')}]})};
 }})};
 const store=publicFeedStore(db);
 const versions=await store.readOutputVintages(key,{days:['2026-11-05','2026-11-16'],limit:15});
 assert.equal(versions.length,1);
 assert.equal(versions[0].body.asOf,'2026-11-01');
 assert.deepEqual(reads[0].params,['2026-11-05','2026-11-16',key,key,key,15]);
 assert.match(reads[0].sql,/vintage_keys/);
 await assert.rejects(store.readOutputVintages(key,{limit:81}),/FEED_VINTAGE_LIMIT_INVALID/);
 await assert.rejects(store.readOutputVintages(key,{days:['2026-02-30']}),
  /FEED_VINTAGE_DAYS_INVALID/);
});

test('ER1 only publishes dated derived scores then verifies their exact D1 readbacks',async()=>{
 const f=fixtures([row('2026-11-01'),row('2026-11-08',85)]);
 const report=await publishER1MonthlyVintages(f.local,f.remote,'core',key);
 assert.deepEqual(report,{status:'VERIFIED',storedDays:2,publishedDays:2,deferredDays:0});
 assert.equal(f.data.get('2026-11-01').body,JSON.stringify(cohort('2026-11-01')));
 assert.equal(f.data.get('2026-11-08').body,JSON.stringify(cohort('2026-11-08',85)));
});

test('legacy UTC-date local archive migrates under its NY asOf without relabeling',async()=>{
 const f=fixtures([row('2026-11-07',97,'2026-11-08')]);
 const result=await publishER1MonthlyVintages(f.local,f.remote,'core',key);
 assert.equal(result.status,'VERIFIED');
 assert.equal(f.data.get('2026-11-07').snapshot_key,'2026-11-07');
 assert.equal(f.data.has('2026-11-08'),false);
});

test('unknown D1 write outcome is resolved by readback, with no blind retry',async()=>{
 const successful=fixtures([row('2026-11-01')],{failAfterWrite:true});
 assert.equal((await publishER1MonthlyVintages(successful.local,successful.remote,'core',key)).status,'VERIFIED');
 const failed=fixtures([row('2026-11-01')],{failWithoutWrite:true});
 await assert.rejects(publishER1MonthlyVintages(failed.local,failed.remote,'core',key),
  /TRANSIENT_UNKNOWN/);
 assert.equal(failed.data.size,0);
});

test('a backlog cannot be marked verified before all archived days are published',async()=>{
 const f=fixtures([row('2026-11-01'),row('2026-11-08',85)]);
 assert.deepEqual(await publishER1MonthlyVintages(f.local,f.remote,'core',key,{maxDaysPerRun:1}),
  {status:'BACKLOG',storedDays:2,publishedDays:1,deferredDays:1});
});

test('monthly current must have an exact local dated archive before replacement',async()=>{
 const f=fixtures([row('2026-11-01')]);
 const newCurrent={...row('2026-11-08',85),snapshot_key:'current'};
 await assert.rejects(publishER1MonthlyVintages(f.local,f.remote,'core',key,
  {current:newCurrent}),/ER1_VINTAGE_CURRENT_UNARCHIVED/);
 assert.equal(f.data.size,0,'no D1 writing precedes this safety check');
 const matched={...row('2026-11-01'),snapshot_key:'current'};
 assert.equal((await publishER1MonthlyVintages(f.local,f.remote,'core',key,
  {current:matched})).status,'VERIFIED');
});

test('newer D1 dates are preserved and equal-timestamp conflicting bodies fail closed',async()=>{
 const old=row('2026-11-01');
 const newer={...old,body:JSON.stringify(cohort('2026-11-01',85)),stored_at:old.stored_at+100};
 const f=fixtures([old],{remoteRows:[newer]});
 assert.equal((await publishER1MonthlyVintages(f.local,f.remote,'core',key)).publishedDays,0);
 assert.equal(f.data.get('2026-11-01').body,newer.body);
 const conflict=fixtures([old],{remoteRows:[{...newer,stored_at:old.stored_at}]});
 await assert.rejects(publishER1MonthlyVintages(conflict.local,conflict.remote,'core',key),
  /ER1_VINTAGE_REMOTE_CONFLICT/);
});

test('invalid raw fields and unrelated feed keys are refused before publication',async()=>{
 const invalid={...row('2026-11-01'),body:JSON.stringify({...cohort('2026-11-01'),rawEps:7})};
 const f=fixtures([invalid]);
 await assert.rejects(publishER1MonthlyVintages(f.local,f.remote,'core',key),
  /ER1_VINTAGE_LOCAL_INVALID/);
 await assert.rejects(publishER1MonthlyVintages(f.local,f.remote,'core','market-data'),
  /ER1_VINTAGE_CONFIG_INVALID/);
});
