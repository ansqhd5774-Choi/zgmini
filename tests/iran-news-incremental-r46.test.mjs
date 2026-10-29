import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {r46Prepare,r46Preflight,r46StoreOnce,r46ReportFromLog}
 from '../scripts/iran-progress/news-metadata-incremental-r46.mjs';

const now=Date.parse('2026-10-29T05:05:00Z');
const oldSources=['tasnim','govuk','guardian-iran','dw-world','bbc-middle-east',
 'aljazeera','un-middle-east'];
function report(){
 const articles=Array.from({length:4},(_,i)=>({
  sourceId:'arabnews',
  url:'https://www.arabnews.com/middle-east/iran-ceasefire-talks-'+(3008701+i),
  title:'Iran ceasefire negotiations number '+i,
  publishedAt:'2026-10-28T08:00:00.000Z',
  rightsVerified:false,displayEligible:false,
  bodyEvidence:'PUBLISHER_EDITORIAL_BODY',
  dateEvidence:'PUBLISHER_DECLARED_ZONED_DATE',
  status:'ARTICLE_METADATA_REVIEWED',
 }));
 return {version:'IRAN_NEWS_R45_FOUR_SOURCE_READ_ONLY',
  checkedAt:'2026-10-29T04:57:08.970Z',
  sources:[{sourceId:'arabnews',status:'READ',feedRead:true,
   candidates:4,articleVerified:4,eligible14Day:4,errors:0,articles},
   {sourceId:'ap',status:'SOURCE_FAILED',feedRead:false,
    candidates:0,articleVerified:0,eligible14Day:0,errors:1,articles:[]}]};
}
function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec('CREATE TABLE market_public_snapshots_v1(snapshot_key TEXT PRIMARY KEY,body TEXT,stored_at INTEGER)');
 db.exec('CREATE TABLE iran_news_article_metadata_r41(article_id TEXT PRIMARY KEY,source_id TEXT,source TEXT,source_url TEXT,title TEXT,published_at TEXT,body_verified INTEGER,keywords_verified INTEGER,checked_at INTEGER,stored_at INTEGER)');
 db.prepare('INSERT INTO market_public_snapshots_v1 VALUES(?,?,?)').run(
  'public:iran-progress:news:iran:r1','{"version":"IRAN_NEWS_DISPLAY_R1"}',12345);
 const ins=db.prepare('INSERT INTO iran_news_article_metadata_r41 VALUES(?,?,?,?,?,?,?,?,?,?)');
 for(let i=0;i<39;i++){
  const url='https://fixture.invalid/original-'+i;
  ins.run(createHash('sha256').update(url).digest('hex'),oldSources[i%7],
   'Source '+i,url,'Original '+i,'2026-10-28T00:00:00.000Z',1,1,1234,1234);
 }
 const remote={
  query:async(_id,sql,params=[])=>({results:db.prepare(sql).all(...params)}),
  adapter:()=>({
   prepare(sql){const stmt=db.prepare(sql);return {
    bind(...args){return {run:async()=>stmt.run(...args),
     all:async()=>({results:stmt.all(...args)})}},
    all:async()=>({results:stmt.all()})}},
   async batch(stmts){db.exec('BEGIN IMMEDIATE');try{
    for(const stmt of stmts)await stmt.run();db.exec('COMMIT');return [];
   }catch(e){db.exec('ROLLBACK');throw e}},
  }),
 };
 return {db,remote,close:()=>db.close()};
}
test('R46 verifies four Arab News articles, isolating AP failure and requiring publisher evidence',()=>{
 const prepared=r46Prepare(report(),{now});
 assert.equal(prepared.status,'PREPARED_NO_WRITE');
 assert.equal(prepared.rows.length,4);
 assert.deepEqual(prepared.sourceIds,['arabnews']);
 assert.ok(prepared.rows.every(x=>x.source==='Arab News'&&x.bodyVerified&&x.twoStageKeywordsVerified));
 const invalid=report();invalid.sources[0].articles[0].dateEvidence='SEARCH_DATE';
 assert.throws(()=>r46Prepare(invalid,{now}),/R46_ARTICLE_EVIDENCE_INVALID/);
 const tampered=report();tampered.sources[0].articles[0].url='https://evil.test/news';
 assert.throws(()=>r46Prepare(tampered,{now}),/R46_ROW_INVALID/);
});
test('R46 reads baseline without writing and upserts four in memory while retaining 39 and R1',async()=>{
 const x=fixture();try{
  const original=x.db.prepare("SELECT article_id,title,source_url,published_at FROM iran_news_article_metadata_r41 ORDER BY article_id").all();
  const r1=x.db.prepare("SELECT * FROM market_public_snapshots_v1").all();
  const pre=await r46Preflight({remote:x.remote,db:'core',report:report(),now});
  assert.equal(pre.summary.status,'PREFLIGHT_READ_ONLY');
  assert.equal(pre.summary.newRows,4);
  assert.equal(x.db.prepare("SELECT COUNT(*) AS n FROM iran_news_article_metadata_r41").get().n,39);
  const first=await r46StoreOnce({remote:x.remote,db:'core',report:report(),now});
  assert.equal(first.status,'D1_READBACK_VERIFIED_PUBLIC_API_UNVERIFIED');
  assert.equal(first.totalRows,43);
  const again=await r46StoreOnce({remote:x.remote,db:'core',report:report(),now:now+1000});
  assert.equal(again.addedRows,0);
  assert.equal(again.totalRows,43);
  assert.deepEqual(x.db.prepare("SELECT article_id,title,source_url,published_at FROM iran_news_article_metadata_r41 WHERE source_id != 'arabnews' ORDER BY article_id").all(),original);
  assert.deepEqual(x.db.prepare('SELECT * FROM market_public_snapshots_v1').all(),r1);
 }finally{x.close()}
});
test('R46 refuses pre-existing mismatched article before writing, and rejects unpinned logs',async()=>{
 const x=fixture();try{
  const a=report().sources[0].articles[0];
  x.db.prepare('INSERT INTO iran_news_article_metadata_r41 VALUES(?,?,?,?,?,?,?,?,?,?)').run(
   createHash('sha256').update(a.url).digest('hex'),'arabnews','Arab News',
   a.url,'MISMATCHED TITLE',a.publishedAt,1,1,100,100);
  await assert.rejects(r46StoreOnce({remote:x.remote,db:'core',report:report(),now}),
   /R46_EXISTING_ARTICLE_IDENTITY_DRIFT/);
  assert.equal(x.db.prepare('SELECT COUNT(*) AS n FROM iran_news_article_metadata_r41').get().n,40);
 }finally{x.close()}
 assert.throws(()=>r46ReportFromLog('FINAL_STATUS=READ_ONLY_PROBE_FINISHED'),
  /R46_R45_LOG_IDENTITY_UNVERIFIED/);
});
