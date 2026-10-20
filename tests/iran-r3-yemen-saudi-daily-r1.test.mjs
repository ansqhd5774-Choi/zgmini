import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyR3Article,CLASSIFIER_VERSION} from '../lib/iran-progress/reference-flow-r3.mjs';
import {collectNewsR3} from '../scripts/iran-progress/continuous-news-r3.mjs';
import {calculateOperationalR3} from '../scripts/iran-progress/operate-r3.mjs';
import {openStore} from '../scripts/iran-progress/store.mjs';
import {iranView} from '../lib/iran-progress/view.mjs';
import {kstCalendarDate} from '../lib/iran-progress/chart-history.mjs';

const url='https://www.bbc.com/news/articles/iran-r3-fixture';
const article=(title,date='2026-10-20')=>({title,date,sourceUrl:url,summary:''});

test('R3_4 detects independently reported Yemeni camp, Taiz and Saudi defense events',()=>{
 assert.equal(CLASSIFIER_VERSION,'IRAN_EVENT_RULES_R3_4');
 for(const title of [
  'Houthi attack kills 58 at Yemen government training camp, governor says',
  'Houthis attack besieged city in Yemen',
  'Houthi missile strikes residential area in Taiz',
  'Saudi coalition strikes Houthi military camp in Shabwa',
 ]) {
  const got=classifyR3Article(article(title));
  assert.equal(got.rule,'MILITARY_ATTACK',title);
  assert.equal(got.delta,-12,title);
  assert.equal(got.eventVerified,false);
  assert.equal(got.eventDate,null);
 }
 assert.equal(classifyR3Article(article('Coalition intercepts Houthi missile over Riyadh')).rule,'MILITARY_INTERCEPTION');
});

test('regional headlines cannot turn proposals, unverified claims or defensive pledges into attacks',()=>{
 for(const title of [
  'Houthis could attack residential area in Taiz',
  'Houthis did not attack the city in Yemen',
  'Why Houthis attack the city in Yemen',
  'UK to send jets to defend Saudi Arabia from Houthi attacks',
 ])assert.equal(classifyR3Article(article(title)).accepted,false,title);
});

test('same-day provisional score rebuilds at KST midnight without fabricating a new event',async()=>{
 const store=openStore(':memory:');
 const at20=Date.parse('2026-10-20T14:59:00Z'),at21=Date.parse('2026-10-20T15:01:00Z');
 const feed='<rss><channel>'+
  '<item><title>Houthi attack kills 58 at Yemen government training camp</title><link>https://www.bbc.com/news/articles/shabwa-19</link><pubDate>Mon, 19 Oct 2026 12:00:00 GMT</pubDate></item>'+
  '<item><title>Houthis attack besieged city in Yemen</title><link>https://www.bbc.com/news/articles/taiz-20</link><pubDate>Tue, 20 Oct 2026 05:00:00 GMT</pubDate></item>'+
  '</channel></rss>';
 const feeds=[{id:'bbc',url:'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',kind:'xml'}];
 const fetcher=async()=>new Response(feed);
 try{
  assert.equal(kstCalendarDate(at20),'2026-10-20');
  assert.equal(kstCalendarDate(at21),'2026-10-21');
  const report20=await collectNewsR3(store,{now:at20,feeds,fetcher});
  assert.equal(report20.accepted,2);
  assert.equal(report20.pending,0);
  const raw20=calculateOperationalR3(store,at20);
  assert.equal(raw20.asOfDate,'2026-10-20');
  assert.equal(raw20.eventCount,2);
  assert.equal(raw20.newsCollection.status,'UPDATED');
  const provisional20=iranView(raw20,at20);
  assert.equal(provisional20.chartHistory.length,14);
  assert.equal(provisional20.chartHistory.at(-1).date,'2026-10-20');
  assert.equal(provisional20.chartHistory.at(-1).value,provisional20.score);
  assert.equal(provisional20.displayEstimate.probability,false);
  store.checkpoint('reference-flow-last-valid-r3',raw20);
  const report21=await collectNewsR3(store,{now:at21,feeds,fetcher});
  assert.equal(report21.accepted,0);
  assert.equal(report21.pending,0);
  const raw21=calculateOperationalR3(store,at21);
  assert.equal(raw21.asOfDate,'2026-10-21');
  assert.equal(raw21.score,raw20.score);
  assert.equal(raw21.newsCollection.scoreChanged,false);
  const provisional21=iranView(raw21,at21);
  assert.equal(provisional21.chartHistory.length,14);
  assert.equal(provisional21.chartHistory.at(-1).date,'2026-10-21');
  assert.equal(provisional21.chartHistory.at(-1).value,provisional21.score);
  assert.equal(provisional21.score,provisional20.score);
  assert.equal(provisional21.chartHistory.at(-1).carried,true);
 }finally{store.close();}
});

test('old 14-day queue entries do not falsely keep current discovery in analysis pending',async()=>{
 const store=openStore(':memory:');
 const now=Date.parse('2026-10-21T01:00:00Z');
 const oldArticle=article('Houthis fired missiles at Aden airport','2026-09-11');
 const oldQueue={url:oldArticle.sourceUrl,article:oldArticle,analyzedAt:now-40*86400000,classifierVersion:'IRAN_EVENT_RULES_R3_2',contentHash:'old'};
 try{
  store.checkpoint('continuous-news-queue-r3',{items:[oldQueue]});
  const report=await collectNewsR3(store,{now,feeds:[{id:'bbc',url:'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',kind:'xml'}],fetcher:async()=>new Response('<rss><channel></channel></rss>')});
  assert.equal(report.pending,0);
  assert.equal(report.status,'NO_NEW_ARTICLES');
 }finally{store.close();}
});
