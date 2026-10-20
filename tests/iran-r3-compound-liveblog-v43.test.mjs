import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyR3Article,buildReferenceFlowR3,CLASSIFIER_VERSION}
 from '../lib/iran-progress/reference-flow-r3.mjs';
import {resolveR3Events} from '../scripts/iran-progress/operate-r3.mjs';
import {collectNewsR3} from '../scripts/iran-progress/continuous-news-r3.mjs';
import {openStore,hash} from '../scripts/iran-progress/store.mjs';
const DATE='2026-10-18';
const live=(title='Iran war live: Ships attacked off UAE, Yemen; drones downed near Riyadh')=>({
 title,date:DATE,summary:'',sourceUrl:'https://www.aljazeera.com/news/liveblog/2026/10/18/iran-war'
});
const other=[
 ['2026-10-12','Another Tanker Catches Fire in Strait of Hormuz after Hitting Sea Mine','https://www.tasnimnews.ir/en/news/2026/10/12/100/sea-mine'],
 ['2026-10-12','Iran Defense Chief Warns US against Playing with Fire','https://www.tasnimnews.ir/en/news/2026/10/12/101/iran-warning'],
 ['2026-10-13','Iranian Deputy FM Warns US of Wider Consequences of War','https://www.tasnimnews.ir/en/news/2026/10/13/102/iran-warning'],
 ['2026-10-13',"Saudi minister vows 'serious response' to Houthi attacks on airports",'https://www.bbc.co.uk/news/articles/saudi-warning'],
 ['2026-10-14','Container Ship Sinks in Strait of Hormuz: IRGC Navy','https://www.tasnimnews.ir/en/news/2026/10/14/103/ship'],
 ['2026-10-14','Houthi missile hits Aramco building after Saudi-led coalition strike on Yemen fuel depot','https://www.bbc.co.uk/news/articles/houthi-building'],
 ['2026-10-15','Houthi missile attack on Yemeni presidential palace kills five, minister says','https://www.bbc.co.uk/news/articles/yemen-palace'],
 ['2026-10-16','Another Tanker Catches Fire in Eastern Strait of Hormuz','https://www.tasnimnews.ir/en/news/2026/10/16/104/tanker'],
 ['2026-10-17','Egypt’s el-Sisi vows to defend Saudi Arabia from Houthi attacks','https://www.aljazeera.com/news/2026/10/17/egypt'],
 ['2026-10-18','Iran Warns of More Devastating Response to Any US-Israeli Aggression','https://www.tasnimnews.ir/en/news/2026/10/18/105/iran-warning']
].map(([date,title,sourceUrl])=>({date,title,sourceUrl,summary:''}));
test('V43 classifier version increments only to isolate new immutable rule decisions',()=>{
 assert.equal(CLASSIFIER_VERSION,'IRAN_EVENT_RULES_R3_4');
});
test('V40 real L10 multi-incident liveblog no longer becomes Iranian attack',()=>{
 const x=classifyR3Article(live());
 assert.deepEqual(x,{accepted:false,reason:'COMPOUND_LIVEBLOG_REQUIRES_EVENT_REVIEW'});
});
test('another saved version of the same liveblog does not masquerade as current headline',()=>{
 const x=classifyR3Article(live('Iran war live: Israeli settlers attack EU diplomats; drones target Riyadh'));
 assert.equal(x.reason,'COMPOUND_LIVEBLOG_REQUIRES_EVENT_REVIEW');
});
test('pipe and bullet multi-incident liveblogs also hold, even if attack mentioned',()=>{
 for(const sep of [' | ',' • ']){
  const x=classifyR3Article(live('Iran war live: Ships attacked off UAE, Yemen'+sep+'drones downed near Riyadh'));
  assert.equal(x.reason,'COMPOUND_LIVEBLOG_REQUIRES_EVENT_REVIEW');
 }
});
test('single-incident liveblog is not automatically blocked',()=>{
 const x=classifyR3Article(live('Iran war live: Iran launched missiles at US base'));
 assert.equal(x.accepted,true);assert.equal(x.rule,'MILITARY_ATTACK');
 assert.equal(x.actor,'IRAN');
});
test('R3 other validated military, warning and sea news unchanged',()=>{
 for(const row of other){
  const r=classifyR3Article(row);assert.equal(r.accepted,true,row.title);
 }
});
test('R3 exact 10-lead candidate reproduces V42 PC shadow 38.7 without changing weights',()=>{
 const events=other.map(a=>classifyR3Article(a)).filter(x=>x.accepted);
 const held=classifyR3Article(live());
 assert.equal(held.accepted,false);
 const resolved=resolveR3Events(events);
 const result=buildReferenceFlowR3(resolved.accepted,{asOfDate:DATE});
 assert.equal(result.eventCount,10);
 assert.equal(result.score,38.7);
 assert.equal(result.domains.MILITARY,16);
 assert.equal(result.domains.MARITIME,20);
 assert.equal(result.weights.MILITARY,0.2);
 assert.equal(result.weights.MARITIME,0.15);
});
test('reported articles are not independently verified incidents or real occurrence dates',()=>{
 const x=classifyR3Article(other[5]);
 assert.equal(x.eventDate,null);assert.equal(x.eventVerified,false);
 assert.equal(x.claimVerification,'SINGLE_SOURCE_REPORT');
});
test('previous R3_2 saved receipt is re-evaluated with version-scoped immutable decisions',async()=>{
 const store=openStore(':memory:');const now=Date.parse('2026-10-19T01:00:00Z'),a=live();
 try{
  store.putSource('news-metadata:'+hash(a),a,now-3600000);
  store.checkpoint('continuous-news-queue-r3',{items:[{url:a.sourceUrl,article:a,analyzedAt:now-3600000,classifierVersion:'IRAN_EVENT_RULES_R3_2',contentHash:hash(a),reason:'ACCEPTED'}]});
  const previous={accepted:true,rule:'MILITARY_ATTACK',type:'MILITARY',delta:-12,date:DATE,
    sourceUrl:a.sourceUrl,receiptHash:hash(a),eventKey:'old-revision'};
  store.checkpoint('reference-flow-continuous-news-r3',{classifierVersion:'IRAN_EVENT_RULES_R3_2',
    events:[previous],eventsHash:hash([previous])});
  const report=await collectNewsR3(store,{now,fetcher:async()=>new Response('<rss><channel></channel></rss>'),
    feeds:[{id:'test',url:'https://example.test/rss',kind:'xml'}]});
  const current=store.getCheckpoint('reference-flow-continuous-news-r3');
  assert.equal(report.storageVerified,true);
  assert.equal(current.classifierVersion,CLASSIFIER_VERSION);
  assert.equal(current.events.length,0);
  const decisions=store.db.prepare("SELECT body FROM decisions WHERE id LIKE 'news-flow-r3:IRAN_EVENT_RULES_R3_4:%'").all();
  assert.equal(decisions.length,1);
  assert.equal(JSON.parse(decisions[0].body).reason,'COMPOUND_LIVEBLOG_REQUIRES_EVENT_REVIEW');
  assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM sources").get().n,1);
  assert.equal(store.getCheckpoint('continuous-news-queue-r3').items[0].article.title,a.title);
 }finally{store.close();}
});
