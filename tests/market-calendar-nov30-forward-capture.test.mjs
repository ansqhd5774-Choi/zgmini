import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runNov30Capture,targetDays,inspectDay} from '../scripts/pc-writer/market-calendar-nov30-forward-capture.mjs';

const clock=()=>Date.parse('2026-11-03T20:00:00Z');
const body=day=>({date:day,pre:[{symbol:'ABCD',name:'Example Corp',eps:null,revenue:null}],after:[],notSupplied:[]});
const withRoot=async fn=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-nov30-test-'));
  try{return await fn(root)}finally{fs.rmSync(root,{recursive:true,force:true})}
};

test('entire November is 30 calendar days, including weekends',()=>{
  assert.equal(targetDays().length,30);
  assert.equal(targetDays()[0],'2026-11-01');
  assert.equal(targetDays().at(-1),'2026-11-30');
  assert.deepEqual(inspectDay(body('2026-11-04'),'2026-11-04'),{count:1,invalid:0});
});

test('reuses already-saved Core input without provider requests',async()=>withRoot(async root=>{
  let fetches=0;
  const report=await runNov30Capture({pcHome:root,clock,
    lookupCore:()=>Object.assign(day=>({storedAt:'2026-11-03T00:00:00.000Z',counts:{count:2,invalid:0}}),{close(){}}),
    fetcher:async()=>{fetches++;throw Error('unexpected fetch')},env:{}});
  assert.equal(report.status,'PASS');
  assert.equal(report.coveredDayCount,30);
  assert.equal(report.coreReusedDayCount,30);
  assert.equal(report.providerCalls,0);
  assert.equal(fetches,0);
}));

test('only missing days fetched once, saved privately and reused on next read',async()=>withRoot(async root=>{
  const core=new Set(targetDays().slice(0,17));
  const lookupCore=()=>Object.assign(day=>core.has(day)?{
    storedAt:'2026-11-03T00:00:00.000Z',counts:{count:1,invalid:0}}:null,{close(){}});
  let fetches=0;
  const fetcher=async url=>{fetches++;return {ok:true,status:200,text:async()=>JSON.stringify(body(new URL(url).searchParams.get('date')))}};
  const opts={pcHome:root,clock,lookupCore,fetcher,env:{EARNINGS_API_KEY:'local-test-key'}};
  const first=await runNov30Capture(opts);
  assert.equal(first.status,'PASS');
  assert.equal(first.providerCalls,13);
  assert.equal(first.coreReusedDayCount,17);
  assert.equal(first.newDayCount,13);
  assert.equal(first.coveredDayCount,30);
  const second=await runNov30Capture({...opts,env:{}});
  assert.equal(second.status,'PASS');
  assert.equal(second.providerCalls,0);
  assert.equal(second.privateReusedDayCount,13);
  assert.equal(fetches,13);
}));

test('quota failure stops without retry and retains successful day files',async()=>withRoot(async root=>{
  let fetches=0;
  const fetcher=async url=>{fetches++;if(fetches===3)return {ok:false,status:429};return {ok:true,status:200,text:async()=>JSON.stringify(body(new URL(url).searchParams.get('date')))}};
  const result=await runNov30Capture({pcHome:root,clock,
    lookupCore:()=>Object.assign(()=>null,{close(){}}),
    fetcher,env:{EARNINGS_API_KEY:'local-test-key'}});
  assert.equal(result.status,'PARTIAL');
  assert.equal(result.code,'NOV30_PROVIDER_RATE_LIMIT_STOP');
  assert.equal(result.providerCalls,3);
  assert.equal(result.newDayCount,2);
  assert.equal(result.coveredDayCount,2);
  assert.equal(fetches,3);
  assert.equal(fs.readdirSync(path.join(root,'er1-input','nov30-forward-days')).length,2);
}));
