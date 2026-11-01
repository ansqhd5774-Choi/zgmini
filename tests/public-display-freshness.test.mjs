import test from 'node:test';
import assert from 'node:assert/strict';
import {storedMarketResponse as candidate} from '../worker/candidate-market-operational-store.mjs';
import {storedMarketResponse as original} from '../worker/market-operational-store.mjs';
test('both market readers retain real stored scores for eight days, including zero and NDJSON',async()=>{
 const now=Date.now(),body={overall:{score:0},domains:[{id:'inflation',score:71}]};
 for(const reader of [candidate,original])for(const age of [7*3600000,8*86400000-1,8*86400000]){
  const response=await reader(new Request('https://candidate/api/market-score'),{now,store:{readScore:async()=>({body,storedAt:now-age})}});
  assert.equal(response.status,age<8*86400000?200:503);
  if(response.ok)assert.deepEqual(await response.json(),body);
 }
 const response=await candidate(new Request('https://candidate/api/market-score',{headers:{accept:'application/x-ndjson'}}),{now,store:{readScore:async()=>({body,storedAt:now-7*3600000})}});
 assert.deepEqual(JSON.parse(await response.text()).body,body);
});
