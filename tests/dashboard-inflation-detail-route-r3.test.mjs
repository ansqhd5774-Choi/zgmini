import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PUBLIC_PROJECTION_KEYS,publicProjectionStore,storedProjectionResponse} from '../worker/market-public-projection-store.mjs';

const route=readFileSync('app/api/inflation-detail/route.ts','utf8');

test('inflation detail GET is wired to the approved stored R2 projection',()=>{
  assert.match(route,/export async function GET\(request:Request\)/);
  assert.match(route,/storedProjectionResponse\(request,/);
  assert.match(route,/publicProjectionStore\(env\.DB\)/);
  assert.match(route,/key:PUBLIC_PROJECTION_KEYS\.inflation/);
  assert.equal(PUBLIC_PROJECTION_KEYS.inflation,'detail:inflation:v1');
  assert.doesNotMatch(route,/\bfetch\(|\bcollectInflation\(|\bcalculateMarket\(/);
});

test('inflation detail is read-only, preserves the published payload and never invents a score',async()=>{
  const now=Date.parse('2026-11-16T09:00:00Z'),payload={status:'READY',score:0,asOfDate:'2026-11-16',methodologyVersion:'INFLATION_R2_R29_56_IA',axes:{TARGET_STABILITY:0},trend:[]};
  const reads=[];
  const db={prepare(sql){
    assert.equal(sql,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?');
    return {bind(key){assert.equal(key,PUBLIC_PROJECTION_KEYS.inflation);return this;},async all(){reads.push('read');return {results:[{body:JSON.stringify(payload),stored_at:now-1}]};}};
  }};
  const response=await storedProjectionResponse(new Request('https://zgmini.kr/api/inflation-detail/'),{store:publicProjectionStore(db),key:PUBLIC_PROJECTION_KEYS.inflation,now,maxAgeMs:1000});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),payload);
  assert.deepEqual(reads,['read']);
});

test('inflation detail does not show a stale stored score as current',async()=>{
  const now=Date.parse('2026-11-16T09:00:00Z');
  const response=await storedProjectionResponse(new Request('https://zgmini.kr/api/inflation-detail/'),{key:PUBLIC_PROJECTION_KEYS.inflation,now,maxAgeMs:1000,store:{read:async()=>({storedAt:now-1001,body:{status:'READY',score:88}})}});
  assert.equal(response.status,503);
  const body=await response.json();
  assert.equal(body.reason,'STORED_PROJECTION_STALE');
  assert.equal(body.score,undefined);
});

test('all supported dashboard risk detail GET routes use the existing approved D1 keys',()=>{
 const routes=[
  ['inflation-detail','inflation'],
  ['recession-detail','recession'],
  ['credit-risk-detail','creditRisk'],
  ['earnings-recession-detail','earningsRecession'],
  ['asset-bubble-detail','assetBubble'],
  ['debt-risk-detail','debtRisk'],
  ['supply-shock-detail','supplyShock'],
 ];
 for(const [slug,key] of routes){
  const source=readFileSync('app/api/'+slug+'/route.ts','utf8');
  assert.ok(source.includes('export async function GET(request:Request)'),slug);
  assert.ok(source.includes('storedProjectionResponse(request,'),slug);
  assert.ok(source.includes('publicProjectionStore(env.DB)'),slug);
  assert.ok(source.includes('key:PUBLIC_PROJECTION_KEYS.'+key),slug);
  assert.equal(typeof PUBLIC_PROJECTION_KEYS[key],'string',key);
  assert.doesNotMatch(source,/\bfetch\(|\bcollect[A-Z]\w*\(|\bcalculateMarket\(/);
 }
});
