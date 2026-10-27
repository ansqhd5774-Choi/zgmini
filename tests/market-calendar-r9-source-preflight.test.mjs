import test from 'node:test';
import assert from 'node:assert/strict';
import {decidePreflight} from '../scripts/pc-writer/market-calendar-r9-source-preflight.mjs';

const config={source:'36266beb3ab942979d9aca7dcdd8af16fb27825b',enabled:true,collectionTarget:'pc'};
const candidateHash='685b41930f1dd1abe275f4b4b118fef267ef4f2758f19427233547f8d91278fc';
const target={taskReferenced:true,head:'36266beb3ab942979d9aca7dcdd8af16fb27825b',approvedCommitPresent:true,parserBlob:'f084e2a360b544257bb44a60b97875627c7ca371',dirtyParser:false,dirtyProtected:0,statusReadable:true};
const state={state:'SCANNED',candidates:[target]};

test('R9 identifies one unchanged approved source as eligible for controlled future transition',()=>{
 assert.equal(decidePreflight({config,taskXml:'<Task/>',projects:state,candidateHash}),'READY_FOR_APPROVED_SOURCE_TRANSITION_NO_CHANGES_MADE');
});

test('R9 refuses mismatched candidate, changed active parser, unverified task, or protected edits',()=>{
 const run=overrides=>decidePreflight({config,taskXml:'<Task/>',projects:state,candidateHash,...overrides});
 assert.equal(run({candidateHash:'other'}),'CANDIDATE_PARSER_MISMATCH_STOP');
 assert.equal(run({taskXml:null}),'CORE_TASK_UNAVAILABLE_STOP');
 assert.equal(run({projects:{state:'SCANNED',candidates:[{...target,taskReferenced:false}]}}),'TASK_PROJECT_AMBIGUOUS_OR_UNRESOLVED_STOP');
 assert.equal(run({projects:{state:'SCANNED',candidates:[{...target,dirtyProtected:1}]}}),'OTHER_PROTECTED_LOCAL_EDITS_STOP');
 assert.equal(run({projects:{state:'SCANNED',candidates:[{...target,dirtyParser:true}]}}),'PARSER_LOCAL_EDIT_PRESERVE_STOP');
 assert.equal(run({projects:{state:'SCANNED',candidates:[{...target,parserBlob:'d'.repeat(40)}]}}),'ACTIVE_PARSER_DRIFT_STOP');
 assert.equal(run({config:{...config,source:'a'.repeat(40)}}),'APPROVED_SOURCE_CHANGED_STOP');
});
