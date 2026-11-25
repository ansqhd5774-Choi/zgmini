import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {selectChangedWorkflows,verifyArchive,ARCHIVE_SHA256,validateConcurrencyQueueSource} from '../scripts/ci-actionlint-changed.mjs';
import {readFileSync} from 'node:fs';

test('selects only changed workflow YAML and does not include ordinary source',()=>{
 const paths=['src/app.ts','.github/workflows/node.js.yml',
  '.github/workflows/node.js.yml','.github/workflows/new_check.yaml',
  '.github/workflows/deleted.yml','docs/example.yml',
  '.github/workflows/deeper/nested.yml','.github/workflows/../secrets.yml',
  '/etc/passwd','.github/workflows/not-yaml.txt'];
 const actual=selectChangedWorkflows(paths,p=>!p.includes('deleted'));
 assert.deepEqual(actual,['.github/workflows/new_check.yaml',
  '.github/workflows/node.js.yml']);
});

test('archive check refuses bad digest and accepts exact bytes',()=>{
 const bytes=Buffer.from('fixture actionlint binary');
 assert.equal(verifyArchive(bytes,createHash('sha256').update(bytes).digest('hex')),true);
 assert.throws(()=>verifyArchive(bytes),/ACTIONLINT_ARCHIVE_SHA256_MISMATCH/);
 assert.match(ARCHIVE_SHA256,/^[a-f0-9]{64}$/);
});

test('existing Node.js CI invokes governance without new workflow or Runner',()=>{
 const y=readFileSync(new URL('../.github/workflows/node.js.yml',import.meta.url),'utf8');
 assert.match(y,/name: Validate changed GitHub Actions YAML \(actionlint\)/);
 assert.match(y,/node scripts\/ci-actionlint-changed\.mjs/);
 assert.match(y,/runs-on: ubuntu-latest/);
 assert.doesNotMatch(y,/continue-on-error:\s*true/);
});

test('workflow selection remains empty when no workflow was modified',()=>{
 assert.deepEqual(selectChangedWorkflows(['scripts/ci-actionlint-changed.mjs',
  'tests/ci-actionlint-changed.test.mjs'],()=>true),[]);
});

test('documented concurrency.queue max and single are allowed at workflow or job level',()=>{
 const contents=[
 'concurrency:','  group: ci-records','  queue: max',
 '  cancel-in-progress: false','jobs:','  test:',
 '    concurrency:','      group: test-job','      queue: single',
 '    runs-on: ubuntu-latest'
 ].join('\n');
 assert.equal(validateConcurrencyQueueSource(contents),true);
});

test('queue compatibility waiver still rejects unsupported queue values and nesting',()=>{
 assert.throws(()=>validateConcurrencyQueueSource(
  'concurrency:\n  group: events\n  queue: unlimited\n'),
  /ACTIONLINT_CONCURRENCY_QUEUE_INVALID/);
 assert.throws(()=>validateConcurrencyQueueSource(
  'jobs:\n  a:\n    concurrency:\n        queue: max\n'),
  /ACTIONLINT_CONCURRENCY_QUEUE_INVALID/);
 assert.throws(()=>validateConcurrencyQueueSource(null),
  /ACTIONLINT_QUEUE_SOURCE_INVALID/);
});

test('existing failure intake queue policy remains accepted by new governance',()=>{
 const y=readFileSync(new URL('../.github/workflows/ci-failure-issue-intake.yml',import.meta.url),'utf8');
 assert.equal(validateConcurrencyQueueSource(y),true);
 assert.match(y,/queue: max/);
 const script=readFileSync(new URL('../scripts/ci-actionlint-changed.mjs',import.meta.url),'utf8');
 assert.match(script,/-ignore','\^unexpected key/);
});
