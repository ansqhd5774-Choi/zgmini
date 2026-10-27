import test from 'node:test';
import assert from 'node:assert/strict';
import {affectsPublication,evaluateLineage} from '../scripts/pc-writer/market-calendar-r10-lineage-telemetry.mjs';

const approved='e'.repeat(40);
const project={head:'a'.repeat(40),sourceObjectPresent:true,diffReadable:true,protectedChangedCount:0,statusReadable:true,dirtyProtected:0};

test('R10 counts genuine protected publisher changes but excludes independent Iran and test files',()=>{
 assert.equal(affectsPublication('lib/release-calendar.mjs'),true);
 assert.equal(affectsPublication('worker/market-data-feed.ts'),true);
 assert.equal(affectsPublication('scripts/pc-writer/run-local.mjs'),true);
 assert.equal(affectsPublication('scripts/pc-writer/market-calendar-r10-lineage-telemetry.mjs'),true);
 assert.equal(affectsPublication('tests/market-calendar-r10-lineage-telemetry.test.mjs'),false);
 assert.equal(affectsPublication('lib/iran-progress/reference-flow.mjs'),false);
 assert.equal(affectsPublication('worker/iran-progress-public.mjs'),false);
});

test('R10 remains fail-closed on source drift or unresolved provenance',()=>{
 const decide=(p=project,ledger=null,writer=null)=>evaluateLineage({approved,project:p,ledger,writer});
 assert.equal(decide({...project,protectedChangedCount:61}),'PROTECTED_SOURCE_DRIFT_STOP');
 assert.equal(decide({...project,sourceObjectPresent:false}),'SOURCE_COMPARISON_NOT_VERIFIED_STOP');
 assert.equal(decide({...project,dirtyProtected:1}),'LOCAL_PROTECTED_EDITS_STOP');
 assert.equal(decide(null),'SOURCE_OR_PROJECT_UNRESOLVED_STOP');
 assert.equal(decide(project,{status:'VERIFIED',source:'b'.repeat(40)}),'LEDGER_SOURCE_INCONSISTENT_REVIEW');
 assert.equal(decide(project,null,{mode:'PUBLISH',source:'b'.repeat(40)}),'WRITER_SOURCE_INCONSISTENT_REVIEW');
 assert.equal(decide(),'SOURCE_COMPATIBILITY_ONLY_NO_CHANGE');
});
