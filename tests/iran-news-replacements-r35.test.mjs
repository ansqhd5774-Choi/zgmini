import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {IRAN_DISPLAY_FEEDS_R26} from '../scripts/iran-progress/news-display-source-registry-r26.mjs';
import {auditIranMultisourceCollectionR24,newsR24SourceUrl}
 from '../scripts/iran-progress/news-display-multisource-audit-r24.mjs';
import {auditIranArticleDetailsR25}
 from '../scripts/iran-progress/news-display-article-audit-r25.mjs';
import {collectIranNewsR26,readIranCollectionR26}
 from '../scripts/iran-progress/news-display-collection-r26.mjs';

const now=Date.parse('2026-10-28T08:00:00Z');
const guardian='https://www.theguardian.com/global-development/2026/oct/27/fears-grow-for-iranian-athletes-on-death-row-as-mountaineer-latest-to-be-hanged';
const dw='https://www.dw.com/en/will-elections-in-israel-change-its-iran-approach/a-79776122';
const dwRssUrl=dw+'?maca=en-rss-en-world-4025-xml-mrss';
const publishers=IRAN_DISPLAY_FEEDS_R26.filter(x=>['guardian-iran','dw-world'].includes(x.id));
const rss=(title,url,date)=>`<?xml version="1.0"?><rss><channel><item><title>${title}</title>`+
 `<link>${url}</link><pubDate>${date}</pubDate></item></channel></rss>`;
const guardianFeed=rss('Iranian athletes face execution',guardian,'Tue, 27 Oct 2026 09:30:30 GMT');
const dwFeed=rss('Will elections in Israel change its Iran approach?',dwRssUrl,
 'Mon, 26 Oct 2026 20:07:00 GMT');
const page=(url,title,published)=>`<!doctype html><html><head>`+
 `<link rel="canonical" href="${url}">`+
 `<script type="application/ld+json">${JSON.stringify({'@type':'NewsArticle',
  headline:title,datePublished:published})}</script>`+
 '</head><body><article><p>'+('Iran and Saudi Arabia discussed regional security and ceasefire prospects. ').repeat(8)+
 '</p></article></body></html>';
const bodies=new Map([
 [guardian,page(guardian,'Iranian athletes face execution','2026-10-27T09:30:30Z')],
 [dw,page(dw,'Will elections in Israel change its Iran approach?',
  '2026-10-27T13:31:42.632Z')],
]);
const mockFetcher=url=>{
 if(url===publishers[0].url)return Promise.resolve(new Response(guardianFeed));
 if(url===publishers[1].url)return Promise.resolve(new Response(dwFeed));
 if(bodies.has(url))return Promise.resolve(new Response(bodies.get(url)));
 throw Error('R35_UNEXPECTED_REQUEST');
};

test('R35 default seven retain no IAEA automatic requests and both replacement RSS sources are official',()=>{
 assert.equal(IRAN_DISPLAY_FEEDS_R26.length,7);
 assert.equal(publishers.length,2);
 assert.equal(publishers[0].url,'https://www.theguardian.com/world/iran/rss');
 assert.equal(publishers[1].url,'https://rss.dw.com/xml/rss-en-world');
 assert.ok(IRAN_DISPLAY_FEEDS_R26.every(x=>!x.id.startsWith('iaea-')));
 assert.equal(newsR24SourceUrl('guardian-iran',guardian),guardian);
 assert.equal(newsR24SourceUrl('dw-world',dwRssUrl),dw);
 assert.equal(newsR24SourceUrl('dw-world','https://evil.example/a-79776122'),null);
 assert.equal(newsR24SourceUrl('guardian-iran','http://www.theguardian.com/world/a'),null);
});

test('R35 verified source feed -> original article -> 30-day review; 27 Oct is not delayed',async()=>{
 const requested=[];
 const fetcher=async url=>{requested.push(url);return mockFetcher(url);};
 const feed=await auditIranMultisourceCollectionR24({now,feeds:publishers,fetcher});
 assert.equal(feed.sourceCount,2);
 assert.equal(feed.sourcesFailed,0);
 assert.equal(feed.candidatesFound,2);
 assert.deepEqual(feed.candidates.map(x=>x.sourceUrl),[guardian,dw]);
 const article=await auditIranArticleDetailsR25({now,feedReport:feed,fetcher});
 assert.equal(article.articlesChecked,2);
 assert.equal(article.articleFailures,0);
 assert.ok(article.articles.every(x=>x.status==='ARTICLE_METADATA_REVIEWED'&&
  x.withinRetentionWindow===true&&x.articleBodyAccessible===true&&
  x.bodyCharacterCount>=200&&x.originalTitleVerified===true&&
  x.rightsVerified===false&&x.displayEligible===false));
 assert.ok(requested.every(url=>!url.includes('iaea.org')));
});

test('R35 only writes private article metadata; never touches score or public news',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'iran-r35-'));
 try{
  writeFileSync(path.join(dir,'iran.sqlite'),'keep score');
  writeFileSync(path.join(dir,'news-display-r1.json'),'keep rights-checked public news');
  const feedCollector=options=>auditIranMultisourceCollectionR24({...options,feeds:publishers});
  const result=await collectIranNewsR26({now,dataDirectory:dir,fetcher:mockFetcher,
   dryRun:false,feedCollector});
  assert.equal(result.sourceCount,2); // The targeted probe covers two new feeds only.
  assert.equal(result.written,true);
  assert.equal(result.candidatesSaved,2);
  assert.equal(result.articleCoverage.requiredSources,7);
  assert.deepEqual(readIranCollectionR26(dir,{now}).items.map(x=>x.sourceId),
   ['dw-world','guardian-iran']);
  assert.equal(readFileSync(path.join(dir,'iran.sqlite'),'utf8'),'keep score');
  assert.equal(readFileSync(path.join(dir,'news-display-r1.json'),'utf8'),
   'keep rights-checked public news');
  assert.equal(result.d1Written,false);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('R35 a blocked publisher article is not passed as verified',async()=>{
 const feed=await auditIranMultisourceCollectionR24({now,feeds:publishers,
  fetcher:mockFetcher});
 const detail=await auditIranArticleDetailsR25({now,feedReport:feed,
  fetcher:url=>url===guardian?Promise.resolve(new Response('Forbidden',{status:403})):
   mockFetcher(url)});
 assert.equal(detail.articleFailures,1);
 assert.equal(detail.articles.find(x=>x.sourceId==='guardian-iran').status,'ARTICLE_FETCH_FAILED');
 assert.equal(detail.articles.find(x=>x.sourceId==='dw-world').status,'ARTICLE_METADATA_REVIEWED');
});
