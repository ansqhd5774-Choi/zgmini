import test from 'node:test';import assert from 'node:assert/strict';
import {classifyR3Article,buildReferenceFlowR3} from '../lib/iran-progress/reference-flow-r3.mjs';
import {validateReferenceFlowR3} from '../lib/iran-progress/reference-public-r3.mjs';
import {resolveR3Events} from '../scripts/iran-progress/operate-r3.mjs';
import {parseR3Feed,collectNewsR3} from '../scripts/iran-progress/continuous-news-r3.mjs';
import {openStore,hash} from '../scripts/iran-progress/store.mjs';
import {IRAN_FLOW_R3_KEY} from '../lib/iran-progress/reference-flow-r3.mjs';
import {storedIranProgressResponse} from '../worker/iran-progress-public.mjs';
import {publishReferenceFlowR3} from '../scripts/iran-progress/publication.mjs';
import {iranView} from '../lib/iran-progress/view.mjs';
const a=(title,sourceUrl='https://www.bbc.com/news/articles/example',summary='')=>({title,sourceUrl,summary,date:'2026-10-17'});
const event=title=>classifyR3Article(a(title));
test('stored Saudi Houthi casualty and building reports count, explanatory replays do not',()=>{
 for(const title of [
  'Houthi missile attack on Yemeni presidential palace kills five, minister says',
  'Houthi missile hits Aramco building after Saudi-led coalition strike on Yemen fuel depot',
 ]){const result=event(title);assert.equal(result.rule,'MILITARY_ATTACK',title);assert.equal(result.delta,-12);}
 assert.equal(event('Houthi missile attack on Yemeni presidential palace kills five, minister says').target,'palace');
 assert.equal(event('Houthi missile hits Aramco building after Saudi-led coalition strike on Yemen fuel depot').target,'building');
 for(const title of ['Houthis strike Yemen’s Aden: What that means','Houthi missile attack on Yemen palace could kill five','Houthi missile attack on Yemen palace failed to kill five'])assert.equal(event(title).accepted,false,title);
 assert.equal(event("Saudi minister vows 'serious response' to Houthi attacks on airports").rule,'MILITARY_WARNING');
});
test('regional executed attacks, interception and threats are distinct',()=>{
 for(const[title,rule]of [['Houthis fired missiles at Aden airport','MILITARY_ATTACK'],['Saudi Arabia strikes Sanaa in Yemen','MILITARY_ATTACK'],['Houthis vow more attacks on Saudi airports','MILITARY_WARNING'],['Saudi Arabia intercepted Houthi missiles','MILITARY_INTERCEPTION'],['Houthi tanker was attacked in Red Sea','MARITIME_DISRUPTION']])assert.equal(event(title).rule,rule,title);
 assert.equal(event('Houthis fired missiles at Aden airport').eventDate,null);
 assert.equal(event('Houthis fired missiles at Aden airport').actor,'HOUTHI');
 for(const title of ['Houthis may attack Saudi airport','Houthis did not attack Aden airport','Why Houthis attack Saudi airports','Ukraine fired missiles at Russian airport','Saudi airport will reopen after Houthi attack','Iran ready to help end Saudi-Yemen conflict'])assert.equal(event(title).accepted,false,title);
 assert.equal(classifyR3Article(a('Iran considers next steps',undefined,'Iran launched missiles at US base')).accepted,false);
 assert.equal(classifyR3Article(a('Houthis fired missiles at Aden airport','https://www.bbc.com.evil.test/news')).accepted,false);
});
test('deterministic duplicate handling preserves distinct places, targets and reported actors',()=>{
 const first=event('Houthis fired missiles at Aden airport'),other=classifyR3Article(a('Houthis fired missiles at Riyadh airport','https://www.bbc.com/news/articles/riyadh'));
 const copy={...first,sourceUrl:'https://www.aljazeera.com/news/example'};
 const resolved=resolveR3Events([first,other,copy]);const flow=buildReferenceFlowR3(resolved.accepted,{asOfDate:'2026-10-17'});
 assert.equal(flow.eventCount,2);assert.equal(flow.score,45.2);assert.equal(flow.domains.MILITARY,26);
 assert.deepEqual(flow,buildReferenceFlowR3(resolveR3Events([copy,other,first]).accepted,{asOfDate:'2026-10-17'}));
 assert.equal(buildReferenceFlowR3(resolved.accepted,{asOfDate:'2026-10-18'}).score,flow.score);
 assert.equal(flow.unobservedDomains.length,4);assert.equal(flow.probability,false);
 const body={...flow,publishedAt:Date.parse('2026-10-18T01:00:00Z'),collectionCheckedAt:Date.parse('2026-10-18T00:00:00Z'),newsCollection:{status:'UPDATED'},events:flow.ledger};
 assert.equal(validateReferenceFlowR3(body,body.publishedAt),true);assert.equal(validateReferenceFlowR3({...body,observedDomains:['FAKE']},body.publishedAt),false);
});
test('RSS publication date and summary context are preserved without fetching paid articles',()=>{
 const rows=parseR3Feed('<rss><channel><item><title>Missiles hit Aden airport</title><description>Iran-backed Houthis reported an attack in Yemen.</description><link>https://www.bbc.com/news/articles/test</link><pubDate>Sat, 17 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>');
 assert.equal(rows.length,1);assert.equal(rows[0].date,'2026-10-17');assert.equal(classifyR3Article(rows[0]).rule,'MILITARY_ATTACK');assert.throws(()=>parseR3Feed('<!DOCTYPE rss><rss/>'),/FORMAT_INVALID/);
});
test('one failed source does not stop healthy discovery and R2 checkpoint stays intact',async()=>{
 const store=openStore(':memory:'),now=Date.parse('2026-10-18T01:00:00Z');
 try{store.checkpoint('reference-flow-last-valid-r2',{score:44.7});const report=await collectNewsR3(store,{now,feeds:[{id:'failed',url:'https://www.iaea.org/feeds/topnews',kind:'xml'},{id:'bbc',url:'https://feeds.bbci.co.uk/rss',kind:'xml'}],fetcher:async url=>url.includes('iaea')?Response.json({}, {status:503}):new Response('<rss><channel><item><title>Houthis fired missiles at Aden airport</title><link>https://www.bbc.com/news/articles/test</link><pubDate>Sat, 17 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>')});
 assert.equal(report.feeds[0].status,'DISCOVERY_DELAYED');assert.equal(report.accepted,1);assert.equal(report.storageVerified,true);assert.equal(store.getCheckpoint('reference-flow-last-valid-r2').score,44.7);
 assert.equal(store.getCheckpoint('reference-flow-continuous-news-r3').events.length,1);
 }finally{store.close();}
});
test('R3 reports rule acceptance separately from actually invoking Ollama',async()=>{
 const store=openStore(':memory:'),now=Date.parse('2026-10-18T01:00:00Z');
 try{
  const feed='<rss><channel><item><title>Houthis fired missiles at Aden airport</title><link>https://www.bbc.com/news/articles/test-attack</link><pubDate>Sat, 17 Oct 2026 12:00:00 GMT</pubDate></item><item><title>Iran considers next steps</title><link>https://www.bbc.com/news/articles/test-opinion</link><pubDate>Sat, 17 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>';
  const report=await collectNewsR3(store,{now,feeds:[{id:'bbc',url:'https://feeds.bbci.co.uk/rss',kind:'xml'}],fetcher:async()=>new Response(feed)});
  assert.equal(report.classifierMethod,'HEADLINE_RULES_R3_NOT_OLLAMA');
  assert.equal(report.classifiedUnique,2);
  assert.equal(report.matchedRuleUnique,1);
  assert.equal(report.unmatchedRuleUnique,1);
  assert.equal(report.nonMatchReasons.OUT_OF_SCOPE,1);
 }finally{store.close();}
});
test('R3 reader/view and timestamp readback are independent of R2; invalid R3 fails closed',async()=>{
 const now=Date.parse('2026-10-18T01:00:00Z'),flow=buildReferenceFlowR3([event('Houthis fired missiles at Aden airport')],{asOfDate:'2026-10-18'});
 const {ledger,...fields}=flow;const body={...fields,publishedAt:now,collectionCheckedAt:now,newsCollection:{status:'UPDATED'},events:ledger};
 let row,writes=0;const remote={query:async()=>({results:row?[row]:[]}),request:async(_,batch)=>{assert.equal(batch[0].params[0],IRAN_FLOW_R3_KEY);writes++;row={body:batch[0].params[1],stored_at:now};throw Error('timeout');}};
 assert.equal((await publishReferenceFlowR3(remote,'test',body,{now})).status,'VERIFIED');assert.equal(writes,1);
 const db={prepare:()=>({bind:key=>({first:async()=>key===IRAN_FLOW_R3_KEY?row:null})})};
 const response=await storedIranProgressResponse(new Request('https://example.test'),{db,now});assert.equal(response.headers.get('x-iran-flow-reader'),'R3');const view=iranView(await response.json(),now);assert.equal(view.methodVersion,'R3');assert.equal(view.score,47.6);
 row.body=JSON.stringify({...body,score:90});const bad=await storedIranProgressResponse(new Request('https://example.test'),{db,now});assert.equal(bad.status,503);assert.equal((await bad.json()).reason,'FLOW_R3_INVALID');
});
