import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore,hash} from '../scripts/iran-progress/store.mjs';
import {classifyR3Article,buildReferenceFlowR3,CLASSIFIER_VERSION} from '../lib/iran-progress/reference-flow-r3.mjs';
import {collectNewsR3,storedR3Signals} from '../scripts/iran-progress/continuous-news-r3.mjs';
import {resolveR3Events,storedR3Candidates} from '../scripts/iran-progress/operate-r3.mjs';

const NOW=Date.parse('2026-10-19T01:00:00Z');
const OLD='IRAN_EVENT_RULES_R3_2';
const rows=[
 ['2026-10-12','Another Tanker Catches Fire in Strait of Hormuz after Hitting Sea Mine','https://www.tasnimnews.ir/en/news/2026/10/12/100/sea-mine'],
 ['2026-10-12','Iran Defense Chief Warns US against Playing with Fire','https://www.tasnimnews.ir/en/news/2026/10/12/101/iran-warning'],
 ['2026-10-13','Iranian Deputy FM Warns US of Wider Consequences of War','https://www.tasnimnews.ir/en/news/2026/10/13/102/iran-warning'],
 ['2026-10-13',"Saudi minister vows 'serious response' to Houthi attacks on airports",'https://www.bbc.co.uk/news/articles/saudi-warning'],
 ['2026-10-14','Container Ship Sinks in Strait of Hormuz: IRGC Navy','https://www.tasnimnews.ir/en/news/2026/10/14/103/ship'],
 ['2026-10-14','Houthi missile hits Aramco building after Saudi-led coalition strike on Yemen fuel depot','https://www.bbc.co.uk/news/articles/houthi-building'],
 ['2026-10-15','Houthi missile attack on Yemeni presidential palace kills five, minister says','https://www.bbc.co.uk/news/articles/yemen-palace'],
 ['2026-10-16','Another Tanker Catches Fire in Eastern Strait of Hormuz','https://www.tasnimnews.ir/en/news/2026/10/16/104/tanker'],
 ['2026-10-17','Egypt’s el-Sisi vows to defend Saudi Arabia from Houthi attacks','https://www.aljazeera.com/news/2026/10/17/egypt'],
 ['2026-10-18','Iran war live: Ships attacked off UAE, Yemen; drones downed near Riyadh','https://www.aljazeera.com/news/liveblog/2026/10/18/iran-war'],
 ['2026-10-18','Iran Warns of More Devastating Response to Any US-Israeli Aggression','https://www.tasnimnews.ir/en/news/2026/10/18/105/iran-warning']
].map(([date,title,sourceUrl])=>({date,title,sourceUrl,summary:''}));
function setup(){
 const store=openStore(':memory:');
 const legacy=[],queue=[];
 for(const a of rows){
  const h=hash(a),candidate=classifyR3Article(a),ev=candidate.accepted?candidate:{
   accepted:true,rule:'MILITARY_ATTACK',type:'MILITARY',delta:-12,
   date:a.date,sourceUrl:a.sourceUrl,eventKey:JSON.stringify([a.date,'MILITARY_ATTACK',a.title.toLowerCase()]),
   evidence:a.title,actor:'IRAN',target:'ships',location:'riyadh',eventVerified:false
  };
  legacy.push({...ev,receiptHash:h});
  store.putSource('news-metadata:'+h,a,NOW-3600000);
  store.putDecision('news-flow-r3:'+OLD+':'+h,{...ev,receiptHash:h},NOW-3600000);
  queue.push({url:a.sourceUrl,article:a,analyzedAt:NOW-3600000,
   fetchedAt:NOW,classifierVersion:OLD,contentHash:h,reason:'ACCEPTED'});
 }
 store.checkpoint('continuous-news-queue-r3',{items:queue});
 store.checkpoint('reference-flow-continuous-news-r3',{
  classifierVersion:OLD,events:legacy,eventsHash:hash(legacy)});
 store.checkpoint('reference-flow-last-valid-r3',{
  score:36.3,version:'IRAN_REFERENCE_FLOW_R3',eventCount:11,
  publishedAt:NOW-3600000,historyMode:'RETROSPECTIVE_PUBLICATION_DATE'});
 return {store,legacy};
}
const emptyFeed=()=>new Response('<rss><channel></channel></rss>');
const args={now:NOW,feeds:[{id:'test',url:'https://example.invalid/test/rss',kind:'xml'}],fetcher:emptyFeed};
test('V46 R3_2 to R3_3 rollover keeps 11 receipt bodies and immutable earlier 11 decisions',async()=>{
 const {store,legacy}=setup();
 try{
  const originals=store.db.prepare('SELECT id,body,stored_at FROM sources ORDER BY id').all();
  const oldDecisions=store.db.prepare("SELECT id,body,stored_at FROM decisions WHERE id LIKE 'news-flow-r3:IRAN_EVENT_RULES_R3_2:%' ORDER BY id").all();
  assert.equal(legacy.length,11);assert.equal(CLASSIFIER_VERSION,'IRAN_EVENT_RULES_R3_3');
  const report=await collectNewsR3(store,args);
  const current=storedR3Signals(store);
  assert.equal(report.storageVerified,true);
  assert.equal(current.length,10);
  assert.equal(current.some(e=>e.sourceUrl.includes('/liveblog/')),false);
  assert.equal(current.filter(e=>e.rule==='MARITIME_DISRUPTION').length,3);
  assert.equal(current.filter(e=>e.rule==='MILITARY_WARNING').length,5);
  assert.equal(current.filter(e=>e.rule==='MILITARY_ATTACK').length,2);
  assert.deepEqual(store.db.prepare('SELECT id,body,stored_at FROM sources ORDER BY id').all(),originals);
  assert.deepEqual(store.db.prepare("SELECT id,body,stored_at FROM decisions WHERE id LIKE 'news-flow-r3:IRAN_EVENT_RULES_R3_2:%' ORDER BY id").all(),oldDecisions);
  const decisions=store.db.prepare("SELECT id,body FROM decisions WHERE id LIKE 'news-flow-r3:IRAN_EVENT_RULES_R3_3:%'").all();
  assert.equal(decisions.length,11);
  const dropped=decisions.map(d=>JSON.parse(d.body)).find(d=>d.reason==='COMPOUND_LIVEBLOG_REQUIRES_EVENT_REVIEW');
  assert.equal(dropped.accepted,false);
  const saved=store.getCheckpoint('reference-flow-last-valid-r3');
  assert.equal(saved.score,36.3);
  assert.equal(saved.eventCount,11);
 }finally{store.close();}
});
test('V46 new-version collector rolls over exactly once, without duplicate or old-score backfill',async()=>{
 const {store}=setup();
 try{
  const first=await collectNewsR3(store,args);
  const projected=buildReferenceFlowR3(resolveR3Events(storedR3Candidates(store)).accepted,{asOfDate:'2026-10-19'});
  assert.equal(first.storageVerified,true);
  assert.equal(projected.score,38.7);
  assert.equal(projected.eventCount,10);
  assert.equal(projected.domains.MILITARY,16);
  assert.equal(projected.domains.MARITIME,20);
  assert.equal(projected.historyMode,'RETROSPECTIVE_PUBLICATION_DATE');
  assert.equal(store.getCheckpoint('reference-flow-last-valid-r3').score,36.3);
  const before=store.db.prepare('SELECT COUNT(*) AS n FROM decisions').get().n;
  const second=await collectNewsR3(store,{...args,now:NOW+3600000});
  const after=store.db.prepare('SELECT COUNT(*) AS n FROM decisions').get().n;
  assert.equal(after,before);
  assert.equal(second.scoreChanged,false);
  assert.equal(storedR3Signals(store).length,10);
  assert.equal(store.getCheckpoint('reference-flow-last-valid-r3').score,36.3);
 }finally{store.close();}
});
test('V46 a later feed outage preserves verified receipts but cannot certify current discovery',async()=>{
 const {store}=setup();
 try{
  await collectNewsR3(store,args);
  const delayed=await collectNewsR3(store,{...args,now:NOW+3600000,
   fetcher:()=>{throw Error('SIMULATED_PROVIDER_FAILURE')}});
  assert.equal(delayed.status,'DISCOVERY_DELAYED');
  assert.equal(delayed.lastDiscoverySuccessAt,NOW);
  assert.equal(storedR3Signals(store).length,10);
  assert.equal(store.getCheckpoint('reference-flow-last-valid-r3').score,36.3);
 }finally{store.close();}
});
