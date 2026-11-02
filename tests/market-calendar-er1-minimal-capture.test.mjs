import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {recentNYBusinessDays,runER1MinimalCapture} from
  '../scripts/pc-writer/market-calendar-er1-minimal-capture.mjs';

const now=Date.parse('2026-11-02T16:00:00Z');
const fakeDay=(date)=>({date,pre:[{symbol:'AAA',name:'Synthetic',eps:1.1,
  revenue:1200000,epsEstimate:2,revenueEstimate:1e15}],after:[],notSupplied:[]});

test('plan only five prior NY business dates; no weekends or same-day lookahead',()=>{
  assert.deepEqual(recentNYBusinessDays(now),{
    asOf:'2026-11-02',dates:['2026-10-30','2026-10-29','2026-10-28','2026-10-27','2026-10-26'],
  });
});

test('five-request manual sample saves local private raw only, then reuses without calls',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'er1-minimal-capture-'));
  try{
    let requests=0;
    const fetcher=async url=>{
      requests++;
      const parsed=new URL(url);
      assert.equal(parsed.origin,'https://api.earningsapi.com');
      assert.equal(parsed.searchParams.get('apikey'),'TOP_SECRET_TEST');
      return new Response(JSON.stringify(fakeDay(parsed.searchParams.get('date'))),
        {status:200,headers:{'content-type':'application/json'}});
    };
    const first=await runER1MinimalCapture({pcHome:root,now,fetcher,
      env:{EARNINGS_API_KEY:'TOP_SECRET_TEST'}});
    assert.equal(first.status,'ER1_PRIVATE_SAMPLE_SAVED');
    assert.equal(first.providerRequests,5);
    assert.equal(first.newDayFiles,5);
    assert.equal(first.uniqueSymbolsWithBoth,1);
    assert.equal(first.dbWrites,0);
    assert.equal(first.d1Writes,0);
    assert.equal(requests,5);
    assert.doesNotMatch(JSON.stringify(first),/TOP_SECRET_TEST|1200000|1\.1/);
    assert.equal(fs.existsSync(path.join(root,'local-cycle.lock')),false);
    assert.equal(fs.existsSync(path.join(root,'storage','core.sqlite')),false);
    const again=await runER1MinimalCapture({pcHome:root,now,env:{},
      fetcher:async()=>{throw Error('MUST_NOT_FETCH')}});
    assert.equal(again.status,'ER1_PRIVATE_SAMPLE_SAVED');
    assert.equal(again.providerRequests,0);
    assert.equal(again.retainedDayFiles,5);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('missing credential and HTTP 429 both stop without retries or Core changes',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'er1-capture-stop-'));
  try{
    const noKey=await runER1MinimalCapture({pcHome:root,now,env:{},
      fetcher:async()=>{throw Error('MUST_NOT_FETCH')}});
    assert.equal(noKey.status,'ER1_PROVIDER_KEY_MISSING_STOP');
    assert.equal(noKey.providerRequests,0);
    let calls=0;
    const limited=await runER1MinimalCapture({pcHome:root,now,
      env:{EARNINGS_API_KEY:'TEST'},fetcher:async()=>{calls++;return new Response('',{status:429});}});
    assert.equal(limited.status,'ER1_PROVIDER_RATE_LIMIT_STOP');
    assert.equal(limited.providerRequests,1);
    assert.equal(limited.providerRetries,0);
    assert.equal(calls,1);
    assert.equal(fs.existsSync(path.join(root,'er1-input','er1-manual-capture.lock')),false);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('three retained days and a single malformed row: keep valid rows, no refetch',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'er1-capture-partial-'));
  try{
    const dayRoot=path.join(root,'er1-input','days');
    fs.mkdirSync(dayRoot,{recursive:true});
    const dates=recentNYBusinessDays(now).dates;
    for(const day of dates.slice(0,3))fs.writeFileSync(path.join(dayRoot,day+'.json'),
      JSON.stringify({storedAt:'2026-11-02T16:00:00Z',body:fakeDay(day)}));
    let calls=0;
    const fetcher=async url=>{
      calls++;
      const day=new URL(url).searchParams.get('date');
      const body=day===dates[3]?{
        date:day,pre:[{symbol:'BBB',eps:0,revenue:0},
          {symbol:'ABC/W',eps:undefined,revenue:'unsupported'}],
        after:[],notSupplied:[],
      }:fakeDay(day);
      return new Response(JSON.stringify(body),{status:200});
    };
    const first=await runER1MinimalCapture({pcHome:root,now,
      env:{EARNINGS_API_KEY:'PRIVATE_TEST'},fetcher});
    assert.equal(first.status,'ER1_PRIVATE_SAMPLE_PARTIAL');
    assert.equal(first.providerRequests,2);
    assert.equal(first.retainedDayFiles,3);
    assert.equal(first.newDayFiles,2);
    assert.equal(first.savedDayCount,5);
    assert.equal(first.verifiedDayCount,5);
    assert.equal(first.quarantinedDays.length,0);
    assert.equal(first.recoveredDays.length,1);
    assert.equal(first.recoveredDays[0].date,dates[3]);
    assert.equal(first.recoveredDays[0].invalidSymbols,1);
    assert.equal(first.recoveredDays[0].missingEPSFields,1);
    assert.equal(first.recoveredDays[0].invalidRevenueValues,1);
    assert.equal(first.recoveredDays[0].excludedEvents,1);
    assert.equal(first.excludedEvents,1);
    assert.equal(first.uniqueSymbolsWithBoth,2);
    assert.equal(calls,2);
    assert.doesNotMatch(JSON.stringify(first),/ABC\/W|PRIVATE_TEST|unsupported/);
    assert.equal(fs.existsSync(path.join(dayRoot,dates[3]+'.json')),true);
    const repeat=await runER1MinimalCapture({pcHome:root,now,env:{},
      fetcher:async()=>{throw Error('SHOULD_NOT_REFETCH')}});
    assert.equal(repeat.status,'ER1_PRIVATE_SAMPLE_PARTIAL');
    assert.equal(repeat.providerRequests,0);
    assert.equal(repeat.retainedDayFiles,5);
    assert.equal(repeat.recoveredDays.length,1);
    assert.equal(repeat.uniqueSymbolsWithBoth,2);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('one invalid revenue among 173 events: only that event is excluded',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'er1-capture-173-'));
  try{
    const days=recentNYBusinessDays(now).dates;
    const folder=path.join(root,'er1-input','days');
    fs.mkdirSync(folder,{recursive:true});
    for(const day of days){
      const events=day===days[3]?Array.from({length:173},(_,i)=>({
        symbol:'S'+String(i).padStart(3,'0'),eps:i===172?null:1,
        revenue:i===172?'invalid':i,
      })):[];
      const body={date:day,pre:events,after:[],notSupplied:[]};
      fs.writeFileSync(path.join(folder,day+'.json'),JSON.stringify({
        storedAt:'2026-11-02T16:00:00Z',body}));
    }
    const result=await runER1MinimalCapture({pcHome:root,now,env:{},readOnly:true,
      fetcher:async()=>{throw Error('NO_NETWORK_ALLOWED')}});
    assert.equal(result.status,'ER1_PRIVATE_SAMPLE_PARTIAL');
    assert.equal(result.providerRequests,0);
    assert.equal(result.retainedDayFiles,5);
    assert.equal(result.dbWrites,0);
    assert.equal(result.d1Writes,0);
    assert.equal(fs.existsSync(path.join(root,'er1-input','er1-manual-capture.lock')),false);
    assert.equal(result.savedDayCount,5);
    assert.equal(result.verifiedDayCount,5);
    assert.equal(result.recoveredDays.length,1);
    assert.equal(result.recoveredDays[0].totalEvents,173);
    assert.equal(result.excludedEvents,1);
    assert.equal(result.uniqueSymbolsWithBoth,172);
    assert.equal(result.quarantinedDays.length,0);
    assert.doesNotMatch(JSON.stringify(result),/S000|S172|"invalid"/);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('invalid day structure stays quarantined, never accepted by row filtering',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'er1-capture-structure-'));
  try{
    const days=recentNYBusinessDays(now).dates;
    const folder=path.join(root,'er1-input','days');
    fs.mkdirSync(folder,{recursive:true});
    for(const day of days){
      const body=day===days[3]?{date:day,pre:[fakeDay(day).pre[0]],after:[],
        notSupplied:null}:fakeDay(day);
      fs.writeFileSync(path.join(folder,day+'.json'),JSON.stringify({
        storedAt:'2026-11-02T16:00:00Z',body}));
    }
    const result=await runER1MinimalCapture({pcHome:root,now,env:{},
      fetcher:async()=>{throw Error('NO_NETWORK_ALLOWED')}});
    assert.equal(result.status,'ER1_PRIVATE_SAMPLE_PARTIAL');
    assert.equal(result.verifiedDayCount,4);
    assert.equal(result.quarantinedDays[0].code,'ER1_CALENDAR_DAY_INVALID');
    assert.equal(result.recoveredDays.length,0);
    assert.equal(result.providerRequests,0);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
