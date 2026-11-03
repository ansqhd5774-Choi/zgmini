import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runDec31Capture,targetDays,inspectDay} from '../scripts/pc-writer/market-calendar-dec31-forward-capture.mjs';

const clock=()=>Date.parse('2026-11-03T20:30:00Z');
const body=day=>({date:day,
  pre:[{symbol:'EXM',name:'Example Inc',epsEstimate:2.2,revenueEstimate:180000000}],
  after:[{symbol:'EXM2',name:'Example 2',eps:0,revenue:2000000}],notSupplied:[]});
const mockCore=set=>()=>Object.assign(day=>set.has(day)?{
  body:body(day),stats:inspectDay(body(day),day),
  storedAt:'2026-11-03T00:00:00Z',source:'core'}:null,{close(){}});
const withRoot=async fn=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-dec31-test-'));
  try{return await fn(root)}finally{fs.rmSync(root,{recursive:true,force:true})}
};

test('December all days and exact values with zeros',()=>{
  assert.equal(targetDays().length,31);
  assert.equal(targetDays()[0],'2026-12-01');
  assert.equal(targetDays().at(-1),'2026-12-31');
  assert.deepEqual(inspectDay(body('2026-12-01'),'2026-12-01'),{
    date:'2026-12-01',total:2,pre:1,after:1,notSupplied:0,
    epsEstimates:1,revenueEstimates:1,epsActuals:1,revenueActuals:1,invalidRows:0});
});

test('entire 31 days reused from Core with zero API requests',async()=>withRoot(async root=>{
  const report=await runDec31Capture({pcHome:root,clock,lookupCore:mockCore(new Set(targetDays())),
    fetcher:()=>{throw Error('forbidden')},env:{}});
  assert.equal(report.status,'PASS');
  assert.equal(report.coreReusedDayCount,31);
  assert.equal(report.providerCalls,0);
  assert.equal(report.records,62);
  assert.equal(report.daily.length,31);
}));

test('fetches only missing days and reuses private files on repeat read',async()=>withRoot(async root=>{
  let calls=0;
  const fetcher=async url=>{calls++;return {ok:true,status:200,
    text:async()=>JSON.stringify(body(new URL(url).searchParams.get('date')))};};
  const opts={pcHome:root,clock,lookupCore:mockCore(new Set(targetDays().slice(0,19))),
    fetcher,env:{EARNINGS_API_KEY:'local-mock-key'}};
  const first=await runDec31Capture(opts);
  assert.equal(first.status,'PASS');assert.equal(first.coreReusedDayCount,19);
  assert.equal(first.newDayCount,12);assert.equal(first.providerCalls,12);
  assert.equal(first.records,62);assert.deepEqual(first.missingDays,[]);
  const again=await runDec31Capture({...opts,env:{}});
  assert.equal(again.status,'PASS');assert.equal(again.privateReusedDayCount,12);
  assert.equal(again.providerCalls,0);assert.equal(calls,12);
}));

test('on rate limit stop and protect completed days without retry',async()=>withRoot(async root=>{
  let calls=0;
  const result=await runDec31Capture({pcHome:root,clock,lookupCore:mockCore(new Set()),
    fetcher:async url=>{calls++;if(calls===4)return {ok:false,status:429};
      return {ok:true,status:200,text:async()=>JSON.stringify(body(new URL(url).searchParams.get('date')))};},
    env:{EARNINGS_API_KEY:'local-mock-key'}});
  assert.equal(result.status,'PARTIAL');assert.equal(result.code,'DEC31_PROVIDER_RATE_LIMIT_STOP');
  assert.equal(result.providerCalls,4);assert.equal(result.newDayCount,3);
  assert.equal(result.coveredDayCount,3);assert.equal(result.missingDays.length,28);
  assert.equal(calls,4);
  assert.equal(fs.readdirSync(path.join(root,'er1-input','dec31-forward-days')).length,3);
}));
