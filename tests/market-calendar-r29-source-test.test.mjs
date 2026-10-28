import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {daysFromNy,inspectDay,readKey,probeSource,reportText}
 from '../scripts/pc-writer/market-calendar-r29-earningsapi-source-test.mjs';

const now=Date.parse('2026-10-28T11:00:00Z');
const key='test-private-r29-key';
const withTemp=async fn=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r29-api-probe-'));
 try{return await fn(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}
};

test('Window covers 14 consecutive New York calendar days',()=>{
 const days=daysFromNy(now);
 assert.equal(days.length,14);assert.equal(days[0],'2026-10-28');
 assert.equal(days.at(-1),'2026-11-10');
});

test('Only typed vendor rows are accepted; no silent reinterpretation of days',()=>{
 const date='2026-11-02';
 const payload={date,pre:[{symbol:'NVDA',name:'Nvidia'}],after:[],notSupplied:[]};
 assert.deepEqual(inspectDay(JSON.stringify(payload),date).priority,['NVDA']);
 assert.throws(()=>inspectDay(JSON.stringify(payload),'2026-11-03'),/DATE_MISMATCH/);
 assert.throws(()=>inspectDay('{broken',date),/RESPONSE_INVALID/);
});

test('Probe uses existing local key, makes 14 read-only requests and writes no secret',async()=>{
 await withTemp(async pcHome=>{
  const original='FRED_API_KEY="existing"\nEARNINGS_API_KEY="'+key+'"\n';
  fs.writeFileSync(path.join(pcHome,'providers.env'),original);
  let count=0;
  const fetchImpl=async url=>{
   count++;
   const parsed=new URL(url);
   assert.equal(parsed.searchParams.get('apikey'),key);
   const date=parsed.searchParams.get('date');
   return new Response(JSON.stringify({date,pre:[{symbol:'NVDA',name:'Nvidia'}],
    after:[],notSupplied:[]}),{headers:{'content-type':'application/json'}});
  };
  const r=await probeSource({pcHome,now,fetchImpl});
  assert.equal(r.result,'READ_ONLY_RECEIVED');assert.equal(r.requests,14);
  assert.equal(r.daysReceived,14);assert.equal(r.rowsTotal,14);
  assert.equal(count,14);assert.deepEqual(r.priorityTickers,['NVDA']);
  const text=reportText(r);assert.equal(text.includes(key),false);
  assert.equal(text.includes('FRED_API_KEY'),false);
  assert.equal(text.includes('KEY_VALUE_INCLUDED=NO'),true);
  assert.equal(fs.readFileSync(path.join(pcHome,'providers.env'),'utf8'),original);
  assert.equal(fs.readdirSync(pcHome).length,1);
 });
});

test('Missing key fails before any network request',async()=>{
 await withTemp(async pcHome=>{
  fs.writeFileSync(path.join(pcHome,'providers.env'),'FRED_API_KEY=abc\n');
  let calls=0;const r=await probeSource({pcHome,now,fetchImpl:()=>{calls++;throw Error('UNEXPECTED');}});
  assert.equal(r.reason,'API_KEY_MISSING');assert.equal(r.requests,0);assert.equal(calls,0);
  assert.throws(()=>readKey(path.join(pcHome,'missing')),/KEY_FILE_MISSING/);
 });
});

test('HTTP 429 stops after first attempt and excludes the key from the report',async()=>{
 await withTemp(async pcHome=>{
  fs.writeFileSync(path.join(pcHome,'providers.env'),'EARNINGS_API_KEY="'+key+'"\n');
  let calls=0;
  const r=await probeSource({pcHome,now,fetchImpl:async()=>{calls++;return new Response('limit',{status:429});}});
  assert.equal(r.result,'SOURCE_FAILED');assert.equal(r.reason,'API_HTTP_429');
  assert.equal(r.requests,1);assert.equal(calls,1);
  assert.equal(reportText(r).includes(key),false);
 });
});
