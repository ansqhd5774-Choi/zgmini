import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {inspectIranNewsSchemaR53,expandIranNewsSchemaR53,
 r53MigrationStatements,r53TableSql,OLD_IDS,NEW_IDS} from '../scripts/iran-progress/news-metadata-schema-expand-r53.mjs';

const sha=s=>createHash('sha256').update(s).digest('hex');
const TABLE='iran_news_article_metadata_r41';
const initial=Array.from({length:41},(_,i)=>({
 articleId:sha('https://www.gov.uk/news/iran-'+i),
 sourceId:i%2?'govuk':'aljazeera',source:i%2?'GOV.UK':'Al Jazeera',
 sourceUrl:'https://www.gov.uk/news/iran-'+i,title:'Iran talks '+i,
 publishedAt:'2026-10-28T09:00:00.000Z',checkedAt:1793240000000,
 storedAt:1793240001000
}));
const manifest={version:'IRAN_NEWS_R41_STAGING_ROWS',rows:initial.slice(0,39)};

function fixture({extraTrigger=false,sourceIds=OLD_IDS}={}){
 const sql=new DatabaseSync(':memory:');
 if(sourceIds===OLD_IDS)sql.exec(readFileSync(new URL('../db/migrations/iran-news-r41/0001_article_metadata.sql',import.meta.url),'utf8'));
 else{
  sql.exec(r53TableSql(TABLE,sourceIds));
  sql.exec('CREATE INDEX idx_iran_news_r41_published_at ON '+TABLE+'(published_at DESC,article_id)');
 }
 sql.exec('CREATE TABLE market_public_snapshots_v1(snapshot_key TEXT PRIMARY KEY, body TEXT NOT NULL,stored_at INTEGER NOT NULL)');
 sql.prepare('INSERT INTO market_public_snapshots_v1 VALUES(?,?,?)').run('public:iran-progress:news:iran:r1','{"version":"IRAN_NEWS_DISPLAY_R1","items":[]}',1793242899922);
 const stmt=sql.prepare(`INSERT INTO ${TABLE} (article_id,source_id,source,source_url,title,published_at,body_verified,keywords_verified,checked_at,stored_at) VALUES(?,?,?,?,?,?,1,1,?,?)`);
 for(const x of initial)stmt.run(x.articleId,x.sourceId,x.source,x.sourceUrl,x.title,x.publishedAt,x.checkedAt,x.storedAt);
 if(extraTrigger)sql.exec(`CREATE TRIGGER test_trigger AFTER INSERT ON ${TABLE} BEGIN SELECT 1; END`);
 let writes=0;
 const remote={async query(_db,q,params=[]){const rows=sql.prepare(q).all(...params);return {results:rows}},
  async request(_db,batch){writes++;sql.exec('BEGIN');try{const results=[];
   for(const item of batch){sql.exec(item.sql);results.push({success:true,results:[]})}
   sql.exec('COMMIT');return results;
  }catch(e){sql.exec('ROLLBACK');throw e}}
 };
 return {sql,remote,get writes(){return writes}};
}
test('original seven-source D1 schema rejects Arab News exactly as observed',()=>{
 const f=fixture();
 assert.throws(()=>f.sql.prepare(`INSERT INTO ${TABLE} (article_id,source_id,source,source_url,title,published_at,body_verified,keywords_verified,checked_at,stored_at) VALUES(?,?,?,?,?,?,1,1,?,?)`)
  .run(sha('new'), 'arabnews','Arab News','https://www.arabnews.com/middle-east/iran','Iran','2026-10-29T01:00:00Z',1793240000000,1793240001000),/CHECK constraint failed: source_id IN/);
 assert.equal(f.sql.prepare(`SELECT COUNT(*) AS n FROM ${TABLE}`).get().n,41);
 f.sql.close();
});
test('R53 7-to-11 migration preserves all 41 metadata rows and R1',async()=>{
 const f=fixture();let backup=null;const phases=[];
 try{
  const pre=await inspectIranNewsSchemaR53({remote:f.remote,db:'core',manifest});
  assert.equal(pre.state,'SEVEN');assert.equal(pre.rowCount,41);
  const out=await expandIranNewsSchemaR53({remote:f.remote,db:'core',manifest,
   backup:async x=>{backup=x},onPhase:x=>phases.push(x)});
  assert.equal(out.status,'ELEVEN_SOURCE_SCHEMA_VERIFIED');
  assert.equal(out.beforeRows,41);assert.equal(out.afterRows,41);
  assert.equal(f.writes,1);assert.equal(backup.rows.length,41);
  assert.ok(phases.includes('POSTWRITE_READBACK'));
  const after=await inspectIranNewsSchemaR53({remote:f.remote,db:'core',manifest});
  assert.equal(after.state,'ELEVEN');assert.equal(after.rowsHash,pre.rowsHash);
  assert.equal(after.r1Hash,pre.r1Hash);assert.deepEqual(after.sourceIds,NEW_IDS);
  f.sql.prepare(`INSERT INTO ${TABLE} (article_id,source_id,source,source_url,title,published_at,body_verified,keywords_verified,checked_at,stored_at) VALUES(?,?,?,?,?,?,1,1,?,?)`)
   .run(sha('new'),'arabnews','Arab News','https://www.arabnews.com/middle-east/iran','Iran','2026-10-29T01:00:00Z',1793240000000,1793240001000);
  assert.equal(f.sql.prepare(`SELECT COUNT(*) AS n FROM ${TABLE}`).get().n,42);
 }finally{f.sql.close()}
});
test('already expanded database is verified but never rewritten',async()=>{
 const f=fixture({sourceIds:NEW_IDS});
 try{const out=await expandIranNewsSchemaR53({remote:f.remote,db:'core',manifest,backup:async()=>{throw Error('backup called')}});
  assert.equal(out.status,'ALREADY_11_SOURCE_SCHEMA_NO_WRITE');assert.equal(f.writes,0);
 }finally{f.sql.close()}
});
test('unknown schema dependencies fail closed before backup or mutation',async()=>{
 const f=fixture({extraTrigger:true});let called=false;
 try{await assert.rejects(expandIranNewsSchemaR53({remote:f.remote,db:'core',manifest,backup:async()=>{called=true}}),/R53_UNRECOGNIZED_SCHEMA_DEPENDENCY/);
  assert.equal(called,false);assert.equal(f.writes,0);
 }finally{f.sql.close()}
});
test('archive identity drift is rejected before any D1 mutation',async()=>{
 const f=fixture();
 try{const changed={...manifest,rows:[{...manifest.rows[0],sourceUrl:'https://www.gov.uk/changed'},...manifest.rows.slice(1)]};
  await assert.rejects(expandIranNewsSchemaR53({remote:f.remote,db:'core',manifest:changed,backup:async()=>{}}),/R53_ARCHIVE_39_CHANGED/);
  assert.equal(f.writes,0);
 }finally{f.sql.close()}
});
test('D1 batch emits the required create/copy/swap/index sequence',()=>{
 const sql=r53MigrationStatements().map(x=>x.sql);
 assert.equal(sql.length,5);
 assert.match(sql[0],/arabnews/);assert.match(sql[1],/^INSERT INTO/);
 assert.match(sql[2],/^DROP TABLE/);assert.match(sql[3],/^ALTER TABLE/);
 assert.match(sql[4],/^CREATE INDEX/);
});
