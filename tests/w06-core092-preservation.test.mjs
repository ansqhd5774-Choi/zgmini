import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCoreCycleId,coreCycleIdFromEnv} from '../scripts/pc-writer/core-cycle-id.mjs';
import {captureCoreOriginAtStart} from '../scripts/pc-writer/core-origin-runtime.mjs';

const source=name=>fs.readFileSync(new URL('../scripts/pc-writer/'+name,import.meta.url),'utf8');
test('W06 preserves Core092 cycle correlation without fabricating origin',()=>{
 const id=newCoreCycleId();
 assert.equal(coreCycleIdFromEnv({ZGMINI_CORE_CYCLE_ID:id}),id);
 assert.equal(coreCycleIdFromEnv({ZGMINI_CORE_CYCLE_ID:'invalid'}),null);
 assert.equal(captureCoreOriginAtStart({platform:'linux'}).status,'UNVERIFIED');
 const cycle=source('local-cycle.mjs');
 const coreBoundary=cycle.indexOf("const file=path.join(base,'local-cycle.lock')");
 assert.ok(coreBoundary>cycle.indexOf('await runCnnMinuteCycle('));
 assert.ok(cycle.indexOf('process.env.ZGMINI_CORE_CYCLE_ID=coreCycleId;')>coreBoundary);
 assert.ok(cycle.indexOf('report.coreOriginEvidence=')>coreBoundary);
 assert.ok(cycle.indexOf('report.coreOriginEvidence=')<cycle.indexOf("save(path.join(base,'local-cycle-last-run.json'),report)"));
 const collect=source('collect-local.mjs');
 assert.ok(collect.indexOf('report.coreCycleId=coreCycleIdFromEnv();')>collect.indexOf("const cnnOnly=lane==='cnn-minute'"));
 assert.ok(collect.indexOf('report.coreCycleId=coreCycleIdFromEnv();')<collect.indexOf('report.employmentR6Collection='));
 const publish=source('run-local.mjs');
 assert.ok(publish.indexOf('report.coreCycleId=coreCycleIdFromEnv();')>publish.indexOf("const seed=read(path.join(base,'local-seed-progress.json'))"));
});
