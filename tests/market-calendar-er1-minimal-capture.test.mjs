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

test('three retained days survive an invalid fourth day; raw quarantined, no extra refetch',async()=>{
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
        date:day,pre:[{symbol:'ABC/W',eps:undefined,revenue:'unsupported'}],
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
    assert.equal(first.verifiedDayCount,4);
    assert.equal(first.quarantinedDays.length,1);
    assert.equal(first.quarantinedDays[0].date,dates[3]);
    assert.equal(first.quarantinedDays[0].invalidSymbols,1);
    assert.equal(first.quarantinedDays[0].missingEPSFields,1);
    assert.equal(first.quarantinedDays[0].invalidRevenueValues,1);
    assert.equal(first.uniqueSymbolsWithBoth,1);
    assert.equal(calls,2);
    assert.doesNotMatch(JSON.stringify(first),/ABC\/W|PRIVATE_TEST|unsupported/);
    assert.equal(fs.existsSync(path.join(dayRoot,dates[3]+'.json')),true);
    const repeat=await runER1MinimalCapture({pcHome:root,now,env:{},
      fetcher:async()=>{throw Error('SHOULD_NOT_REFETCH')}});
    assert.equal(repeat.status,'ER1_PRIVATE_SAMPLE_PARTIAL');
    assert.equal(repeat.providerRequests,0);
    assert.equal(repeat.retainedDayFiles,5);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
