import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {storedIranNewsMetadataR41Response} from '../worker/iran-news-metadata-public-r41.mjs';
import {IRAN_NEWS_METADATA_SOURCE_IDS_R41} from '../lib/iran-progress/news-metadata-r41.mjs';
const now=Date.parse('2026-10-29T05:00:00Z');
const url='https://www.arabnews.com/middle-east/saudi-iran-ceasefire-talks-3008783';
const articleId=createHash('sha256').update(url).digest('hex');
const row={article_id:articleId,source_id:'arabnews',source:'Arab News',
 source_url:url,title:'Saudi and Iranian ceasefire talks',
 published_at:'2026-10-28T07:00:00.000Z',body_verified:1,keywords_verified:1,
 checked_at:now-1000};
const db=rows=>({prepare(sql){
 assert.match(sql,/FROM iran_news_article_metadata_r41/);
 return {all:async()=>({results:rows})};
}});
const req=new Request('https://zgmini.kr/api/outbreak-news/iran/r41');
test('R45 one verified source is READY with actual source count, not an 11-source gate',async()=>{
 const r=await storedIranNewsMetadataR41Response(req,{db:db([row]),now});
 assert.equal(r.status,200);
 const p=await r.json();
 assert.equal(p.status,'READY');
 assert.equal(p.itemCount,1);
 assert.equal(p.sourceCount,1);
 assert.equal(p.configuredSourceCount,11);
 assert.equal(p.requiredSourceCount,0);
 assert.equal(p.items[0].source,'Arab News');
 assert.equal(IRAN_NEWS_METADATA_SOURCE_IDS_R41.length,11);
});
test('R45 zero visible articles is PENDING and DB read failure is UNAVAILABLE',async()=>{
 const empty=await storedIranNewsMetadataR41Response(req,{db:db([]),now});
 assert.equal((await empty.json()).status,'PENDING');
 const err=await storedIranNewsMetadataR41Response(req,{db:{prepare(){throw Error('offline')}},now});
 assert.equal(err.status,503);
 assert.equal((await err.json()).status,'UNAVAILABLE');
});
test('R45 invalid article stays outside the public API without modifying the R1 snapshot',async()=>{
 const stale={...row,published_at:'2026-09-01T07:00:00.000Z'};
 const res=await storedIranNewsMetadataR41Response(req,{db:db([stale]),now});
 assert.equal((await res.json()).itemCount,0);
});
