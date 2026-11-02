import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {r42VerifiedRows,r42Preflight,r42StoreOnce}
 from '../scripts/iran-progress/news-metadata-d1-once-r42.mjs';

const now=Date.parse('2026-10-29T01:30:00.000Z');

function fixture({existingR1=true,failSecondWrite=false}={}){
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE market_public_snapshots_v1 (snapshot_key TEXT PRIMARY KEY, body TEXT,stored_at INTEGER)');
 if(existingR1)db.prepare('INSERT INTO market_public_snapshots_v1 VALUES(?,?,?)').run(
  'public:iran-progress:news:iran:r1','{"version":"IRAN_NEWS_DISPLAY_R1","items":[]}',12345);
 const writes=[];
 const identity=()=>db.prepare('SELECT * FROM market_public_snapshots_v1').all();
 const remote={
  async query(_id,sql,params=[]){return {results:db.prepare(sql).all(...params)}},
  async request(_id,statements){
   for(const stmt of statements){writes.push(stmt.sql);
    if(failSecondWrite&&writes.length===2)throw Error('D1_OUTCOME_UNKNOWN');
    db.exec(stmt.sql);}
   return statements.map(()=>({success:true}));
  },
  adapter(){return {
   prepare(sql){const stmt=db.prepare(sql);return {bind(...params){return {
    run:async()=>stmt.run(...params),all:async()=>({results:stmt.all(...params)})};}}},
   async batch(statements){db.exec('BEGIN IMMEDIATE');try{
    for(const statement of statements)await statement.run();
    db.exec('COMMIT');return [];
   }catch(error){db.exec('ROLLBACK');throw error}}
  }},
 };
 return {db,remote,writes,identity,close(){db.close()}};
}

test('R42 preflight is read-only, identifies 39 verified news rows and seven sources',async()=>{
 const x=fixture();try{
  const r=await r42Preflight({remote:x.remote,db:'core',now});
  assert.equal(r.status,'PREFLIGHT_READ_ONLY');
  assert.equal(r.rows,39);assert.equal(r.displayRows,35);assert.equal(r.sources,7);
  assert.equal(x.writes.length,0);
  assert.equal(x.db.prepare("SELECT COUNT(*) as n FROM sqlite_master WHERE name='iran_news_article_metadata_r41'").get().n,0);
 }finally{x.close()}
});

test('R42 writes 39 rows once, reads back all rows and never alters the R1 snapshot',async()=>{
 const x=fixture();try{
  const before=x.identity();
  const f=async()=>new Response(JSON.stringify({status:'READY',sourceCount:7,itemCount:35,items:Array(35).fill({})}));
  const r=await r42StoreOnce({remote:x.remote,db:'core',now,fetcher:f});
  assert.equal(r.status,'D1_AND_PUBLIC_API_VERIFIED');
  assert.equal(r.d1RowsVerified,39);assert.equal(r.displayRows,35);
  assert.equal(r.sourceCount,7);assert.equal(r.apiCount,35);
  assert.equal(x.writes.length,2);
  assert.equal(x.db.prepare('SELECT COUNT(*) AS n FROM iran_news_article_metadata_r41').get().n,39);
  assert.deepEqual(x.identity(),before);
  const second=await r42StoreOnce({remote:x.remote,db:'core',now:now+1000,fetcher:f});
  assert.equal(second.d1RowsVerified,39);
  assert.equal(x.db.prepare('SELECT COUNT(*) AS n FROM iran_news_article_metadata_r41').get().n,39);
  assert.deepEqual(x.identity(),before);
 }finally{x.close()}
});

test('R42 does not mistake D1 successful storage for a published API',async()=>{
 const x=fixture();try{
  const r=await r42StoreOnce({remote:x.remote,db:'core',now,
   fetcher:async()=>new Response(JSON.stringify({status:'UNAVAILABLE'}),{status:503})});
  assert.equal(r.status,'D1_STORED_PUBLIC_API_PENDING');
  assert.equal(r.d1Written,true);
  assert.equal(r.publicStatus,'API_NOT_READY');
 }finally{x.close()}
});

test('R42 stops before writes if R1 identity is missing',async()=>{
 const x=fixture({existingR1:false});try{
  await assert.rejects(r42StoreOnce({remote:x.remote,db:'core',now}),/R42_R1_IDENTITY_UNVERIFIED/);
  assert.equal(x.writes.length,0);
 }finally{x.close()}
});

test('R42 preserves partial migration on failure and never changes R1 data',async()=>{
 const x=fixture({failSecondWrite:true});try{
  const before=x.identity();
  await assert.rejects(r42StoreOnce({remote:x.remote,db:'core',now}),/D1_OUTCOME_UNKNOWN/);
  assert.equal(x.writes.length,2);
  assert.deepEqual(x.identity(),before);
 }finally{x.close()}
});

test('R42 manifest contains original-source article identifiers without fabricated content',()=>{
 const rows=r42VerifiedRows({now});
 assert.equal(rows.length,39);
 assert.ok(rows.every(x=>x.sourceUrl.startsWith('https://')&&x.bodyVerified===true&&
  !Object.hasOwn(x,'body')&&!Object.hasOwn(x,'summary')&&!Object.hasOwn(x,'impact')));
});
