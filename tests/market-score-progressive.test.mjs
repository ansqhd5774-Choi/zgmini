import test from 'node:test';
import assert from 'node:assert/strict';
import {createMarketScoreR1Handler} from '../worker/market-score-r1.mjs';
import {withMarketScoreCache} from '../worker/market-score-cache.mjs';
import {streamMarketScore} from '../worker/market-score-stream.mjs';
import {collectProgressiveMarketInputs} from '../worker/market-score-progressive-inputs.mjs';
import {collectDiagnosticLiveInputs} from '../worker/diagnostic-v1-canary.mjs';
import {readProgressiveMarketResponse} from '../lib/market-score/read-progressive-response.mjs';

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};
const request=()=>new Request('https://example.test/api/market-score');
const partial={status:'SUCCESS',domains:Array.from({length:12},(_,i)=>({id:String(i),score:null})),updatedAt:'2026-09-27T00:00:00Z'};

test('stored domain renders before unrelated collection, final score and null gates unchanged',async()=>{
  const slow=deferred(),early=deferred();let done=false;
  const handler=createMarketScoreR1Handler({env:{},now:()=>new Date('2026-09-27T00:00:00Z'),
    collectInputs:()=>slow.promise,orchestrate:()=>({snapshot:{diagnostics:{}}}),
    collectBreadthDomain:async()=>({status:'READY',score:40}),
    loadConsumptionDomain:async()=>({status:'READY',score:42}),
  });
  const events=[];
  const reading=readProgressiveMarketResponse(streamMarketScore(handler,request()),body=>{
    events.push(body);
    if(body.domains.find(d=>d.id==='breadth')?.score===40)early.resolve();
  },()=>{done=true});
  await early.promise;
  assert.equal(done,false);
  assert.equal(events.at(-1).overall.score,null);
  assert.equal(events.at(-1).domains.find(d=>d.id==='consumption').score,42);
  assert.equal(events.at(-1).domains.find(d=>d.id==='employment').score,null);
  assert.equal('series' in events.at(-1),false);
  slow.resolve({series:{},external:{}});await reading;
  assert.equal(done,true);
  assert.equal(events.at(-1).dataQuality.reweighted,false);
  assert.equal(events.at(-1).domains.find(d=>d.id==='breadth').score,40);
});

test('rates publish without waiting for macro and failed macro does not erase rates',async()=>{
  const slow=deferred(),early=deferred();let baseStarted=false;
  const job=collectProgressiveMarketInputs({asOf:'2026-09-27',onProgress:x=>{if(x.rateR2)early.resolve(x)}},{
    collectBase:async()=>{baseStarted=true;await slow.promise;throw new Error('provider failure')},
    collectRates:async()=>({rateR2:{series:{EFFR:[{value:1}]}}}),
  });
  const received=await early.promise;assert.equal(baseStarted,true);
  assert.equal(received.rateR2.series.EFFR[0].value,1);
  slow.resolve();assert.equal((await job).rateR2.series.EFFR[0].value,1);
});

test('collector publishes independent SEC and FRED inputs while copper is pending',async()=>{
  const slow=deferred(),early=deferred();let finished=false;
  const job=collectDiagnosticLiveInputs({env:{FRED_API_KEY:'fixture'},asOf:'2026-09-27',
    fetchImpl:async()=>{throw new Error('unexpected network')},
    onProgress:x=>{if(x.series.UNRATE&&x.external.registeredFundFlowRows.length)early.resolve(x)},
    adapters:{
      fetchFred:async seriesId=>({seriesId,status:'READY_CURRENT_VINTAGE',rows:[{observationDate:'2026-08-01',value:1}]}),
      fetchFundFlows:async()=>({status:'READY_CURRENT_VINTAGE_RAW',rows:[{observationDate:'2026-03-01',value:0.1}]}),
      fetchOfr:async()=>({}),fetchCmdi:async()=>({}),fetchGscpi:async()=>({}),fetchBis:async()=>({}),fetchEarnings:async()=>({}),
      fetchCopper:()=>slow.promise,
    },
  }).then(x=>{finished=true;return x});
  const x=await early.promise;assert.equal(finished,false);assert.equal(x.external.copperRows.length,0);
  slow.resolve({status:'FAILED'});const final=await job;
  assert.equal(final.external.registeredFundFlowRows.length,1);
});

test('shared collection broadcasts to concurrent subscribers; late subscriber receives latest',async()=>{
  const slow=deferred(),started=deferred();let calls=0,notify;
  const cached=withMarketScoreCache(async(_request,onProgress)=>{
    calls++;notify=onProgress;started.resolve();await slow.promise;
    return Response.json(partial);
  },{getCache:()=>null});
  const first=[],second=[];
  const a=cached(request(),x=>first.push(x));await started.promise;
  notify(partial);
  const b=cached(request(),x=>second.push(x));
  await Promise.resolve();assert.equal(calls,1);assert.equal(second.length,1);
  slow.resolve();await Promise.all([a,b]);assert.equal(first.length,1);
});

test('fragmented UTF8 stream preserves Korean text and zero; incomplete stream is rejected',async()=>{
  const value={...partial,label:'물가',domains:partial.domains.map((d,i)=>({...d,score:i===0?0:null}))};
  const bytes=new TextEncoder().encode(JSON.stringify({type:'snapshot',body:value})+'\n'+JSON.stringify({type:'complete',body:value,cacheControl:'public, max-age=300'})+'\n');
  const stream=new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=7)c.enqueue(bytes.slice(i,i+7));c.close()}});
  const received=[];
  await readProgressiveMarketResponse(new Response(stream,{headers:{'content-type':'application/x-ndjson'}}),x=>received.push(x),()=>{});
  assert.equal(received[0].label,'물가');assert.equal(received[0].domains[0].score,0);
  await assert.rejects(readProgressiveMarketResponse(new Response(JSON.stringify({type:'snapshot',body:value})+'\n',{headers:{'content-type':'application/x-ndjson'}}),()=>{},()=>{}),/INCOMPLETE/);
});

test('disconnect does not cancel shared collection; failed end retains delivered snapshot',async()=>{
  const slow=deferred(),started=deferred();let finished=false;
  const stream=streamMarketScore(async(_r,notify)=>{notify(partial);started.resolve();await slow.promise;finished=true;return Response.json(partial)},request());
  const reader=stream.body.getReader();await reader.read();await started.promise;await reader.cancel();slow.resolve();
  await new Promise(r=>setTimeout(r,0));assert.equal(finished,true);
  const seen=[];
  await assert.rejects(readProgressiveMarketResponse(streamMarketScore(async(_r,notify)=>{notify(partial);throw new Error('private error')},request()),x=>seen.push(x),()=>{}),/MARKET_SCORE_UNAVAILABLE/);
  assert.equal(seen.length,1);
});
