import test from 'node:test';
import assert from 'node:assert/strict';
import {attemptOutput,recordOutputStageTiming} from '../scripts/pc-writer/independent-publication.mjs';

test('Writer timing preserves every attempt count with bounded slowest entries',()=>{
 const report={};
 for(let i=0;i<25;i++)recordOutputStageTiming(report,`feed:PRIVATE-KEY-${i}`,i+1,true);
 const timing=report.writerStageTiming;
 assert.equal(timing.samples,25);
 assert.equal(timing.totalMeasuredMs,325);
 assert.equal(timing.byStage['feed-publication'].samples,25);
 assert.equal(timing.byStage['feed-publication'].totalMs,325);
 assert.equal(timing.slowest.length,12);
 assert.equal(timing.slowest[0].elapsedMs,25);
 assert.equal(timing.slowest.at(-1).elapsedMs,14);
 assert.doesNotMatch(JSON.stringify(timing),/PRIVATE-KEY|token|credential/i);
 assert.equal(timing.scope,'ATTEMPT_OUTPUT_CALLBACKS_ONLY_NOT_FULL_CORE_OR_WRITER');
});

test('Writer timing groups independently instrumented computation and D1 stages',()=>{
 const report={};
 recordOutputStageTiming(report,'market',1500.9,true);
 recordOutputStageTiming(report,'composite-archive-local',5.4,true);
 recordOutputStageTiming(report,'composite-observed-publication',42.4,false);
 recordOutputStageTiming(report,'projection-publication:inflation',123.9,true);
 recordOutputStageTiming(report,'w05-saved-sidecar:earnings',11.8,true);
 recordOutputStageTiming(report,'untrusted\\nSECRET',3,true);
 recordOutputStageTiming(report,'market',-1,true);
 assert.equal(report.writerStageTiming.samples,6);
 assert.equal(report.writerStageTiming.byStage.market.totalMs,1500);
 assert.equal(report.writerStageTiming.byStage['composite-observed-publication'].failed,1);
 assert.equal(report.writerStageTiming.byStage['projection-publication'].totalMs,123);
 assert.equal(report.writerStageTiming.byStage['w05-stored-sidecar'].samples,1);
 assert.equal(report.writerStageTiming.byStage['other-stages'].samples,1);
 assert.doesNotMatch(JSON.stringify(report.writerStageTiming),/SECRET|untrusted/);
 recordOutputStageTiming(report,'constructor',7,true);
 assert.equal(report.writerStageTiming.byStage.constructor.samples,1);
});

test('normal and failed output contracts remain unchanged with monotonic timing',async()=>{
 const report={};
 let called=0;
 assert.equal(await attemptOutput(report,'market',async()=>{called++;}),true);
 assert.equal(await attemptOutput(report,'feed:private',async()=>{
  called++;throw Error('VALIDATION_FAILED');
 }),false);
 assert.equal(called,2);
 assert.deepEqual(report.failures,[{id:'feed:private',reason:'VALIDATION_FAILED'}]);
 assert.equal(report.writerStageTiming.samples,2);
 assert.equal(report.writerStageTiming.byStage.market.failed,0);
 assert.equal(report.writerStageTiming.byStage['feed-publication'].failed,1);
 assert.ok(report.writerStageTiming.totalMeasuredMs>=0);
});

test('stage timing cannot veto an otherwise successful calculation',async()=>{
 const frozen=Object.freeze({});
 assert.equal(await attemptOutput(frozen,'market',async()=>{}),true);
 assert.equal(Object.keys(frozen).length,0);
});

test('stage timing limits the number of category names',()=>{
 const report={};
 for(let i=0;i<80;i++)recordOutputStageTiming(report,'stage-'+i,i,true);
 assert.ok(Object.keys(report.writerStageTiming.byStage).length<=33);
 assert.equal(report.writerStageTiming.samples,80);
 assert.equal(report.writerStageTiming.slowest.length,12);
 assert.equal(report.writerStageTiming.byStage['other-stages'].samples,48);
});
