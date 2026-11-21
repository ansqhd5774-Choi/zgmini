import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 INFLATION_CANDIDATES_7_PUBLIC_ROUTE,
 INFLATION_CANDIDATES_7_PUBLIC_KEY,
 readInflationCandidates7PublicResponse,
} from '../worker/inflation-causal-candidates-public-7-r1.mjs';

const url='https://zgmini.kr/api/inflation-candidate-inputs';

test('W05 Inflation7 Next public route delegates to existing stored-only Reader exactly',async()=>{
 assert.equal(INFLATION_CANDIDATES_7_PUBLIC_ROUTE,'/api/inflation-candidate-inputs');
 assert.equal(INFLATION_CANDIDATES_7_PUBLIC_KEY,'detail:inflation-causal-candidates-7:r1');
 const source=await readFile(new URL('../app/api/inflation-candidate-inputs/route.ts',import.meta.url),'utf8');
 assert.match(source,/from '\.\.\/\.\.\/\.\.\/worker\/inflation-causal-candidates-public-7-r1\.mjs'/);
 assert.match(source,/readInflationCandidates7PublicResponse\(request,runtime\.DB_CORE\?\?runtime\.DB\)/);
 assert.match(source,/export const GET=publicResponse;/);
 assert.match(source,/export const HEAD=publicResponse;/);
 assert.doesNotMatch(source,/\b(?:fetch|put|post|insert|update|delete|migrate|schedule|publish|collect)\s*\(/i);
});

test('W05 Inflation7 stored Reader leaves missing projection PENDING, rejects query and unavailable binding',async()=>{
 let selected=0;
 const db={prepare(sql){
  assert.equal(sql,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?');
  return {bind(key){
   assert.equal(key,INFLATION_CANDIDATES_7_PUBLIC_KEY);
   return {async first(){selected++;return null;}};
  }};
 }};
 const get=await readInflationCandidates7PublicResponse(new Request(url),db);
 assert.equal(get.status,200);
 assert.deepEqual(await get.json(),{status:'PENDING',reason:'STORED_PUBLIC_SUMMARY_PENDING',score:null,indicators:[]});
 assert.equal(selected,1);
 const head=await readInflationCandidates7PublicResponse(new Request(url,{method:'HEAD'}),db);
 assert.equal(head.status,200);
 assert.equal(await head.text(),'');
 assert.equal(selected,2);
 const query=await readInflationCandidates7PublicResponse(new Request(url+'?raw=1'),db);
 assert.equal(query.status,400);
 assert.equal(selected,2);
 const unavailable=await readInflationCandidates7PublicResponse(new Request(url),null);
 assert.equal(unavailable.status,503);
 assert.equal(selected,2);
});
