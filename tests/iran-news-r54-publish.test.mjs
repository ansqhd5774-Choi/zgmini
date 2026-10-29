import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {r53TableSql,NEW_IDS,OLD_IDS} from '../scripts/iran-progress/news-metadata-schema-expand-r53.mjs';
import {inspectIranNewsR54,publishIranNewsR54} from '../scripts/iran-progress/news-metadata-publish-r54.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const TABLE='iran_news_article_metadata_r41';
const NOW=1793270000000;
const baseline=Array.from({length:44},(_,i)=>({
 articleId:sha('https://example.com/old-'+i),sourceId:i%2?'govuk':'aljazeera',
 source:i%2?'GOV.UK':'Al Jazeera',sourceUrl:'https://example.com/old-'+i,
 title:'Iran archive '+i,publishedAt:'2026-10-28T09:00:00.000Z',
 checkedAt:1793240000000,storedAt:1793240001000
}));
const eight=Array.from({length:8},(_,i)=>({
 articleId:sha('https://www.arabnews.com/node/'+(800000+i)),
 sourceId:'arabnews',source:'Arab News',
 sourceUrl:'https://www.arabnews.com/node/'+(800000+i),
 title:'Iran publication '+i,publishedAt:'2026-10-28T18:00:00.000Z',
 checkedAt:1793248000000,bodyVerified:true,twoStageKeywordsVerified:true
}));
const manifest={version:'IRAN_NEWS_R41_STAGING_ROWS',rows:baseline.slice(0,39)};
function fixture({ids=NEW_IDS,initialNew=0,mutateAt=null}={}){
 const sql=new DatabaseSync(':memory:');
 sql.exec(r53TableSql(TABLE,ids));
 sql.exec('CREATE INDEX idx_iran_news_r41_published_at ON '+TABLE+'(published_at DESC,article_id)');
 sql.exec('CREATE TABLE market_public_snapshots_v1(snapshot_key TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL)');
 const r1Body='{"version":"IRAN_NEWS_DISPLAY_R1","items":[]}';
 sql.prepare('INSERT INTO market_public_snapshots_v1 VALUES(?,?,?)')
  .run('public:iran-progress:news:iran:r1',r1Body,1793242899922);
 const insert=sql.prepare(`INSERT INTO ${TABLE} (article_id,source_id,source,source_url,title,published_at,body_verified,keywords_verified,checked_at,stored_at) VALUES(?,?,?,?,?,?,1,1,?,?)`);
 for(const x of baseline)insert.run(x.articleId,x.sourceId,x.source,x.sourceUrl,x.title,x.publishedAt,x.checkedAt,x.storedAt);
 for(const x of eight.slice(0,initialNew))insert.run(x.articleId,x.sourceId,x.source,x.sourceUrl,x.title,x.publishedAt,x.checkedAt,NOW-10);
 let writes=0,reads=0;
 const remote={async query(_db,q,params=[]){reads++;
   if(mutateAt!==null&&reads===mutateAt)sql.prepare('UPDATE market_public_snapshots_v1 SET stored_at=stored_at+1').run();
   return {results:sql.prepare(q).all(...params)};
  },async request(_db,statements){writes++;sql.exec('BEGIN');try{
    for(const item of statements)sql.prepare(item.sql).run(...item.params);
    sql.exec('COMMIT');return statements.map(()=>({success:true}));
   }catch(e){sql.exec('ROLLBACK');throw e}
  }};
 const hooks={parseR46:()=>({checkedAt:'2026-10-29T03:00:00.000Z',rows:eight}),
  parseR49:()=>({evidenceCheckedAt:'2026-10-29T03:00:00.000Z',newRows:8,
   originalCount:39,originalHash:'archived-hash'}),
  preflight:async()=>({newArticlesVerified:8,baselineOriginal39:39,
   historicalMetadataCorrections:0,baselineOriginal39Sha256:'archived-hash',
   r1StoredAt:1793242899922,existingVerified:initialNew,newArticleIds:8-initialNew})};
 const params={remote,db:'core',manifest,r46Evidence:'R46 fake',r49Evidence:'R49 fake',now:NOW,...hooks};
 return {sql,remote,params,get writes(){return writes},close:()=>sql.close()};
}
test('read-only schema inspection uses actual 11-source schema and does not write',async()=>{
 const f=fixture();try{
  const result=await inspectIranNewsR54({remote:f.remote,db:'core',manifest});
  assert.equal(result.status,'SCHEMA_VERIFIED_EIGHT_IDS_UNCHECKED');
  assert.equal(result.existingRows,44);assert.equal(result.arabNewsRows,0);
  assert.equal(f.writes,0);
 }finally{f.close()}
});
test('fresh eight-ID membership preflight gives READY only when none stored',async()=>{
 const f=fixture();try{
  const result=await inspectIranNewsR54(f.params);
  assert.equal(result.status,'READY_EIGHT_NOT_STORED');
  assert.equal(result.storedExpected,0);assert.equal(result.missingExpected,8);
  assert.equal(f.writes,0);
 }finally{f.close()}
});
test('one atomic insert moves 44 to 52; old rows and R1 are byte-for-byte preserved',async()=>{
 const f=fixture();try{
  const before=f.sql.prepare(`SELECT * FROM ${TABLE} ORDER BY article_id`).all();
  const result=await publishIranNewsR54(f.params);
  assert.equal(result.status,'EIGHT_D1_ROWS_VERIFIED_PUBLIC_API_PENDING');
  assert.equal(result.beforeRows,44);assert.equal(result.afterRows,52);
  assert.equal(result.newRowsVerified,8);assert.equal(f.writes,1);
  const after=f.sql.prepare(`SELECT * FROM ${TABLE} ORDER BY article_id`).all();
  const byId=new Map(after.map(x=>[x.article_id,x]));
  assert.deepEqual(before.map(x=>byId.get(x.article_id)),before);
  assert.equal(f.sql.prepare('SELECT stored_at FROM market_public_snapshots_v1').get().stored_at,1793242899922);
 }finally{f.close()}
});
test('already stored eight articles must never write again',async()=>{
 const f=fixture({initialNew:8});try{
  const result=await publishIranNewsR54(f.params);
  assert.equal(result.status,'ALREADY_EIGHT_STORED_NO_WRITE');
  assert.equal(result.d1Written,false);assert.equal(f.writes,0);
 }finally{f.close()}
});
test('one existing article fails closed with zero writes',async()=>{
 const f=fixture({initialNew:1});try{
  await assert.rejects(publishIranNewsR54(f.params),/R54_NOT_ALL_EIGHT_MISSING_NO_WRITE/);
  assert.equal(f.writes,0);
 }finally{f.close()}
});
test('original seven-source schema refuses the write before calling request',async()=>{
 const f=fixture({ids:OLD_IDS});try{
  await assert.rejects(publishIranNewsR54(f.params),/R54_ELEVEN_SOURCE_SCHEMA_REQUIRED/);
  assert.equal(f.writes,0);
 }finally{f.close()}
});
test('unexpected R1 change at final read-only step blocks the write',async()=>{
 const f=fixture();try{
  let inspected=0;
  const result=()=>inspectIranNewsR54(f.params);
  const inspect=async()=>{inspected++;const out=await result();if(inspected===1)
   f.sql.prepare('UPDATE market_public_snapshots_v1 SET stored_at=stored_at+1').run();return out};
  await assert.rejects(publishIranNewsR54({...f.params,inspect}),
   /R54_CURRENT_ARCHIVE_OR_R1_GATE_FAILED|R54_PREWRITE_STATE_DRIFT_NO_WRITE/);
  assert.equal(f.writes,0);
 }finally{f.close()}
});
test('plain INSERT conflict rolls back the entire 8-statement D1 batch',async()=>{
 const f=fixture();try{
  const conflictId=eight[7].articleId;
  const request=f.remote.request;
  f.remote.request=async(db,batch)=>{
   const x=eight[7];
   f.sql.prepare(`INSERT INTO ${TABLE} (article_id,source_id,source,source_url,title,published_at,body_verified,keywords_verified,checked_at,stored_at) VALUES(?,?,?,?,?,?,1,1,?,?)`)
    .run(x.articleId,x.sourceId,x.source,x.sourceUrl,x.title,x.publishedAt,x.checkedAt,NOW);
   return request(db,batch);
  };
  await assert.rejects(publishIranNewsR54(f.params),/UNIQUE constraint failed/);
  assert.equal(f.writes,1);
  assert.equal(f.sql.prepare(`SELECT COUNT(*) AS n FROM ${TABLE}`).get().n,45);
  assert.equal(f.sql.prepare(`SELECT COUNT(*) AS n FROM ${TABLE} WHERE article_id=?`).get(conflictId).n,1);
 }finally{f.close()}
});
