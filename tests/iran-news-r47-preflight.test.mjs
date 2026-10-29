import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {parseIranNewsR46Evidence,preflightIranNewsR47}
 from '../scripts/iran-progress/news-metadata-preflight-r47.mjs';

const now=Date.parse('2026-10-29T08:00:00.000Z');
const article={
 sourceId:'arabnews',
 sourceUrl:'https://www.arabnews.com/middle-east/iran-peace-negotiations-3008802',
 originalTitle:'Iran peace negotiations',
 publisherDeclaredPublishedAt:'2026-10-29T07:00:00.000Z',
 bodyVerified:true,twoStageKeywordsVerified:true,rightsVerified:false,displayEligible:false
};
const json=JSON.stringify({version:'IRAN_NEWS_R45_OPTIONAL_PRIVATE_PROBE',
 status:'PARTIAL',checkedAt:'2026-10-29T07:37:00.221Z',sources:[{
 sourceId:'arabnews',status:'READ',feedUrlsRead:1,feedUrlsFailed:0,candidates:22
 }],candidatesDiscovered:22,articleOutcomes:{ARTICLE_METADATA_REVIEWED:1,ARTICLE_FETCH_FAILED:1},
 metadataReviewed:1,eligible14Day:1,articles:[article],pcCacheWritten:false,
 remoteD1Written:false,publicSnapshotModified:false,schedulerModified:false,scoreLedgerModified:false});
const evidence=[
 'R46_READ_ONLY_TEST_BEGIN=YES',
 'PINNED_SOURCE=485c9a08b37270b5cc35260829e81adda3e19bc7',
 'PC_CORE_D1_SCHEDULER_PUBLIC_WRITES=DISABLED','SOURCE_FILES=20_VERIFIED',
 'NODE_TESTS=PASS','STAGE_2=ARABNEWS_R24_R25_LIVE_READONLY',json,
 'FINAL_STATUS=R46_TESTS_PASS_PROBE_RECORDED'].join('\r\n');
function oldRows(){
 const sources=['tasnim','govuk','guardian-iran','dw-world',
  'bbc-middle-east','aljazeera','un-middle-east'];
 return Array.from({length:39},(_,i)=>({
  article_id:createHash('sha256').update('https://legacy.example/'+i).digest('hex'),
  source_id:sources[i%7],source_url:'https://legacy.example/'+i,
  title:'Original article '+i,published_at:'2026-10-28T01:00:00.000Z',
  body_verified:1,keywords_verified:1,checked_at:now-100000
 }));
}
function legacyArchive(){return oldRows().map(row=>({
 articleId:row.article_id,sourceId:row.source_id,sourceUrl:row.source_url,
 title:row.title,publishedAt:row.published_at
}));}
function db(rows=oldRows()){
 const hits=[];
 return {hits,remote:{query:async(_db,sql,params)=>{
  hits.push(sql);
  if(sql.includes('market_public_snapshots_v1'))return {results:[{
   body:JSON.stringify({version:'IRAN_NEWS_DISPLAY_R1',items:[]}),stored_at:12345}]};
  if(sql.includes('iran_news_article_metadata_r41'))return {results:rows};
  throw Error('UNEXPECTED_SQL');
 }}};
}
test('R47 accepts pinned R46 evidence without inventing body or scoring',()=>{
 const report=parseIranNewsR46Evidence(evidence,{now});
 assert.equal(report.rows.length,1);
 assert.equal(report.rows[0].source,'Arab News');
 assert.equal(report.rows[0].articleId,createHash('sha256').update(article.sourceUrl).digest('hex'));
 assert.equal(Object.hasOwn(report.rows[0],'body'),false);
});
test('R47 reads both original R1 and the existing 39 D1 rows without writing',async()=>{
 const x=db();const r=await preflightIranNewsR47({
  remote:x.remote,db:'approved-core',evidence,now,archiveRows:legacyArchive()});
 assert.equal(r.status,'PREFLIGHT_READY_FOR_APPROVED_PUBLISH');
 assert.equal(r.newArticlesVerified,1);
 assert.equal(r.newArticleIds,1);
 assert.equal(r.baselineOriginal39,39);
 assert.equal(r.d1Written,false);
 assert.equal(x.hits.length,2);
 assert.ok(x.hits.every(sql=>sql.startsWith('SELECT')));
});
test('R47 distinguishes an already stored row from an unknown partial state',async()=>{
 const verified=parseIranNewsR46Evidence(evidence,{now}).rows[0];
 const stored={article_id:verified.articleId,source_id:'arabnews',
  source_url:verified.sourceUrl,title:verified.title,published_at:verified.publishedAt,
  body_verified:1,keywords_verified:1,checked_at:verified.checkedAt};
 const x=db([...oldRows(),stored]);
 const r=await preflightIranNewsR47({remote:x.remote,db:'approved-core',evidence,now,archiveRows:legacyArchive()});
 assert.equal(r.status,'ALREADY_PRESENT');
 await assert.rejects(preflightIranNewsR47({
  remote:db([...oldRows(),{...stored,title:'CONFLICT'}]).remote,
  db:'approved-core',evidence,now,archiveRows:legacyArchive()}),/R47_EXISTING_ARTICLE_CONFLICT/);
});
test('R47 stops if legacy D1 rows are missing or R46 success evidence is modified',async()=>{
 await assert.rejects(preflightIranNewsR47({
  remote:db(oldRows().slice(1)).remote,db:'approved-core',evidence,now,
  archiveRows:legacyArchive()
 }),/R47_ORIGINAL_39_ARTICLES_MISSING/);
 assert.throws(()=>parseIranNewsR46Evidence(evidence.replace('NODE_TESTS=PASS',
  'NODE_TESTS=FAILED'),{now}),/R47_EVIDENCE_IDENTITY_INVALID/);
 assert.throws(()=>parseIranNewsR46Evidence(evidence.replace(
  '"twoStageKeywordsVerified":true','"twoStageKeywordsVerified":false'),{now}),
  /R47_EVIDENCE_ARTICLE_INVALID/);
});

test('R47 preserves original 39 ID identities while permitting two added legacy-source articles',async()=>{
 const extras=Array.from({length:2},(_,i)=>{
  const sourceUrl='https://legacy.example/extra-'+i;
  return {article_id:createHash('sha256').update(sourceUrl).digest('hex'),
   source_id:'guardian-iran',source_url:sourceUrl,title:'New article '+i,
   published_at:'2026-10-29T01:00:00.000Z',body_verified:1,
   keywords_verified:1,checked_at:now-1000};
 });
 const x=db([...oldRows(),...extras]);
 const r=await preflightIranNewsR47({remote:x.remote,db:'approved-core',
  evidence,now,archiveRows:legacyArchive()});
 assert.equal(r.status,'PREFLIGHT_READY_FOR_APPROVED_PUBLISH');
 assert.equal(r.baselineOriginal39,39);
 assert.equal(r.currentOriginalSourceRows,41);
 assert.equal(r.extraOriginalSourceRows,2);
 assert.equal(r.newArticleIds,1);
 assert.equal(x.hits.length,2);
 assert.equal(r.d1Written,false);
});
test('R47 still refuses a changed URL for any archived article ID',async()=>{
 const changed=oldRows();changed[4]={...changed[4],source_url:'https://legacy.example/altered'};
 await assert.rejects(preflightIranNewsR47({
  remote:db(changed).remote,db:'approved-core',
  evidence,now,archiveRows:legacyArchive()
 }),/R47_ORIGINAL_39_IDENTITY_CHANGED/);
});
