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

test('exact BLS CPI/PPI, Fed G17 and Census M3 full-release mapping only',()=>{
 const planned=planInflationCandidateCoreDue({approved:true,events:EVENTS,sources,
  checkpoint:checkpoint(),now:NOW,providerEnv:keys});
 assert.deepEqual(planned.due.map(x=>x.group),['cpi','ppi','fed','census']);
 assert.ok(planned.due.find(x=>x.group==='census').eventKey.includes('full-report'));
 assert.deepEqual(planned.skipped,['treasury','eia']);
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
