import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareIranNewsIncrementalR45,stageIranNewsIncrementalR45}
 from '../scripts/iran-progress/news-metadata-incremental-r45.mjs';
const now=Date.parse('2026-10-29T05:00:00Z');
const sourceUrl='https://www.arabnews.com/middle-east/iran-ceasefire-talks-3008783';
const article={sourceId:'arabnews',sourceUrl,status:'ARTICLE_METADATA_REVIEWED',
 originalTitle:'Iran ceasefire talks resume',publisherDeclaredPublishedAt:'2026-10-28T14:55:34.506Z',
 articleBodyAccessible:true,scopeVerifiedFromArticle:true};
const report=(articles=[article])=>({version:'IRAN_ARTICLE_DETAIL_AUDIT_R25',
 mode:'READ_ONLY',checkedAt:'2026-10-29T04:57:08.970Z',articles});

test('R45 converts only verified opt-in articles into valid metadata-only rows',()=>{
 const rows=prepareIranNewsIncrementalR45(report([article,
  {...article,sourceId:'ap',sourceUrl:'https://apnews.com/article/iran-test-12345678'},
  {...article,sourceId:'arabnews',status:'FIRST_PUBLICATION_UNVERIFIED'}]),{now});
 assert.equal(rows.length,1);
 assert.equal(rows[0].articleId,createHash('sha256').update(sourceUrl).digest('hex'));
 assert.equal(rows[0].source,'Arab News');
 assert.equal(rows[0].bodyVerified,true);
 assert.equal(rows[0].twoStageKeywordsVerified,true);
 assert.equal(Object.hasOwn(rows[0],'body'),false);
 assert.equal(Object.hasOwn(rows[0],'impact'),false);
});
test('R45 fails closed on bad publication evidence and duplicate IDs',()=>{
 assert.throws(()=>prepareIranNewsIncrementalR45(report([
  {...article,scopeVerifiedFromArticle:false}]),{now}),/R45_VERIFIED_ARTICLE_INVALID_OR_DUPLICATE/);
 assert.throws(()=>prepareIranNewsIncrementalR45(report([
  {...article,publisherDeclaredPublishedAt:'2026-10-28'}]),{now}),/R45_VERIFIED_ARTICLE_INVALID_OR_DUPLICATE/);
 assert.throws(()=>prepareIranNewsIncrementalR45(report([article,article]),{now}),/R45_VERIFIED_ARTICLE_INVALID_OR_DUPLICATE/);
});
test('R45 empty reports never open the DB',async()=>{
 const out=await stageIranNewsIncrementalR45(null,report([]),{now});
 assert.equal(out.rows,0);
 assert.equal(out.d1Written,false);
 assert.equal(out.status,'NO_VERIFIED_NEW_SOURCE_ARTICLES');
});
test('R45 writes only one incremental row through existing R41 D1 read-back adapter',async()=>{
 let written=0,called=0;
 const memory=new Map();
 const db={prepare(sql){called++;
  return {bind(...params){return {
   async run(){
    written++;memory.set(params[0],{article_id:params[0],source_url:params[3],body_verified:1,keywords_verified:1,checked_at:params[7]});
   },
   async all(){return {results:params.map(id=>memory.get(id)).filter(Boolean)};}
  }}}},
  async batch(statements){for(const s of statements)await s.run();}
 };
 const out=await stageIranNewsIncrementalR45(db,report(),{now});
 assert.equal(out.rows,1);
 assert.equal(out.readbackVerified,1);
 assert.equal(written,1);
 assert.equal(memory.size,1);
 assert.ok(called>=2);
});
