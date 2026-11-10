import test from 'node:test';
import assert from 'node:assert/strict';
import {buildD05LineageEvent,decideD05LineageAppend,D05_LINEAGE_EVENT_SCHEMA}
 from '../lib/score-history/d05-lineage-event-contract-r1.mjs';

const calculatedAt='2026-11-10T12:00:13.385Z';
const now=Date.parse(calculatedAt);
const names=['macro','credit','supply','fundFlows','bisDsr','bisTc','rates'];
const sources=names.map((sourceKey,i)=>({sourceKey,batchKey:sourceKey+':2026-11-10',
 storedAt:now-i*1000,storedBodySha256:i.toString(16).padStart(64,'0')}));
const link={status:'LINKED_SELECTED_7_BATCHES_ONLY',scope:'LOCAL_PC_ONLY',
 effectiveUseVerified:false,completeD05InputLineage:false,publicD1Verified:false,
 calculatedAt,asOfDate:'2026-11-10',score:47.97618582151962,
 outputSignature:'21ac0fbc',archiveKey:'composite-observed:2026-11-10',
 archiveStoredAt:now,sources};
const runtimeSourceSha='a'.repeat(40),approvedSourceSha='b'.repeat(40);
const recordedAt='2026-11-10T12:00:14.000Z';
const build=(override={})=>buildD05LineageEvent({link,runtimeSourceSha,approvedSourceSha,
 recordedAt,...override});

test('only verified seven-source local archive link can prepare a private event',()=>{
 const entry=build();
 assert.equal(entry.status,'PREPARED_LOCAL_ONLY');
 assert.equal(entry.schema,D05_LINEAGE_EVENT_SCHEMA);
 assert.equal(entry.eventId,'D05/CM-R1/'+calculatedAt);
 assert.equal(entry.inputScope,'SELECTED_7_BATCHES_ONLY');
 assert.equal(entry.selectionEvidence,'POST_SELECTION_UNIQUE_MATCH');
 assert.equal(entry.effectiveUseVerified,false);
 assert.equal(entry.completeD05InputLineage,false);
 assert.equal(entry.publicD1Verified,false);
 assert.equal(entry.sources.length,7);
 assert.match(entry.stableEvidenceDigestSha256,/^[0-9a-f]{64}$/);
 assert.equal(JSON.stringify(entry).includes('body'),false);
});

test('record receipt time does not change stable event identity or digest',()=>{
 const first=build(),second=build({recordedAt:'2026-11-10T12:00:18.000Z'});
 assert.equal(first.stableEvidenceDigestSha256,second.stableEvidenceDigestSha256);
 assert.equal(first.eventId,second.eventId);
 assert.notEqual(first.recordedAt,second.recordedAt);
});

test('seven direct reader IDs are distinguished from retrospective shadow matches',()=>{
 const witnessed=build({link:{...link,sources:sources.map(x=>
  ({...x,selectionWitness:'READER_DIRECT_ID'}))}});
 assert.equal(witnessed.selectionEvidence,'DIRECT_ID_AND_EXACT_ROW_MATCH');
 assert.ok(witnessed.sources.every(x=>x.selectionWitness==='READER_DIRECT_ID'));
 assert.notEqual(witnessed.stableEvidenceDigestSha256,build().stableEvidenceDigestSha256);
});

test('prepares a single append line, never writes to any file or DB',()=>{
 const result=decideD05LineageAppend('',build());
 assert.equal(result.status,'APPEND_READY');
 assert.equal(result.existingEventCount,0);
 assert.equal(JSON.parse(result.line).eventId,'D05/CM-R1/'+calculatedAt);
 assert.ok(result.line.endsWith('\n'));
});

test('same event and stable evidence is idempotent even with new receipt time',()=>{
 const first=build(),line=decideD05LineageAppend('',first).line;
 const second=build({recordedAt:'2026-11-10T12:00:18.000Z'});
 assert.deepEqual(decideD05LineageAppend(line,second),
  {status:'NOOP_SAME_EVENT',eventId:first.eventId});
});

test('same event id with changed source hash is a conflict and never overwrites',()=>{
 const first=build(),line=decideD05LineageAppend('',first).line;
 const changed=build({link:{...link,sources:sources.map((x,i)=>i===0?
  {...x,storedBodySha256:'f'.repeat(64)}:x)}});
 assert.equal(decideD05LineageAppend(line,changed).code,'EVENT_ID_CONFLICT');
 assert.equal(JSON.parse(line).sources[0].storedBodySha256,first.sources[0].storedBodySha256);
});

test('missing selected inputs, archive UNCHANGED and unverified links fail closed',()=>{
 assert.equal(build({link:{...link,sources:sources.slice(0,6)}}).code,'SELECTED_SEVEN_INCOMPLETE');
 assert.equal(build({link:{...link,status:'UNCHANGED'}}).code,'PARTIAL_LINK_NOT_VERIFIED');
 assert.equal(build({link:{...link,completeD05InputLineage:true}}).code,'PARTIAL_LINK_NOT_VERIFIED');
 assert.equal(build({link:{...link,archiveStoredAt:now-1000}}).code,'ARCHIVE_CHECKPOINT_MISMATCH');
});

test('partial-line and invalid JSON ledger remain untouched and unproven',()=>{
 const entry=build();
 assert.equal(decideD05LineageAppend('{"eventId":"partial"',entry).code,
  'LINEAGE_LEDGER_PARTIAL_LINE');
 assert.equal(decideD05LineageAppend('{broken}\n',entry).code,'LINEAGE_LEDGER_INVALID');
 assert.equal(decideD05LineageAppend(null,entry).code,'LINEAGE_LEDGER_UNAVAILABLE');
});

test('existing duplicate event is an integrity error, not success',()=>{
 const line=decideD05LineageAppend('',build()).line;
 assert.equal(decideD05LineageAppend(line+line,build()).code,'LINEAGE_LEDGER_DUPLICATE');
});

test('tampered digest, unexpected private field or truncated source sha is rejected',()=>{
 const entry=build();
 assert.equal(decideD05LineageAppend('',{...entry,stableEvidenceDigestSha256:'f'.repeat(64)}).code,
  'LINEAGE_EVENT_INVALID');
 assert.equal(decideD05LineageAppend('',{...entry,apiToken:'SHOULD_NOT_PERSIST'}).code,
  'LINEAGE_EVENT_INVALID');
 assert.equal(build({runtimeSourceSha:'not-a-sha'}).code,'SOURCE_OR_RECORD_TIME_UNVERIFIED');
});

test('bad dates, score, output signature and source prefix cannot be recorded',()=>{
 assert.equal(build({link:{...link,asOfDate:'2026-02-30'}}).code,'CALCULATED_EVENT_INVALID');
 assert.equal(build({link:{...link,score:101}}).code,'CALCULATED_EVENT_INVALID');
 assert.equal(build({link:{...link,outputSignature:'not-sha'}}).code,'CALCULATED_EVENT_INVALID');
 assert.equal(build({link:{...link,sources:sources.map((x,i)=>i===1?{...x,batchKey:'macro:other'}:x)}}).code,
  'SELECTED_SEVEN_INCOMPLETE');
});
