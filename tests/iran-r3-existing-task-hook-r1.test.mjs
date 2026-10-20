import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const installer=readFileSync(new URL('../scripts/iran-progress/install-reference-flow.mjs',import.meta.url),'utf8');
const wrapper=readFileSync(new URL('../scripts/iran-progress/run-reference-flow-r3.mjs',import.meta.url),'utf8');

test('R3 task hookup requires prior verified R3 publication and exact existing task launcher',()=>{
 assert.match(installer,/const r2=process\.argv\.includes\('--r2'\),r3=process\.argv\.includes\('--r3'\)/);
 assert.match(installer,/FLOW_MODE_CONFLICT/);
 assert.match(installer,/reference-flow-publication-/);
 assert.match(installer,/\['VERIFIED','UNCHANGED'\]/);
 assert.match(installer,/schtasks\.exe.*\/Query.*\/TN/);
 assert.match(installer,/FLOW_EXISTING_TASK_MISMATCH/);
 assert.match(installer,/R3_PREVIOUS_LAUNCHER_NOT_VERIFIED/);
 assert.match(installer,/\.before-reference-r3/);
 assert.match(installer,/scheduleChanged:false/);
});

test('R3 scheduled chain republishes news before legacy collection and retains previous R2 mode',()=>{
 assert.match(wrapper,/operate-r3\.mjs.*--collect-publish/);
 assert.match(wrapper,/--legacy-r2/);
 assert.match(wrapper,/\['--r2'\]/);
 assert.match(wrapper,/if\(r3!==0\|\|original!==0\)process\.exitCode=1/);
 assert.match(installer,/--legacy-runner=/);
 assert.match(installer,/--legacy-r2/);
 assert.doesNotMatch(installer,/\/Create|\/Change|\/Delete/);
});
