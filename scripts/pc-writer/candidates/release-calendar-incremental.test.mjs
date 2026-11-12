import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectReleaseCalendarIncremental,
  planReleaseCalendarSources,
  RELEASE_CALENDAR_SUCCESS_INTERVAL_MS,
  RELEASE_CALENDAR_FAILED_RETRY_MS,
} from './release-calendar-incremental.mjs';

const START=Date.parse('2026-11-05T12:00:00Z');
const HOUR=60*60*1000;
const SOURCES={
  bls:{url:'https://www.bls.gov/example',page:'https://www.bls.gov/schedule/'},
  bea:{url:'https://www.bea.gov/example',page:'https://www.bea.gov/news/schedule'},
};

function fixture({initial=null,canClaim=true,blsFails=0}={}){
  let saved=initial,attempted=0,finished=0;
  const input=new Map(),calls=[];
  const store={
    readOutput:async()=>saved?{body:saved,storedAt:START}:null,
    writeOutput:async(key,body)=>{assert.equal(key,'release-calendar');saved=body},
    writeAttempt:async()=>{attempted++},
    writeInput:async(key,body)=>{input.set(key,{body})},
    readInput:async key=>input.get(key)??null,
  };
  const locks={
    claim:async()=>canClaim?'owned-lease':null,
    finish:async()=>{finished++},
  };
  const fetchImpl=async url=>{
    const source=url.includes('bls.gov')?'bls':'bea';
    calls.push(source);
    if(source==='bls'&&blsFails-->0)return new Response('Service unavailable',{status:503});
    return new Response(JSON.stringify({id:source==='bls'?'ppi':'pce',date:source==='bls'?'2026-11-13':'2026-11-25'}));
  };
  const parse=(text,source)=>[{...JSON.parse(text),source}];
  const execute=now=>collectReleaseCalendarIncremental({
    store,locks,specs:SOURCES,parse,fetchImpl,now,
  });
  return {execute,calls,get saved(){return saved},get attempted(){return attempted},get finished(){return finished}};
}

test('successful source keeps 6h cache; failed source alone retries at 60m, preserving old events',async()=>{
  const earlier=new Date(START-7*HOUR).toISOString();
  const scenario=fixture({
    blsFails:1,
    initial:{
      status:'PARTIAL',updatedAt:earlier,
      sources:{bls:{status:'READY',checkedAt:earlier}},
      events:[{id:'ppi',source:'bls',date:'2026-11-06',title:'Previous BLS release'}],
    },
  });
  const first=await scenario.execute(START);
  assert.equal(first.status,'PARTIAL');
  assert.equal(first.providerRequests,2);
  assert.deepEqual(scenario.calls,['bls','bea']);
  assert.equal(scenario.saved.sources.bls.status,'SOURCE_FAILED');
  assert.equal(scenario.saved.sources.bls.checkedAt,earlier);
  assert.equal(scenario.saved.events.find(e=>e.source==='bls').date,'2026-11-06');
  assert.equal(scenario.saved.events.find(e=>e.source==='bea').date,'2026-11-25');

  const minute=await scenario.execute(START+60_000);
  assert.equal(minute.status,'CACHED');
  assert.equal(minute.providerRequests,0);
  assert.equal(scenario.calls.length,2);

  const recovered=await scenario.execute(START+61*60_000);
  assert.equal(recovered.status,'READY');
  assert.equal(recovered.providerRequests,1);
  assert.deepEqual(recovered.refreshedSources,['bls']);
  assert.deepEqual(scenario.calls,['bls','bea','bls']);
  assert.equal(scenario.saved.events.find(e=>e.source==='bls').date,'2026-11-13');
  assert.equal(scenario.saved.events.filter(e=>e.source==='bls').length,1);
  assert.equal(scenario.saved.sources.bea.checkedAt,new Date(START).toISOString());

  const nextMinute=await scenario.execute(START+62*60_000);
  assert.equal(nextMinute.status,'CACHED');
  assert.equal(nextMinute.providerRequests,0);

  const beaDue=await scenario.execute(START+6*HOUR+2*60_000);
  assert.equal(beaDue.status,'READY');
  assert.deepEqual(beaDue.refreshedSources,['bea']);
  assert.deepEqual(scenario.calls,['bls','bea','bls','bea']);
  assert.equal(scenario.attempted,3);
  assert.equal(scenario.finished,3);
});

test('failed provider is not hammered by repeated Core cycles or duplicate runs',async()=>{
  const scenario=fixture({blsFails:10});
  assert.equal((await scenario.execute(START)).status,'PARTIAL');
  assert.deepEqual(scenario.calls,['bls','bea']);
  for(const minutes of [1,5,15,30,59]){
    const cached=await scenario.execute(START+minutes*60_000);
    assert.equal(cached.status,'CACHED');
    assert.equal(cached.providerRequests,0);
  }
  const next=await scenario.execute(START+HOUR);
  assert.equal(next.status,'PARTIAL');
  assert.deepEqual(next.refreshedSources,['bls']);
  assert.deepEqual(scenario.calls,['bls','bea','bls']);
  assert.equal((await scenario.execute(START+HOUR+5*60_000)).status,'CACHED');
});

test('lease refusal blocks work without saving attempts or making provider calls',async()=>{
  const scenario=fixture({canClaim:false});
  const result=await scenario.execute(START);
  assert.equal(result.status,'RUNNING');
  assert.equal(result.providerRequests,0);
  assert.equal(scenario.calls.length,0);
  assert.equal(scenario.attempted,0);
  assert.equal(scenario.finished,0);
});

test('planner uses separately bounded clocks without introducing a new scheduler',()=>{
  assert.equal(RELEASE_CALENDAR_SUCCESS_INTERVAL_MS,6*HOUR);
  assert.equal(RELEASE_CALENDAR_FAILED_RETRY_MS,HOUR);
  const previous={sources:{
    bls:{status:'SOURCE_FAILED',attemptedAt:new Date(START-61*60_000).toISOString()},
    bea:{status:'READY',checkedAt:new Date(START-2*HOUR).toISOString()},
  }};
  assert.deepEqual(planReleaseCalendarSources(SOURCES,previous,START),['bls']);
  assert.deepEqual(planReleaseCalendarSources(SOURCES,previous,START-2*60_000),[]);
  assert.throws(()=>planReleaseCalendarSources(SOURCES,previous,START,{failureRetryMs:0}),/POLICY_INVALID/);
});

test('source not in available specs is retained rather than erased by main-only source set',async()=>{
  const old=new Date(START-HOUR).toISOString();
  const extra={id:'extra-event',source:'other-installed-provider',date:'2026-12-01'};
  const scenario=fixture({initial:{status:'READY',updatedAt:old,
    sources:{'other-installed-provider':{status:'READY',checkedAt:old}},events:[extra]}});
  assert.equal((await scenario.execute(START)).status,'READY');
  assert.deepEqual(scenario.saved.events.find(e=>e.source==='other-installed-provider'),extra);
  assert.equal(scenario.saved.sources['other-installed-provider'].checkedAt,old);
});
