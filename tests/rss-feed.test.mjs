import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rssResponse} from '../worker/rss-feed.mjs';
const xml=readFileSync(new URL('../public/rss.xml',import.meta.url),'utf8');
test('submitted uppercase RSS URL and XML aliases return the same feed without redirect',async()=>{
 for(const path of ['/RSS','/RSS/','/rss','/rss/','/rss.xml','/rss.xml/','/feed.xml']){
  const response=rssResponse(new Request('https://zgmini.kr'+path),xml);
  assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/rss+xml; charset=utf-8');assert.equal(await response.text(),xml);
 }
});
test('RSS supports HEAD and isolates unrelated URLs and write methods',async()=>{
 assert.equal(await rssResponse(new Request('https://zgmini.kr/RSS',{method:'HEAD'}),xml).text(),'');
 assert.equal(rssResponse(new Request('https://zgmini.kr/RSS',{method:'POST'}),xml).status,405);
 assert.equal(rssResponse(new Request('https://zgmini.kr/api/market-score'),xml),null);
 assert.equal((xml.match(/<item>/g)||[]).length,3);
 for(const match of xml.matchAll(/<(?:link|guid[^>]*)>([^<]+)</g))assert.equal(new URL(match[1]).hostname,'zgmini.kr');
 assert(!xml.includes('<pubDate>'),'do not fabricate publication dates');
});
