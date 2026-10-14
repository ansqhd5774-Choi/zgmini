import {test} from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {openStore} from '../scripts/iran-progress/store.mjs';
import {collectNewsR2,parseR2Feed,storedR2Signals,R2_NEWS_KEY} from '../scripts/iran-progress/continuous-news-r2.mjs';
const now=Date.UTC(2026,9,15),url='https://www.iaea.org/newscenter/news/iran-inspections';
const rss=title=>`<rss><channel><item><title>${title}</title><link>${url}</link><pubDate>Wed, 14 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>`;
const feeds=[{id:'iaea',url:'https://www.iaea.org/feeds/topnews',kind:'xml'}];
async function withStore(run){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iran-r2-'));const store=openStore(path.join(dir,'iran.sqlite'));try{await run(store);}finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}}
test('RSS and Atom preserve published date, reject undated corrections, unsafe URLs and DTD',()=>{
 assert.equal(parseR2Feed(rss('Iran nuclear inspections resumed'))[0].date,'2026-10-14');
 const atom=`<feed><entry><title>Iran held indirect talks with US</title><link rel="self" href="https://evil.test/self"/><link rel="alternate" href="https://www.gov.uk/news/iran"/><published>2026-10-13T12:00:00Z</published><updated>2026-10-15T12:00:00Z</updated></entry></feed>`;
 assert.equal(parseR2Feed(atom)[0].date,'2026-10-13');
 assert.equal(parseR2Feed(atom.replace(/<published>.*?<\/published>/,'')).length,0);
 assert.equal(parseR2Feed(rss('Iran nuclear inspections resumed').replace(url,'https://evil.test/iran')).length,0);
 assert.throws(()=>parseR2Feed('<!DOCTYPE rss><rss/>'),/FORMAT_INVALID/);
});
test('content corrections and classifier changes reanalyze exclusions without altering R1',()=>withStore(async store=>{
 let title='Iran considers inspection options';const fetcher=async()=>new Response(rss(title));
 store.checkpoint('continuous-news-last-run-r1',{status:'COMPLETE',checkedAt:123});
 let r=await collectNewsR2(store,{now,fetcher,feeds});assert.equal(r.status,'ANALYZED_NO_CHANGE');assert.equal(storedR2Signals(store).length,0);
 title='Iran nuclear inspections resumed';r=await collectNewsR2(store,{now:now+1000,fetcher,feeds});assert.equal(r.accepted,1);assert.equal(storedR2Signals(store).length,1);
 r=await collectNewsR2(store,{now:now+2000,fetcher,feeds});assert.equal(r.analyzed,0);assert.equal(r.status,'NO_NEW_ARTICLES');
 const queue=store.getCheckpoint('continuous-news-queue-r2');queue.items[0].classifierVersion='OLD';store.checkpoint('continuous-news-queue-r2',queue);
 r=await collectNewsR2(store,{now:now+3000,fetcher,feeds});assert.equal(r.analyzed,1);assert.equal(r.status,'ANALYZED_NO_CHANGE');assert.equal(r.scoreChanged,false);
 assert.deepEqual(store.getCheckpoint('continuous-news-last-run-r1'),{status:'COMPLETE',checkedAt:123});
}));
test('discovery failures preserve last success and signals; bounded analysis resumes pending work',()=>withStore(async store=>{
 const good=async()=>new Response(rss('Iran nuclear inspections resumed'));
 await collectNewsR2(store,{now,fetcher:good,feeds});
 const r=await collectNewsR2(store,{now:now+1000,fetcher:async()=>new Response('',{status:503}),feeds});
 assert.equal(r.status,'DISCOVERY_DELAYED');assert.equal(r.lastDiscoverySuccessAt,now);assert.equal(storedR2Signals(store).length,1);
 const thrown=await collectNewsR2(store,{now:now+2000,fetcher:async()=>{throw Error('DNS_FAILED');},feeds});
 assert.equal(thrown.status,'DISCOVERY_DELAYED');assert.equal(thrown.lastDiscoverySuccessAt,now);assert.equal(storedR2Signals(store).length,1);
 const cp=store.getCheckpoint(R2_NEWS_KEY);cp.events[0].delta=99;store.checkpoint(R2_NEWS_KEY,cp);assert.throws(()=>storedR2Signals(store),/CHECKPOINT_INVALID/);
}));
