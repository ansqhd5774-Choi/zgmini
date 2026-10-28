import test from 'node:test';
import assert from 'node:assert/strict';
import {IRAN_GOVUK_R24_TOPIC_FEEDS,IRAN_ALJAZEERA_TOPIC_ARCHIVE_R32}
 from '../scripts/iran-progress/news-display-multisource-audit-r24.mjs';
import {IRAN_DISPLAY_FEEDS_R26} from '../scripts/iran-progress/news-display-source-registry-r26.mjs';
import {IRAN_NEWS_SERVER_SHADOW_SOURCES,probeIranNewsServerR39,
 boundedIranNewsServerFetcherR39,handleIranNewsShadowR39}
 from '../worker/iran-news-server-shadow-r39.mjs';

const now=Date.parse('2026-10-28T12:00:00Z');
const links={
 tasnim:'https://www.tasnimnews.ir/en/news/2026/10/27/987/iran-ceasefire-talks',
 govuk:'https://www.gov.uk/government/news/iran-ceasefire-talks',
 'guardian-iran':'https://www.theguardian.com/world/2026/oct/27/iran-ceasefire-talks',
 'dw-world':'https://www.dw.com/en/iran-ceasefire-talks/a-79776122',
 'bbc-middle-east':'https://www.bbc.com/news/articles/iran-ceasefire-talks',
 aljazeera:'https://www.aljazeera.com/news/2026/10/27/iran-ceasefire-talks',
 'un-middle-east':'https://news.un.org/en/story/2026/10/1168654',
};
const rss=url=>`<rss><channel><item><title>Iran ceasefire talks</title><link>${url}</link>`+
 '<pubDate>Tue, 27 Oct 2026 03:00:00 GMT</pubDate></item></channel></rss>';
const atom=`<feed><entry><title>Iran ceasefire talks</title><updated>2026-10-27T03:00:00Z</updated>`+
 `<link rel="alternate" href="${links.govuk}"/></entry></feed>`;
const tasnim=`<!doctype html><html><a href="/en/news/2026/10/27/987/iran-ceasefire-talks">Iran news</a></html>`;
const aljazeeraArchive=`<!doctype html><html><a href="/news/2026/10/27/iran-ceasefire-talks">Iran archive</a></html>`;
const article=url=>`<!doctype html><html><head><link rel="canonical" href="${url}">`+
 `<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org',
 '@type':'NewsArticle',headline:'Iran ceasefire talks',datePublished:'2026-10-27T08:00:00Z',
 articleBody:'Iran and Saudi officials discussed a ceasefire.'})}</script></head>`+
 '<body><article><p>Iran and Saudi officials discussed a ceasefire.</p></article></body></html>';
const govData=JSON.stringify({base_path:'/government/news/iran-ceasefire-talks',
 first_published_at:'2026-10-27T08:00:00Z',title:'Iran ceasefire talks',
 details:{body:'<p>Iran and Saudi officials discussed a ceasefire.</p>'}});
function sourceFor(url){
 if(IRAN_GOVUK_R24_TOPIC_FEEDS.includes(url))return 'govuk';
 return IRAN_DISPLAY_FEEDS_R26.find(item=>item.url===url)?.id;
}
function mockedFetch({fail=null,requests=[]}={}){
 return async(url,options)=>{
  requests.push({url,redirect:options?.redirect});
  const source=sourceFor(url);
  if(source===fail)return new Response('unavailable',{status:503});
  if(source==='govuk')return new Response(atom);
  if(source==='tasnim')return new Response(tasnim);
  if(source==='aljazeera')return new Response(rss(links.aljazeera));
  if(source)return new Response(rss(links[source]));
  if(url===IRAN_ALJAZEERA_TOPIC_ARCHIVE_R32)return new Response(aljazeeraArchive);
  if(url.startsWith('https://www.gov.uk/api/content/'))return new Response(govData);
  if(Object.values(links).includes(url))return new Response(article(url));
  throw Error('UNEXPECTED_SOURCE_REQUEST');
 };
}

test('R39 isolates seven source article probes with R38 keywords and zero persistence',async()=>{
 const requests=[];
 const report=await probeIranNewsServerR39({now,maxArticles:14,
  fetcher:mockedFetch({requests})});
 assert.equal(report.version,'IRAN_NEWS_SERVER_SHADOW_R39');
 assert.equal(report.status,'REVIEW_REQUIRED');
 assert.equal(report.activeSourceCount,7);
 assert.deepEqual(report.sources.map(item=>item.sourceId),IRAN_NEWS_SERVER_SHADOW_SOURCES);
 assert.equal(report.sourcesWithQualified30Days,7);
 assert.equal(report.qualified30Days,7);
 assert.equal(report.qualified14Days,7);
 assert.equal(report.outgoingRequests,requests.length);
 assert.equal(report.outgoingRequests,18); // 11 publisher feeds plus seven article requests.
 assert.ok(requests.every(item=>item.redirect==='manual'));
 assert.ok(report.articles.every(item=>item.titleVerified&&item.bodyVerified&&
  item.twoStageKeywordsVerified));
 assert.ok(report.articles.every(item=>!Object.hasOwn(item,'body')&&
  !Object.hasOwn(item,'rawHtml')));
 assert.equal(report.d1Written,false);
 assert.equal(report.publicSnapshotModified,false);
 assert.equal(report.schedulerModified,false);
 assert.equal(report.scoreLedgerModified,false);
 assert.equal(report.displayEligible,false);
 assert.equal(report.coverageProven,false);
});

test('R39 makes partial source failure visible, never implying all seven are covered',async()=>{
 const report=await probeIranNewsServerR39({now,fetcher:mockedFetch({fail:'bbc-middle-east'})});
 assert.equal(report.status,'PARTIAL_REVIEW_REQUIRED');
 assert.equal(report.sourceFeedsFailed,1);
 assert.equal(report.sourcesWithQualified30Days,6);
 assert.equal(report.sources.find(item=>item.sourceId==='bbc-middle-east').feedStatus,'SOURCE_FAILED');
 assert.equal(report.d1Written,false);
});

test('R39 rejects arbitrary external URLs, credentials and redirects',async()=>{
 const requests=[];
 const {fetcher}=boundedIranNewsServerFetcherR39(async(url,options)=>{
  requests.push({url,options});return new Response('ok');
 });
 for(const url of ['https://evil.example/rss','http://www.gov.uk/feeds',
  'https://user@www.gov.uk/path','https://www.gov.uk:8443/path',
  'https://www.gov.uk/path#section','https://127.0.0.1/'])
  await assert.rejects(fetcher(url),/R39_UNTRUSTED_FETCH_DESTINATION/);
 assert.equal(requests.length,0);
 await fetcher('https://www.gov.uk/government/news',{redirect:'follow'});
 assert.equal(requests[0].options.redirect,'manual');
});

test('R39 shadow endpoint is disabled without secret and never fetches for unauthorized callers',async()=>{
 const url='https://shadow.example/internal/iran-news-shadow-r39';
 let requests=0;
 const fetcher=()=>{requests++;throw Error('UNAUTHORIZED_FETCH');};
 for(const [request,token,expected] of [
  [new Request(url,{method:'POST'}),undefined,503],
  [new Request(url,{method:'POST'}),'x'.repeat(32),403],
  [new Request(url,{method:'GET'}),'x'.repeat(32),405],
  [new Request('https://shadow.example/other',{method:'POST'}),'x'.repeat(32),404],
 ]){
  const response=await handleIranNewsShadowR39(request,{token,fetcher,now});
  assert.equal(response.status,expected);
 }
 assert.equal(requests,0);
});
