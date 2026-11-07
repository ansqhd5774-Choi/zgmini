import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadOperationalSources} from '../scripts/pc-writer/theme-platform-operational.mjs';
import {R32} from '../scripts/pc-writer/theme-platform.mjs';
import {planPublicPhysicalCycle,runPublicPhysicalCycle,verifyPublicPhysicalProjection} from
 '../scripts/pc-writer/theme-platform-public-cycle.mjs';

const grant=JSON.parse(fs.readFileSync(new URL('../config/theme-platform-delegation.json',import.meta.url)));
const approved={selectionVerified:true,formulaVerified:true,inputVerified:true,
 rightsEvidenceValid:true,publicationApprovalValid:true,readerCompatible:true};
const allApproved=plan=>Object.fromEntries(plan.groups.map(g=>[g.feedKey,{...approved}]));
const owners=(plan,invocations)=>Object.fromEntries(plan.groups.map(group=>[
 group.feedKey,async(input)=>{
  invocations.push(input);
  return {status:'PUBLIC_API_VERIFIED',d1Writes:1,providerCalls:0,schedulerWrites:0};
 }]));
const publicFixture=plan=>({status:'READY',
 themes:plan.publicTargets.map(t=>({theme:t.label,score:50,
  history:Array.from({length:252},(_,n)=>({date:new Date(Date.UTC(2025,0,1+n))
   .toISOString().slice(0,10),score:50}))})),
 provisional:{points:[{date:'2025-09-10',scores:Object.fromEntries(
  plan.publicTargets.map(t=>[t.label,51]))}]}});

test('one public physical-cycle plan groups 20 phases into six existing D1 keys',()=>{
 const plan=planPublicPhysicalCycle();
 assert.equal(plan.status,'PUBLIC_PHYSICAL_OWNER_PLAN_NOT_ACTIVATED');
 assert.equal(plan.publicTargetIds.length,10);
 assert.equal(plan.publicTargetIds.includes('ai-semiconductor'),false);
 assert.equal(plan.publicPhaseCount,20);
 assert.equal(plan.physicalFeedCount,6);
 assert.equal(plan.providerCalls,0);assert.equal(plan.d1Writes,0);
 assert.equal(plan.groups.filter(g=>g.kind==='confirmed').length,3);
 assert.equal(plan.groups.filter(g=>g.kind==='provisional').length,3);
 const r37=plan.groups.filter(g=>g.family==='r37');
 assert.equal(r37.length,2);
 assert.equal(r37[0].feedKey,'theme-legacy-nine-r37');
 assert.equal(r37[1].feedKey,'theme-nine-r32-provisional-r88');
 assert.deepEqual(r37.map(g=>g.themeIds.length),[8,8]);
 assert.deepEqual(r37.map(g=>g.methodologyVersion),[R32,R32]);
 assert.equal(new Set(plan.groups.map(g=>g.feedKey)).size,6);
});

test('without explicit opt-in the coordinator cannot call any publisher',async()=>{
 const plan=planPublicPhysicalCycle(),invocations=[];
 const actual=await runPublicPhysicalCycle({grant,contextByFeed:allApproved(plan),
  owners:owners(plan,invocations)});
 assert.equal(actual.status,'PUBLIC_PHYSICAL_OWNER_PLAN_NOT_ACTIVATED');
 assert.equal(invocations.length,0);
});

test('stale mandatory L7/R178 Reader stops the six owner cycle before any D1 write',async()=>{
 const plan=planPublicPhysicalCycle(),invocations=[];
 const actual=await runPublicPhysicalCycle({grant,allowPublish:true,
  contextByFeed:allApproved(plan),owners:owners(plan,invocations),
  readPublic:async()=>({status:'UNAVAILABLE',reason:'STORED_DATA_STALE'})});
 assert.equal(actual.status,'PUBLIC_BASE_READER_UNAVAILABLE');
 assert.equal(actual.reason,'STORED_DATA_STALE');
 assert.equal(actual.completedGroups,0);
 assert.equal(actual.d1Writes,0);
 assert.deepEqual(invocations,[]);
});

test('stale base can bootstrap only the existing R37 confirmed physical owner once',async()=>{
 const plan=planPublicPhysicalCycle(),invocations=[];
 const handlers=owners(plan,invocations);
 const r37=plan.groups.find(g=>g.family==='r37'&&g.kind==='confirmed');
 handlers[r37.feedKey]=async input=>{
  invocations.push(input);
  return {status:'D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH',
   d1Writes:1,providerCalls:0};
 };
 const actual=await runPublicPhysicalCycle({grant,allowPublish:true,
  recoverConfirmedOnStale:true,contextByFeed:allApproved(plan),
  owners:handlers,readPublic:async()=>({status:'UNAVAILABLE',
   reason:'STORED_DATA_STALE'})});
 assert.equal(actual.status,'PUBLIC_BASE_RECOVERY_PENDING');
 assert.equal(actual.d1Writes,1);
 assert.equal(actual.completedGroups,1);
 assert.equal(actual.results[0].feedKey,r37.feedKey);
 assert.equal(invocations.length,1);
 assert.equal(invocations[0].confirmedOnlyRecovery,true);
 assert.equal(invocations[0].themes,undefined);
});

test('one recovery plus ready readback processes the other five groups without repeating R37',async()=>{
 const plan=planPublicPhysicalCycle(),invocations=[];
 const handlers=owners(plan,invocations);
 let reads=0;
 const actual=await runPublicPhysicalCycle({grant,allowPublish:true,
  recoverConfirmedOnStale:true,contextByFeed:allApproved(plan),owners:handlers,
  readPublic:async()=>++reads===1?{status:'UNAVAILABLE',
   reason:'STORED_DATA_STALE'}:publicFixture(plan)});
 assert.equal(actual.status,'PUBLIC_PHYSICAL_OWNER_CYCLE_VERIFIED');
 assert.equal(actual.completedGroups,6);
 assert.equal(actual.verifiedGroups,6);
 assert.equal(actual.d1Writes,6);
 assert.equal(reads,3);
 assert.equal(invocations.length,6);
 assert.equal(new Set(invocations.map(i=>i.feedKey)).size,6);
 assert.equal(invocations[0].confirmedOnlyRecovery,true);
});

test('stale recovery never bypasses existing rights or rescues a different 503 reason',async()=>{
 const plan=planPublicPhysicalCycle(),invocations=[];
 const approvals=allApproved(plan),handlers=owners(plan,invocations);
 const r37=plan.groups.find(g=>g.family==='r37'&&g.kind==='confirmed');
 approvals[r37.feedKey].rightsEvidenceValid=false;
 const blocked=await runPublicPhysicalCycle({grant,allowPublish:true,
  recoverConfirmedOnStale:true,contextByFeed:approvals,owners:handlers,
  readPublic:async()=>({status:'UNAVAILABLE',reason:'STORED_DATA_STALE'})});
 assert.equal(blocked.status,'PUBLIC_BASE_RECOVERY_BLOCKED');
 assert.equal(blocked.reason,'RIGHTS_EVIDENCE_MISSING');
 const unrelated=await runPublicPhysicalCycle({grant,allowPublish:true,
  recoverConfirmedOnStale:true,contextByFeed:allApproved(plan),owners:handlers,
  readPublic:async()=>({status:'UNAVAILABLE',reason:'BACKEND_FAILURE'})});
 assert.equal(unrelated.status,'PUBLIC_BASE_READER_UNAVAILABLE');
 assert.equal(invocations.length,0);
 await assert.rejects(runPublicPhysicalCycle({grant,allowPublish:true,
  recoverConfirmedOnStale:true,contextByFeed:allApproved(plan),
  owners:handlers}),/THEME_PUBLIC_RECOVERY_READER_REQUIRED/);
});

test('ambiguous confirmed recovery stops before the other five physical owners',async()=>{
 const plan=planPublicPhysicalCycle(),invocations=[];
 const handlers=owners(plan,invocations);
 const r37=plan.groups.find(g=>g.family==='r37'&&g.kind==='confirmed');
 handlers[r37.feedKey]=async input=>{
  invocations.push(input);return {status:'D1_STATE_UNKNOWN',
   d1Writes:1,providerCalls:0};};
 const result=await runPublicPhysicalCycle({grant,allowPublish:true,
  recoverConfirmedOnStale:true,contextByFeed:allApproved(plan),
  owners:handlers,readPublic:async()=>({status:'UNAVAILABLE',
   reason:'STORED_DATA_STALE'})});
 assert.equal(result.status,'STATE_UNKNOWN_STOPPED');
 assert.equal(result.d1Writes,1);
 assert.equal(invocations.length,1);
});

test('public 503 from Reader lookup cannot leave confirmed D1 feeds partially written',async()=>{
 const plan=planPublicPhysicalCycle(),invocations=[];
 const actual=await runPublicPhysicalCycle({grant,allowPublish:true,
  contextByFeed:allApproved(plan),owners:owners(plan,invocations),
  readPublic:async()=>{throw Object.assign(new Error('503'),
   {code:'THEME_PUBLIC_API_HTTP_503'});}});
 assert.equal(actual.status,'PUBLIC_BASE_READER_UNAVAILABLE');
 assert.equal(actual.reason,'THEME_PUBLIC_API_HTTP_503');
 assert.equal(actual.completedGroups,0);
 assert.equal(actual.d1Writes,0);
 assert.deepEqual(invocations,[]);
});

test('approved one-shot owner dispatch runs six feeds once, never eight R37 writes',async()=>{
 const plan=planPublicPhysicalCycle(),invocations=[];
 const actual=await runPublicPhysicalCycle({grant,allowPublish:true,
  contextByFeed:allApproved(plan),owners:owners(plan,invocations),
  readPublic:async()=>publicFixture(plan)});
 assert.equal(actual.status,'PUBLIC_PHYSICAL_OWNER_CYCLE_VERIFIED');
 assert.equal(actual.projection.status,'PUBLIC_PROJECTION_VERIFIED');
 assert.equal(actual.verifiedGroups,6);
 assert.equal(actual.completedGroups,6);
 assert.equal(actual.d1Writes,6);
 assert.equal(actual.providerCalls,0);
 assert.equal(actual.publicTargetIds.length,10);
 assert.equal(invocations.length,6);
 assert.equal(new Set(invocations.map(g=>g.feedKey)).size,6);
 // The R37 publisher must use its original nine-theme record, not an
 // eight-theme filtered payload passed down by this coordinator.
 assert.ok(!Object.hasOwn(invocations[0],'themes'));
 assert.ok(!Object.hasOwn(invocations[0],'record'));
});

test('owner reports alone cannot claim the ten-theme public cutover is done',async()=>{
 const plan=planPublicPhysicalCycle(),invocations=[];
 const actual=await runPublicPhysicalCycle({grant,allowPublish:true,
  contextByFeed:allApproved(plan),owners:owners(plan,invocations)});
 assert.equal(actual.verifiedGroups,6);
 assert.equal(actual.status,'PUBLIC_READBACK_PENDING');
 assert.equal(actual.projection,null);
});

test('public projection validates all ten dynamic labels and both actual phases',()=>{
 const plan=planPublicPhysicalCycle();
 const feed=publicFixture(plan);
 assert.equal(verifyPublicPhysicalProjection({plan,feed}).status,'PUBLIC_PROJECTION_VERIFIED');
 const missing=structuredClone(feed);
 delete missing.provisional.points[0].scores[plan.publicTargets[9].label];
 const result=verifyPublicPhysicalProjection({plan,feed:missing});
 assert.equal(result.status,'PUBLIC_PROJECTION_PARTIAL');
 assert.equal(result.failures[0].id,plan.publicTargetIds[9]);
 const duplicate=structuredClone(feed);
 duplicate.themes.push(structuredClone(duplicate.themes[0]));
 assert.equal(verifyPublicPhysicalProjection({plan,feed:duplicate}).status,
  'PUBLIC_THEME_LABEL_DUPLICATED');
});

test('private additional registrations do not become public or receive writer calls',async()=>{
 const reg=Array.from({length:164},(_,i)=>({sha256:'f'.repeat(64),
  internalId:`registered-private-${i}`,definition:{schema:'ZGMINI_THEME_CONFIG_V2',
   id:`private-${i}`,label:`Private ${i}`,etfs:['QQQ'],benchmark:'SPY',profile:R32,
   selectionEvidence:{sha256:'f'.repeat(64)}}}));
 const plan=planPublicPhysicalCycle({registrations:reg}),invocations=[];
 assert.equal(plan.publicTargetIds.length,10);
 assert.equal(plan.physicalFeedCount,6);
 const result=await runPublicPhysicalCycle({registrations:reg,grant,allowPublish:true,
  contextByFeed:allApproved(plan),owners:owners(plan,invocations)});
 assert.equal(result.verifiedGroups,6);
 assert.equal(invocations.length,6);
});

test('missing rights or installed owner block only their feed without writes',async()=>{
 const plan=planPublicPhysicalCycle(),invocations=[];
 const approvals=allApproved(plan);
 approvals[plan.groups[0].feedKey].rightsEvidenceValid=false;
 const handlers=owners(plan,invocations);
 delete handlers[plan.groups[1].feedKey];
 const output=await runPublicPhysicalCycle({grant,allowPublish:true,
  contextByFeed:approvals,owners:handlers});
 assert.equal(output.status,'PARTIAL_REVIEW_REQUIRED');
 assert.equal(output.verifiedGroups,4);
 assert.equal(output.results[0].reason,'RIGHTS_EVIDENCE_MISSING');
 assert.equal(output.results[1].reason,'EXISTING_PUBLIC_OWNER_NOT_CONNECTED');
 assert.equal(output.d1Writes,4);
 assert.equal(invocations.length,4);
});

test('unrecognized or uncertain write outcome stops later owner calls, never retries',async()=>{
 const plan=planPublicPhysicalCycle(),invocations=[];
 const handlers=owners(plan,invocations);
 handlers[plan.groups[1].feedKey]=async input=>{
  invocations.push(input);
  return {status:'D1_WRITE_COMPLETED_FOLLOWUP_FAILED',d1Writes:1,
   providerCalls:0,schedulerWrites:0};
 };
 const result=await runPublicPhysicalCycle({grant,allowPublish:true,
  contextByFeed:allApproved(plan),owners:handlers});
 assert.equal(result.status,'STATE_UNKNOWN_STOPPED');
 assert.equal(result.completedGroups,2);
 assert.equal(result.d1Writes,2);
 assert.equal(invocations.length,2);
 assert.equal(result.results[1].status,'STATE_UNKNOWN');
});

test('missing writer effect counts never count as a successful D1 readback',async()=>{
 const plan=planPublicPhysicalCycle(),invocations=[];
 const handlers=owners(plan,invocations);
 handlers[plan.groups[0].feedKey]=async input=>{
  invocations.push(input);return {status:'PUBLIC_API_VERIFIED'};
 };
 const result=await runPublicPhysicalCycle({grant,allowPublish:true,
  contextByFeed:allApproved(plan),owners:handlers});
 assert.equal(result.status,'STATE_UNKNOWN_STOPPED');
 assert.equal(result.d1Writes,0);
 assert.equal(invocations.length,1);
});

test('pending public Reader readback is distinct from verified D1 publication',async()=>{
 const plan=planPublicPhysicalCycle(),invocations=[];
 const handlers=owners(plan,invocations);
 handlers[plan.groups[0].feedKey]=async input=>{
  invocations.push(input);return {status:'D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH',
   d1Writes:1,providerCalls:0};
 };
 const result=await runPublicPhysicalCycle({grant,allowPublish:true,
  contextByFeed:allApproved(plan),owners:handlers});
 assert.equal(result.status,'PARTIAL_REVIEW_REQUIRED');
 assert.equal(result.results[0].status,'PUBLIC_READBACK_PENDING');
 assert.equal(result.d1Writes,6);
});

test('R88 D1 CAS/readback alone never certifies public API completion',async()=>{
 const plan=planPublicPhysicalCycle(),invocations=[];
 const handlers=owners(plan,invocations);
 const r88=plan.groups.find(g=>g.feedKey==='theme-nine-r32-provisional-r88');
 handlers[r88.feedKey]=async input=>{
  invocations.push(input);return {status:'WRITTEN_AND_READBACK_VERIFIED',
   d1Writes:1,providerCalls:0};
 };
 const result=await runPublicPhysicalCycle({grant,allowPublish:true,
  contextByFeed:allApproved(plan),owners:handlers});
 assert.equal(result.status,'PARTIAL_REVIEW_REQUIRED');
 assert.equal(result.verifiedGroups,5);
 assert.equal(result.results.find(g=>g.feedKey===r88.feedKey).status,
  'PUBLIC_READBACK_PENDING');
});

test('family collision on same physical key is refused before any write',()=>{
 const sources=loadOperationalSources();
 const altered=structuredClone(sources);
 altered.bindings.families['data-center'].confirmed='theme-legacy-nine-r37';
 assert.throws(()=>planPublicPhysicalCycle({sources:altered}),
  /THEME_PUBLIC_FEED_OWNER_OR_METHOD_CONFLICT/);
});
