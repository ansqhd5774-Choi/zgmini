import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {collectInflation19IfDue,runInflation19RecurringFromCore,
 planInflation19Due,INFL19_RECURRING_SCHEMA} from './inflation-causal-recurring-r1.mjs';

const now=new Date('2026-11-07T22:00:00.000Z');
const event=(source,id,date)=>({source,id,date,sourceUrl:'https://official.example/release'});
const releases=[event('bls','ppi','2026-11-07'),
 event('eia_epm','eia-epm','2026-11-07'),
 event('nyfed','nyfed-sce','2026-11-07')];

test('default is inert even if all collectors and quota providers are injected',async()=>{
 let calls=0;
 const result=await collectInflation19IfDue({approved:false,
  officialEvents:releases,quotaFetch:()=>{calls++;throw Error('NOT_ALLOWED')}});
 assert.equal(result.status,'DISABLED');assert.equal(result.providerRequests,0);
 assert.equal(calls,0);assert.equal(result.skipped.length,4);
});

test('unverified or future release never causes a monthly API request',()=>{
 const x=planInflation19Due({enabled:true,now,events:[
  event('bls','ppi','2026-11-08'),event('eia_epm','other','2026-11-07'),
  {source:'nyfed',id:'nyfed-sce',date:'2026-11-07'}],gasDailyApproved:false});
 assert.deepEqual(x.due,[]);assert.equal(x.status,'NO_VERIFIED_RELEASE_DUE');
});

test('date-only release cannot be completed before the conservative US-day cutoff',()=>{
 const early=new Date('2026-11-07T13:00:00.000Z');
 const x=planInflation19Due({enabled:true,now:early,events:releases});
 assert.deepEqual(x.due,[]);
 const late=planInflation19Due({enabled:true,now,events:releases});
 assert.equal(late.due.length,3);
});

test('exact verified release events and separately approved daily gas qualify',()=>{
 const x=planInflation19Due({enabled:true,now,events:releases,gasDailyApproved:true});
 assert.deepEqual(x.due.map(v=>v.key),['bls8','electricity','sce','gas']);
 assert.deepEqual(x.due.map(v=>v.maxRequests),[1,2,3,1]);
});

test('checkpoint suppresses already handled event and gas UTC day',()=>{
 const x=planInflation19Due({enabled:true,now,events:releases,gasDailyApproved:true,
 checkpoint:{processed:{bls8:'2026-11-07',gas:'2026-11-07'}}});
 assert.deepEqual(x.due.map(v=>v.key),['electricity','sce']);
});

test('later completed event checkpoint must never regress to an older release',()=>{
 const x=planInflation19Due({enabled:true,now,events:releases,gasDailyApproved:true,
  checkpoint:{processed:{bls8:'2026-11-08',gas:'2026-11-08'},
   attempted:{electricity:{eventKey:'2026-11-08',at:'2026-11-07T20:00:00.000Z'}}}});
 assert.deepEqual(x.due.map(v=>v.key),['sce']);
});

test('failed event is throttled for 24h, gas failure for the entire UTC day',()=>{
 const checkpoint={processed:{},attempted:{
  bls8:{eventKey:'2026-11-07',at:'2026-11-07T22:00:00.000Z'},
  gas:{eventKey:'2026-11-07',at:'2026-11-07T22:00:00.000Z'}}};
 const nowSoon=new Date('2026-11-07T23:59:00Z');
 const x=planInflation19Due({enabled:true,now:nowSoon,checkpoint,events:[releases[0]],gasDailyApproved:true});
 assert.deepEqual(x.due,[]);
 const nextDay=new Date('2026-11-08T22:01:00Z');
 const y=planInflation19Due({enabled:true,now:nextDay,checkpoint,events:[releases[0]],gasDailyApproved:true});
 assert.deepEqual(y.due.map(e=>e.key),['bls8','gas']);
});

test('real approved fetch is mandatory for enabled due and never silently falls back',async()=>{
 await assert.rejects(()=>collectInflation19IfDue({approved:true,
  now,
  checkpointIO:{file:'/none',load:()=>({schema:INFL19_RECURRING_SCHEMA,processed:{}})},
  officialEvents:releases,providerEnv:{BLS_API_KEY:'test'}}),
  /INFL19_RECURRING_APPROVED_QUOTA_FETCH_REQUIRED/);
});

test('released BLS8 is fetched once, saved and is not fetched twice',async()=>{
 const cp={schema:INFL19_RECURRING_SCHEMA,processed:{}};
 let network=0,saveCount=0;
 const deps={approved:true,base:'/staged/pc-writer',now,officialEvents:[releases[0]],
  checkpointIO:{file:'/none',load:()=>cp,save:x=>{
   saveCount++;cp.processed={...x.processed};cp.attempted={...x.attempted};}},
  providerEnv:{BLS_API_KEY:'SECRET-DO-NOT-LOG'},
  quotaFetch:async()=>{network++;return {ok:true}},
  collectors:{bls8:async({quotaFetch,blsKey})=>{
   assert.equal(blsKey,'SECRET-DO-NOT-LOG');await quotaFetch('https://api.bls.gov');
   return {status:'SAVED_READBACK',providerCalls:1};}},
 };
 const first=await collectInflation19IfDue(deps);
 assert.equal(first.status,'COMPLETE');assert.equal(first.providerRequests,1);
 assert.equal(first.updated[0].source,'bls8');assert.equal(saveCount,2);
 assert.equal(network,1);assert.equal(JSON.stringify(first).includes('SECRET'),false);
 const second=await collectInflation19IfDue(deps);
 assert.equal(second.status,'NO_VERIFIED_RELEASE_DUE');assert.equal(network,1);
});

test('one source failure keeps previous checkpoint and allows independent due source',async()=>{
 const cp={schema:INFL19_RECURRING_SCHEMA,processed:{}};
 let b=0,e=0;
 const r=await collectInflation19IfDue({approved:true,base:'/staged/pc-writer',now,
  officialEvents:releases.slice(0,2),providerEnv:{BLS_API_KEY:'k',EIA_API_KEY:'k2'},
  checkpointIO:{file:'/none',load:()=>cp,save:x=>{
   cp.processed={...x.processed};cp.attempted={...x.attempted};}},
  quotaFetch:async()=>({ok:true}),collectors:{
   bls8:async({quotaFetch})=>{await quotaFetch('https://bls.gov');b++;throw Error('unsafe credential URL: key=123');},
   electricity:async({quotaFetch})=>{await quotaFetch('https://eia.gov');await quotaFetch('https://eia.gov');e++;return {status:'UNCHANGED',providerRequests:2};},
  }});
 assert.equal(b,1);assert.equal(e,1);assert.equal(r.status,'PARTIAL_PREVIOUS_CHECKPOINT_PRESERVED');
 assert.equal(r.providerRequests,3);assert.equal(cp.processed.electricity,'2026-11-07');
 assert.equal(cp.processed.bls8,undefined);assert.equal(JSON.stringify(r).includes('key=123'),false);
 // The failed BLS attempt is checkpointed, so a second Core tick cannot refetch.
 const again=planInflation19Due({enabled:true,now,checkpoint:cp,events:releases.slice(0,2)});
 assert.deepEqual(again.due,[]);
});

test('collector cannot use more than its bounded approved quota calls',async()=>{
 let network=0;
 const r=await collectInflation19IfDue({approved:true,base:'/staged/pc-writer',now,
  officialEvents:[releases[0]],providerEnv:{BLS_REGISTRATION_KEY:'key'},
  checkpointIO:{file:'/none',load:()=>({schema:INFL19_RECURRING_SCHEMA,processed:{}}),save:()=>{}},
  quotaFetch:async()=>{network++;return {ok:true}},collectors:{
   bls8:async({quotaFetch})=>{await quotaFetch('first');await quotaFetch('second');return {status:'SAVED_READBACK',providerCalls:2}},
  }});
 assert.equal(network,1);assert.equal(r.providerRequests,1);
 assert.deepEqual(r.failed,[{source:'bls8',code:'INFL19_RECURRING_REQUEST_BOUND_EXCEEDED'}]);
});

test('Core adapter does not read calendar or construct quota while flag disabled',async()=>{
 let calendar=0,quota=0;
 const r=await runInflation19RecurringFromCore('/none',{now,
  envLoader:()=>({FRED_API_KEY:'key'}),
  calendarLoader:()=>{calendar++;throw Error('MUST_NOT_READ');},
  quotaFactory:()=>{quota++;throw Error('MUST_NOT_CREATE');}});
 assert.equal(r.status,'DISABLED');assert.equal(r.providerRequests,0);
 assert.equal(calendar,0);assert.equal(quota,0);
});

test('Core adapter rejects unverified calendar sources with no provider calls',async()=>{
 let quota=0;
 const r=await runInflation19RecurringFromCore('/none',{now,
  envLoader:()=>({ZGMINI_INFL19_RECURRING_APPROVED:'1',BLS_API_KEY:'key'}),
  calendarLoader:()=>({events:releases,sources:{
   bls:{status:'SOURCE_FAILED',checkedAt:'2026-11-07T20:00:00Z'},
   eia_epm:{status:'UNVERIFIED',checkedAt:'2026-11-07T20:00:00Z'},
   nyfed:{status:'READY',checkedAt:'2026-11-08T00:00:00Z'},
  }}),
  checkpointIO:{file:'/none',load:()=>({schema:INFL19_RECURRING_SCHEMA,processed:{}})},
  quotaFactory:()=>{quota++;throw Error('MUST_NOT_CREATE');},
  collectors:{bls8:()=>{throw Error('MUST_NOT_COLLECT');}}});
 assert.equal(r.status,'NO_VERIFIED_RELEASE_DUE');assert.equal(r.providerRequests,0);
 assert.equal(quota,0);
});

test('SCE source uses safe pre-existing directory and measures redirect requests',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'infl19-recurring-unit-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const base=path.join(root,'pc-writer');
 fs.mkdirSync(path.join(base,'inflation-causal','sce31'),{recursive:true});
 const checkpoint={schema:INFL19_RECURRING_SCHEMA,processed:{}};
 let count=0;
 const r=await collectInflation19IfDue({approved:true,base,now,
  officialEvents:[releases[2]],
  checkpointIO:{file:'/none',load:()=>checkpoint,save:x=>{
   checkpoint.processed={...x.processed};checkpoint.attempted={...x.attempted};}},
  quotaFetch:async()=>{count++;return {ok:true}},
  collectors:{sce:async({fetcher,directory})=>{
   assert.equal(directory,path.join(base,'inflation-causal','sce31'));
   await fetcher('https://www.newyorkfed.org/first');
   await fetcher('https://www.newyorkfed.org/redirect');
   return {status:'STORED'};
  }}});
 assert.equal(r.status,'COMPLETE');assert.equal(count,2);
 assert.equal(r.providerRequests,2);assert.equal(checkpoint.processed.sce,'2026-11-07');
});
