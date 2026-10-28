import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {prepareIranNewsMetadataR41,stageIranNewsMetadataR41}
 from '../scripts/iran-progress/news-metadata-stage-r41.mjs';
import {storedIranNewsMetadataR41Response}
 from '../worker/iran-news-metadata-public-r41.mjs';
import {IRAN_NEWS_METADATA_SOURCE_IDS_R41}
 from '../lib/iran-progress/news-metadata-r41.mjs';

const report=JSON.parse(readFileSync(new URL('../docs/IRAN_NEWS_R40_FULL_AUDIT_20261029.json',import.meta.url),'utf8'));
const now=Date.parse('2026-10-29T01:30:00.000Z');

function d1({schema=true}={}){
 const sqlite=new DatabaseSync(':memory:');
 if(schema)sqlite.exec(readFileSync(new URL('../db/migrations/iran-news-r41/0001_article_metadata.sql',import.meta.url),'utf8'));
 sqlite.exec('CREATE TABLE market_public_snapshots_v1(snapshot_key TEXT PRIMARY KEY, body TEXT NOT NULL,stored_at INTEGER NOT NULL)');
 sqlite.prepare('INSERT INTO market_public_snapshots_v1 VALUES(?,?,?)').run('public:iran-progress:news:iran:r1','{"existing":true}',1234);
 return {sqlite,prepare(sql){
  const prepared=sqlite.prepare(sql);
  function bound(params){return {
   run:async()=>prepared.run(...params),
   all:async()=>({results:prepared.all(...params)}),
   first:async()=>prepared.get(...params)??null,
   bind(...next){return bound(next)},
  }}
  return bound([]);
 },async batch(stmts){
  sqlite.exec('BEGIN IMMEDIATE');
  try{const results=[];for(const stmt of stmts)results.push(await stmt.run());
   sqlite.exec('COMMIT');return results;}
  catch(error){sqlite.exec('ROLLBACK');throw error;}
 },close(){sqlite.close()}};
}

test('R41 prepares exactly 39 verified rows and never invents body, summary or impact',()=>{
 const rows=prepareIranNewsMetadataR41(report,{now});
 assert.equal(rows.length,39);
 assert.equal(new Set(rows.map(row=>row.articleId)).size,39);
 assert.equal(new Set(rows.map(row=>row.sourceUrl)).size,39);
 assert.deepEqual([...new Set(rows.map(row=>row.sourceId))].sort(),[...IRAN_NEWS_METADATA_SOURCE_IDS_R41].sort());
 assert.ok(rows.every(row=>row.bodyVerified&&row.twoStageKeywordsVerified));
 assert.ok(rows.every(row=>row.articleId.length===64&&!Object.hasOwn(row,'summary')&&
  !Object.hasOwn(row,'impact')&&!Object.hasOwn(row,'body')));
});

test('R41 uses a separate D1 table with checked-at monotonic upserts and read-back',async()=>{
 const db=d1(),rows=prepareIranNewsMetadataR41(report,{now});
 try{
  const before=db.sqlite.prepare('SELECT * FROM market_public_snapshots_v1').get();
  const result=await stageIranNewsMetadataR41(db,rows,{now});
  assert.equal(result.status,'STAGED_READBACK_VERIFIED');
  assert.equal(result.rows,39);
  assert.equal(result.batchesWritten,2);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM iran_news_article_metadata_r41').get().n,39);
  assert.deepEqual(db.sqlite.prepare('SELECT * FROM market_public_snapshots_v1').get(),before);
  const repeated=await stageIranNewsMetadataR41(db,rows,{now:now+1000});
  assert.equal(repeated.readbackVerified,39);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM iran_news_article_metadata_r41').get().n,39);
  const original=db.sqlite.prepare('SELECT title FROM iran_news_article_metadata_r41 WHERE article_id=?').get(rows[0].articleId).title;
  await stageIranNewsMetadataR41(db,[{...rows[0],title:'STALE_TITLE',checkedAt:rows[0].checkedAt-1}],{now:now+1000});
  assert.equal(db.sqlite.prepare('SELECT title FROM iran_news_article_metadata_r41 WHERE article_id=?').get(rows[0].articleId).title,original);
 }finally{db.close()}
});

test('R41 reader displays 35 last-14-day original-source titles and never joins R1',async()=>{
 const db=d1(),rows=prepareIranNewsMetadataR41(report,{now});
 try{
  await stageIranNewsMetadataR41(db,rows,{now});
  const response=await storedIranNewsMetadataR41Response(
   new Request('https://zgmini.kr/api/outbreak-news/iran/r41'),{db,now});
  assert.equal(response.status,200);
  const payload=await response.json();
  assert.equal(payload.version,'IRAN_NEWS_METADATA_R41');
  assert.equal(payload.status,'READY');
  assert.equal(payload.itemCount,35);
  assert.equal(payload.sourceCount,7);
  assert.ok(payload.items.every(item=>item.id&&item.title&&item.source&&item.sourceUrl&&
   !Object.hasOwn(item,'summary')&&!Object.hasOwn(item,'body')&&!Object.hasOwn(item,'impact')));
  assert.ok(payload.items.some(item=>item.source==='Al Jazeera'));
  const oldResponse=await storedIranNewsMetadataR41Response(new Request('https://zgmini.kr/api/outbreak-news/iran/r41'),
   {db,now:now+40*86400000});
  assert.equal((await oldResponse.json()).itemCount,0);
 }finally{db.close()}
});

test('R41 fails closed without D1 schema, and rejects unverified candidates before writing',async()=>{
 const missing=d1({schema:false});
 try{
  const response=await storedIranNewsMetadataR41Response(new Request('https://zgmini.kr/api/outbreak-news/iran/r41'),{db:missing,now});
  assert.equal(response.status,503);
  assert.equal((await response.json()).reason,'R41_SCHEMA_OR_READ_UNAVAILABLE');
 }finally{missing.close()}
 const db=d1();
 try{
  const rows=prepareIranNewsMetadataR41(report,{now});
  await assert.rejects(stageIranNewsMetadataR41(db,[{...rows[0],bodyVerified:false}],{now}),/R41_STAGE_INPUT_INVALID/);
  await assert.rejects(stageIranNewsMetadataR41(db,[{...rows[0],sourceUrl:'https://example.com/iran'}],{now}),/R41_STAGE_INPUT_INVALID/);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM iran_news_article_metadata_r41').get().n,0);
 }finally{db.close()}
});
