import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {selectChangedWorkflows,verifyArchive,ARCHIVE_SHA256} from '../scripts/ci-actionlint-changed.mjs';
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
