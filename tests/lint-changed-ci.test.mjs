import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseDiffBase,selectChangedSource} from '../scripts/lint-changed-ci.mjs';

const OLD='a'.repeat(40),PARENT='b'.repeat(40);
test('PR includes all code changes relative to its merge parent',()=>{
 assert.equal(chooseDiffBase({event:'pull_request',before:OLD,headParent:PARENT}),PARENT);
});
test('multi-commit push compares with GitHub pre-push SHA',()=>{
 assert.equal(chooseDiffBase({event:'push',before:OLD,headParent:PARENT}),OLD);
});
test('missing or initial push base fails closed',()=>{
 assert.throws(()=>chooseDiffBase({event:'push',before:'0'.repeat(40),headParent:PARENT}),
  /LINT_BASE_UNAVAILABLE/);
 assert.throws(()=>chooseDiffBase({event:'schedule',headParent:PARENT}),
  /LINT_BASE_UNAVAILABLE/);
});
test('changed-source selection preserves eligible files and deduplicates',()=>{
 assert.deepEqual(selectChangedSource([
  'app/a.tsx','worker/b.ts','tests/c.test.mjs','scripts/build.js','app/a.tsx',
  'docs/doc.md','.github/workflows/node.js.yml','dist/ignored.js','node_modules/x.js',
  'public/index.html','app/deleted.tsx'
 ]),['app/a.tsx','app/deleted.tsx','scripts/build.js',
    'tests/c.test.mjs','worker/b.ts']);
});
