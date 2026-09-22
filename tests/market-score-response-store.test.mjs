import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {withMarketScoreCache} from '../worker/market-score-cache.mjs';

test('SQL store survives independent handler instances, expires and preserves unrelated tables',async()=>{
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec('CREATE TABLE unrelated(value INTEGER); INSERT INTO unrelated VALUES(7)');
  const db={prepare(sql){const stmt=sqlite.prepare(sql);const wrapper=args=>({bind:(...values)=>wrapper(values),run:async()=>stmt.run(...args),first:async()=>stmt.get(...args)});return wrapper([])}};
  let time=Date.parse('2026-09-23T00:00:00Z');let calls=0;
  const body={status:'SUCCESS',domains:Array.from({length:12},()=>({score:null,status:'PARTIAL'})),overall:{score:null,status:'PARTIAL'}};
  const create=()=>withMarketScoreCache(async()=>{calls++;return Response.json(body)},{env:{DB:db},now:()=>time});
  const req=()=>new Request('https://zgmini.kr/api/market-score');
  assert.equal((await create()(req())).headers.get('x-market-cache-write'),'STORED');
  time+=1000;
  const hit=await create()(req());assert.equal(hit.headers.get('x-market-cache'),'HIT');assert.deepEqual(await hit.json(),body);assert.equal(calls,1);
  time+=300000;assert.equal((await create()(req())).headers.get('x-market-cache'),'MISS');assert.equal(calls,2);
  assert.equal(sqlite.prepare('SELECT value FROM unrelated').get().value,7);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM market_score_response_cache_v1').get().n,1);
  sqlite.close();
});
