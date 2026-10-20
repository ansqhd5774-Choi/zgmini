import test from 'node:test';import assert from 'node:assert/strict';
import {prepareStagflation,publishStagflation} from '../scripts/pc-writer/stagflation-publication.mjs';
import {STAGFLATION_S21_SERIES} from '../lib/diagnostic-layer/stagflation-s21.mjs';
import {STAGFLATION_PUBLIC_KEY} from '../worker/stagflation-public.mjs';
import {DatabaseSync} from 'node:sqlite';
const now=Date.parse('2026-10-21T00:00:00Z');
const source=()=>({series:Object.fromEntries(STAGFLATION_S21_SERIES.map(id=>[id,Array.from({length:147},(_,i)=>({observationDate:new Date(Date.UTC(2014,5+i,1)).toISOString().slice(0,10),value:id==='EXPINF5YR'?2.5:100*1.03**(i/12)}))]))});
const core=body=>({prepare(sql){assert.match(sql,/^SELECT /);return {async first(){return body}}}});
async function prepared(){return prepareStagflation(core({body:JSON.stringify(source()),stored_at:now-1000}),{enabled:true,now});}
test('disabled by default: no database access or publication',async()=>{
 assert.equal((await prepareStagflation({prepare(){throw Error('must not read')}})).status,'DISABLED');
 assert.equal((await publishStagflation({request(){throw Error('must not write')}},'db',{})).status,'SKIPPED_NOT_READY');
});
test('prepares only fresh complete stored inputs, without raw arrays',async()=>{
 const p=await prepared();assert.equal(p.prepared,true);assert.equal(p.body.history.length,13);assert.equal(p.body.history[0].raw,undefined);
 for(const row of [null,{body:'broken',stored_at:now-1000},{body:JSON.stringify(source()),stored_at:0}])assert.equal((await prepareStagflation(core(row),{enabled:true,now})).prepared,false);
 const s=source();s.series.PCEPI.pop(); // no common final month, preceding 13 months lack required warmup
 assert.equal((await prepareStagflation(core({body:JSON.stringify(s),stored_at:now-1000}),{enabled:true,now})).prepared,false);
});
test('writes only separate key, verifies readback, preserves newer publication',async()=>{
 const p=await prepared();let row=null,writes=0;
 const remote={async query(db,sql,params){assert.deepEqual(params,[STAGFLATION_PUBLIC_KEY]);return {results:row?[row]:[]}},async request(db,plan){writes++;assert.equal(plan.length,1);const params=plan[0].params;assert.equal(params[0],STAGFLATION_PUBLIC_KEY);row={body:params[1],stored_at:params[2]};}};
 assert.equal((await publishStagflation(remote,'db',p)).status,'VERIFIED');assert.equal(writes,1);
 assert.equal((await publishStagflation(remote,'db',p)).status,'UNCHANGED');assert.equal(writes,1);
 row.stored_at=p.storedAt+1;assert.equal((await publishStagflation(remote,'db',p)).status,'REMOTE_NEWER_PRESERVED');assert.equal(writes,1);
});
test('submission timeout reads back once and never retries write',async()=>{
 const p=await prepared();let row=null,writes=0,reads=0;
 const remote={async query(){reads++;return {results:row?[row]:[]}},async request(){writes++;row={body:JSON.stringify(p.body),stored_at:p.storedAt};throw Error('timeout')}};
 assert.equal((await publishStagflation(remote,'db',p)).status,'VERIFIED');assert.equal(writes,1);assert.equal(reads,2);
 row=null;remote.request=async()=>{writes++;throw Error('timeout')};
 await assert.rejects(publishStagflation(remote,'db',p),/OUTCOME_UNKNOWN/);assert.equal(writes,2);
});

test('SQL compare-and-swap preserves a concurrent newer record',async()=>{
 const p=await prepared(),store=new DatabaseSync(':memory:');
 try{
  store.exec('CREATE TABLE market_public_snapshots_v1(snapshot_key TEXT PRIMARY KEY,body TEXT,stored_at INTEGER)');
  store.prepare('INSERT INTO market_public_snapshots_v1 VALUES(?,?,?)').run(STAGFLATION_PUBLIC_KEY,'old',p.storedAt-1);
  const remote={async query(db,sql,params){return {results:store.prepare(sql).all(...params)}},async request(db,plan){
   store.prepare('UPDATE market_public_snapshots_v1 SET body=?,stored_at=?').run('concurrent-newer',p.storedAt+1);
   for(const item of plan)store.prepare(item.sql).run(...item.params);
  }};
  await assert.rejects(publishStagflation(remote,'db',p),/READBACK_MISMATCH/);
  assert.equal(store.prepare('SELECT body FROM market_public_snapshots_v1').get().body,'concurrent-newer');
 }finally{store.close();}
});
