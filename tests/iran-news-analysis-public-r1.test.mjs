import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {IRAN_NEWS_ANALYSIS_PUBLIC_KEY_R1,validIranNewsAnalysisSnapshotR1}
 from '../lib/iran-progress/news-analysis-public-r1.mjs';
import {storedIranNewsAnalysisR1Response}
 from '../worker/iran-news-analysis-public-r1.mjs';

const now=Date.parse('2026-10-29T04:00:00.000Z');
const sourceUrl='https://www.gov.uk/government/news/example';
const id=createHash('sha256').update(sourceUrl).digest('hex');
const valid={version:'IRAN_NEWS_ANALYSIS_R1',publishedAt:now-1000,
 items:[{id,sourceUrl,summaryKo:'영국 정부는 관련 핵 사찰 문제를 언급했습니다.',
  interpretationKo:'사찰 요구가 유지되고 있으나 실제 협상 성과는 아직 확인되지 않았습니다.',
  impact:'neutral',analysisStatus:'READY',analyzedAt:now-2000,
  evidenceUrls:[sourceUrl],model:'gemma3:4b'}],pending:[]};

function d1(body=valid,storedAt=body?.publishedAt){
 const calls=[];
 return {calls,prepare(sql){calls.push(sql);return {bind(...args){calls.push(args);return {
  async first(){return body?{body:JSON.stringify(body),stored_at:storedAt}:null;},
 };}};}};
}

test('AI analysis is keyed separately from R41 metadata and existing GOV.UK R1',()=>{
 assert.equal(IRAN_NEWS_ANALYSIS_PUBLIC_KEY_R1,'public:iran-progress:news:analysis-provisional:r1');
});

test('valid independent provisional analysis yields readiness and no score mutation',async()=>{
 assert.equal(await validIranNewsAnalysisSnapshotR1(valid,{now}),true);
 const db=d1();
 const response=await storedIranNewsAnalysisR1Response(
  new Request('https://zgmini.kr/api/outbreak-news/iran/analysis-r1'),{db,now});
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.version,'IRAN_NEWS_ANALYSIS_R1');
 assert.equal(body.status,'READY');
 assert.equal(body.itemCount,1);
 assert.equal(body.items[0].impact,'neutral');
 assert.equal(body.items[0].analysisStatus,'READY');
 assert.equal(db.calls.length,2);
 assert.equal(db.calls[1][0],IRAN_NEWS_ANALYSIS_PUBLIC_KEY_R1);
 assert.equal(db.calls[0],
  'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?');
});

test('independent reader reports PENDING, PARTIAL and STALE without fabricating',async()=>{
 const pending=await storedIranNewsAnalysisR1Response(new Request('https://x.test'),
  {db:d1(null),now});
 assert.equal(pending.status,200);
 assert.equal((await pending.json()).status,'PENDING');
 const partly={...valid,pending:[{id:'b'.repeat(64),reason:'SOURCE_BODY_UNAVAILABLE'}]};
 assert.equal((await (await storedIranNewsAnalysisR1Response(new Request('https://x.test'),
  {db:d1(partly),now})).json()).status,'PARTIAL');
 const stale={...valid,publishedAt:now-3*86400000,items:valid.items.map(i=>({...i,
  analyzedAt:now-3*86400000-1000}))};
 assert.equal((await (await storedIranNewsAnalysisR1Response(new Request('https://x.test'),
  {db:d1(stale),now})).json()).status,'STALE');
});

test('reader fails closed for tampered identities, hallucinated fields, weak evidence',async()=>{
 for(const body of [
  {...valid,items:[{...valid.items[0],id:'a'.repeat(64)}]},
  {...valid,items:[{...valid.items[0],evidenceUrls:[]}]},
  {...valid,items:[{...valid.items[0],summaryKo:'This is an English summary.'}]},
  {...valid,items:[{...valid.items[0],impact:'war'}]},
  {...valid,items:[{...valid.items[0],rightsVerified:true}]},
  {...valid,items:[{...valid.items[0],sourceUrl:'http://www.gov.uk/government/news/example'}]},
 ]){
  assert.equal(await validIranNewsAnalysisSnapshotR1(body,{now}),false);
  const response=await storedIranNewsAnalysisR1Response(new Request('https://x.test'),
   {db:d1(body),now});
  assert.equal(response.status,503);
  assert.equal((await response.json()).reason,'ANALYSIS_SNAPSHOT_INVALID');
 }
});

test('reader rejects wrong stored_at and database failure without exposing content',async()=>{
 const bad=await storedIranNewsAnalysisR1Response(new Request('https://x.test'),
  {db:d1(valid,999),now});
 assert.equal(bad.status,503);
 assert.equal((await bad.json()).reason,'ANALYSIS_SNAPSHOT_INVALID');
 const denied=await storedIranNewsAnalysisR1Response(new Request('https://x.test'),
  {db:{prepare(){throw Error('Unavailable');}},now});
 assert.equal(denied.status,503);
 assert.equal((await denied.json()).reason,'ANALYSIS_SNAPSHOT_READ_FAILED');
 const post=await storedIranNewsAnalysisR1Response(new Request('https://x.test',{method:'POST'}),
  {db:d1(),now});
 assert.equal(post.status,405);
});
