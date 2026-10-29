import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {inspectIranArticleR25} from '../scripts/iran-progress/news-display-article-audit-r25.mjs';
import {prepareR46Rows,publishR46Rows,collectPublishR46} from '../scripts/iran-progress/news-collect-publish-r46.mjs';
import {collectIranNewsR26} from '../scripts/iran-progress/news-display-collection-r26.mjs';
const now=Date.parse('2026-10-29T05:00:00Z');
const url='https://www.aljazeera.com/news/liveblog/2026/10/29/iran-war-live';
const prose='Iran and Saudi officials continued peace talks about the war and a possible agreement. '.repeat(4);
const html=(body,extra='')=>`<!doctype html><html><head><link rel="canonical" href="${url}"><script type="application/ld+json">${JSON.stringify({'@type':'NewsArticle',headline:'Iran war live: peace talks continue',datePublished:'2026-10-29T00:00:00Z'})}</script></head><body>${extra}<div class="wysiwyg wysiwyg--all-content">${body}</div></body></html>`;
const article=(sourceUrl=url)=>({...inspectIranArticleR25({sourceId:'aljazeera',sourceUrl:url},html('<ul><li>'+prose+'</li></ul>'),{now}),sourceUrl});
function fixture(t){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'iran-r46-')),sql=new DatabaseSync(':memory:');
 sql.exec(fs.readFileSync(new URL('../db/migrations/iran-news-r41/0001_article_metadata.sql',import.meta.url),'utf8'));
 let writes=0;
 const remote={async query(db,statement,params=[]){return {results:sql.prepare(statement).all(...params)};},adapter(){return {
  prepare(statement){return {bind(...params){return {statement,params,async all(){return {results:sql.prepare(statement).all(...params)};}};}};},
  async batch(statements){sql.exec('BEGIN');try{for(const s of statements){sql.prepare(s.statement).run(...s.params);writes++;}sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}}
 };}};
 t.after(()=>{sql.close();fs.rmSync(directory,{recursive:true,force:true});});
 return {directory,sql,remote,writes:()=>writes};
}
test('live editorial list is parsed while navigation/sidebar text cannot pass body verification',()=>{
 const good=article();assert.equal(good.status,'ARTICLE_METADATA_REVIEWED');assert.equal(good.publisherDeclaredPublishedAt,'2026-10-29T00:00:00.000Z');
 assert.equal(good.articleBodyEvidence,'PUBLISHER_EDITORIAL_CONTAINER_BLOCKS');assert.ok(good.bodyCharacterCount>200);
 const bad=inspectIranArticleR25({sourceId:'aljazeera',sourceUrl:url},html('',`<nav><li>${prose}</li></nav>`),{now});
 assert.equal(bad.status,'ARTICLE_BODY_UNVERIFIED');
 const ordinary=inspectIranArticleR25({sourceId:'aljazeera',sourceUrl:url},html('<p>'+prose+'</p>'),{now});assert.equal(ordinary.status,'ARTICLE_METADATA_REVIEWED');
});
test('only body-verified two-stage recent metadata becomes public rows',()=>{
 const good=article();assert.equal(prepareR46Rows([good],{now}).length,1);
 assert.equal(prepareR46Rows([{...good,status:'ARTICLE_BODY_UNVERIFIED'}],{now}).length,0);
 assert.throws(()=>prepareR46Rows([{...good,scopeVerifiedFromArticle:false}],{now}),/VERIFIED_METADATA_INVALID/);
 assert.equal(prepareR46Rows([{...good,publisherDeclaredPublishedAt:'2026-10-01T00:00:00.000Z'}],{now}).length,0);
});
test('new 29th metadata reaches D1/readback/public API once; unchanged rows cause no more writes',async t=>{
 const f=fixture(t),rows=prepareR46Rows([article()],{now});let reads=0;
 const fetcher=async()=>{reads++;return Response.json({itemCount:1,sourceCount:1,items:rows.map(r=>({id:r.articleId,sourceUrl:r.sourceUrl,title:r.title,publishedAt:r.publishedAt}))});};
 const first=await publishR46Rows({remote:f.remote,db:'db',rows,now,fetcher});assert.equal(first.status,'D1_AND_PUBLIC_API_VERIFIED');assert.equal(first.changed,1);
 const second=await publishR46Rows({remote:f.remote,db:'db',rows,now:now+1,fetcher});assert.equal(second.status,'NO_METADATA_CHANGES');assert.equal(f.writes(),1);assert.equal(reads,1);
});
test('failed public readback never reports successful publication',async t=>{
 const f=fixture(t),rows=prepareR46Rows([article()],{now});
 await assert.rejects(publishR46Rows({remote:f.remote,db:'db',rows,now,fetcher:async()=>Response.json({items:[]})}),/PUBLIC_API_READBACK_PENDING/);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM iran_news_article_metadata_r41').get().n,1);
});
test('uncertain D1 submission is retained and requires exact readback before another collection',async t=>{
 const f=fixture(t);let collections=0;
 const remote={...f.remote,adapter(){throw Error('SIMULATED_WRITE_UNKNOWN');}};
 const collector=async options=>{collections++;await options.articleAuditor({});return {written:true};};
 const opts={dataDirectory:f.directory,remote,db:'db',now,collector,articleAuditor:async()=>({metadataReviewed:1,articles:[article()]})};
 await assert.rejects(collectPublishR46(opts),/SIMULATED_WRITE_UNKNOWN/);
 const state=JSON.parse(fs.readFileSync(path.join(f.directory,'news-collect-publish-r46-status.json')));
 assert.equal(state.status,'D1_OUTCOME_REQUIRES_READBACK');assert.equal(state.pendingRows.length,1);
 await assert.rejects(collectPublishR46(opts),/PREVIOUS_PARTIAL_WRITE_REVIEW_REQUIRED/);assert.equal(collections,1);
});
test('real collector preserves the existing PC cache on a total source outage',async t=>{
 const f=fixture(t),file=path.join(f.directory,'news-display-candidates-r26.json');
 const original=JSON.stringify({version:'IRAN_NEWS_COLLECTION_R26',items:[]});
 fs.writeFileSync(file,original);fs.writeFileSync(path.join(f.directory,'iran.sqlite'),'marker');
 await assert.rejects(collectIranNewsR26({dataDirectory:f.directory,now,dryRun:false,fetcher:async()=>new Response('',{status:503})}),/ALL_FEEDS_FAILED_PRESERVE_CACHE/);
 assert.equal(fs.readFileSync(file,'utf8'),original);assert.equal(f.writes(),0);
});
