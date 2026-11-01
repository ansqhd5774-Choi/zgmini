import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateUsIexProvisional} from '../lib/market-breadth/us-provisional-r1.mjs';
import {summarizeUsBreadthCoreEvidence} from '../scripts/pc-writer/us-breadth-core-readonly-r23.mjs';

const members=Array.from({length:503},(_,i)=>`T${i}`);
const previous=Object.fromEntries(members.map(symbol=>[symbol,{t:'2026-10-29T04:00:00Z',c:100,v:1}]));
const current=Object.fromEntries(members.slice(0,100).map((symbol,i)=>[symbol,
  {t:'2026-10-30T13:45:00Z',c:i<60?101:99,v:1}]));
const output=calculateUsIexProvisional({members,priorDate:'2026-10-29',observationDate:'2026-10-30',
  sessionStartUtc:'2026-10-30T13:30:00Z',slotEndUtc:'2026-10-30T14:00:00Z',
  collectedAt:'2026-10-30T14:01:00Z',referenceBars:previous,currentBars:current,
  referencePageComplete:true,currentPageComplete:true});
const taskXml='<Task><Triggers><Interval>PT5M</Interval></Triggers><Settings>'+
  '<MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy></Settings>'+
  '<Actions><Exec><Command>wscript.exe</Command><Arguments>approved.vbs</Arguments></Exec></Actions></Task>';

test('read-only Core evidence retains missing IEX, checks D1 same slot and never leaks source records',()=>{
 const result=summarizeUsBreadthCoreEvidence({config:{enabled:true,collectionTarget:'pc',source:'a'.repeat(40),
   providersSecret:'DO_NOT_PRINT'},taskXml,head:'a'.repeat(40),dirty:0,
  quota:{at:'2026-10-30T14:00:50Z',status:'COMPLETE'},
  cycle:{at:'2026-10-30T14:03:00Z',status:'COMPLETE',usProvisional:{status:'LOCAL_READY'}},
  sidecar:{output,raw:{members,prices:'DO_NOT_PRINT'}},
  early:{at:'2026-10-30T14:01:00Z',completedAt:'2026-10-30T14:02:00Z',
   status:'VERIFIED',slotEndUtc:output.slotEndUtc},
  remote:{body:output,stored_at:Date.parse('2026-10-30T14:02:00Z')}});
 assert.equal(result.task.triggerPT5M,true);
 assert.equal(result.task.ignoreNew,true);
 assert.equal(result.task.actionChainVerified,false);
 assert.equal(result.source.sourceMatches,true);
 assert.equal(result.core.maySkip15MinSlots,false);
 assert.deepEqual([result.provisional.observedCount,result.provisional.missingCount],[100,403]);
 assert.equal(result.provisional.earlyVerified,true);
 assert.equal(result.d1.sameSlot,true);
 assert.equal(result.d1.bodyExactMatch,true);
 assert.equal(result.d1.storedAtAfterSlot,true);
 assert.equal(result.provisional.attemptFinishedLagMs,120_000);
 assert.doesNotMatch(JSON.stringify(result),/DO_NOT_PRINT|"T0"|"prices"|"members"/);
});

test('long Core and absent live Task/D1 evidence never masquerade as a 15m guarantee',()=>{
 const result=summarizeUsBreadthCoreEvidence({taskError:'TASK_XML_QUERY_FAILED_NOT_DISABLED_PROOF',
  quota:{at:'2026-10-30T14:01:00Z'},cycle:{at:'2026-10-30T14:20:00Z',
   usProvisional:{status:'LOCAL_READY'}},sidecar:{output},
  early:{at:'2026-10-30T14:18:00Z',status:'FAILED',exit:1}});
 assert.equal(result.task.query,'XML_UNAVAILABLE');
 assert.equal(result.task.ignoreNew,null);
 assert.equal(result.core.maySkip15MinSlots,true);
 assert.equal(result.provisional.earlyVerified,false);
 assert.equal(result.d1.queried,false);
 assert.equal(result.d1.sameSlot,null);
 assert.match(result.conclusion,/three consecutive natural/);
});

test('a stale quota COMPLETE or same-slot but different D1 counts is not publication proof',()=>{
 const changed={...output,counts:{...output.counts,rising:61,falling:39}};
 const result=summarizeUsBreadthCoreEvidence({
  quota:{at:'2026-10-30T14:15:00Z',status:'COMPLETE'},
  cycle:{at:'2026-10-30T14:03:00Z',status:'COMPLETE'},
  sidecar:{output},
  early:{at:'2026-10-30T14:16:00Z',completedAt:'2026-10-30T14:17:00Z',
   status:'VERIFIED',slotEndUtc:'2026-10-30T13:45:00Z'},
  remote:{body:changed,stored_at:Date.parse('2026-10-30T13:59:00Z')},
 });
 assert.equal(result.core.lastCycleStale,true);
 assert.equal(result.core.elapsedMs,null);
 assert.equal(result.core.maySkip15MinSlots,null);
 assert.equal(result.provisional.earlyForCurrentSlot,false);
 assert.equal(result.provisional.earlyVerified,false);
 assert.equal(result.d1.sameSlot,true);
 assert.equal(result.d1.bodyExactMatch,false);
 assert.equal(result.d1.storedAtAfterSlot,false);
});
