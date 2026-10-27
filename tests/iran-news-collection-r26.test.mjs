import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {IRAN_GOVUK_R24_TOPIC_FEEDS,IRAN_MULTISOURCE_FEEDS_R24} from '../scripts/iran-progress/news-display-multisource-audit-r24.mjs';
import {R3_FEEDS} from '../scripts/iran-progress/continuous-news-r3.mjs';
import {NEWS_COLLECTION_R26_FILE,NEWS_COLLECTION_R26_VERSION,collectIranNewsR26,
 planIranCollectionR26,readIranCollectionR26} from '../scripts/iran-progress/news-display-collection-r26.mjs';

const now=Date.parse('2026-10-27T12:00:00Z');
const gov='https://www.gov.uk/government/news/iran-new-r26';
const bbc='https://www.bbc.com/news/articles/saudi-security-r26';
const governmentBody='<p>'+('UK and Iranian ministers discussed diplomatic proposals. ').repeat(6)+'</p>';
const bbcBody=('Saudi Arabia and Yemen announced new regional safety talks. ').repeat(7);
const rss=items=>`<rss><channel>${items}</channel></rss>`;
const govFeed=`<feed><entry><title>Iran new update</title>`+
 `<updated>2026-10-27T11:20:00Z</updated><link href="${gov}"/></entry></feed>`;
const bbcFeed=rss(`<item><title>Saudi security update</title><link>${bbc}</link>`+
 '<pubDate>Tue, 27 Oct 2026 11:00:00 GMT</pubDate></item>');
const bbcPage=`<!doctype html><html><head><link rel="canonical" href="${bbc}">`+
 `<script type="application/ld+json">${JSON.stringify({'@type':'NewsArticle',
  headline:'Saudi security update',datePublished:'2026-10-27T10:30:00Z'})}</script>`+
 `</head><body><article><p>${bbcBody}</p></article></body></html>`;
const content=JSON.stringify({base_path:'/government/news/iran-new-r26',
 first_published_at:'2026-10-27T10:00:00Z',title:'Iran new update',
 details:{body:governmentBody}});

function mockFeedFetch({oneFailed=false,allFailed=false}={}){
 return async url=>{
  if(allFailed)return new Response('blocked',{status:503});
  if(IRAN_GOVUK_R24_TOPIC_FEEDS.includes(url))return new Response(govFeed);
  if(url===bbc)return new Response(bbcPage);
  if(url==='https://www.gov.uk/api/content/government/news/iran-new-r26')return new Response(content);
  const spec=IRAN_MULTISOURCE_FEEDS_R24.find(feed=>feed.url===url);
  if(!spec)throw Error('UNKNOWN_TEST_URL');
  if(oneFailed&&spec.id==='aljazeera')return new Response('blocked',{status:503});
  if(spec.id==='tasnim')return new Response('<html><body>Empty publisher listing</body></html>');
  if(spec.id==='bbc-middle-east')return new Response(bbcFeed);
  return new Response(rss(''));
 };
}

async function inDir(fn){
 const dir=mkdtempSync(path.join(tmpdir(),'iran-r26-'));
 try{
  writeFileSync(path.join(dir,'iran.sqlite'),'unchanged score ledger');
  writeFileSync(path.join(dir,'news-display-r1.json'),'unchanged rights-checked public cache');
  return await fn(dir);
 }finally{rmSync(dir,{recursive:true,force:true});}
}
const id=url=>createHash('sha256').update(url).digest('hex');

test('R26 display-only seven-source registry exactly matches approved R3 feeds',()=>{
 assert.deepEqual(IRAN_MULTISOURCE_FEEDS_R24,R3_FEEDS);
});

test('R26 Windows audit CMD is pinned, ASCII/CRLF and never runs collection apply',()=>{
 const cmd=readFileSync(new URL('../IRAN_NEWS_R26_COLLECTION_READONLY.cmd',import.meta.url));
 assert.ok(cmd.every(byte=>byte<128));
 assert.match(cmd.toString('ascii'),/Pinned source SHA: 9560b41942a414896420b7a413de0dac49bb9048/);
 assert.match(cmd.toString('ascii'),/news-display-collection-r26\.mjs" --dry-run/);
 assert.equal(cmd.toString('ascii').includes(' --collect'),false);
 assert.equal(cmd.toString('ascii').replace(/\r\n/g,'').includes('\n'),false);
 assert.match(cmd.toString('ascii'),/IRAN_NEWS_R26_COLLECTION_READONLY_RESULT\.txt/);
});

test('R26 collects genuine article metadata from 7 sources without licensing or publishing it',async()=>{
 await inDir(async dataDirectory=>{
  const result=await collectIranNewsR26({dataDirectory,now,fetcher:mockFeedFetch()});
  assert.equal(result.status,'COLLECTION_REVIEW_READY');
  assert.equal(result.sourceCount,7);
  assert.equal(result.sourcesFailed,0);
  assert.equal(result.newCandidates,2);
  assert.equal(result.candidatesSaved,2);
  assert.equal(result.rightsVerified,0);
  assert.equal(result.displayEligible,0);
  assert.equal(result.dryRun,true);
  assert.equal(result.written,false);
  assert.ok(result.feedStatuses.every(s=>s.sourceId));
  assert.equal(existsSync(path.join(dataDirectory,NEWS_COLLECTION_R26_FILE)),false);
 });
});

test('R26 stores metadata only in its independent PC file with exact read-back',async()=>{
 await inDir(async dataDirectory=>{
  const result=await collectIranNewsR26({dataDirectory,now,fetcher:mockFeedFetch(),dryRun:false});
  assert.equal(result.status,'COLLECTION_REVIEW_READY');
  assert.equal(result.written,true);
  const cache=readIranCollectionR26(dataDirectory,{now});
  assert.equal(cache.items.length,2);
  assert.deepEqual(new Set(cache.items.map(item=>item.sourceId)),new Set(['govuk','bbc-middle-east']));
  assert.ok(cache.items.every(item=>item.reviewStatus==='ARTICLE_METADATA_REVIEWED'&&
   item.rightsVerified===false&&item.displayEligible===false));
  assert.ok(cache.items.every(item=>!('fullBody' in item)&&!('summary' in item)));
  assert.equal(readFileSync(path.join(dataDirectory,'iran.sqlite'),'utf8'),'unchanged score ledger');
  assert.equal(readFileSync(path.join(dataDirectory,'news-display-r1.json'),'utf8'),
   'unchanged rights-checked public cache');
  const again=await collectIranNewsR26({dataDirectory,now:now+1000,
   fetcher:mockFeedFetch(),dryRun:false});
  assert.equal(again.newCandidates,0);
  assert.equal(again.candidatesSaved,2);
 });
});

test('R26 isolates one publisher failure while collecting the other valid articles',async()=>{
 await inDir(async dataDirectory=>{
  const result=await collectIranNewsR26({dataDirectory,now,
   fetcher:mockFeedFetch({oneFailed:true}),dryRun:false});
  assert.equal(result.status,'PARTIAL_COLLECTION_REVIEW_REQUIRED');
  assert.equal(result.sourcesFailed,1);
  assert.equal(result.newCandidates,2);
  assert.equal(result.feedStatuses.find(s=>s.sourceId==='aljazeera').status,'SOURCE_FAILED');
  assert.equal(readIranCollectionR26(dataDirectory,{now}).items.length,2);
 });
});

test('R26 total source outage stops before writing and retains all prior candidate metadata',async()=>{
 await inDir(async dataDirectory=>{
  await collectIranNewsR26({dataDirectory,now,fetcher:mockFeedFetch(),dryRun:false});
  const file=path.join(dataDirectory,NEWS_COLLECTION_R26_FILE);
  const before=readFileSync(file,'utf8');
  await assert.rejects(collectIranNewsR26({dataDirectory,now:now+1000,
   fetcher:mockFeedFetch({allFailed:true}),dryRun:false}),/R26_ALL_FEEDS_FAILED_PRESERVE_CACHE/);
  assert.equal(readFileSync(file,'utf8'),before);
  assert.equal(readFileSync(path.join(dataDirectory,'iran.sqlite'),'utf8'),'unchanged score ledger');
 });
});

test('R26 expires metadata using original publication date and preserves valid historical candidates',()=>{
 const oldUrl='https://www.gov.uk/government/news/old-iran-r26';
 const old={id:id(oldUrl),sourceId:'govuk',sourceUrl:oldUrl,
  originalTitle:'Iran historical briefing',publisherDeclaredPublishedAt:'2026-09-01T08:00:00.000Z',
  reviewStatus:'ARTICLE_METADATA_REVIEWED',rightsVerified:false,displayEligible:false};
 const recentUrl='https://www.gov.uk/government/news/recent-saudi-r26';
 const recent={...old,id:id(recentUrl),sourceUrl:recentUrl,
  publisherDeclaredPublishedAt:'2026-10-27T08:00:00.000Z'};
 const result=planIranCollectionR26({before:{version:NEWS_COLLECTION_R26_VERSION,
  items:[old,recent]},feedReport:{version:'IRAN_NEWS_MULTISOURCE_AUDIT_R24',
  sourceCount:7,sourcesFailed:0,candidatesFound:0,sources:[]},
 articleReport:{version:'IRAN_ARTICLE_DETAIL_AUDIT_R25',articleFailures:0,
  articlesUnchecked:0,articlesChecked:0,articles:[]},now});
 assert.equal(result.report.expiredCandidates,1);
 assert.equal(result.report.candidatesSaved,1);
 assert.deepEqual(result.cache.items,[recent]);
});

test('R26 never replaces a reviewed original title with an unverified feed title',async()=>{
 await inDir(async dataDirectory=>{
  await collectIranNewsR26({dataDirectory,now,fetcher:mockFeedFetch(),dryRun:false});
  const cache=readIranCollectionR26(dataDirectory,{now});
  assert.equal(cache.items.find(item=>item.sourceUrl===gov).originalTitle,'Iran new update');
  assert.equal(cache.items.find(item=>item.sourceUrl===bbc).originalTitle,'Saudi security update');
  assert.equal(cache.items.length,2);
 });
});
