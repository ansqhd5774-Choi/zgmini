import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
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

test('R45 preserves old-source rows and displays all eight newly verified Arab News rows',async()=>{
 const old={...row,article_id:createHash('sha256').update('https://www.gov.uk/government/speeches/iran-briefing').digest('hex'),
  source_id:'govuk',source:'GOV.UK',source_url:'https://www.gov.uk/government/speeches/iran-briefing',title:'Iran briefing'};
 const added=Array.from({length:8},(_,index)=>{
  const sourceUrl=`https://www.arabnews.com/middle-east/saudi-iran-ceasefire-talks-300878${index}`;
  return {...row,article_id:createHash('sha256').update(sourceUrl).digest('hex'),source_url:sourceUrl};
 });
 const res=await storedIranNewsMetadataR41Response(req,{db:db([old,...added]),now});
 assert.equal(res.status,200);
 const payload=await res.json();
 assert.equal(payload.status,'READY');
 assert.equal(payload.sourceCount,2);
 assert.equal(payload.configuredSourceCount,11);
 assert.equal(payload.itemCount,9);
 assert.equal(payload.items.filter(item=>item.source==='Arab News').length,8);
 assert.equal(payload.items.filter(item=>item.source==='GOV.UK').length,1);
});

test('R45 website container keeps latest R41 display and R1 fallback without a seven-source gate',()=>{
 const source=readFileSync(new URL('../app/outbreak-news-container-r1.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(source,/sourceCount\s*===\s*7/);
 assert.match(source,/newer\.payload\?\.status==="READY"/);
 assert.match(source,/newer\.payload\.items\.length===newer\.payload\.itemCount/);
 assert.match(source,/return <OutbreakNewsMetadataR41 eventId=\{eventId\} items=\{newer\.payload\.items\}\/>/);
 assert.match(source,/return <OutbreakNewsUI eventId=\{eventId\} items=\{items\}/);
});
