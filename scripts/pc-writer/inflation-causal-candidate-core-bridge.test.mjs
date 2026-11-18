import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {planInflationCandidateCoreDue,collectInflationCandidatesIfDue,
 runInflationCandidatesFromCore,CANDIDATE_CORE_SCHEMA,CANDIDATE_CORE_CHECKPOINT}
 from './inflation-causal-candidate-core-bridge.mjs';

const NOW=new Date('2026-11-20T23:30:00.000Z');
const at='2026-11-20T12:00:00.000Z';
const source=url=>({status:'READY',checkedAt:at,url});
const sources={bls:source('bls'),fed:source('fed'),census:source('census'),
 treasury:source('treasury'),eia:source('eia')};
const event=(source,id,title,date='2026-11-19')=>({source,id,title,date,
 sourceUrl:'https://official.example/'+id});
const EVENTS=[
 event('bls','cpi','Consumer Price Index'),
 event('bls','ppi','Producer Price Index'),
 event('fed','industrial-production','Industrial Production G.17'),
 event('census','census-full-report-manufacturers-shipments-inventories-and-orders-september-2026',
  "Full Report - Manufacturers' Shipments, Inventories, and Orders · September 2026"),
 event('census','census-advance-report-on-durable-goods-manufacturers-shipments-inventories-and-orders-september-2026',
  "Advance Report on Durable Goods--Manufacturers' Shipments, Inventories, and Orders · September 2026"),
 event('treasury','treasury-cusip','US Treasury CUSIP auction'),
 event('eia','eia-wpsr','Weekly Petroleum Status Report'),
];
const checkpoint=()=>({schema:CANDIDATE_CORE_SCHEMA,processed:{},attempted:{}});
const keys={BLS_API_KEY:'fixture',EIA_API_KEY:'fixture',CENSUS_API_KEY:'fixture'};

test('default disabled makes no release or credential-dependent due',()=>{
 const planned=planInflationCandidateCoreDue({approved:false,events:EVENTS,sources,
  checkpoint:checkpoint(),now:NOW,bootstrapApproved:true,providerEnv:keys});
 assert.equal(planned.status,'DISABLED');
 assert.deepEqual(planned.due,[]);
});

test('exact recorded legacy CPI/Census parser failures admit initial recovery without calendar dates',()=>{
 const doc=checkpoint();
 doc.attempted.cpi={eventKey:'release:bls:cpi:2026-11-08',
  at:'2026-11-08T22:45:02.525Z',failureCode:'BLS_CANDIDATE_VALUE_OR_DUPLICATE'};
 doc.attempted.census={eventKey:'release:census:m3:2026-11-08',
  at:'2026-11-08T22:45:02.525Z',failureCode:'CENSUS_M3_HEADERS_INVALID'};
 const input={approved:true,bootstrapApproved:true,events:[],sources:{},
  checkpoint:doc,providerEnv:keys,now:NOW};
 const planned=planInflationCandidateCoreDue(input);
 assert.deepEqual(planned.due.map(x=>x.group),['cpi','census']);
 assert.deepEqual(planned.due.map(x=>x.eventKey),
  ['legacy-parser-recovery:cpi','legacy-parser-recovery:census']);
 assert.ok(planned.due.every(x=>x.releaseDate===null));
 assert.deepEqual(planInflationCandidateCoreDue({...input,bootstrapApproved:false}).due,[]);
 doc.processed.census={eventKey:'release:census:m3:2026-11-08',
  observationDate:'2026-09-01'};
 assert.deepEqual(planInflationCandidateCoreDue(input).due.map(x=>x.group),['cpi']);
 delete doc.processed.census;
 doc.attempted.census.failureCode='CENSUS_M3_HTTP_429';
 assert.deepEqual(planInflationCandidateCoreDue(input).due.map(x=>x.group),['cpi']);
 doc.attempted.cpi={eventKey:'legacy-parser-recovery:cpi',at:NOW.toISOString(),
  failureCode:'BLS_CANDIDATE_VALUE_OR_DUPLICATE'};
 assert.deepEqual(planInflationCandidateCoreDue(input).due,[]);
});

test('W01 legacy-parser recovery is truly once after 24h, not a repeating quota consumer',()=>{
 const doc=checkpoint();
 doc.attempted.census={eventKey:'legacy:census',at:'2026-11-08T22:45:02.525Z',
  failureCode:'CENSUS_M3_HEADERS_INVALID'};
 const input={approved:true,bootstrapApproved:true,events:[],sources:{},
  checkpoint:doc,providerEnv:keys,now:NOW};
 const first=planInflationCandidateCoreDue(input);
 assert.deepEqual(first.due.map(x=>x.eventKey),['legacy-parser-recovery:census']);
 doc.attempted.census={eventKey:'legacy-parser-recovery:census',at:NOW.toISOString(),
  failureCode:'CENSUS_M3_HEADERS_INVALID'};
 for(const date of ['2026-11-21T23:30:00.000Z','2026-11-30T23:30:00.000Z']){
  const after=planInflationCandidateCoreDue({...input,now:new Date(date)});
  assert.deepEqual(after.due,[],date);
 }
 // A new independently verified full Census release is a different event.
 const release=planInflationCandidateCoreDue({...input,events:EVENTS,
  sources,now:new Date('2026-11-30T23:30:00.000Z')});
 assert.deepEqual(release.due.map(x=>x.group),['census']);
});

test('W01 bootstrap Treasury/EIA request is once even on unchanged or failed readback',()=>{
 const doc=checkpoint();
 const input={approved:true,bootstrapApproved:true,events:[],sources:{},
  checkpoint:doc,providerEnv:keys,now:NOW};
 assert.deepEqual(planInflationCandidateCoreDue(input).due.map(x=>x.group),
  ['treasury','eia']);
 doc.attempted.treasury={eventKey:'bootstrap:treasury',at:NOW.toISOString()};
 doc.attempted.eia={eventKey:'bootstrap:eia',at:NOW.toISOString(),
  failureCode:'EIA_REGULAR_HTTP_503'};
 for(const date of ['2026-11-21T00:40:00.000Z','2026-12-20T23:30:00.000Z']){
  assert.deepEqual(planInflationCandidateCoreDue({...input,now:new Date(date)}).due,[],
   'one-shot bootstrap does not re-fetch after cooldown');
 }
});

test('W01 unchanged one-shot collector does not reenter approved provider quota',async()=>{
 const doc=checkpoint(),calls=[];
 const original=async()=>({status:'UNCHANGED',providerRequests:1});
 const mock={treasury:async args=>{calls.push('treasury');await args.quotaFetch('approved');return original();}};
 const opts={base:'/tmp/pc-writer',approved:true,bootstrapApproved:true,
  officialEvents:[],officialSources:{},providerEnv:{},quotaFetch:async()=>({ok:true}),
  collectors:mock,checkpointIO:{load:()=>doc,save:()=>{}},
  latestIO:()=>null,now:NOW};
 const first=await collectInflationCandidatesIfDue(opts);
 assert.deepEqual(first.completed,[{group:'treasury',status:'AWAITING_NEW_OBSERVATION',latest:null}]);
 assert.deepEqual(calls,['treasury']);
 const later=await collectInflationCandidatesIfDue({...opts,
  now:new Date('2026-11-30T23:30:00.000Z')});
 assert.deepEqual(later.completed,[]);
 assert.equal(later.providerRequests,0);
 assert.deepEqual(calls,['treasury']);
});

test('one-shot recovery executes only failed groups and advances checkpoint on saved readback',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-recovery-'));
 const base=path.join(root,'pc-writer');fs.mkdirSync(base);
 try{
  const doc=checkpoint(),latest={},calls=[];
  doc.attempted.cpi={eventKey:'legacy:bls',
   at:'2026-11-08T22:45:02.525Z',failureCode:'BLS_CANDIDATE_VALUE_OR_DUPLICATE'};
  doc.attempted.census={eventKey:'legacy:census',
   at:'2026-11-08T22:45:02.525Z',failureCode:'CENSUS_M3_HEADERS_INVALID'};
  const collectors={
   cpi:async()=>{calls.push('cpi');latest.cpi='2026-10-01';
    return {status:'SAVED_READBACK',providerRequests:1};},
   census:async()=>{calls.push('census');latest.census='2026-09-01';
    return {status:'SAVED_READBACK',providerRequests:2};}
  };
  const result=await collectInflationCandidatesIfDue({base,approved:true,
   bootstrapApproved:true,officialEvents:[],officialSources:{},providerEnv:keys,
   now:NOW,quotaFetch:async()=>({ok:true}),collectors,
   checkpointIO:{load:()=>doc,save:()=>{}},latestIO:g=>latest[g]??null});
  assert.deepEqual(calls,['cpi','census']);
  assert.deepEqual(result.completed.map(x=>x.status),
   ['OBSERVATION_ADVANCED','OBSERVATION_ADVANCED']);
  assert.equal(doc.processed.cpi.observationDate,'2026-10-01');
  assert.equal(doc.processed.census.observationDate,'2026-09-01');
  assert.equal(planInflationCandidateCoreDue({approved:true,bootstrapApproved:true,
   events:[],checkpoint:doc,providerEnv:keys,now:new Date('2026-11-23T23:00Z')}).due.length,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('exact BLS CPI/PPI, Fed G17 and Census M3 full-release mapping only',()=>{
 const planned=planInflationCandidateCoreDue({approved:true,events:EVENTS,sources,
  checkpoint:checkpoint(),now:NOW,providerEnv:keys});
 assert.deepEqual(planned.due.map(x=>x.group),['cpi','ppi','fed','census']);
 assert.ok(planned.due.find(x=>x.group==='census').eventKey.includes('full-report'));
 assert.deepEqual(planned.skipped,['treasury','eia']);
});

test('stored official BLS CPI release remains due if calendar refresh fails',()=>{
 const official={...EVENTS[0],sourceUrl:'https://www.bls.gov/schedule/news_release/cpi.htm'};
 const changed={...sources,bls:{status:'SOURCE_FAILED',checkedAt:at}};
 const outcome=planInflationCandidateCoreDue({approved:true,events:[official,EVENTS[1]],
  sources:changed,checkpoint:checkpoint(),now:NOW,providerEnv:keys});
 assert.deepEqual(outcome.due.map(x=>x.group),['cpi']);
 const unverified=planInflationCandidateCoreDue({approved:true,events:[EVENTS[0]],
  sources:changed,checkpoint:checkpoint(),now:NOW,providerEnv:keys});
 assert.equal(unverified.due.length,0);
 const before=planInflationCandidateCoreDue({approved:true,events:[
  {...official,date:'2026-11-20'}],sources:changed,checkpoint:checkpoint(),
  now:new Date('2026-11-20T21:59:00Z'),providerEnv:keys});
 assert.equal(before.due.length,0);
});

test('Treasury auctions and EIA WPSR never trigger; bootstrap is explicitly one-shot',()=>{
 const planned=planInflationCandidateCoreDue({approved:true,events:EVENTS,sources,
  checkpoint:checkpoint(),now:NOW,providerEnv:keys,bootstrapApproved:true});
 assert.deepEqual(planned.due.map(x=>x.group),['cpi','ppi','fed','census','treasury','eia']);
 assert.equal(planned.due.find(x=>x.group==='treasury').eventKey,'bootstrap:treasury');
 assert.equal(planned.due.find(x=>x.group==='eia').eventKey,'bootstrap:eia');
 const absent=planInflationCandidateCoreDue({approved:true,events:EVENTS,sources,
  checkpoint:checkpoint(),now:NOW,bootstrapApproved:true,providerEnv:{...keys,EIA_API_KEY:''}});
 assert.ok(!absent.due.find(x=>x.group==='eia'));
});

test('date-only source event cannot trigger before UTC 22:00 on announcement day',()=>{
 const events=[event('bls','cpi','Consumer Price Index','2026-11-20')];
 const before=planInflationCandidateCoreDue({approved:true,events,sources,
  checkpoint:checkpoint(),now:new Date('2026-11-20T21:59:59.000Z'),providerEnv:keys});
 const after=planInflationCandidateCoreDue({approved:true,events,sources,
  checkpoint:checkpoint(),now:new Date('2026-11-20T22:00:00.000Z'),providerEnv:keys});
 assert.ok(!before.due.find(x=>x.group==='cpi'));
 assert.ok(after.due.find(x=>x.group==='cpi'));
});

test('already processed and recent attempted event are not retried per Core tick',()=>{
 const doc=checkpoint(),eventKey='release:bls:cpi:2026-11-19';
 doc.attempted.cpi={eventKey,at:'2026-11-20T22:00:00.000Z'};
 const first=planInflationCandidateCoreDue({approved:true,events:EVENTS,sources,
  checkpoint:doc,now:NOW,providerEnv:keys});
 assert.ok(!first.due.find(x=>x.group==='cpi'));
 doc.processed.ppi={eventKey:'release:bls:ppi:2026-11-19',observationDate:'2026-10-01'};
 const second=planInflationCandidateCoreDue({approved:true,events:EVENTS,sources,
  checkpoint:doc,now:NOW,providerEnv:keys});
 assert.ok(!second.due.find(x=>x.group==='ppi'));
 const later=planInflationCandidateCoreDue({approved:true,events:EVENTS,sources,
  checkpoint:doc,now:new Date('2026-11-21T23:30:00Z'),providerEnv:keys});
 assert.ok(later.due.find(x=>x.group==='cpi'));
});

test('actual execution records attempt first, advances checkpoint only after readback latest advances',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-infl-bridge-'));
 const base=path.join(root,'pc-writer');fs.mkdirSync(base);
 try{
 const doc=checkpoint(),latest={cpi:'2026-09-01',ppi:'2026-09-01'};
 const saved=[],calls=[];
 const collector=async args=>{
  assert.equal(doc.attempted[args.group].eventKey.startsWith('release:bls:'),true);
  calls.push(args.group);await args.quotaFetch('https://official.example/'+args.group);
  if(args.group==='cpi')latest.cpi='2026-10-01';
  return {status:'SAVED_READBACK',providerRequests:1};
 };
 const result=await collectInflationCandidatesIfDue({approved:true,base,
  officialEvents:EVENTS.filter(x=>x.source==='bls'),officialSources:sources,
  providerEnv:keys,now:NOW,quotaFetch:async()=>({ok:true}),
  collectors:{cpi:collector,ppi:collector},
  checkpointIO:{load:()=>doc,save:x=>saved.push(JSON.stringify(x))},
  latestIO:g=>latest[g]??null});
 assert.deepEqual(calls,['cpi','ppi']);
 assert.equal(result.providerRequests,2);
 assert.equal(result.completed.find(x=>x.group==='cpi').status,'OBSERVATION_ADVANCED');
 assert.equal(result.completed.find(x=>x.group==='ppi').status,'AWAITING_NEW_OBSERVATION');
 assert.equal(doc.processed.cpi?.observationDate,'2026-10-01');
 assert.equal(doc.processed.ppi,undefined);
 assert.ok(saved.length>=3);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('provider failure is isolated and a previous good observation is not claimed current',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-infl-bridge-'));
 const base=path.join(root,'pc-writer');fs.mkdirSync(base);
 try{
 const doc=checkpoint(),latest={cpi:'2026-09-01',ppi:'2026-09-01'};
 const result=await collectInflationCandidatesIfDue({approved:true,base,
  officialEvents:EVENTS.filter(x=>x.source==='bls'),officialSources:sources,
  providerEnv:keys,now:NOW,quotaFetch:async()=>({ok:true}),
  collectors:{cpi:async()=>{throw Object.assign(Error('private'),{code:'BLS_CANDIDATE_BAD'});},
   ppi:async args=>{await args.quotaFetch('https://official.example/ppi');
    return {status:'UNCHANGED',providerRequests:1};}},
  checkpointIO:{load:()=>doc,save:()=>{}},latestIO:g=>latest[g]});
 assert.equal(doc.attempted.cpi.failureCode,'BLS_CANDIDATE_BAD');
 assert.ok(!JSON.stringify(doc).includes('private'));
 assert.equal(result.status,'PARTIAL_PREVIOUS_INPUTS_PRESERVED');
 assert.equal(result.providerRequests,1);
 assert.equal(doc.processed.cpi,undefined);
 assert.equal(doc.processed.ppi,undefined);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('production wrapper cannot call quota or calendar while flag remains disabled',async()=>{
 let calendarCalls=0,quotaCalls=0;
 const out=await runInflationCandidatesFromCore('/tmp/pc-writer',{
  envLoader:()=>({...keys}),calendarLoader:()=>{calendarCalls++;throw Error('calendar read');},
  quotaFactory:()=>{quotaCalls++;throw Error('network');},now:NOW});
 assert.equal(out.status,'DISABLED');
 assert.equal(calendarCalls,0);assert.equal(quotaCalls,0);
});

test('checkpoint persists after staged provider readback and never shares existing inflation19 file',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-infl-bridge-'));
 const base=path.join(root,'pc-writer');fs.mkdirSync(base);
 try{
  const out=await collectInflationCandidatesIfDue({approved:true,base,bootstrapApproved:true,
   providerEnv:keys,now:NOW,quotaFetch:async()=>({ok:true}),
   collectors:{treasury:async args=>{
    await args.quotaFetch('https://official.example/treasury');
    const dir=path.join(base,'inflation-causal-candidates-r1');
    fs.writeFileSync(path.join(dir,'treasury-mts-customs-duties.json'),
     JSON.stringify({observations:[{date:'2026-09-30'}]}));
    return {status:'SAVED_READBACK',providerRequests:1};
   },eia:async args=>{
    await args.quotaFetch('https://official.example/eia');
    const dir=path.join(base,'inflation-causal-candidates-r1');
    fs.writeFileSync(path.join(dir,'eia-us-regular-gasoline-weekly.json'),
     JSON.stringify({observations:[{date:'2026-11-17'}]}));
    return {status:'SAVED_READBACK',providerRequests:1};
   }}});
  assert.equal(out.status,'COMPLETE');assert.equal(out.providerRequests,2);
  const cp=JSON.parse(fs.readFileSync(path.join(base,CANDIDATE_CORE_CHECKPOINT),'utf8'));
  assert.equal(cp.schema,CANDIDATE_CORE_SCHEMA);
  assert.equal(cp.processed.treasury.eventKey,'bootstrap:treasury');
  assert.equal(cp.processed.eia.eventKey,'bootstrap:eia');
  assert.equal(fs.existsSync(path.join(base,'inflation-causal-r1','recurring-checkpoint-r1.json')),false);
  const recheck=planInflationCandidateCoreDue({approved:true,bootstrapApproved:true,
   checkpoint:cp,now:new Date('2026-11-22T23:30:00.000Z'),providerEnv:keys});
  assert.equal(recheck.due.length,0);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('failed groups persist safe codes without changing retry timing or last-good checkpoint',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-infl-bridge-'));
 const base=path.join(root,'pc-writer');fs.mkdirSync(base);
 try{
  const doc=checkpoint(),latest={cpi:'2026-09-01'};
  doc.processed.cpi={eventKey:'release:bls:cpi:2026-10-01',observationDate:'2026-09-01'};
  const eventKey=EVENTS.find(x=>x.id==='cpi');
  const stable=JSON.stringify(doc.processed);
  const changed=[];
  const input={approved:true,base,officialEvents:[eventKey],officialSources:sources,
   providerEnv:keys,quotaFetch:async()=>({ok:true}),
   checkpointIO:{load:()=>doc,save:x=>changed.push(JSON.stringify(x))},latestIO:g=>latest[g]};
  const first=await collectInflationCandidatesIfDue({...input,now:NOW,
   collectors:{cpi:async()=>{throw Object.assign(Error('token=DO_NOT_LEAK'),
    {code:'CREDENTIALS_LEAK_ATTEMPT'});}}});
  assert.equal(first.failed[0].code,'INFL_CANDIDATE_SOURCE_FAILED');
  assert.equal(doc.attempted.cpi.failureCode,'INFL_CANDIDATE_SOURCE_FAILED');
  assert.equal(JSON.stringify(doc.processed),stable);
  assert.ok(!JSON.stringify(doc).includes('DO_NOT_LEAK'));
  const immediate=planInflationCandidateCoreDue({approved:true,events:[eventKey],sources,
   checkpoint:doc,providerEnv:keys,now:new Date('2026-11-21T20:00:00.000Z')});
  assert.deepEqual(immediate.due,[]);
  const second=await collectInflationCandidatesIfDue({...input,
   now:new Date('2026-11-22T23:30:00.000Z'),collectors:{cpi:async args=>{
    await args.quotaFetch('https://official.example/cpi');latest.cpi='2026-10-01';
    return {status:'SAVED_READBACK',providerRequests:1};}}});
  assert.equal(second.failed.length,0);
  assert.equal(second.completed[0].status,'OBSERVATION_ADVANCED');
  assert.equal(doc.attempted.cpi.failureCode,undefined);
  assert.equal(doc.processed.cpi.observationDate,'2026-10-01');
  assert.ok(changed.length>=4);
  doc.attempted.cpi.failureCode='SECRET_ARBITRARY';
  assert.throws(()=>planInflationCandidateCoreDue({approved:true,events:[eventKey],sources,
   checkpoint:doc,providerEnv:keys,now:new Date('2026-11-24T23:30:00Z')}),
   /INFL_CANDIDATE_CORE_CHECKPOINT_INVALID/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('W01 candidate temporary outage uses one hour retry, quota guard does not lose its code',async()=>{
 const eventKey='release:bls:cpi:2026-11-19';
 const doc=checkpoint();
 doc.attempted.cpi={eventKey,at:'2026-11-21T22:30:00.000Z',
  failureCode:'BLS_CANDIDATE_HTTP_503'};
 const params={approved:true,events:EVENTS.filter(x=>x.id==='cpi'),
  sources,checkpoint:doc,providerEnv:keys};
 const before=planInflationCandidateCoreDue({...params,
  now:new Date('2026-11-21T23:29:00.000Z')});
 assert.ok(!before.due.some(x=>x.group==='cpi'));
 const after=planInflationCandidateCoreDue({...params,
  now:new Date('2026-11-21T23:31:00.000Z')});
 assert.ok(after.due.some(x=>x.group==='cpi'));
 doc.attempted.cpi.failureCode='BLS_CANDIDATE_HTTP_429';
 assert.ok(!planInflationCandidateCoreDue({...params,
  now:new Date('2026-11-21T23:31:00.000Z')}).due.some(x=>x.group==='cpi'));
 doc.attempted.cpi.failureCode='BLS_CANDIDATE_VALUE_OR_DUPLICATE';
 assert.ok(!planInflationCandidateCoreDue({...params,
  now:new Date('2026-11-21T23:31:00.000Z')}).due.some(x=>x.group==='cpi'));
 doc.attempted.cpi.failureCode='INFL_CANDIDATE_QUOTA_GUARD';
 assert.ok(planInflationCandidateCoreDue({...params,
  now:new Date('2026-11-21T23:31:00.000Z')}).due.some(x=>x.group==='cpi'));

 const root=fs.mkdtempSync(path.join(os.tmpdir(),'w01-candidate-guard-'));
 const base=path.join(root,'pc-writer');fs.mkdirSync(base);
 try{
  const saved=checkpoint();
  const result=await collectInflationCandidatesIfDue({approved:true,base,
   officialEvents:EVENTS.filter(x=>x.id==='cpi'),officialSources:sources,
   providerEnv:keys,now:NOW,quotaFetch:async()=>{throw Object.assign(
    Error('secret-url-with-key'),{code:'PROVIDER_QUOTA_GUARD'});},
   collectors:{cpi:async({quotaFetch})=>{await quotaFetch('https://api.bls.gov');
    return {status:'SAVED_READBACK',providerRequests:1};}},
   checkpointIO:{load:()=>saved,save:()=>{}},latestIO:()=>null});
  assert.equal(result.status,'PARTIAL_PREVIOUS_INPUTS_PRESERVED');
  assert.equal(result.failed[0].code,'INFL_CANDIDATE_QUOTA_GUARD');
  assert.equal(saved.attempted.cpi.failureCode,'INFL_CANDIDATE_QUOTA_GUARD');
  assert.ok(!JSON.stringify(result).includes('secret-url'));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('W01 restores only previously validated official PPI, Fed and Census events when calendar refresh fails',()=>{
 const oldAt='2026-11-18T20:00:00.000Z';
 const retained=[
  {...EVENTS.find(e=>e.id==='ppi'),sourceUrl:'https://www.bls.gov/schedule/news_release/ppi.htm'},
  {...EVENTS.find(e=>e.id==='industrial-production'),
   sourceUrl:'https://www.federalreserve.gov/releases/g17/'},
  {...EVENTS.find(e=>e.source==='census'&&e.id.startsWith('census-full-report')),
   sourceUrl:'https://www.census.gov/economic-indicators/calendar-listview.html'},
 ];
 const src={
  bls:{status:'SOURCE_FAILED',checkedAt:oldAt},
  fed:{status:'SOURCE_FAILED',checkedAt:oldAt},
  census:{status:'SOURCE_FAILED',checkedAt:oldAt},
 };
 const input={approved:true,events:retained,sources:src,
  providerEnv:keys,checkpoint:checkpoint(),now:NOW};
 assert.deepEqual(planInflationCandidateCoreDue(input).due.map(x=>x.group),
  ['ppi','fed','census']);
 const poison=retained.map(x=>({...x,sourceUrl:x.sourceUrl.replace('www.','www.evil-')}));
 assert.equal(planInflationCandidateCoreDue({...input,events:poison}).due.length,0);
 const never={...src,bls:{status:'SOURCE_FAILED',checkedAt:null}};
 assert.deepEqual(planInflationCandidateCoreDue({...input,sources:never}).due.map(x=>x.group),
  ['fed','census']);
 const future={...src,census:{status:'SOURCE_FAILED',checkedAt:'2026-11-21T00:00:00.000Z'}};
 assert.deepEqual(planInflationCandidateCoreDue({...input,sources:future}).due.map(x=>x.group),
  ['ppi','fed']);
});
