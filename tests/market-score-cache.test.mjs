import test from 'node:test';
import assert from 'node:assert/strict';
import {withMarketScoreCache} from '../worker/market-score-cache.mjs';

const request = () => new Request('https://zgmini.kr/api/market-score');
const body = {status:'SUCCESS', domains:Array.from({length:12},()=>({status:'PARTIAL',score:null})), overall:{status:'PARTIAL',score:null},updatedAt:'2026-09-23T00:00:00Z'};
function setup() {
  const entries=new Map(); let calls=0; let time=Date.parse(body.updatedAt);
  const cache={match:async key=>entries.get(key.url)?.clone(),put:async(key,res)=>entries.set(key.url,res.clone())};
  const handler=withMarketScoreCache(async()=>{calls++;return Response.json(body)}, {getCache:()=>cache,now:()=>time});
  return {handler,entries,cache,calls:()=>calls,advance:ms=>time+=ms};
}
test('cache hit skips collection and preserves partial/null and original timestamp',async()=>{
  const s=setup(); assert.equal((await s.handler(request())).headers.get('x-market-cache'),'MISS');
  s.advance(10000);const res=await s.handler(request());
  assert.equal(res.headers.get('x-market-cache'),'HIT');assert.equal(s.calls(),1);
  assert.deepEqual(await res.json(),body);assert.match(res.headers.get('cache-control'),/max-age=290/);
  assert.equal(res.headers.has('x-market-cache-stored-at'),false);
});
test('hard expiry never returns stale response',async()=>{
  const s=setup();await s.handler(request());s.advance(300000);
  assert.equal((await s.handler(request())).headers.get('x-market-cache'),'MISS');assert.equal(s.calls(),2);
});
test('failure and malformed success are never cached',async()=>{
  for(const response of [Response.json({status:'FAILED'},{status:503}),Response.json({status:'SUCCESS',domains:[]})]){
    let writes=0;const h=withMarketScoreCache(async()=>response.clone(),{getCache:()=>({match:async()=>null,put:async()=>writes++})});
    await h(request());assert.equal(writes,0);
  }
});
test('cache exceptions fall back to actual handler',async()=>{
  const h=withMarketScoreCache(async()=>Response.json(body),{getCache:()=>({match:async()=>{throw Error('cache')},put:async()=>{throw Error('cache')}})});
  assert.deepEqual(await (await h(request())).json(),body);
});
test('entitlement state changes partition cache without exposing secrets',async()=>{
  const s=setup();await s.handler(request());let called=0;
  const h=withMarketScoreCache(async()=>{called++;return Response.json(body)}, {getCache:()=>s.cache,env:{EQUIBLES_B1_PLAN:'PRO',EQUIBLES_API_KEY:'test-secret'}});
  await h(request());assert.equal(called,1);
  for(const key of s.entries.keys())assert.ok(!key.includes('test-secret'));
});
test('non-GET never touches cache',async()=>{
  const h=withMarketScoreCache(async()=>new Response(null,{status:405}),{getCache:()=>{throw Error('must not run')}});
  assert.equal((await h(new Request(request(),{method:'POST'}))).status,405);
});

test('simultaneous cold requests share collection and each response remains readable',async()=>{
  let calls=0,release;const gate=new Promise(r=>release=r);
  const h=withMarketScoreCache(async()=>{calls++;await gate;return Response.json(body)}, {getCache:()=>undefined});
  const jobs=Array.from({length:5},()=>h(request()));
  await new Promise(r=>setImmediate(r));assert.equal(calls,1);release();
  for(const response of await Promise.all(jobs))assert.deepEqual(await response.json(),body);
});
test('refresh ahead serves valid cache immediately and failure does not extend hard expiry',async()=>{
  const s=setup();await s.handler(request());s.advance(240000);
  let time=Date.parse(body.updatedAt)+240000,calls=0,release;const jobs=[];
  const gate=new Promise(r=>release=r);
  const h=withMarketScoreCache(async()=>{calls++;await gate;return Response.json({status:'FAILED'},{status:503})},
    {getCache:()=>s.cache,now:()=>time,waitUntil:job=>jobs.push(job)});
  for(const response of await Promise.all([h(request()),h(request())])){
    assert.equal(response.headers.get('x-market-cache'),'HIT');assert.deepEqual(await response.json(),body);
  }
  assert.equal(calls,1);assert.equal(jobs.length,1);release();await Promise.all(jobs);
  time+=60000;assert.equal((await h(request())).status,503);assert.equal(calls,2);
});
test('successful refresh ahead replaces the cached observation',async()=>{
  const s=setup();await s.handler(request());s.advance(240000);const jobs=[];
  const updated={...body,updatedAt:'2026-09-23T00:04:00Z'};
  const h=withMarketScoreCache(async()=>Response.json(updated),{getCache:()=>s.cache,
    now:()=>Date.parse(updated.updatedAt),waitUntil:job=>jobs.push(job)});
  assert.deepEqual(await (await h(request())).json(),body);await Promise.all(jobs);
  assert.deepEqual(await (await h(request())).json(),updated);
});
