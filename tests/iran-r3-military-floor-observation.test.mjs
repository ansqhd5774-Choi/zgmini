import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyR3Article,buildReferenceFlowR3} from '../lib/iran-progress/reference-flow-r3.mjs';

const classify=(date,title,n)=>{
 const result=classifyR3Article({
  date,title,summary:'',
  sourceUrl:`https://www.bbc.com/news/articles/saturation-fixture-${n}`,
 });
 assert.equal(result.accepted,true,title);
 return result;
};

test('military at zero keeps receiving actual reports, but raw weighted score stays fixed',()=>{
 const reports=[];
 let n=0;
 for(const date of ['2026-10-08','2026-10-09','2026-10-10','2026-10-11','2026-10-12'])
  reports.push(classify(date,'Houthis fired missiles at Aden airport',++n));
 for(const date of ['2026-10-13','2026-10-14','2026-10-15'])
  reports.push(classify(date,'Houthi tanker was attacked in Red Sea',++n));
 const previous=buildReferenceFlowR3(reports,{asOfDate:'2026-10-16'});
 assert.equal(previous.domains.MILITARY,0);
 assert.equal(previous.domains.MARITIME,20);
 assert.equal(previous.score,35.5);

 const later=[
  ['2026-10-17','Houthis vow more attacks on Saudi airports'],
  ['2026-10-18','Saudi Arabia intercepted Houthi missiles'],
  ['2026-10-19','Houthis fired missiles at Aden airport'],
  ['2026-10-20','Houthi missile hits Aramco building in Saudi Arabia'],
 ].map(([date,title])=>classify(date,title,++n));
 const current=buildReferenceFlowR3([...reports,...later],{asOfDate:'2026-10-20'});
 assert.equal(current.eventCount,previous.eventCount+later.length);
 assert.equal(current.domains.MILITARY,0);
 assert.equal(current.score,35.5);
 for(const date of later.map(e=>e.date)){
  const h=current.history.find(h=>h.date===date);
  assert.ok(h,date);
  assert.equal(h.value,35.5,date);
  assert.equal(h.delta,0,date);
 }
 assert.equal(current.saturatedDomains.includes('MILITARY'),true);
 assert.equal(current.unobservedDomains.includes('DIPLOMACY'),true);
 assert.equal(current.unobservedDomains.includes('CEASEFIRE'),true);
 assert.equal(current.unobservedDomains.includes('NUCLEAR'),true);
});
