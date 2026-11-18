// W06 #40 one-shot public readback — deliberate unmerged diagnostic.
// Distinguish ABSENT from explicit null. Never infer an official observation
// date from market-score.updatedAt or a historical chart point.
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCompositeMarketScore,DOMAIN_WEIGHTS} from '../lib/market-score/composite-model-r1.mjs';

const has=(object,key)=>Object.prototype.hasOwnProperty.call(object??{},key);
const expectedIds=['inflation','employment','rates','credit','growth','consumption',
 'earnings','liquidity','fundFlows','breadth','dollarFx','commodities'];

function dateFields(body){
 const domains=Array.isArray(body?.domains)?body.domains:[];
 return domains.map(d=>{
  const own=has(d,'observationDate');
  const trend=Array.isArray(d?.trend)?d.trend:[];
  const last=trend.at(-1);
  return {
   id:d?.id,
   status:d?.status,
   hasObservationDate:own,
   observationDate:own?d.observationDate:'FIELD_ABSENT',
   hasAsOfDate:has(d,'asOfDate'),
   asOfDate:has(d,'asOfDate')?d.asOfDate:'FIELD_ABSENT',
   domainUpdatedAt:d?.updatedAt??null,
   scoreValid:typeof d?.score==='number'&&Number.isFinite(d.score),
   trendCount:trend.length,
   lastHistoricalLabel:last?.label??last?.date??null,
  };
 });
}

test('W06 #40 current main projection retains exact selective observation-date fields, not fabricated dates',()=>{
 const ids=DOMAIN_WEIGHTS.map(d=>d.id);
 assert.deepEqual(ids,expectedIds);
 const mock=ids.map((id,i)=>({
  id,score:35+i,status:'READY',updatedAt:'2026-11-18',
  observationDate:'2026-11-12',
  asOfDate:'2026-11-18',
  trend:[{label:'2026-11-12',value:35+i}],
 }));
 const out=buildCompositeMarketScore(mock,{updatedAt:'2026-11-18T03:00:00Z'});
 const meta=dateFields(out);
 const preserved=meta.filter(d=>d.hasObservationDate).map(d=>d.id);
 assert.deepEqual(preserved,['fundFlows','breadth','dollarFx','commodities']);
 for(const d of meta)
  assert.equal(d.observationDate,d.hasObservationDate?'2026-11-12':'FIELD_ABSENT',d.id);
 console.log('W06_40_MAIN_SOURCE_DATE_PROJECTION',JSON.stringify({
  preservedDateIds:preserved,missingDateIds:ids.filter(id=>!preserved.includes(id)),
  noImputedDates:meta.every(d=>d.observationDate==='FIELD_ABSENT'||d.observationDate==='2026-11-12')
 }));
});

test('W06 #40 live GET JSON and NDJSON report presence of each public date property without coercion', {timeout:50000},async()=>{
 const origin='https://zgmini.kr/api/market-score';
 async function request(accept){
  const res=await fetch(origin,{
   headers:{'accept':accept,'cache-control':'no-cache',
    'user-agent':'ZGMINI-W06-one-off-domain-date-readonly'},
   cache:'no-store',signal:AbortSignal.timeout(18000)
  });
  const header={
   status:res.status,
   cacheSource:res.headers.get('x-market-cache'),
   contentType:(res.headers.get('content-type')??'').split(';')[0],
   storedAtHeader:res.headers.get('x-market-snapshot-at'),
  };
  if(res.status!==200)return {header,body:null};
  const text=await res.text();
  assert.ok(text.length>0&&text.length<10_000_000,'bounded public response');
  if(accept.includes('x-ndjson')){
   const lines=text.trim().split('\n').map(line=>JSON.parse(line));
   const completed=lines.filter(line=>line.type==='complete');
   assert.ok(completed.length>0,'NDJSON completed stored snapshot');
   return {header,body:completed.at(-1).body};
  }
  return {header,body:JSON.parse(text)};
 }
 const json=await request('application/json');
 const ndjson=await request('application/x-ndjson');
 console.log('W06_40_LIVE_DATE_FIELD_PRESENCE',JSON.stringify({
  jsonStatus:json.header.status,ndjsonStatus:ndjson.header.status,
  jsonStoredAt:json.header.storedAtHeader,ndjsonStoredAt:ndjson.header.storedAtHeader,
  jsonSnapshot:json.body?.updatedAt??null,ndjsonSnapshot:ndjson.body?.updatedAt??null,
  jsonAsOfDate:json.body?.asOfDate??null,ndjsonAsOfDate:ndjson.body?.asOfDate??null,
  jsonDomains:dateFields(json.body),ndjsonDomains:dateFields(ndjson.body),
 }));
 assert.equal(json.header.status,200,'actual public GET JSON available');
 assert.equal(ndjson.header.status,200,'actual public GET NDJSON available');
 for(const body of [json.body,ndjson.body]){
  assert.equal(body?.status,'SUCCESS');
  assert.deepEqual((body.domains??[]).map(d=>d.id),expectedIds);
 }
 // A publication may occur between requests. Only exact same updatedAt is
 // comparable; do not infer divergence from non-identical snapshots.
 if(json.body?.updatedAt===ndjson.body?.updatedAt)
  assert.deepEqual(dateFields(json.body),dateFields(ndjson.body),
   'same published snapshot cannot lose observationDate at JSON/NDJSON serialization');
});
