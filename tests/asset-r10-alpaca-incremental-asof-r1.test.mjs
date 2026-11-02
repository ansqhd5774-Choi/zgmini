import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {collectAlpacaIncremental} from '../scripts/pc-writer/alpaca-incremental.mjs';

function fixture(t){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'r10-alpaca-unmapped-'));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const dir=path.join(base,'asset-r10-alpaca');fs.mkdirSync(dir);
 const original=JSON.stringify([{ticker:'SPY'}]);
 fs.writeFileSync(path.join(dir,'group-000.json'),original);
 fs.writeFileSync(path.join(dir,'checkpoint.json'),JSON.stringify({end:'2026-10-05'}));
 fs.writeFileSync(path.join(base,'providers.env'),'APCA_API_KEY_ID=MOCK_TEST_ID\nAPCA_API_SECRET_KEY=MOCK_TEST_SECRET\n');
 return {base,dir,original};
}
const at=Date.parse('2026-10-11T12:00:00Z');

test('Core incremental collector requests unmapped ticker identity and persists immutable provenance flags',async t=>{
 const {base,dir,original}=fixture(t);let calls=0;
 const fetchImpl=async(url,opts)=>{
  calls++;assert.equal(url.origin,'https://data.alpaca.markets');
  assert.equal(url.searchParams.get('asof'),'-');
  assert.equal(url.searchParams.get('feed'),'iex');
  assert.equal(url.searchParams.get('adjustment'),'split');
  assert.equal(url.searchParams.get('start'),'2026-10-05T00:00:00Z');
  assert.equal(url.searchParams.get('end'),'2026-10-10T23:59:59Z');
  assert.equal(opts.headers['APCA-API-KEY-ID'],'MOCK_TEST_ID');
  return Response.json({bars:{SPY:[{t:'2026-10-09T00:00:00Z',c:101,v:10}]},next_page_token:null});
 };
 const r=await collectAlpacaIncremental(base,{now:at,fetchImpl,wait:async()=>{}});
 assert.equal(r.status,'COLLECTED_PENDING_VALIDATION');assert.equal(r.storageVerified,true);
 const saved=path.join(dir,'incremental','2026-10-05-2026-10-10-group-000.json');
 const rows=JSON.parse(fs.readFileSync(saved,'utf8'));
 assert.deepEqual(rows,[{ticker:'SPY',tradeDate:'2026-10-09',currentClose:101,currentVolume:10,
  source:'ALPACA',feed:'iex',adjustmentStatus:'split',asof:'-',symbolMappingMode:'UNMAPPED_ASOF_DASH'}]);
 assert.equal(fs.readFileSync(path.join(dir,'group-000.json'),'utf8'),original);
 assert.equal((await collectAlpacaIncremental(base,{now:at,fetchImpl})).status,'CACHED');
 assert.equal(calls,1);
});

test('provider errors never advance checkpoint or forge evidence rows',async t=>{
 const {base,dir}=fixture(t);
 const result=await collectAlpacaIncremental(base,{now:at,fetchImpl:async url=>{
  assert.equal(url.searchParams.get('asof'),'-');
  return Response.json({error:'mock'}, {status:429});
 }});
 assert.equal(result.status,'BLOCKED');assert.equal(result.errorCode,'ALPACA_HTTP_429');
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'checkpoint.json'),'utf8')),{end:'2026-10-05'});
 assert.equal(fs.existsSync(path.join(dir,'incremental','2026-10-05-2026-10-10-group-000.json')),false);
});

test('provider response for a relabeled ticker is rejected and original group kept',async t=>{
 const {base,dir,original}=fixture(t);
 const result=await collectAlpacaIncremental(base,{now:at,fetchImpl:async url=>{
  assert.equal(url.searchParams.get('asof'),'-');
  return Response.json({bars:{SKYD:[{t:'2026-10-09T00:00:00Z',c:101,v:10}]},next_page_token:null});
 }});
 assert.equal(result.status,'BLOCKED');assert.equal(result.errorCode,'ALPACA_INVALID_BAR');
 assert.equal(fs.readFileSync(path.join(dir,'group-000.json'),'utf8'),original);
 assert.equal(fs.existsSync(path.join(dir,'incremental-checkpoint.json')),false);
});
